const mongoose = require('mongoose');

const eduDetailSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true // Ensure one education record per user
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
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index on username for faster queries
eduDetailSchema.index({ username: 1 });

module.exports = mongoose.model('EduDetail', eduDetailSchema);