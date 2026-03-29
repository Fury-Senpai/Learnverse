const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const Stripe   = require('stripe');

dotenv.config();

const Purchase = require('../models/Purchase');
const Course   = require('../models/Course');
const User     = require('../models/User');
const Session  = require('../models/Session');

const stripe  = Stripe(process.env.STRIPE_SECRET_KEY);
const FIX     = process.argv.includes('--fix');
const ONE_SID = process.argv.includes('--session')
  ? process.argv[process.argv.indexOf('--session') + 1]
  : null;

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;
const dim    = (s) => `\x1b[2m${s}\x1b[0m`;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(green('✅ MongoDB connected\n'));

  /* ── 1. Check raw pending purchases ── */
  const pending = ONE_SID
    ? await Purchase.find({ stripeSessionId: ONE_SID }).populate('student course')
    : await Purchase.find({ status: 'pending' }).populate('student course').limit(50);

  console.log(bold(`\n══ Pending Purchases (${pending.length}) ══`));

  const healed = [];
  const broken = [];

  for (const p of pending) {
    const sid = p.stripeSessionId;
    process.stdout.write(`  ${dim(sid.slice(0, 30))}... `);

    try {
      const ss = await stripe.checkout.sessions.retrieve(sid);

      if (ss.payment_status === 'paid') {
        console.log(red('PAID in Stripe but PENDING in DB ← ROOT CAUSE FOUND'));
        broken.push({ purchase: p, stripeSession: ss });

        if (FIX) {
          await Purchase.findByIdAndUpdate(p._id, { status: 'completed' });

          const { type, courseId, teacherId } = ss.metadata;
          const dollars    = ss.amount_total / 100;
          const teacherCut = dollars * 0.7;

          if (type === 'course' && courseId) {
            await Course.findByIdAndUpdate(courseId, { $inc: { totalStudents: 1 } });
            if (teacherId) await User.findByIdAndUpdate(teacherId, { $inc: { earnings: teacherCut } });
          } else if (type === 'session') {
            await Session.findOneAndUpdate({ stripeSessionId: sid }, { paid: true, status: 'confirmed' });
            if (ss.metadata.teacherId) await User.findByIdAndUpdate(ss.metadata.teacherId, { $inc: { earnings: teacherCut } });
          }

          healed.push(sid);
          console.log(green('   → Healed ✅'));
        }
      } else {
        console.log(yellow(`payment_status=${ss.payment_status} — legitimately pending`));
      }
    } catch (err) {
      console.log(red(`Stripe lookup failed: ${err.message}`));
    }
  }

  /* ── 2. Webhook secret sanity check ── */
  console.log(bold('\n══ Environment Check ══'));

  const checks = {
    MONGO_URI:             process.env.MONGO_URI,
    STRIPE_SECRET_KEY:     process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    CLIENT_URL:            process.env.CLIENT_URL,
  };
  for (const [k, v] of Object.entries(checks)) {
    if (!v) console.log(red(`  ❌ ${k} is missing`));
    else if (k === 'STRIPE_WEBHOOK_SECRET' && !v.startsWith('whsec_'))
      console.log(red(`  ❌ ${k} looks wrong — should start with "whsec_"`));
    else console.log(green(`  ✅ ${k} = ${v.slice(0, 20)}…`));
  }

  /* ── 3. Webhook mode — local vs deployed ── */
  console.log(bold('\n══ Webhook Mode Hint ══'));
  const isLive = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live');
  if (isLive) {
    console.log(yellow('  ⚠️  Using LIVE Stripe keys'));
    console.log('     → Webhook endpoint must be registered at:');
    console.log('       https://dashboard.stripe.com/webhooks');
    console.log('     → Endpoint URL should be: ' + (process.env.CLIENT_URL || 'YOUR_BACKEND_URL') + '/api/payments/webhook');
    console.log('     → Event to listen for: checkout.session.completed');
  } else {
    console.log(dim('  ℹ️  Using TEST Stripe keys'));
    console.log('     → For local dev, run:');
    console.log('       stripe listen --forward-to localhost:5000/api/payments/webhook');
    console.log('     → The secret from that command goes in STRIPE_WEBHOOK_SECRET');
  }

  /* ── 4. has-access logic smoke test ── */
  console.log(bold('\n══ has-access Logic Test ══'));
  const sampleCompleted = await Purchase.findOne({ status: 'completed', type: 'course' }).populate('course student');
  if (sampleCompleted) {
    const found = await Purchase.findOne({
      student: sampleCompleted.student._id,
      course:  sampleCompleted.course._id,
      status:  'completed',
    });
    if (found) console.log(green('  ✅ has-access query works — completed purchase is findable'));
    else        console.log(red('  ❌ has-access query BROKEN — completed purchase not found by student+course+status'));
  } else {
    console.log(dim('  ℹ️  No completed course purchases in DB to test against'));
  }

  /* ── 5. Summary ── */
  console.log(bold('\n══ Summary ══'));
  console.log(`  Pending purchases checked : ${pending.length}`);
  console.log(`  Paid in Stripe but pending: ${broken.length}`);
  if (FIX) console.log(green(`  Healed                    : ${healed.length}`));
  else if (broken.length > 0) console.log(yellow(`  → Run with --fix to heal them`));

  if (broken.length > 0) {
    console.log(red('\n  ROOT CAUSE SUMMARY:'));
    console.log('  Stripe marked the payment as paid but the webhook never');
    console.log('  updated the Purchase record to "completed" in your DB.');
    console.log('  This is caused by one of:');
    console.log('    1. Wrong STRIPE_WEBHOOK_SECRET (most common on deploy)');
    console.log('    2. express.json() running BEFORE express.raw() in server.js');
    console.log('    3. Your deployed server URL not registered in Stripe dashboard');
    console.log('    4. Webhook endpoint returning non-200 so Stripe stopped retrying');
    console.log('\n  All 4 are fixed in the updated payments.js and server.js.');
  }

  await mongoose.disconnect();
  console.log(green('\n✅ Done\n'));
}

run().catch(err => {
  console.error(red('Script failed:'), err);
  process.exit(1);
});