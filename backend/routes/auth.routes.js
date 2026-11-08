/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Authentication Routes (backend/routes/auth.routes.js)
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');

// Public authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);

// Protected route
router.get('/me', authenticateToken, authController.getProfile);

module.exports = router;
