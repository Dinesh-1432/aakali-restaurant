const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Protected routes
router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/address', userController.addAddress);
router.put('/address/:addressId', userController.updateAddress);
router.delete('/address/:addressId', userController.deleteAddress);
router.patch('/address/:addressId/default', userController.setDefaultAddress);

module.exports = router;
