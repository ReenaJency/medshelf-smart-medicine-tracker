/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Authentication Controller (backend/controllers/auth.controller.js)
 */

const db = require('../config/db');
const { hashPassword, verifyPassword, generateToken } = require('../middleware/auth');

/**
 * Register a New User
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    // 1. Validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full name (minimum 2 characters).'
      });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please re-enter.'
      });
    }

    // 2. Check for duplicate email
    const existingUsers = await db.query(
      'SELECT user_id FROM users WHERE LOWER(email) = ?',
      [normalizedEmail]
    );

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // 3. Hash password & insert into database
    const passwordHash = hashPassword(password);
    const result = await db.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    const newUserId = result.insertId;

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully! You can now log in.',
      userId: newUserId
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.'
    });
  }
}

/**
 * Log In an Existing User
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email address and password.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query user by email
    const users = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = ?',
      [normalizedEmail]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    const user = users[0];

    // Verify password hash
    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful! Redirecting to Dashboard...',
      token: token,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('[Login Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again later.'
    });
  }
}

/**
 * Get Current Logged-In User Profile
 * GET /api/auth/me
 */
async function getProfile(req, res) {
  try {
    const users = await db.query(
      'SELECT user_id, full_name, email, created_at FROM users WHERE user_id = ?',
      [req.user.userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (err) {
    console.error('[Get Profile Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile.'
    });
  }
}

/**
 * Reset Forgotten Password
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const users = await db.query(
      'SELECT user_id FROM users WHERE LOWER(email) = ?',
      [normalizedEmail]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this email address.'
      });
    }

    const newHash = hashPassword(newPassword);
    await db.query(
      'UPDATE users SET password_hash = ? WHERE LOWER(email) = ?',
      [newHash, normalizedEmail]
    );

    return res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset! Please log in with your new password.'
    });
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset.'
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  resetPassword
};
