const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  // Which restaurant owns this item
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },

  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // ─── PRICE IN PAISE ──────────────────────────────────────────────
  // Primary field — integer, no floating-point bugs
  // ₹180 is stored as 18000
  pricePaise: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },

  category: {
    type: String,
    required: true,
    enum: [
      'Biryani', 'Pizza', 'Burger', 'Pasta', 'Salad',
      'Dessert', 'Drinks', 'Indian', 'Chinese', 'Continental',
      'South Indian', 'North Indian', 'Tandoor', 'Snacks', 'Breakfast'
    ]
  },

  image: {
    type: String
  },

  isVeg: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  isBestseller: {
    type: Boolean,
    default: false
  },

  rating:      { type: Number, default: 4.5, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },

  preparationTimeMins: {
    type: Number,
    default: 20,
    min: 0
  },

  tags: [String],

  nutritionInfo: {
    calories: Number,
    protein:  Number,
    carbs:    Number,
    fat:      Number
  },

  customizations: [{
    name: String,
    isRequired: { type: Boolean, default: false },
    options: [{
      label:      String,
      extraPaise: { type: Number, default: 0 }  // extra cost in paise
    }]
  }],

  // For ranking in search / menu order
  sortOrder:  { type: Number, default: 0 },
  popularity: { type: Number, default: 0 }    // incremented each time ordered

}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

// ─── VIRTUAL: rupee price for display ────────────────────────────
menuItemSchema.virtual('price').get(function () {
  return this.pricePaise / 100;
});

// ─── VIRTUAL: formatted price string ─────────────────────────────
menuItemSchema.virtual('priceDisplay').get(function () {
  return `₹${(this.pricePaise / 100).toFixed(0)}`;
});

// ─── TEXT INDEX for search ────────────────────────────────────────
menuItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });
menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ popularity: -1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
