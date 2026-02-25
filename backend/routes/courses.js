const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Comment = require('../models/Comment');
const Purchase = require('../models/Purchase');
const { protect, teacherOnly } = require('../middleware/auth');

// GET /api/courses — all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().populate('teacher', 'name username avatar').sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courses/:id
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('teacher', 'name username avatar bio');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/courses — teacher creates course
router.post('/', protect, teacherOnly, async (req, res) => {
  try {
    const { title, description, thumbnail, price, videos, category } = req.body;
    const course = await Course.create({
      title, description, thumbnail, price: price || 0, videos: videos || [], category, teacher: req.user._id
    });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/courses/:id — teacher updates course info
router.put('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/courses/:id — teacher deletes entire course
router.delete('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    await Course.findByIdAndDelete(req.params.id);
    // Also remove associated comments
    await Comment.deleteMany({ course: req.params.id });
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/courses/:id/videos — teacher adds a video
router.post('/:id/videos', protect, teacherOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    const { title, url, duration } = req.body;
    course.videos.push({ title, url, duration });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/courses/:id/videos/:videoId — teacher updates a single video
router.put('/:id/videos/:videoId', protect, teacherOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    const video = course.videos.id(req.params.videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    const { title, url, duration } = req.body;
    if (title !== undefined) video.title = title;
    if (url !== undefined) video.url = url;
    if (duration !== undefined) video.duration = duration;
    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/courses/:id/videos/:videoId — teacher deletes a single video
router.delete('/:id/videos/:videoId', protect, teacherOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    course.videos = course.videos.filter(v => v._id.toString() !== req.params.videoId);
    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/courses/:id/videos/reorder — teacher reorders videos
router.put('/:id/videos/reorder', protect, teacherOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    // req.body.order is array of video ids in new order
    const { order } = req.body;
    const reordered = order.map(vid => course.videos.id(vid)).filter(Boolean);
    course.videos = reordered;
    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
    const existingRating = course.ratings.find(r => r.user.toString() === req.user._id.toString());
    if (existingRating) {
      existingRating.rating = rating;
    } else {
      course.ratings.push({ user: req.user._id, rating });
    }
    course.averageRating = course.calculateAverageRating();
    await course.save();
    res.json({ averageRating: course.averageRating, totalRatings: course.ratings.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courses/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ course: req.params.id }).populate('author', 'name username avatar').sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/courses/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const comment = await Comment.create({ course: req.params.id, author: req.user._id, body: req.body.body });
    await comment.populate('author', 'name username avatar');
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courses/teacher/my
router.get('/teacher/my', protect, teacherOnly, async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;