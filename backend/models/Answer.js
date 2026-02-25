const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question:  { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  parent:    { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', default: null }, // null = top-level answer, set = reply
  body:      { type: String, required: true },
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  upvotes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  depth:     { type: Number, default: 0 }, // 0 = answer, 1+ = nested reply
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Answer', answerSchema);