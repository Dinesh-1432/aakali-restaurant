const mongoose = require('mongoose');

// Ledger entry for every wallet balance change — full audit trail.
// All amounts in paise (integers) to match the rest of the money model.
const walletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amountPaise: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfterPaise: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    enum: ['topup', 'refund', 'order', 'adjustment'],
    default: 'topup'
  },
  description: String,
  gatewayOrderId: String,
  gatewayTxnId: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

walletTransactionSchema.virtual('amountRupees').get(function () {
  return this.amountPaise / 100;
});
walletTransactionSchema.virtual('balanceAfterRupees').get(function () {
  return this.balanceAfterPaise / 100;
});

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
