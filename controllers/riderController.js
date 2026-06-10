const Rider = require('../models/Rider');
const User = require('../models/User');

// @desc    Get all available online riders
// @route   GET /api/riders/available
// @access  Private/Admin
exports.getAvailableRiders = async (req, res) => {
  try {
    const riders = await Rider.find({
      isOnline: true,
      activeOrderId: null,
      isActive: true
    }).populate('userId', 'name email phone');

    res.json({
      success: true,
      count: riders.length,
      data: riders
    });
  } catch (error) {
    console.error('Error fetching available riders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching riders'
    });
  }
};

// @desc    Register user as a rider
// @route   POST /api/riders/register
// @access  Private
exports.registerRider = async (req, res) => {
  try {
    const { vehicleType, vehicleNumber, licenseNumber } = req.body;

    let rider = await Rider.findOne({ userId: req.user.id });
    if (rider) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as a rider'
      });
    }

    rider = await Rider.create({
      userId: req.user.id,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      kycStatus: 'verified' // Auto-approve for ease of sandbox/demo
    });

    // Upgrade user's role to 'rider'
    await User.findByIdAndUpdate(req.user.id, { role: 'rider' });

    res.status(201).json({
      success: true,
      message: 'Rider registration completed successfully',
      data: rider
    });
  } catch (error) {
    console.error('Rider registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error registering rider'
    });
  }
};

// @desc    Update rider location
// @route   PUT /api/riders/location
// @access  Private/Rider
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const rider = await Rider.findOne({ userId: req.user.id });
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    rider.currentLat = lat;
    rider.currentLng = lng;
    rider.lastLocationUpdatedAt = Date.now();
    await rider.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: { lat, lng }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating location'
    });
  }
};

// @desc    Toggle online/offline status
// @route   PUT /api/riders/online
// @access  Private/Rider
exports.toggleOnlineStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;

    const rider = await Rider.findOne({ userId: req.user.id });
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    rider.isOnline = !!isOnline;
    await rider.save();

    res.json({
      success: true,
      message: `Rider is now ${rider.isOnline ? 'online' : 'offline'}`,
      data: { isOnline: rider.isOnline }
    });
  } catch (error) {
    console.error('Error toggling online state:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling status'
    });
  }
};

// @desc    Get rider profile
// @route   GET /api/riders/profile
// @access  Private
exports.getRiderProfile = async (req, res) => {
  try {
    const rider = await Rider.findOne({ userId: req.user.id }).populate('userId', 'name email phone avatar');
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider profile not found'
      });
    }

    res.json({
      success: true,
      data: rider
    });
  } catch (error) {
    console.error('Error fetching rider profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching rider profile'
    });
  }
};
