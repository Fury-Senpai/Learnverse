const express = require('express');
const router  = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { protect, moderatorOnly } = require('../middleware/auth');

/* ─────────────────────────────────────────
   GET  /api/community/messages
   Returns last 100 messages (newest last)
───────────────────────────────────────── */
router.get('/messages', protect, async (req, res) => {
  try {
    const room = req.query.room || 'general';
    const messages = await ChatMessage.find({ room, isDeleted: false })
      .populate('author', 'name username avatar role')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/community/messages
   Any logged-in user can post
───────────────────────────────────────── */
router.post('/messages', protect, async (req, res) => {
  try {
    const { body, room = 'general' } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
    if (body.length > 1000) return res.status(400).json({ message: 'Message too long (max 1000 chars)' });

    const msg = await ChatMessage.create({ author: req.user._id, body: body.trim(), room });
    await msg.populate('author', 'name username avatar role');
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   DELETE /api/community/messages/:id
   Rules:
     - Author can delete their OWN message
     - Moderator can delete ANY message
     - Nobody else can delete
───────────────────────────────────────── */
router.delete('/messages/:id', protect, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg || msg.isDeleted) return res.status(404).json({ message: 'Message not found' });

    const isAuthor    = msg.author.toString() === req.user._id.toString();
    const isModerator = req.user.role === 'moderator';

    if (!isAuthor && !isModerator)
      return res.status(403).json({ message: 'You can only delete your own messages' });

    // Soft delete — keeps audit trail
    msg.isDeleted = true;
    msg.deletedBy = req.user._id;
    msg.deletedAt = new Date();
    await msg.save();

    res.json({ message: 'Message deleted', deletedBy: req.user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/community/messages/deleted
   Moderator only — view deleted messages for audit
───────────────────────────────────────── */
router.get('/messages/deleted', protect, moderatorOnly, async (req, res) => {
  try {
    const msgs = await ChatMessage.find({ isDeleted: true })
      .populate('author', 'name username role')
      .populate('deletedBy', 'name username role')
      .sort({ deletedAt: -1 })
      .limit(200);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;