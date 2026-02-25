const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, required: true },
  meetLink: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'completed'], default: 'pending' },
  scheduledAt: Date,
  stripeSessionId: String,
  paid: { type: Boolean, default: false },
  endedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);