const express = require('express');
const router = express.Router();
const EduDetail = require('../models/EduDetail');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, async (req, res) => {
  console.log("======== SURVEY SUBMISSION STARTED ========");
  console.log("Headers:", req.headers);
  console.log("Authenticated user:", req.user);
  console.log("Incoming data:", req.body);

  try {
    const eduDetail = new EduDetail({
      userId: req.user._id,
      educationLevel: req.body.educationLevel,
      standard: req.body.standard,
      codingLevel: req.body.codingLevel,
      strongLanguages: req.body.strongLanguages
    });

    console.log("Document to be saved:", eduDetail);

    const savedDetail = await eduDetail.save();
    console.log("Successfully saved:", savedDetail);

    res.status(201).json({
      success: true,
      data: savedDetail
    });
    // Check for required fields
    if (!req.body.educationLevel || !req.body.standard || !req.body.codingLevel || !req.body.strongLanguages) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

  } catch (error) {
    console.error("SAVE ERROR:", error);

    // Enhanced error logging
    if (error.name === 'ValidationError') {
      console.error("Validation errors:", error.errors);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get education details for current user (protected)
router.get('/me', protect, async (req, res) => {
  try {
    const eduDetails = await EduDetail.findOne({ userId: req.user._id });
    res.json(eduDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;