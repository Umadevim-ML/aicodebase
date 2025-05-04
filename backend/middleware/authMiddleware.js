const jwt = require('jsonwebtoken');
const User = require('../models/User');



const protect = async (req, res, next) => {
  // 1. Get token from header

  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. Check if token exists

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized - no token provided'
    });
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Changed from decoded.id to decoded.userId to match your token
    req.user = await User.findById(decoded.userId).select('-password');    
   

    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({
      success: false,
      error: 'Not authorized - invalid token',
      message: err.message
    });
  }
};

module.exports = { protect };