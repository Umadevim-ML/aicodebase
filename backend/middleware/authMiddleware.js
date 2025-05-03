const jwt = require('jsonwebtoken');
const User = require('../models/User');

<<<<<<< HEAD
// middleware/authMiddleware.js
const protect = async (req, res, next) => {
=======
const protect = async (req, res, next) => {
  // 1. Get token from header
>>>>>>> fc901a2f73a2dc9a889da4e38fea05c263495d30
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

<<<<<<< HEAD
=======
  // 2. Check if token exists
>>>>>>> fc901a2f73a2dc9a889da4e38fea05c263495d30
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized - no token provided'
    });
  }

  try {
<<<<<<< HEAD
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Changed from decoded.id to decoded.userId to match your token
    req.user = await User.findById(decoded.userId).select('-password');
=======
    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Get user from token
    req.user = await User.findById(decoded.id).select('-password');
>>>>>>> fc901a2f73a2dc9a889da4e38fea05c263495d30
    
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