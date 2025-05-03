const express = require('express');
const router = express.Router();
const EduDetail = require('../models/EduDetail');
const { protect } = require('../middleware/authMiddleware');

// POST survey data
router.post('/', protect, async (req, res) => {
  try {
    // Validate required fields
    const { educationLevel, standard, codingLevel } = req.body;
    if (!educationLevel || !standard || !codingLevel) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields (educationLevel, standard, codingLevel)"
      });
    }

    // Check if user already has education details
    const existingDetails = await EduDetail.findOne({ username: req.user.username });
    if (existingDetails) {
      return res.status(400).json({
        success: false,
        error: "Education details already exist for this user"
      });
    }

    // Create new survey with username
    const eduDetail = new EduDetail({
      username: req.user.username,
      educationLevel,
      standard,
      codingLevel,
      strongLanguages: req.body.strongLanguages || []
    });

    const savedDetail = await eduDetail.save();
    
    res.status(201).json({
      success: true,
      data: savedDetail
    });

  } catch (error) {
    console.error("Error saving survey:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET current user's survey data
router.get('/', protect, async (req, res) => {
  try {
    const eduDetails = await EduDetail.findOne({ username: req.user.username });
    
    if (!eduDetails) {
      return res.status(404).json({ 
        success: false,
        message: 'Education details not found' 
      });
    }

    res.json({
      success: true,
      data: eduDetails
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;