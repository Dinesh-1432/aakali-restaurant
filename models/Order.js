const mongoose = require('mongoose');

// ORDER STATUS LOG — every state transition gets its own record
const statusLogSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'               // who triggered the change (admin, rider, system)
  },
  changedByRole: String,      // snapshot of role at time of change
  note: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// ORDER ITEM — snapshot of menu item at order time
// If restaurant later changes the price/name, history stays correct
const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  },
  item_name: {           // SNAPSHOT — not a ref
    type: String,
    required: true
  },
  unitPricePaise: {      // SNAPSHOT in paise — financial accuracy
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  subtotalPaise: {
    type: Number,
    required: true
  },
  isVeg:  Boolean,
  imgUrl: String,
  customizations: [{
    name:   String,
    option: String,
    extraPaise: Number
  }]
}, { _id: true });

// Virtuals for display
orderItemSchema.virtual('unitPriceRupees').get(function () { return this.unitPricePaise / 100; });
orderItemSchema.virtual('subtotalRupees').get(function ()  { return this.subtotalPaise  / 100; });

// MAIN ORDER SCHEMA
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },

  // Central hub — links everything
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    default: null
  },

  // Snapshotted items — ORDER_ITEMS table equivalent
  items: [orderItemSchema],

  // Delivery address snapshot (in case address is later deleted)
  deliveryAddress: {
    street:  String,
    area:    String,
    city:    String,
    state:   String,
    pincode: String,
    lat:     Number,
    lng:     Number,
    phone:   String
  },

  // ─── ALL MONEY IN PAISE ─────────────────────────────────────────
  // Stored as integers — no floating-point rounding bugs
  subtotalPaise:      { type: Number, required: true, min: 0 },
  taxPaise:           { type: Number, default: 0, min: 0 },       // 5% GST
  deliveryFeePaise:   { type: Number, default: 0, min: 0 },
  discountPaise:      { type: Number, default: 0, min: 0 },       // from promo
  gatewayFeePaise:     { type: Number, default: 0, min: 0 },       // gateway MDR/platform fee
  totalPaise:         { type: Number, required: true, min: 0 },   // final charged

  // COMMISSION ENGINE — platform revenue tracking
  // commissionPaise = totalPaise × restaurant.commissionPct / 100
  commissionPaise:    { type: Number, default: 0, min: 0 },
  commissionPct:      { type: Number, default: 15 },              // snapshotted

  // Promo code applied
  promoCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode',
    default: null
  },
  promoCode:        String,   // snapshot of code string
  promoDiscountPaise: { type: Number, default: 0 },

  // Payment
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'cash', 'wallet', 'netbanking'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  gatewayOrderId: String,
  gatewayPaymentId: String,
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },

  // Order lifecycle
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },

  // ORDER_STATUS_LOGS — full audit trail
  statusHistory: [statusLogSchema],

  estimatedDeliveryTime: Date,
  actualDeliveryTime:    Date,
  specialInstructions:   String,

  // Post-delivery
  rating: { type: Number, min: 1, max: 5 },
  review: String,
  cancelReason: String

}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

// ─── VIRTUAL RUPEE HELPERS ────────────────────────────────────────
orderSchema.virtual('subtotalRupees').get(function ()    { return this.subtotalPaise    / 100; });
orderSchema.virtual('taxRupees').get(function ()         { return this.taxPaise         / 100; });
orderSchema.virtual('deliveryFeeRupees').get(function () { return this.deliveryFeePaise / 100; });
orderSchema.virtual('discountRupees').get(function ()    { return this.discountPaise    / 100; });
orderSchema.virtual('gatewayFeeRupees').get(function ()   { return this.gatewayFeePaise   / 100; });
orderSchema.virtual('totalRupees').get(function ()       { return this.totalPaise       / 100; });
orderSchema.virtual('commissionRupees').get(function ()  { return this.commissionPaise  / 100; });

// ─── AUTO ORDER NUMBER ────────────────────────────────────────────
orderSchema.pre('validate', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `SWAD${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ─── STATUS UPDATE WITH AUDIT LOG ────────────────────────────────
orderSchema.methods.updateStatus = function (newStatus, changedBy = null, role = 'system', note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status:        newStatus,
    changedBy,
    changedByRole: role,
    note,
    timestamp:     new Date()
  });
};

// ─── COMMISSION CALCULATION ───────────────────────────────────────
orderSchema.methods.calculateCommission = function (commissionPct = 15) {
  this.commissionPct   = commissionPct;
  this.commissionPaise = Math.round(this.totalPaise * commissionPct / 100);
};

// ─── INDEXES ─────────────────────────────────────────────────────
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ riderId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
