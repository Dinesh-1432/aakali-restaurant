const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    customizations: [{
      name: String,
      option: String,
      price: Number
    }],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastModified on save
cartSchema.pre('save', function(next) {
  this.lastModified = Date.now();
  next();
});

// Calculate cart totals
cartSchema.methods.calculateTotals = async function() {
  await this.populate('items.menuItem');
  
  let subtotal = 0;
  this.items.forEach(item => {
    let itemPrice = item.menuItem.price;
    
    // Add customization prices
    if (item.customizations && item.customizations.length > 0) {
      item.customizations.forEach(custom => {
        itemPrice += custom.price || 0;
      });
    }
    
    subtotal += itemPrice * item.quantity;
  });
  
  const tax = subtotal * 0.05; // 5% tax
  const deliveryFee = subtotal > 500 ? 0 : 40; // Free delivery above ₹500
  const total = subtotal + tax + deliveryFee;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    deliveryFee,
    total: Math.round(total * 100) / 100,
    itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0)
  };
};

module.exports = mongoose.model('Cart', cartSchema);
