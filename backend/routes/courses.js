const express = require('express');
const router  = express.Router();
const Course  = require('../models/Course');
const Comment = require('../models/Comment');
const Purchase = require('../models/Purchase');
const { protect, teacherOnly } = require('../middleware/auth');

/* helper: is requester the course owner OR a moderator? */
const canManageCourse = (course, user) =>
  course.teacher.toString() === user._id.toString() || user.role === 'moderator';

/* helper: is requester the comment author OR a moderator? */
const canManageComment = (comment, user) =>
  comment.author.toString() === user._id.toString() || user.role === 'moderator';

// GET /api/courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().populate('teacher', 'name username avatar').sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/courses/:id
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('teacher', 'name username avatar bio');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/courses — teacher creates course
router.post('/', protect, teacherOnly, async (req, res) => {
  try {
    const { title, description, thumbnail, price, videos, category } = req.body;
    const course = await Course.create({
      title, description, thumbnail, price: price || 0,
      videos: videos || [], category, teacher: req.user._id
    });
    res.status(201).json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/courses/:id — teacher (owner) updates course
router.put('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    // Only the owner teacher can edit course info (not moderator — mod can only delete)
    if (course.teacher.toString() !== req.user._id.toString() && req.user.role !== 'moderator')
      return res.status(403).json({ message: 'Not authorized' });
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/courses/:id — owner teacher OR moderator
router.delete('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (!canManageCourse(course, req.user))
      return res.status(403).json({ message: 'Not authorized' });
    await Course.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ course: req.params.id });
    res.json({ message: 'Course deleted', deletedBy: req.user.role });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/courses/:id/videos — teacher adds video
router.post('/:id/videos', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    const { title, url, duration } = req.body;
    course.videos.push({ title, url, duration });
    await course.save();
    res.status(201).json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/courses/:id/videos/:videoId — teacher updates video
router.put('/:id/videos/:videoId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    const video = course.videos.id(req.params.videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    const { title, url, duration } = req.body;
    if (title !== undefined)    video.title    = title;
    if (url !== undefined)      video.url      = url;
    if (duration !== undefined) video.duration = duration;
    await course.save();
    res.json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/courses/:id/videos/:videoId — owner or moderator
router.delete('/:id/videos/:videoId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (!canManageCourse(course, req.user))
      return res.status(403).json({ message: 'Not authorized' });
    course.videos = course.videos.filter(v => v._id.toString() !== req.params.videoId);
    await course.save();
    res.json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/courses/:id/rate
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.price > 0) {
      const purchase = await Purchase.findOne({ student: req.user._id, course: course._id, status: 'completed' });
      if (!purchase) return res.status(403).json({ message: 'Purchase required to rate' });
    }
    const existing = course.ratings.find(r => r.user.toString() === req.user._id.toString());
    if (existing) existing.rating = rating;
    else course.ratings.push({ user: req.user._id, rating });
    course.averageRating = course.calculateAverageRating();
    await course.save();
    res.json({ averageRating: course.averageRating, totalRatings: course.ratings.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/courses/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ course: req.params.id })
      .populate('author', 'name username avatar role')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/courses/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const comment = await Comment.create({ course: req.params.id, author: req.user._id, body: req.body.body });
    await comment.populate('author', 'name username avatar role');
    res.status(201).json(comment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/courses/:courseId/comments/:commentId — author OR moderator
router.delete('/:courseId/comments/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (!canManageComment(comment, req.user))
      return res.status(403).json({ message: 'You can only delete your own comments' });
    await Comment.findByIdAndDelete(req.params.commentId);
    res.json({ message: 'Comment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/courses/teacher/my
router.get('/teacher/my', protect, async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;