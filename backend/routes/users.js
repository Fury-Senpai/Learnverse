const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Course   = require('../models/Course');
const Purchase = require('../models/Purchase');
const Session  = require('../models/Session');
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
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─────────────────────────────────────────
   GET /api/users/me/dashboard
   Owner-only — returns full profile data:
   - For students: purchased courses + booked sessions
   - For teachers: own courses, sessions, revenue breakdown
─────────────────────────────────────────── */
router.get('/me/dashboard', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const role   = req.user.role;

    if (role === 'student') {
      const [purchases, sessions] = await Promise.all([
        Purchase.find({ student: userId, status: 'completed', type: 'course' })
          .populate('course', 'title thumbnail price averageRating totalStudents teacher category')
          .populate({ path: 'course', populate: { path: 'teacher', select: 'name username' } })
          .sort({ createdAt: -1 }),
        Session.find({ student: userId })
          .populate('teacher', 'name username avatar')
          .sort({ createdAt: -1 }),
      ]);
      return res.json({ role: 'student', purchases, sessions });
    }

    if (role === 'teacher') {
      const [courses, sessions] = await Promise.all([
        Course.find({ teacher: userId }).sort({ createdAt: -1 }),
        Session.find({ teacher: userId })
          .populate('student', 'name username avatar')
          .sort({ createdAt: -1 }),
      ]);

      // Revenue breakdown
      const completedPurchases = await Purchase.find({
        status: 'completed', type: 'course',
        course: { $in: courses.map(c => c._id) },
      });
      const totalRevenue   = completedPurchases.reduce((s, p) => s + (p.teacherEarning || 0), 0);
      const monthlyRevenue = completedPurchases
        .filter(p => new Date(p.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((s, p) => s + (p.teacherEarning || 0), 0);

      const sessionRevenue = await Purchase.aggregate([
        { $match: { status: 'completed', type: 'session' } },
        { $lookup: { from: 'sessions', localField: 'session', foreignField: '_id', as: 'sess' } },
        { $unwind: '$sess' },
        { $match: { 'sess.teacher': userId } },
        { $group: { _id: null, total: { $sum: '$teacherEarning' } } },
      ]);
      const totalSessionRevenue = sessionRevenue[0]?.total || 0;

      return res.json({
        role: 'teacher',
        courses,
        sessions,
        revenue: {
          total:          totalRevenue + totalSessionRevenue,
          fromCourses:    totalRevenue,
          fromSessions:   totalSessionRevenue,
          thisMonth:      monthlyRevenue,
          totalStudents:  courses.reduce((s, c) => s + (c.totalStudents || 0), 0),
          totalCourses:   courses.length,
          totalSessions:  sessions.length,
        },
      });
    }

    res.json({ role });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Moderator: suspend / note ─── */
router.put('/:id/moderate', protect, moderatorOnly, async (req, res) => {
  try {
    const { action, moderatorNote } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'moderator')
      return res.status(403).json({ message: 'Cannot moderate another moderator' });
    if (moderatorNote !== undefined) target.moderatorNote = moderatorNote;
    await target.save();
    res.json({ message: `User moderated (${action})`, user: target });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Moderator: delete user ─── */
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

// PUT /api/users/profile (own profile)
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