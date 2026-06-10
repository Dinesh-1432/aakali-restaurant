const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  cuisine: [{
    type: String,
    trim: true
  }],
  tags: [String],                         // e.g. ['biryani','north','tandoor']

  logoUrl: String,
  bannerUrl: String,

  // Pricing — all in paise (₹1 = 100 paise)
  deliveryFeePaise: {
    type: Number,
    default: 2000,                        // ₹20
    min: 0
  },
  minOrderPaise: {
    type: Number,
    default: 10000,                       // ₹100
    min: 0
  },

  // Commission engine — platform earns commissionPct% of every order
  commissionPct: {
    type: Number,
    default: 15,
    min: 0,
    max: 100
  },

  deliveryTimeMins: {
    min: { type: Number, default: 25 },
    max: { type: Number, default: 35 }
  },

  address: {
    street:  String,
    area:    String,
    city:    { type: String, default: 'Hyderabad' },
    state:   { type: String, default: 'Telangana' },
    pincode: String,
    lat:     Number,
    lng:     Number
  },

  isVeg:    { type: Boolean, default: false },
  isOpen:   { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  isNew:    { type: Boolean, default: false },

  // Free-delivery promo text shown on card
  discountTag: String,                    // e.g. '40% OFF up to ₹80'

  rating:      { type: Number, default: 4.0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },

  // Owner — rest_admin user
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Total platform revenue earned from this restaurant (running total)
  totalCommissionEarnedPaise: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual helpers — rupee display values
restaurantSchema.virtual('deliveryFeeRupees').get(function () {
  return this.deliveryFeePaise / 100;
});
restaurantSchema.virtual('minOrderRupees').get(function () {
  return this.minOrderPaise / 100;
});
restaurantSchema.virtual('deliveryTimeLabel').get(function () {
  return `${this.deliveryTimeMins.min}–${this.deliveryTimeMins.max} min`;
});

// Auto-generate slug from name
restaurantSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Text index for search
restaurantSchema.index({ name: 'text', description: 'text', cuisine: 'text', tags: 'text' });
restaurantSchema.index({ isOpen: 1, isActive: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
