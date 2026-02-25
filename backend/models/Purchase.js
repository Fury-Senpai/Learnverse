const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  type: { type: String, enum: ['course', 'session'], required: true },
  amount: { type: Number, required: true },
  teacherEarning: Number,
  platformEarning: Number,
  stripeSessionId: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', purchaseSchema);