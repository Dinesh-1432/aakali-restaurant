const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { sendOTP, getSMSStatus } = require('../utils/sms');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Send OTP to mobile number
 * @route   POST /api/auth/send-mobile-otp
 * @access  Public
 */
exports.sendMobileOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    if (!/^\+\d{1,3}\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in MongoDB with TTL expiry (5 minutes)
    await OTP.findOneAndUpdate(
      { phone },
      { otp, attempts: 0, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      { upsert: true, new: true }
    );

    // Send OTP via SMS (or log to console if SMS not configured)
    console.log(`📱 OTP for ${phone}: ${otp}`);
    console.log(`⏰ Expires in 5 minutes`);
    
    // Try to send SMS
    const smsResult = await sendOTP(phone, otp);
    
    if (smsResult.success && smsResult.method !== 'console' && smsResult.method !== 'console-fallback') {
      console.log(`✅ SMS sent successfully via ${smsResult.method}`);
    } else {
      console.log(`⚠️ SMS not sent - using console only (${smsResult.message})`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      smsMethod: smsResult.method,
      // In development only - remove in production!
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: error.message
    });
  }
};

/**
 * @desc    Verify OTP and login/register user
 * @route   POST /api/auth/verify-mobile-otp
 * @access  Public
 */
exports.verifyMobileOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Get stored OTP from DB
    const storedData = await OTP.findOne({ phone });

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new OTP.'
      });
    }

    // Check if OTP expired (also handled by TTL but double-check)
    if (new Date() > storedData.expiresAt) {
      await OTP.deleteOne({ phone });
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new OTP.'
      });
    }

    // Check attempts
    if (storedData.attempts >= 3) {
      await OTP.deleteOne({ phone });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts += 1;
      await storedData.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.`
      });
    }

    // OTP verified — delete from DB
    await OTP.deleteOne({ phone });

    // Check if user exists
    let user = await User.findOne({ phone });

    if (user) {
      // Existing user - login
      console.log(`✅ User logged in via mobile OTP: ${phone}`);
    } else {
      // New user - register
      // Extract country code and number
      const match = phone.match(/^(\+\d{1,3})(\d{10})$/);
      const countryCode = match ? match[1] : '+91';
      const number = match ? match[2] : phone;

      user = await User.create({
        name: `User ${number.slice(-4)}`, // Default name
        phone,
        email: `${number}@mobile.user`, // Temporary email
        password: Math.random().toString(36).slice(-8), // Random password
        isEmailVerified: false,
        authProvider: 'mobile',
        role: 'user'
      });

      console.log(`✅ New user registered via mobile OTP: ${phone}`);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: `Welcome ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.',
      error: error.message
    });
  }
};

/**
 * @desc    Get SMS service status
 * @route   GET /api/auth/sms-status
 * @access  Public
 */
exports.getSMSServiceStatus = (req, res) => {
  try {
    const status = getSMSStatus();
    res.status(200).json({
      success: true,
      sms: {
        enabled: status.enabled,
        service: status.service,
        configured: status.configured,
        message: status.configured
          ? `SMS service active (${status.service})`
          : 'SMS service not configured - using console only'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get SMS status', error: error.message });
  }
};
