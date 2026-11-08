/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Dashboard Routes (backend/routes/dashboard.routes.js)
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth');

// Protected dashboard stats
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);

module.exports = router;
