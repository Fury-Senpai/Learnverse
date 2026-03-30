const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body:      { type: String, required: true, maxlength: 1000 },
  room:      { type: String, default: 'general' }, // for future multi-room support
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // who deleted it (mod/author)
  deletedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);