const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promoController');
const { protect, authorize } = require('../middleware/auth');

// Protected user route
router.post('/validate', protect, promoController.validatePromoCode);

// Admin-only routes
router.get('/', protect, authorize('admin', 'super_admin'), promoController.getAllPromos);
router.post('/', protect, authorize('admin', 'super_admin'), promoController.createPromoCode);
router.get('/:id', protect, authorize('admin', 'super_admin'), promoController.getPromoById);
router.put('/:id', protect, authorize('admin', 'super_admin'), promoController.updatePromoCode);
router.delete('/:id', protect, authorize('admin', 'super_admin'), promoController.deletePromoCode);

module.exports = router;
