const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Answer   = require('../models/Answer');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');

/* ─── karma helper ─── */
const applyKarma = async (authorId, delta) => {
  await User.findByIdAndUpdate(authorId, { $inc: { karma: delta } });
};

/* ─── vote helper (shared for questions + answers) ─── */
const handleVote = async (doc, userId, type, save) => {
  const alreadyUp   = doc.upvotes.some(id => id.toString() === userId.toString());
  const alreadyDown = doc.downvotes.some(id => id.toString() === userId.toString());

  if (type === 'up') {
    if (alreadyUp) {
      doc.upvotes.pull(userId);
      await applyKarma(doc.author, -5);
    } else {
      if (alreadyDown) { doc.downvotes.pull(userId); await applyKarma(doc.author, 2); }
      doc.upvotes.push(userId);
      await applyKarma(doc.author, 5);
    }
  } else {
    if (alreadyDown) {
      doc.downvotes.pull(userId);
      await applyKarma(doc.author, 2);
    } else {
      if (alreadyUp) { doc.upvotes.pull(userId); await applyKarma(doc.author, -5); }
      doc.downvotes.push(userId);
      await applyKarma(doc.author, -2);
    }
  }
  await save();
  return { upvotes: doc.upvotes.length, downvotes: doc.downvotes.length };
};

/* ══════════════ QUESTIONS ══════════════ */

// GET /api/qa/questions
router.get('/questions', async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('author', 'name username avatar karma')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/qa/questions
router.post('/questions', protect, async (req, res) => {
  try {
    const { title, body, tags } = req.body;
    const q = await Question.create({ title, body, tags: tags || [], author: req.user._id });
    await q.populate('author', 'name username avatar karma');
    res.status(201).json(q);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/qa/questions/:id  — returns question + full threaded answers tree
router.get('/questions/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'name username avatar karma');
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Fetch ALL answers for this question (flat)
    const allAnswers = await Answer.find({ question: question._id })
      .populate('author', 'name username avatar karma')
      .sort({ createdAt: 1 }); // oldest first so threading renders top-down

    // Build tree: top-level answers with nested replies
    const map = {};
    const roots = [];
    allAnswers.forEach(a => { map[a._id.toString()] = { ...a.toObject(), replies: [] }; });
    allAnswers.forEach(a => {
      if (a.parent) {
        const parentNode = map[a.parent.toString()];
        if (parentNode) parentNode.replies.push(map[a._id.toString()]);
      } else {
        roots.push(map[a._id.toString()]);
      }
    });

    res.json({ question, answers: roots });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/qa/questions/:id/vote
router.post('/questions/:id/vote', protect, async (req, res) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Not found' });
    const result = await handleVote(q, req.user._id, req.body.type, () => q.save());
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ══════════════ ANSWERS & REPLIES ══════════════ */

// POST /api/qa/questions/:id/answers  — top-level answer
router.post('/questions/:id/answers', protect, async (req, res) => {
  try {
    const answer = await Answer.create({
      question: req.params.id,
      body: req.body.body,
      author: req.user._id,
      parent: null,
      depth: 0
    });
    await Question.findByIdAndUpdate(req.params.id, { $inc: { answerCount: 1 } });
    await answer.populate('author', 'name username avatar karma');
    res.status(201).json({ ...answer.toObject(), replies: [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/qa/answers/:id/reply  — reply to an answer (nested thread)
router.post('/answers/:id/reply', protect, async (req, res) => {
  try {
    const parent = await Answer.findById(req.params.id);
    if (!parent) return res.status(404).json({ message: 'Parent answer not found' });

    const reply = await Answer.create({
      question: parent.question,
      body: req.body.body,
      author: req.user._id,
      parent: parent._id,
      depth: (parent.depth || 0) + 1
    });
    // Count replies toward answerCount too
    await Question.findByIdAndUpdate(parent.question, { $inc: { answerCount: 1 } });
    await reply.populate('author', 'name username avatar karma');
    res.status(201).json({ ...reply.toObject(), replies: [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/qa/answers/:id/vote
router.post('/answers/:id/vote', protect, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: 'Not found' });
    const result = await handleVote(answer, req.user._id, req.body.type, () => answer.save());
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/qa/answers/:id  — author or question-owner can delete
router.delete('/answers/:id', protect, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: 'Not found' });
    if (answer.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    // Also delete all nested replies
    await Answer.deleteMany({ $or: [{ _id: answer._id }, { parent: answer._id }] });
    await Question.findByIdAndUpdate(answer.question, { $inc: { answerCount: -1 } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;