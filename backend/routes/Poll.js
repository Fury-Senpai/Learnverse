const express    = require('express');
const router     = express.Router();
const Poll       = require('../models/Poll');
const Course     = require('../models/Course');
const CourseNote = require('../models/CourseNote');
const { protect } = require('../middleware/auth');

/* ── owner check helper ── */
const isCourseOwner = async (courseId, userId) => {
  const c = await Course.findById(courseId);
  return c && c.teacher.toString() === userId.toString();
};

/* ═══════════════════════
   POLLS
═══════════════════════ */

// GET /api/polls/:courseId  — all polls for a course
router.get('/:courseId', protect, async (req, res) => {
  try {
    const polls = await Poll.find({ course: req.params.courseId }).sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/polls/:courseId  — teacher creates a poll
router.post('/:courseId', protect, async (req, res) => {
  try {
    const owner = await isCourseOwner(req.params.courseId, req.user._id);
    if (!owner && req.user.role !== 'moderator')
      return res.status(403).json({ message: 'Only the course teacher can create polls' });

    const { question, options } = req.body;
    if (!question?.trim())          return res.status(400).json({ message: 'Question is required' });
    if (!options || options.length < 2) return res.status(400).json({ message: 'At least 2 options required' });
    if (!options.some(o => o.isCorrect))return res.status(400).json({ message: 'Mark at least one correct answer' });

    const poll = await Poll.create({
      course:   req.params.courseId,
      teacher:  req.user._id,
      question: question.trim(),
      options:  options.map(o => ({ text: o.text.trim(), isCorrect: !!o.isCorrect, votes: [] })),
    });
    res.status(201).json(poll);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/polls/:pollId/vote  — student submits answer
router.put('/:pollId/vote', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll)         return res.status(404).json({ message: 'Poll not found' });
    if (poll.closed)   return res.status(400).json({ message: 'This poll is closed' });

    const { optionId } = req.body;
    const userId = req.user._id;

    // Remove any previous vote by this user across all options (one vote per poll)
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== userId.toString());
    });

    // Cast the new vote
    const chosen = poll.options.id(optionId);
    if (!chosen) return res.status(404).json({ message: 'Option not found' });
    chosen.votes.push(userId);

    await poll.save();
    res.json(poll);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/polls/:pollId/reveal  — teacher reveals correct answer
router.put('/:pollId/reveal', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.teacher.toString() !== req.user._id.toString() && req.user.role !== 'moderator')
      return res.status(403).json({ message: 'Not authorized' });

    poll.revealed = true;
    await poll.save();
    res.json(poll);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/polls/:pollId/close  — teacher closes voting
router.put('/:pollId/close', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.teacher.toString() !== req.user._id.toString() && req.user.role !== 'moderator')
      return res.status(403).json({ message: 'Not authorized' });

    poll.closed   = true;
    poll.revealed = true; // auto-reveal when closed
    await poll.save();
    res.json(poll);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/polls/:pollId  — teacher deletes poll
router.delete('/:pollId', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.teacher.toString() !== req.user._id.toString() && req.user.role !== 'moderator')
      return res.status(403).json({ message: 'Not authorized' });

    await Poll.findByIdAndDelete(req.params.pollId);
    res.json({ message: 'Poll deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ═══════════════════════
   COURSE NOTES / ASSIGNMENTS
═══════════════════════ */

// GET /api/polls/:courseId/notes  — get all notes for a course
router.get('/:courseId/notes', protect, async (req, res) => {
  try {
    const notes = await CourseNote.find({ course: req.params.courseId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/polls/:courseId/notes  — teacher adds a note/assignment
router.post('/:courseId/notes', protect, async (req, res) => {
  try {
    const owner = await isCourseOwner(req.params.courseId, req.user._id);
    if (!owner && req.user.role !== 'moderator')
      return res.status(403).json({ message: 'Only the course teacher can add notes' });

    const { title, type, driveUrl, description, dueDate } = req.body;
    if (!title?.trim())    return res.status(400).json({ message: 'Title is required' });
    if (!driveUrl?.trim()) return res.status(400).json({ message: 'Drive URL is required' });

    const note = await CourseNote.create({
      course: req.params.courseId,
      teacher: req.user._id,
      title: title.trim(),
      type: type || 'note',
      driveUrl: driveUrl.trim(),
      description: description?.trim() || '',
      dueDate: dueDate ? new Date(dueDate) : null,
    });
    res.status(201).json(note);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/polls/:courseId/notes/:noteId
router.delete('/:courseId/notes/:noteId', protect, async (req, res) => {
  try {
    const note = await CourseNote.findById(req.params.noteId);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.teacher.toString() !== req.user._id.toString() && req.user.role !== 'moderator')
      return res.status(403).json({ message: 'Not authorized' });

    await CourseNote.findByIdAndDelete(req.params.noteId);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;