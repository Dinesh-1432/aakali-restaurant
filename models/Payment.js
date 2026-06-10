const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Amount in paise — no floats
  amountPaise: {
    type: Number,
    required: true,
    min: 1
  },

  method: {
    type: String,
    enum: ['upi', 'card', 'cash', 'wallet', 'netbanking'],
    required: true
  },

  // Payment sub-method for UPI
  upiApp: {
    type: String,
    enum: ['gpay', 'phonepe', 'paytm', 'bhim', 'other', null],
    default: null
  },

  // Gateway details
  gateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'paytm', 'mock', 'cash'],
    default: 'mock'
  },
  gatewayOrderId:  String,             // gateway's order reference
  gatewayTxnId:    String,             // gateway's transaction ID
  gatewayResponse: mongoose.Schema.Types.Mixed, // raw gateway payload

  status: {
    type: String,
    enum: ['initiated', 'pending', 'success', 'failed', 'refunded', 'partially_refunded'],
    default: 'initiated',
    index: true
  },

  failureReason:   String,
  refundAmountPaise: { type: Number, default: 0 },
  refundedAt:      Date,

  // For reconciliation
  settledAt: Date
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

paymentSchema.virtual('amountRupees').get(function () {
  return this.amountPaise / 100;
});

paymentSchema.index({ gatewayTxnId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
