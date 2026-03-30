const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    // ✅ Moderator role can NEVER be set via signup
    const allowedRoles = ['student', 'teacher'];
    const safeRole = allowedRoles.includes(role) ? role : 'student';

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Username already taken' });

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name, username: username.toLowerCase(),
      email: email.toLowerCase(), password, role: safeRole
    });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, karma: user.karma }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        _id: user._id, name: user.name, username: user.username,
        email: user.email, role: user.role, karma: user.karma,
        sessionPrice: user.sessionPrice
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;