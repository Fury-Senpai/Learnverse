const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
  votes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const pollSchema = new mongoose.Schema({
  course:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacher:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  question:  { type: String, required: true },
  options:   [optionSchema],
  // When true, teacher has revealed the correct answer to students
  revealed:  { type: Boolean, default: false },
  // When true, students can no longer vote
  closed:    { type: Boolean, default: false },
  createdAt: { type: Date,    default: Date.now },
});

module.exports = mongoose.model('Poll', pollSchema);