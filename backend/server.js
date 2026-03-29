const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// 1. Raw body for Stripe webhook 
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// 2. JSON parser for everything else
app.use(express.json({ limit: '10mb' }));

// 3. CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// ROUTES
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/courses',  require('./routes/courses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/qa',       require('./routes/qa'));
app.use('/api/chatbot',  require('./routes/chatbot'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/search',   require('./routes/search'));

app.get('/', (req, res) => res.json({ message: 'LearnHub API running ✅' }));

/* ─────────────────────────────────────────────────────────────
   GLOBAL ERROR HANDLER
───────────────────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

/* ─────────────────────────────────────────────────────────────
   DATABASE + START
───────────────────────────────────────────────────────────── */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });