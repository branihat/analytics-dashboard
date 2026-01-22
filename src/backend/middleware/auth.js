const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('🔍 Auth Debug - Decoded token:', { 
      userId: decoded.userId, 
      username: decoded.username,
      userType: decoded.userType,
      department: decoded.department 
    });
    
    const user = await User.getUserById(decoded.userId, decoded.userType);
    console.log('🔍 Auth Debug - User from DB:', { 
      id: user?.id, 
      username: user?.username,
      department: user?.department 
    });
    
    // Merge token data with user data for complete user object
    req.user = {
      ...user,
      userId: decoded.userId,
      userType: decoded.userType || user.userType,
      permissions: decoded.permissions || user.permissions,
      department: decoded.department || user.department
    };
    
    console.log('🔍 Auth Debug - Final req.user:', { 
      id: req.user.id, 
      username: req.user.username,
      department: req.user.department 
    });
    
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};