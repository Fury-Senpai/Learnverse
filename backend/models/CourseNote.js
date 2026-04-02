const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacher:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  title:      { type: String, required: true },
  type:       { type: String, enum: ['note', 'assignment', 'resource'], default: 'note' },
  // Google Drive share link or any URL
  driveUrl:   { type: String, required: true },
  // Optional description
  description:{ type: String, default: '' },
  // Due date for assignments
  dueDate:    { type: Date,   default: null },
  createdAt:  { type: Date,   default: Date.now },
});

module.exports = mongoose.model('CourseNote', noteSchema);