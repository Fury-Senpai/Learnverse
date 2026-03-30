const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  username:     { type: String, required: true, unique: true, lowercase: true },
  email:        { type: String, required: true },
  password:     { type: String, required: true },
  // 'moderator' can only be assigned directly in DB — never via signup/login route
  role:         { type: String, enum: ['student', 'teacher', 'moderator'], default: 'student' },
  karma:        { type: Number, default: 0 },
  bio:          { type: String, default: '' },
  avatar:       { type: String, default: '' },
  sessionPrice: { type: Number, default: 0 },
  earnings:     { type: Number, default: 0 },
  // moderator: optional note about why this user was promoted
  moderatorNote:{ type: String, default: '' },
  createdAt:    { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (pwd) {
  return bcrypt.compare(pwd, this.password);
};

module.exports = mongoose.model('User', userSchema);