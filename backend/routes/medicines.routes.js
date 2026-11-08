/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Medicines Routes (backend/routes/medicines.routes.js)
 * 
 * All routes are protected by JWT authentication
 */

const express = require('express');
const router = express.Router();
const medicinesController = require('../controllers/medicines.controller');
const { authenticateToken } = require('../middleware/auth');

// All medicine endpoints require valid user authentication
router.use(authenticateToken);

// Medicine CRUD operations
router.get('/', medicinesController.getAllMedicines);
router.get('/:id', medicinesController.getMedicineById);
router.post('/', medicinesController.createMedicine);
router.put('/:id', medicinesController.updateMedicine);
router.patch('/:id/adjust-qty', medicinesController.adjustQuantity);
router.delete('/:id', medicinesController.deleteMedicine);

// Seed sample data for testing
router.post('/seed-demo', medicinesController.seedDemoData);

module.exports = router;
