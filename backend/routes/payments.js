const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Session = require('../models/Session');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// POST /api/payments/checkout/course/:courseId
router.post('/checkout/course/:courseId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate('teacher', 'name');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.price === 0) return res.status(400).json({ message: 'Course is free' });

    // Check if already purchased
    const existing = await Purchase.findOne({ student: req.user._id, course: course._id, status: 'completed' });
    if (existing) return res.status(400).json({ message: 'Already purchased' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: course.title, description: course.description.substring(0, 100) },
          unit_amount: Math.round(course.price * 100),
        },
        quantity: 1,
      }],
      metadata: { type: 'course', courseId: course._id.toString(), studentId: req.user._id.toString(), teacherId: course.teacher._id.toString() },
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/courses/${course._id}`,
    });

    // Create pending purchase
    await Purchase.create({
      student: req.user._id,
      course: course._id,
      type: 'course',
      amount: course.price,
      teacherEarning: course.price * 0.7,
      platformEarning: course.price * 0.3,
      stripeSessionId: session.id,
      status: 'pending'
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payments/checkout/session/:teacherId
router.post('/checkout/session/:teacherId', protect, async (req, res) => {
  try {
    const teacher = await User.findById(req.params.teacherId);
    if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ message: 'Teacher not found' });
    if (teacher.sessionPrice === 0) return res.status(400).json({ message: 'Teacher has no session price set' });

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
      metadata: { type: 'session', teacherId: teacher._id.toString(), studentId: req.user._id.toString() },
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/profile/${teacher.username}`,
    });

    // Create session record
    const sessionRecord = await Session.create({
      teacher: teacher._id,
      student: req.user._id,
      price: teacher.sessionPrice,
      stripeSessionId: checkoutSession.id,
    });

    await Purchase.create({
      student: req.user._id,
      session: sessionRecord._id,
      type: 'session',
      amount: teacher.sessionPrice,
      teacherEarning: teacher.sessionPrice * 0.7,
      platformEarning: teacher.sessionPrice * 0.3,
      stripeSessionId: checkoutSession.id,
      status: 'pending'
    });

    res.json({ url: checkoutSession.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payments/webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { type, courseId, studentId, teacherId } = session.metadata;

    await Purchase.findOneAndUpdate(
      { stripeSessionId: session.id },
      { status: 'completed' }
    );

    if (type === 'course') {
      await Course.findByIdAndUpdate(courseId, { $inc: { totalStudents: 1 } });
      await User.findByIdAndUpdate(teacherId, { $inc: { earnings: session.amount_total * 0.007 } });
    } else if (type === 'session') {
      await Session.findOneAndUpdate({ stripeSessionId: session.id }, { paid: true, status: 'confirmed' });
      await User.findByIdAndUpdate(session.metadata.teacherId, { $inc: { earnings: session.amount_total * 0.007 } });
    }
  }

  res.json({ received: true });
});

// GET /api/payments/verify/:sessionId
router.get('/verify/:sessionId', protect, async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ stripeSessionId: req.params.sessionId, student: req.user._id });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/payments/my-purchases
router.get('/my-purchases', protect, async (req, res) => {
  try {
    const purchases = await Purchase.find({ student: req.user._id, status: 'completed' }).populate('course', 'title thumbnail');
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/payments/has-access/:courseId
router.get('/has-access/:courseId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.price === 0) return res.json({ hasAccess: true });
    if (course.teacher.toString() === req.user._id.toString()) return res.json({ hasAccess: true });
    const purchase = await Purchase.findOne({ student: req.user._id, course: req.params.courseId, status: 'completed' });
    res.json({ hasAccess: !!purchase });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;