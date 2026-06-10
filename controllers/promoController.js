const PromoCode = require('../models/PromoCode');
const Order = require('../models/Order');

// @desc    Validate promo code
// @route   POST /api/promos/validate
// @access  Private
exports.validatePromoCode = async (req, res) => {
  try {
    const { code, restaurantId, orderTotalPaise } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    const promo = await PromoCode.findOne({ code: code.toUpperCase() });
    if (!promo) {
      return res.status(404).json({
        success: false,
        message: 'Invalid promo code'
      });
    }

    const validation = promo.validate(Number(orderTotalPaise), restaurantId);
    if (!validation.valid) {
      return res.json({
        success: false,
        message: validation.reason
      });
    }

    // Check per-user limit
    const usedCount = await Order.countDocuments({
      userId: req.user.id,
      promoCodeId: promo._id,
      status: { $ne: 'cancelled' }
    });

    if (promo.perUserLimit !== null && usedCount >= promo.perUserLimit) {
      return res.json({
        success: false,
        message: 'You have reached the maximum usage limit for this promo code'
      });
    }

    res.json({
      success: true,
      data: {
        code: promo.code,
        promoCodeId: promo._id,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountPaise: validation.discountPaise
      }
    });
  } catch (error) {
    console.error('Error validating promo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error validating promo code'
    });
  }
};

// @desc    Get all promo codes
// @route   GET /api/promos
// @access  Private/Admin
exports.getAllPromos = async (req, res) => {
  try {
    const promos = await PromoCode.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: promos.length,
      data: promos
    });
  } catch (error) {
    console.error('Error fetching promos:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching promos'
    });
  }
};

// @desc    Create promo code
// @route   POST /api/promos
// @access  Private/Admin
exports.createPromoCode = async (req, res) => {
  try {
    const promoData = {
      ...req.body,
      createdBy: req.user.id
    };

    const promo = await PromoCode.create(promoData);

    res.status(201).json({
      success: true,
      data: promo
    });
  } catch (error) {
    console.error('Error creating promo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating promo code'
    });
  }
};

// @desc    Update promo code
// @route   PUT /api/promos/:id
// @access  Private/Admin
exports.updatePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!promo) return res.status(404).json({ success: false, message: 'Promo not found' });
    res.json({ success: true, data: promo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Delete promo code
// @route   DELETE /api/promos/:id
// @access  Private/Admin
exports.deletePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: 'Promo not found' });
    res.json({ success: true, message: 'Promo code deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single promo code
// @route   GET /api/promos/:id
// @access  Private/Admin
exports.getPromoById = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: 'Promo not found' });
    res.json({ success: true, data: promo });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
