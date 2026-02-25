const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: String,
  url: String,
  duration: String
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  thumbnail: { type: String, default: '' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, default: 0 },
  videos: [videoSchema],
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 }
  }],
  averageRating: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  category: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now }
});

courseSchema.methods.calculateAverageRating = function () {
  if (this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
  return (sum / this.ratings.length).toFixed(1);
};

module.exports = mongoose.model('Course', courseSchema);