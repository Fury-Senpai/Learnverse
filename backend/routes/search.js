const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');

// GET /api/search?q=query
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ courses: [], users: [] });

    const regex = new RegExp(q, 'i');
    const [courses, users] = await Promise.all([
      Course.find({ title: regex }).populate('teacher', 'name username').limit(10),
      User.find({ username: regex }).select('name username role karma avatar').limit(10)
    ]);

    res.json({ courses, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;