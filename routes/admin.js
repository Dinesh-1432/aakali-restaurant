const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require authentication and admin/super_admin role
router.use(protect, authorize('admin', 'super_admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.get('/revenue', adminController.getRevenueStats);
router.get('/popular-items', adminController.getPopularItems);

module.exports = router;
