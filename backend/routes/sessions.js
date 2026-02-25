const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { protect, teacherOnly } = require('../middleware/auth');

// GET /api/sessions/my — student's sessions
router.get('/my', protect, async (req, res) => {
  try {
    const query = req.user.role === 'teacher'
      ? { teacher: req.user._id }
      : { student: req.user._id };
    const sessions = await Session.find(query)
      .populate('teacher', 'name username avatar')
      .populate('student', 'name username avatar')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/sessions/:id/meet-link — teacher adds meet link
router.put('/:id/meet-link', protect, teacherOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    session.meetLink = req.body.meetLink;
    session.status = 'confirmed';
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/sessions/:id/end — teacher ends/completes a session
router.put('/:id/end', protect, teacherOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session is already completed' });
    }
    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;