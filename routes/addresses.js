const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { protect } = require('../middleware/auth');

// All address routes are protected
router.use(protect);

router.get('/', addressController.getAddresses);
router.post('/', addressController.createAddress);
router.put('/:id/default', addressController.setDefaultAddress);
router.delete('/:id', addressController.deleteAddress);

module.exports = router;
