const mongoose = require('mongoose');

const eduDetailSchema = new mongoose.Schema({
  username: {
    type: String,
    ref: 'User',
    required: true
  },
  educationLevel: {
    type: String,
    enum: ['school', 'college', 'university', 'other'],
    required: true
  },
  standard: {
    type: String,
    required: true
  },
  codingLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'professional'],
    required: true
  },
  strongLanguages: {
    type: [String],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EduDetail', eduDetailSchema);