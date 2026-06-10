const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', restaurantController.getAllRestaurants);
router.get('/:id', restaurantController.getRestaurantById);
router.get('/:id/menu', restaurantController.getRestaurantMenu);

// Protected routes (Admin / Restaurant Admin)
router.post('/', protect, authorize('admin', 'super_admin'), restaurantController.createRestaurant);
router.put('/:id', protect, authorize('admin', 'super_admin', 'rest_admin'), restaurantController.updateRestaurant);
router.delete('/:id', protect, authorize('admin', 'super_admin'), restaurantController.deleteRestaurant);

module.exports = router;
