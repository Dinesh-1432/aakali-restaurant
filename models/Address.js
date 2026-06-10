const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  label: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  customLabel: String,                  // if label === 'other'

  // Address fields
  street:  { type: String, required: true, trim: true },
  area:    { type: String, trim: true },
  city:    { type: String, required: true, trim: true },
  state:   { type: String, trim: true },
  pincode: { type: String, trim: true },

  // GPS — for map display and delivery routing
  lat: Number,
  lng: Number,

  // Delivery instructions
  landmark:     String,
  instructions: String,               // e.g. "Leave at door"

  isDefault: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one default per user
addressSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

addressSchema.virtual('displayName').get(function () {
  return [this.area, this.city, this.pincode].filter(Boolean).join(', ');
});

module.exports = mongoose.model('Address', addressSchema);
