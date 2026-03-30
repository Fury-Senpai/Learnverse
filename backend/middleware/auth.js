const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/* ── Verify JWT ── */
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User no longer exists' });
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

/* ── Role gates ── */
const teacherOnly = (req, res, next) => {
  if (req.user.role !== 'teacher')
    return res.status(403).json({ message: 'Teachers only' });
  next();
};

// Moderator only (strict)
const moderatorOnly = (req, res, next) => {
  if (req.user.role !== 'moderator')
    return res.status(403).json({ message: 'Moderators only' });
  next();
};

// Teacher OR moderator (e.g. creating courses)
const teacherOrMod = (req, res, next) => {
  if (!['teacher', 'moderator'].includes(req.user.role))
    return res.status(403).json({ message: 'Teachers or moderators only' });
  next();
};

// Any authenticated user with elevated rights (mod or teacher)
const elevated = (req, res, next) => {
  if (!['teacher', 'moderator'].includes(req.user.role))
    return res.status(403).json({ message: 'Elevated role required' });
  next();
};

module.exports = { protect, teacherOnly, moderatorOnly, teacherOrMod, elevated };