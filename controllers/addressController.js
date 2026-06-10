const Address = require('../models/Address');
const User = require('../models/User');

// @desc    Get user's addresses
// @route   GET /api/addresses
// @access  Private
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id, isActive: true });
    res.json({
      success: true,
      count: addresses.length,
      data: addresses
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching addresses'
    });
  }
};

// @desc    Add a new address
// @route   POST /api/addresses
// @access  Private
exports.createAddress = async (req, res) => {
  try {
    const { label, customLabel, street, area, city, state, pincode, lat, lng, landmark, instructions, isDefault } = req.body;

    // Check if user already has active addresses
    const existingCount = await Address.countDocuments({ userId: req.user.id, isActive: true });

    // Force default if it's the first address
    const shouldBeDefault = existingCount === 0 ? true : !!isDefault;

    const address = await Address.create({
      userId: req.user.id,
      label,
      customLabel,
      street,
      area,
      city,
      state,
      pincode,
      lat,
      lng,
      landmark,
      instructions,
      isDefault: shouldBeDefault
    });

    // Update User model defaultAddressId if appropriate
    if (shouldBeDefault) {
      await User.findByIdAndUpdate(req.user.id, { defaultAddressId: address._id });
    }

    res.status(201).json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating address'
    });
  }
};

// @desc    Set address as default
// @route   PUT /api/addresses/:id/default
// @access  Private
exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user.id, isActive: true });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or unauthorized'
      });
    }

    address.isDefault = true;
    await address.save(); // pre-save hook handles setting others to false

    // Update User model reference
    await User.findByIdAndUpdate(req.user.id, { defaultAddressId: address._id });

    res.json({
      success: true,
      message: 'Address set as default successfully',
      data: address
    });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error setting default address'
    });
  }
};

// @desc    Delete an address
// @route   DELETE /api/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user.id, isActive: true });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or unauthorized'
      });
    }

    // Soft delete
    address.isActive = false;
    address.isDefault = false;
    await address.save();

    // If this was the default address, clear it on User or assign next default
    const user = await User.findById(req.user.id);
    if (user.defaultAddressId?.toString() === address._id.toString()) {
      const nextDefault = await Address.findOne({ userId: req.user.id, isActive: true });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
        user.defaultAddressId = nextDefault._id;
      } else {
        user.defaultAddressId = undefined;
      }
      await user.save();
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting address'
    });
  }
};
