#!/usr/bin/env node

// Debug script to check user authentication data
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Test the JWT token and user data
function debugUserAuth() {
  console.log('🔍 User Authentication Debug');
  console.log('');
  
  // Test JWT secret
  console.log('JWT_SECRET configured:', !!process.env.JWT_SECRET);
  
  // Create a test token for super admin
  const testUser = {
    userId: 999,
    email: 'superadmin@aero.com',
    username: 'SuperAdmin',
    role: 'admin',
    userType: 'admin',
    permissions: 'all',
    department: null
  };
  
  const token = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '24h' });
  console.log('Test token created for super admin');
  
  // Decode the token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('');
  console.log('Decoded token data:');
  console.log('  Email:', decoded.email);
  console.log('  Username:', decoded.username);
  console.log('  Role:', decoded.role);
  console.log('  UserType:', decoded.userType);
  
  // Check super admin conditions
  console.log('');
  console.log('Super admin checks:');
  console.log('  Email match (superadmin@aero.com):', decoded.email === 'superadmin@aero.com');
  console.log('  Username match (SuperAdmin):', decoded.username === 'SuperAdmin');
  console.log('  Is admin role:', decoded.role === 'admin');
  console.log('  Is admin userType:', decoded.userType === 'admin');
  
  const isSuperAdmin = decoded.email === 'superadmin@aero.com' || decoded.username === 'SuperAdmin';
  console.log('  Final isSuperAdmin result:', isSuperAdmin);
  
  console.log('');
  console.log('🎯 If you can login but don\'t see Organizations menu:');
  console.log('1. Make sure frontend is rebuilt: npm run build');
  console.log('2. Check browser console for errors');
  console.log('3. Try hard refresh (Ctrl+F5)');
  console.log('4. Check if user data matches above conditions');
}

debugUserAuth();