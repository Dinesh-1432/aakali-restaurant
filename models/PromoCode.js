const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9_]{3,20}$/
  },

  description: {
    type: String,
    trim: true
  },

  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },

  // For 'percentage': integer 1-100 (e.g. 20 = 20% OFF)
  // For 'fixed': amount in paise (e.g. 5000 = ₹50 OFF)
  discountValue: {
    type: Number,
    required: true,
    min: 1
  },

  // Minimum cart value to apply this promo (paise)
  minOrderPaise: {
    type: Number,
    default: 0
  },

  // Cap for percentage promos — max discount in paise
  // e.g. '20% OFF up to ₹80' → maxDiscountPaise: 8000
  maxDiscountPaise: {
    type: Number,
    default: null
  },

  // Usage limits
  usageLimit:  { type: Number, default: null },   // null = unlimited
  usedCount:   { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },     // times same user can use

  // Validity window
  validFrom:  { type: Date, required: true },
  validUntil: { type: Date, required: true },

  // Scope — empty array means applies to ALL restaurants
  applicableRestaurantIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],

  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

/**
 * Validate a promo for a given order.
 * Returns { valid, discountPaise, reason }
 */
promoCodeSchema.methods.validate = function (orderTotalPaise, restaurantId) {
  const now = new Date();

  if (!this.isActive)
    return { valid: false, reason: 'Promo code is inactive' };

  if (now < this.validFrom || now > this.validUntil)
    return { valid: false, reason: 'Promo code has expired' };

  if (this.usageLimit !== null && this.usedCount >= this.usageLimit)
    return { valid: false, reason: 'Promo code usage limit reached' };

  if (orderTotalPaise < this.minOrderPaise)
    return {
      valid: false,
      reason: `Minimum order of ₹${this.minOrderPaise / 100} required`
    };

  if (this.applicableRestaurantIds.length > 0 && restaurantId) {
    const applicable = this.applicableRestaurantIds
      .map(id => id.toString())
      .includes(restaurantId.toString());
    if (!applicable)
      return { valid: false, reason: 'Promo not valid for this restaurant' };
  }

  let discountPaise;
  if (this.discountType === 'percentage') {
    discountPaise = Math.round(orderTotalPaise * this.discountValue / 100);
    if (this.maxDiscountPaise !== null) {
      discountPaise = Math.min(discountPaise, this.maxDiscountPaise);
    }
  } else {
    discountPaise = Math.min(this.discountValue, orderTotalPaise);
  }

  return { valid: true, discountPaise };
};

promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
