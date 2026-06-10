const express = require('express');
const router = express.Router();
const riderController = require('../controllers/riderController');
const { protect, authorize } = require('../middleware/auth');

// All rider routes require protection
router.use(protect);

router.get('/profile', riderController.getRiderProfile);
router.post('/register', riderController.registerRider);

// Rider-specific or Admin dashboard routes
router.get('/available', authorize('admin', 'super_admin'), riderController.getAvailableRiders);
router.put('/location', authorize('rider', 'admin', 'super_admin'), riderController.updateLocation);
router.put('/online', authorize('rider', 'admin', 'super_admin'), riderController.toggleOnlineStatus);

module.exports = router;
