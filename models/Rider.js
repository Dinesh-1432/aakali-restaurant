const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  // Same login system as User — this is an extra profile row
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Vehicle
  vehicleType: {
    type: String,
    enum: ['bike', 'bicycle', 'car', 'scooter'],
    default: 'bike'
  },
  vehicleNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  licenseNumber: {
    type: String,
    trim: true
  },

  // KYC
  kycStatus: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected'],
    default: 'pending'
  },
  kycDocumentUrl: String,

  // Live state
  isOnline: {
    type: Boolean,
    default: false
  },
  currentLat: {
    type: Number,
    default: null
  },
  currentLng: {
    type: Number,
    default: null
  },
  lastLocationUpdatedAt: Date,

  // Earnings — stored in paise
  totalEarningsPaise: {
    type: Number,
    default: 0
  },
  todayEarningsPaise: {
    type: Number,
    default: 0
  },
  completedDeliveries: {
    type: Number,
    default: 0
  },
  cancelledDeliveries: {
    type: Number,
    default: 0
  },

  // Rating
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },

  // Currently assigned order
  activeOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

riderSchema.virtual('totalEarningsRupees').get(function () {
  return this.totalEarningsPaise / 100;
});
riderSchema.virtual('todayEarningsRupees').get(function () {
  return this.todayEarningsPaise / 100;
});

riderSchema.index({ isOnline: 1, isActive: 1 });
riderSchema.index({ currentLat: 1, currentLng: 1 });

module.exports = mongoose.model('Rider', riderSchema);
