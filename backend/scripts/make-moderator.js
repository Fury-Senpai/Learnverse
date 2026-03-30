/**
 * make-moderator.js
 * 
 * DBA-only script to grant or revoke moderator role.
 * Moderator role CANNOT be set via signup or any API — only through this script.
 *
 * Usage:
 *   node scripts/make-moderator.js --grant  --email user@example.com  --note "Trusted senior member"
 *   node scripts/make-moderator.js --revoke --email user@example.com  --to student
 *   node scripts/make-moderator.js --list
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const User = require('../models/User');

const args        = process.argv.slice(2);
const ACTION      = args.includes('--grant') ? 'grant' : args.includes('--revoke') ? 'revoke' : args.includes('--list') ? 'list' : null;
const EMAIL_IDX   = args.indexOf('--email');
const NOTE_IDX    = args.indexOf('--note');
const TO_IDX      = args.indexOf('--to');

const email = EMAIL_IDX !== -1 ? args[EMAIL_IDX + 1] : null;
const note  = NOTE_IDX  !== -1 ? args[NOTE_IDX  + 1] : 'Promoted by DBA';
const revokeTo = TO_IDX !== -1 ? args[TO_IDX + 1] : 'student';

const green  = s => `\x1b[32m${s}\x1b[0m`;
const red    = s => `\x1b[31m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const bold   = s => `\x1b[1m${s}\x1b[0m`;

async function run() {
  if (!ACTION) {
    console.log(`
Usage:
  node scripts/make-moderator.js --grant  --email <email> [--note "reason"]
  node scripts/make-moderator.js --revoke --email <email> [--to student|teacher]
  node scripts/make-moderator.js --list
    `);
    process.exit(0);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(green('✅ Connected to MongoDB\n'));

  /* ── List all current moderators ── */
  if (ACTION === 'list') {
    const mods = await User.find({ role: 'moderator' }).select('name username email moderatorNote createdAt');
    if (mods.length === 0) {
      console.log(yellow('No moderators found.'));
    } else {
      console.log(bold(`Found ${mods.length} moderator(s):\n`));
      mods.forEach(m => {
        console.log(`  👤 ${m.name} (@${m.username})`);
        console.log(`     Email : ${m.email}`);
        console.log(`     Note  : ${m.moderatorNote || '—'}`);
        console.log(`     Since : ${m.createdAt.toLocaleDateString()}\n`);
      });
    }
    await mongoose.disconnect();
    return;
  }

  if (!email) {
    console.error(red('❌ --email is required'));
    process.exit(1);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(red(`❌ No user found with email: ${email}`));
    process.exit(1);
  }

  /* ── Grant moderator ── */
  if (ACTION === 'grant') {
    if (user.role === 'moderator') {
      console.log(yellow(`⚠️  @${user.username} is already a moderator.`));
    } else {
      const prevRole = user.role;
      user.role          = 'moderator';
      user.moderatorNote = note;
      await user.save();
      console.log(green(`✅ @${user.username} (${user.name}) promoted from '${prevRole}' to 'moderator'`));
      console.log(`   Note: ${note}`);
    }
  }

  /* ── Revoke moderator ── */
  if (ACTION === 'revoke') {
    if (user.role !== 'moderator') {
      console.log(yellow(`⚠️  @${user.username} is not a moderator (current role: ${user.role})`));
    } else {
      const allowedRoles = ['student', 'teacher'];
      const newRole = allowedRoles.includes(revokeTo) ? revokeTo : 'student';
      user.role          = newRole;
      user.moderatorNote = '';
      await user.save();
      console.log(green(`✅ @${user.username} (${user.name}) demoted from 'moderator' to '${newRole}'`));
    }
  }

  await mongoose.disconnect();
  console.log(green('\n✅ Done'));
}

run().catch(err => {
  console.error(red('Script failed:'), err.message);
  process.exit(1);
});