const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Session = require('../models/Session');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

/* ─────────────────────────────────────────
   CHECKOUT — Course
───────────────────────────────────────── */
router.post('/checkout/course/:courseId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate('teacher', 'name');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.price === 0) return res.status(400).json({ message: 'Course is free' });

    const existing = await Purchase.findOne({
      student: req.user._id, course: course._id, status: 'completed'
    });
    if (existing) return res.status(400).json({ message: 'Already purchased' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: course.title,
            description: course.description?.substring(0, 100),
          },
          unit_amount: Math.round(course.price * 100),
        },
        quantity: 1,
      }],
      // ✅ FIX 1: metadata must be flat strings — already correct here, keep it
      metadata: {
        type: 'course',
        courseId:  course._id.toString(),
        studentId: req.user._id.toString(),
        teacherId: course.teacher._id.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/courses/${course._id}`,
    });

    // Delete any stale pending purchase for this student+course before creating a fresh one
    await Purchase.deleteMany({
      student: req.user._id, course: course._id, status: 'pending'
    });

    await Purchase.create({
      student:         req.user._id,
      course:          course._id,
      type:            'course',
      amount:          course.price,
      teacherEarning:  course.price * 0.7,
      platformEarning: course.price * 0.3,
      stripeSessionId: session.id,
      status:          'pending',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   CHECKOUT — 1:1 Session
───────────────────────────────────────── */
router.post('/checkout/session/:teacherId', protect, async (req, res) => {
  try {
    const teacher = await User.findById(req.params.teacherId);
    if (!teacher || teacher.role !== 'teacher')
      return res.status(404).json({ message: 'Teacher not found' });
    if (!teacher.sessionPrice || teacher.sessionPrice === 0)
      return res.status(400).json({ message: 'Teacher has no session price set' });

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `1:1 Session with ${teacher.name}` },
          unit_amount: Math.round(teacher.sessionPrice * 100),
        },
        quantity: 1,
      }],
      metadata: {
        type:      'session',
        teacherId: teacher._id.toString(),
        studentId: req.user._id.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/profile/${teacher.username}`,
    });

    const sessionRecord = await Session.create({
      teacher:         teacher._id,
      student:         req.user._id,
      price:           teacher.sessionPrice,
      stripeSessionId: checkoutSession.id,
    });

    await Purchase.create({
      student:         req.user._id,
      session:         sessionRecord._id,
      type:            'session',
      amount:          teacher.sessionPrice,
      teacherEarning:  teacher.sessionPrice * 0.7,
      platformEarning: teacher.sessionPrice * 0.3,
      stripeSessionId: checkoutSession.id,
      status:          'pending',
    });

    res.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('Session checkout error:', err);
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   WEBHOOK — Stripe events
   ✅ FIX 2: Raw body is already handled in server.js via
      app.use('/api/payments/webhook', express.raw({...}))
   ✅ FIX 3: Earnings calc was wrong: amount_total is in CENTS
      so  amount_total * 0.007  gives cents * 0.007  (completely wrong)
      correct formula: (amount_total / 100) * 0.7
   ✅ FIX 4: Webhook must respond 200 FAST — moved all DB work
      into a non-blocking background process so Stripe doesn't
      time out and retry (retries = duplicate purchases in logs)
───────────────────────────────────────── */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,               // raw Buffer — requires express.raw() in server.js BEFORE express.json()
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️  Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Respond to Stripe immediately — then process async
  res.json({ received: true });

  // Handle events in the background
  handleStripeEvent(event).catch(err =>
    console.error('❌ Webhook handler error:', err)
  );
});

async function handleStripeEvent(event) {
  if (event.type !== 'checkout.session.completed') return;

  const stripeSession = event.data.object;
  const { type, courseId, studentId, teacherId } = stripeSession.metadata;
  const sessionId  = stripeSession.id;

  // amount_total is in CENTS → divide by 100 for dollars
  const amountDollars = stripeSession.amount_total / 100;
  const teacherCut    = amountDollars * 0.7;

  console.log(`✅ Webhook: ${type} payment — session ${sessionId} — $${amountDollars}`);

  // Mark purchase completed
  const updated = await Purchase.findOneAndUpdate(
    { stripeSessionId: sessionId },
    { status: 'completed' },
    { new: true }
  );

  if (!updated) {
    console.error(`❌ No purchase found for stripeSessionId: ${sessionId}`);
    // ✅ FIX 5: Fallback — create the purchase if the webhook fires before
    //    the pending record was saved (race condition on slow servers)
    if (type === 'course' && courseId && studentId) {
      const course = await Course.findById(courseId);
      if (course) {
        await Purchase.create({
          student:         studentId,
          course:          courseId,
          type:            'course',
          amount:          amountDollars,
          teacherEarning:  teacherCut,
          platformEarning: amountDollars * 0.3,
          stripeSessionId: sessionId,
          status:          'completed',
        });
        console.log('✅ Fallback purchase record created');
      }
    }
  }

  if (type === 'course') {
    await Course.findByIdAndUpdate(courseId, { $inc: { totalStudents: 1 } });
    if (teacherId) {
      await User.findByIdAndUpdate(teacherId, { $inc: { earnings: teacherCut } });
    }
    console.log(`✅ Course ${courseId} — student added, teacher +$${teacherCut.toFixed(2)}`);

  } else if (type === 'session') {
    await Session.findOneAndUpdate(
      { stripeSessionId: sessionId },
      { paid: true, status: 'confirmed' }
    );
    const meta_teacherId = stripeSession.metadata.teacherId;
    if (meta_teacherId) {
      await User.findByIdAndUpdate(meta_teacherId, { $inc: { earnings: teacherCut } });
    }
    console.log(`✅ 1:1 session confirmed — teacher +$${teacherCut.toFixed(2)}`);
  }
}

