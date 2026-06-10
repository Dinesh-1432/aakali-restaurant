const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true              // one delivery record per order
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },

  // Pickup = restaurant location
  pickupLat:  Number,
  pickupLng:  Number,
  pickupAddress: String,

  // Drop = customer delivery address
  dropLat:  Number,
  dropLng:  Number,
  dropAddress: String,

  // Timeline — full audit trail
  assignedAt:  { type: Date, default: Date.now },
  acceptedAt:  Date,          // rider accepted the order
  arrivedAt:   Date,          // rider arrived at restaurant
  pickedAt:    Date,          // rider picked up the food
  deliveredAt: Date,          // delivered to customer

  // Distance & earnings
  distanceKm: {
    type: Number,
    default: 0
  },
  earningsPaise: {
    type: Number,
    default: 3000             // ₹30 base delivery pay
  },
  bonusPaise: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ['assigned', 'accepted', 'arrived_at_restaurant', 'picked', 'on_the_way', 'delivered', 'failed', 'cancelled'],
    default: 'assigned',
    index: true
  },

  failureReason: String,

  // Customer proof
  deliveryPhotoUrl:  String,
  customerSignature: String,

  // OTP verification for delivery (optional)
  deliveryOtp:         String,
  isOtpVerified:       { type: Boolean, default: false },

  // Customer rating for this delivery
  customerRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  customerReview: String
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

deliverySchema.virtual('totalEarningsPaise').get(function () {
  return this.earningsPaise + this.bonusPaise;
});
deliverySchema.virtual('totalEarningsRupees').get(function () {
  return this.totalEarningsPaise / 100;
});
deliverySchema.virtual('deliveryDurationMins').get(function () {
  if (this.pickedAt && this.deliveredAt) {
    return Math.round((this.deliveredAt - this.pickedAt) / 60000);
  }
  return null;
});

deliverySchema.index({ riderId: 1, status: 1 });
deliverySchema.index({ orderId: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
