const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const socialAuthController = require('../controllers/socialAuthController');
const mobileOtpController = require('../controllers/mobileOtpController');
const { protect } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);

// Social Authentication Routes
router.post('/google', socialAuthController.googleSignIn);
router.post('/facebook', socialAuthController.facebookSignIn);

// Mobile OTP Authentication Routes
router.post('/send-mobile-otp', mobileOtpController.sendMobileOTP);
router.post('/verify-mobile-otp', mobileOtpController.verifyMobileOTP);
router.get('/sms-status', mobileOtpController.getSMSServiceStatus);

module.exports = router;
