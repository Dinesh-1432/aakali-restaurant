const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/auth');

// All delivery routes require rider or admin authentication
router.use(protect, authorize('admin', 'super_admin', 'rider'));

router.get('/orders', deliveryController.getDeliveryOrders);
router.get('/orders/:id', deliveryController.getDeliveryOrderById);
router.patch('/orders/:id/status', deliveryController.updateDeliveryStatus);
router.post('/orders/:id/verify-otp', deliveryController.verifyDeliveryOtp);
router.get('/stats', deliveryController.getDeliveryStats);

module.exports = router;
