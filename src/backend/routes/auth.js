const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateSignup = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Signup route
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password } = req.body;
    const user = await User.createUser({ username, email, password });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login route
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, role } = req.body;
    const result = await User.authenticateUser(email, password, role);

    res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email } = req.body;
    const updatedUser = await User.updateUser(req.user.id, { username, email });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Logout route (optional - mainly for client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Get all users (admin only) - for Profile page
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const users = await User.findAll();
    
    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update own name (admin only) - for Profile page
router.patch('/update-name', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // Validate username
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username cannot be empty' });
    }

    // Check if username already exists
    const existingUser = await User.findByUsername(username.trim());
    if (existingUser && existingUser.id !== req.user.userId) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Update username
    await User.updateUsername(req.user.userId, username.trim());

    res.json({
      success: true,
      message: 'Username updated successfully'
    });
  } catch (error) {
    console.error('Update name error:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// Update any user's name (admin only) - for Profile page
router.patch('/update-user-name/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // Validate username
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username cannot be empty' });
    }

    // Check if username already exists
    const existingUser = await User.findByUsername(username.trim());
    if (existingUser && existingUser.id !== parseInt(id)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Update username
    await User.updateUsername(id, username.trim());

    res.json({
      success: true,
      message: 'Username updated successfully'
    });
  } catch (error) {
    console.error('Update user name error:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

module.exports = router;