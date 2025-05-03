const mongoose = require('mongoose');

const eduDetailSchema = new mongoose.Schema({
  username: {
    type: String,
<<<<<<< HEAD
    ref: 'User',
    required: true
=======
    required: true,
    unique: true // Ensure one education record per user
>>>>>>> fc901a2f73a2dc9a889da4e38fea05c263495d30
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
<<<<<<< HEAD
    required: true
=======
    default: []
>>>>>>> fc901a2f73a2dc9a889da4e38fea05c263495d30
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

<<<<<<< HEAD
=======
// Add index on username for faster queries
eduDetailSchema.index({ username: 1 });

>>>>>>> fc901a2f73a2dc9a889da4e38fea05c263495d30
module.exports = mongoose.model('EduDetail', eduDetailSchema);