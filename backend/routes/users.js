const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Course  = require('../models/Course');
const { protect, moderatorOnly } = require('../middleware/auth');

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'moderator' } })
      .sort({ karma: -1 }).limit(10)
      .select('name username karma role avatar');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Moderator: list all users ─── */
router.get('/all', protect, moderatorOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Moderator: suspend / unsuspend / change notes ─── */
router.put('/:id/moderate', protect, moderatorOnly, async (req, res) => {
  try {
    const { action, moderatorNote } = req.body;
    // action: 'warn' | 'note'  — expand as needed
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'moderator')
      return res.status(403).json({ message: 'Cannot moderate another moderator' });

    if (moderatorNote !== undefined) target.moderatorNote = moderatorNote;
    await target.save();
    res.json({ message: `User moderated (${action})`, user: target });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Moderator: delete any user ─── */
router.delete('/:id', protect, moderatorOnly, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'moderator')
      return res.status(403).json({ message: 'Cannot delete another moderator' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `User @${target.username} deleted` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/:username  (public profile)
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password -email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/profile  (own profile)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, avatar, sessionPrice } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, avatar, sessionPrice },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;