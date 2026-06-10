const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add address
// @route   POST /api/users/address
// @access  Private
exports.addAddress = async (req, res) => {
  try {
    const { label, street, city, state, zipCode, isDefault } = req.body;

    const user = await User.findById(req.user.id);

    // If this is set as default, unset other defaults
    if (isDefault) {
      user.address.forEach(addr => {
        addr.isDefault = false;
      });
    }

    user.address.push({
      label,
      street,
      city,
      state,
      zipCode,
      isDefault: isDefault || user.address.length === 0
    });

    await user.save();

    res.json({
      success: true,
      message: 'Address added successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update address
// @route   PUT /api/users/address/:addressId
// @access  Private
exports.updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.address.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const { label, street, city, state, zipCode, isDefault } = req.body;

    if (label) address.label = label;
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (zipCode) address.zipCode = zipCode;

    if (isDefault) {
      user.address.forEach(addr => {
        addr.isDefault = false;
      });
      address.isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete address
// @route   DELETE /api/users/address/:addressId
// @access  Private
exports.deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    user.address = user.address.filter(
      addr => addr._id.toString() !== req.params.addressId
    );

    await user.save();

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Set default address
// @route   PATCH /api/users/address/:addressId/default
// @access  Private
exports.setDefaultAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.address.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    user.address.forEach(addr => {
      addr.isDefault = false;
    });
    address.isDefault = true;

    await user.save();

    res.json({
      success: true,
      message: 'Default address updated',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
