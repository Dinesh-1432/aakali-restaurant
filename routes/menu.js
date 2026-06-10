const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', menuController.getAllMenuItems);
router.get('/search', menuController.searchMenuItems);
router.get('/category/:category', menuController.getMenuItemsByCategory);
router.get('/:id', menuController.getMenuItemById);

// Protected routes (Admin only)
router.post('/', protect, authorize('admin', 'super_admin', 'rest_admin'), upload.single('image'), menuController.createMenuItem);
router.put('/:id', protect, authorize('admin', 'super_admin', 'rest_admin'), upload.single('image'), menuController.updateMenuItem);
router.delete('/:id', protect, authorize('admin', 'super_admin', 'rest_admin'), menuController.deleteMenuItem);
router.patch('/:id/availability', protect, authorize('admin', 'super_admin', 'rest_admin'), menuController.toggleAvailability);

module.exports = router;
