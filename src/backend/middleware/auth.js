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
      department: decoded.department,
      organizationId: decoded.organizationId,
      isSuperAdmin: decoded.isSuperAdmin
    });
    
    const user = await User.getUserById(decoded.userId, decoded.userType);
    console.log('🔍 Auth Debug - User from DB:', { 
      id: user?.id, 
      username: user?.username,
      department: user?.department,
      organizationId: user?.organizationId,
      isSuperAdmin: user?.isSuperAdmin
    });
    
    // Merge token data with user data for complete user object
    req.user = {
      ...user,
      userId: decoded.userId,
      userType: decoded.userType || user.userType,
      permissions: decoded.permissions || user.permissions,
      department: decoded.department || user.department,
      organizationId: decoded.organizationId || user.organizationId,
      isSuperAdmin: decoded.isSuperAdmin || user.isSuperAdmin || false
    };
    
    console.log('🔍 Auth Debug - Final req.user:', { 
      id: req.user.id, 
      username: req.user.username,
      department: req.user.department,
      organizationId: req.user.organizationId,
      isSuperAdmin: req.user.isSuperAdmin
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

// Middleware to enforce organization-based data access
const enforceOrganizationAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super admin can access all data
  if (req.user.isSuperAdmin || req.user.email === 'superadmin@aero.com') {
    console.log('🔓 Super admin access granted - can see all data');
    req.organizationFilter = null; // No filter for super admin
    return next();
  }

  // Regular users can only access their organization's data
  if (!req.user.organizationId) {
    return res.status(403).json({ error: 'User not associated with any organization' });
  }

  console.log(`🔒 Organization access enforced - user can only see org ${req.user.organizationId} data`);
  req.organizationFilter = req.user.organizationId;
  next();
};

// Helper function to add organization filter to queries
const addOrganizationFilter = (req, baseQuery, params = []) => {
  if (req.organizationFilter === null) {
    // Super admin - no filter needed
    return { query: baseQuery, params };
  }

  // Add organization filter
  const hasWhere = baseQuery.toLowerCase().includes('where');
  const filterClause = hasWhere ? ' AND organization_id = ?' : ' WHERE organization_id = ?';
  
  return {
    query: baseQuery + filterClause,
    params: [...params, req.organizationFilter]
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  enforceOrganizationAccess,
  addOrganizationFilter
};