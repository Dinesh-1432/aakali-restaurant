const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * @desc    Google OAuth Sign-In
 * @route   POST /api/auth/google
 * @access  Public
 */
exports.googleSignIn = async (req, res) => {
  try {
    const { credential, clientId } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId || process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Extract user information from Google
    const {
      sub: googleId,
      email,
      name,
      picture,
      email_verified
    } = payload;

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Google email not verified'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Update existing user with Google info if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        user.profilePicture = picture;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        profilePicture: picture,
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4), // Always 12+ chars
        isEmailVerified: true,
        authProvider: 'google'
      });
    }

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
        role: user.role,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Google Sign-In Error:', error);
    
    if (error.message && error.message.includes('Token used too late')) {
      return res.status(400).json({
        success: false,
        message: 'Google token expired. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Google sign-in failed. Please try again.',
      error: error.message
    });
  }
};

/**
 * @desc    Facebook OAuth Sign-In
 * @route   POST /api/auth/facebook
 * @access  Public
 */
exports.facebookSignIn = async (req, res) => {
  try {
    const { accessToken, userID } = req.body;

    if (!accessToken || !userID) {
      return res.status(400).json({
        success: false,
        message: 'Facebook access token and user ID are required'
      });
    }

    // Verify the Facebook token by fetching user data from Facebook
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Facebook token'
      });
    }

    const fbData = await response.json();

    // Verify the user ID matches
    if (fbData.id !== userID) {
      return res.status(400).json({
        success: false,
        message: 'Facebook user ID mismatch'
      });
    }

    const { id: facebookId, name, email, picture } = fbData;

    // Email might not be available if user didn't grant permission
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email permission required. Please allow email access.'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Update existing user with Facebook info if not already set
      if (!user.facebookId) {
        user.facebookId = facebookId;
        user.profilePicture = picture?.data?.url || user.profilePicture;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name,
        email: email.toLowerCase(),
        facebookId,
        profilePicture: picture?.data?.url,
        password: Math.random().toString(36).slice(-8), // Random password (won't be used)
        isEmailVerified: true,
        authProvider: 'facebook'
      });
    }

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
        role: user.role,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Facebook Sign-In Error:', error);
    res.status(500).json({
      success: false,
      message: 'Facebook sign-in failed. Please try again.',
      error: error.message
    });
  }
};
