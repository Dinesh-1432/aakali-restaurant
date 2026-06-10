const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes (User)
router.use(protect);

router.get('/razorpay-key', (req, res) => res.json({ success: true, key: process.env.RAZORPAY_KEY_ID }));
router.post('/', orderController.createOrder);
router.post('/verify', orderController.verifyPayment);
router.get('/my-orders', orderController.getMyOrders);

// Admin routes — MUST come before /:id to avoid 'admin' being matched as an ObjectId
router.get('/admin/all', authorize('admin', 'super_admin', 'rest_admin', 'kds'), orderController.getAllOrders);
router.patch('/:id/status', authorize('admin', 'super_admin', 'rest_admin', 'kds'), orderController.updateOrderStatus);
router.patch('/:id/assign-rider', authorize('admin', 'super_admin'), orderController.assignRider);

router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', orderController.cancelOrder);
router.post('/:id/rate', orderController.rateOrder);

module.exports = router;