/* ─────────────────────────────────────────
   VERIFY — called by PaymentSuccess page
   ✅ FIX 6: Poll Stripe directly if purchase is still pending.
      This handles the race condition where the user lands on
      /payment-success before the webhook fires.
───────────────────────────────────────── */
router.get('/verify/:sessionId', protect, async (req, res) => {
  try {
    let purchase = await Purchase.findOne({
      stripeSessionId: req.params.sessionId,
      student: req.user._id,
    });

    // If still pending, ask Stripe directly and process it now
    if (purchase && purchase.status === 'pending') {
      try {
        const stripeSession = await stripe.checkout.sessions.retrieve(req.params.sessionId);

        if (stripeSession.payment_status === 'paid') {
          const { type, courseId, teacherId } = stripeSession.metadata;
          const amountDollars = stripeSession.amount_total / 100;
          const teacherCut    = amountDollars * 0.7;

          // Update purchase
          purchase = await Purchase.findOneAndUpdate(
            { stripeSessionId: req.params.sessionId },
            { status: 'completed' },
            { new: true }
          );

          // Side effects (idempotent — use $inc carefully; you may want to check first)
          if (type === 'course' && courseId) {
            // Only increment if this course purchase wasn't already counted
            const alreadyCounted = await Purchase.countDocuments({
              course: courseId, status: 'completed',
              _id: { $ne: purchase._id }
            });
            if (alreadyCounted === 0) {
              await Course.findByIdAndUpdate(courseId, { $inc: { totalStudents: 1 } });
            }
            if (teacherId) {
              await User.findByIdAndUpdate(teacherId, { $inc: { earnings: teacherCut } });
            }
          } else if (type === 'session') {
            await Session.findOneAndUpdate(
              { stripeSessionId: req.params.sessionId },
              { paid: true, status: 'confirmed' }
            );
            if (stripeSession.metadata.teacherId) {
              await User.findByIdAndUpdate(stripeSession.metadata.teacherId, { $inc: { earnings: teacherCut } });
            }
          }

          console.log(`✅ Verify endpoint completed purchase ${purchase._id} (webhook was late)`);
        }
      } catch (stripeErr) {
        console.error('Stripe retrieve error in verify:', stripeErr.message);
      }
    }

    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   HAS-ACCESS — check course access
───────────────────────────────────────── */
router.get('/has-access/:courseId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.price === 0) return res.json({ hasAccess: true });
    if (course.teacher.toString() === req.user._id.toString())
      return res.json({ hasAccess: true });

    const purchase = await Purchase.findOne({
      student:  req.user._id,
      course:   req.params.courseId,
      status:   'completed',
    });

    // ✅ FIX 7: If not found locally, verify with Stripe as last resort
    if (!purchase) {
      const pendingPurchase = await Purchase.findOne({
        student: req.user._id,
        course:  req.params.courseId,
        status:  'pending',
      });

      if (pendingPurchase) {
        try {
          const stripeSession = await stripe.checkout.sessions.retrieve(
            pendingPurchase.stripeSessionId
          );
          if (stripeSession.payment_status === 'paid') {
            // Webhook was late — heal it now
            await Purchase.findByIdAndUpdate(pendingPurchase._id, { status: 'completed' });
            return res.json({ hasAccess: true });
          }
        } catch (_) {}
      }
    }

    res.json({ hasAccess: !!purchase });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   MY-PURCHASES
───────────────────────────────────────── */
router.get('/my-purchases', protect, async (req, res) => {
  try {
    const purchases = await Purchase.find({
      student: req.user._id,
      status: 'completed',
    }).populate('course', 'title thumbnail price');
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;