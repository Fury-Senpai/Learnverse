const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find().sort({ karma: -1 }).limit(10).select('name username karma role avatar');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:username
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password -email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, avatar, sessionPrice } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, avatar, sessionPrice },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;