const Order = require('../models/Order');
const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Address = require('../models/Address');
const PromoCode = require('../models/PromoCode');
const Payment = require('../models/Payment');
const Rider = require('../models/Rider');
const Delivery = require('../models/Delivery');
const { sendEmail } = require('../utils/email');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_5g2xU1S2XqWb8r',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Expose the Razorpay client so other controllers (e.g. webhooks) can reuse it
exports.razorpayClient = razorpay;

/**
 * Finalize an order after successful payment.
 * Idempotent — safe to call from both /verify (browser callback) and the
 * Razorpay webhook. Second invocation is a no-op.
 *
 * Handles:
 *   - marking order paymentStatus = completed
 *   - creating/updating a Payment audit record
 *   - clearing the user's cart
 *   - incrementing MenuItem popularity
 *   - incrementing PromoCode usedCount (only fires here, never on order create)
 *   - sending confirmation email + emitting socket event
 */
exports.finalizePaidOrder = async function finalizePaidOrder(order, {
  gatewayPaymentId,
  gatewayResponse = null,
  io = null
} = {}) {
  // Idempotency guard — bail if already completed
  if (order.paymentStatus === 'completed') {
    return { alreadyFinalized: true, order };
  }

  order.paymentStatus = 'completed';
  if (gatewayPaymentId) order.gatewayPaymentId = gatewayPaymentId;
  await order.save();

  // Upsert Payment audit record keyed on gatewayTxnId
  let payment = null;
  if (gatewayPaymentId) {
    payment = await Payment.findOneAndUpdate(
      { gatewayTxnId: gatewayPaymentId },
      {
        $setOnInsert: {
          orderId: order._id,
          userId: order.userId._id || order.userId,
          amountPaise: order.totalPaise,
          method: order.paymentMethod,
          gateway: 'razorpay',
          gatewayOrderId: order.gatewayOrderId,
          gatewayTxnId: gatewayPaymentId
        },
        $set: {
          status: 'success',
          gatewayResponse: gatewayResponse || undefined,
          settledAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
    if (payment && !order.paymentId) {
      order.paymentId = payment._id;
      await order.save();
    }
  }

  // Clear the user's cart (best-effort)
  try {
    const cart = await Cart.findOne({ user: order.userId._id || order.userId });
    if (cart && cart.items.length) {
      cart.items = [];
      await cart.save();
    }
  } catch (err) {
    console.error('finalizePaidOrder: cart clear failed:', err);
  }

  // Bump menu item popularity
  try {
    for (const item of order.items) {
      await MenuItem.findByIdAndUpdate(item.menuItemId, {
        $inc: { popularity: item.quantity }
      });
    }
  } catch (err) {
    console.error('finalizePaidOrder: popularity bump failed:', err);
  }

  // Now that payment is confirmed, register the promo use globally
  if (order.promoCodeId) {
    try {
      await PromoCode.findByIdAndUpdate(order.promoCodeId, { $inc: { usedCount: 1 } });
    } catch (err) {
      console.error('finalizePaidOrder: promo usedCount bump failed:', err);
    }
  }

  // Confirmation email (best-effort)
  try {
    const populated = order.userId && order.userId.email
      ? order
      : await Order.findById(order._id).populate('userId', 'name email phone');
    const email = populated.userId && populated.userId.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: `
          <h2>Order Confirmed!</h2>
          <p>Thank you for your order. Your order number is <strong>${order.orderNumber}</strong></p>
          <p>Total Amount Paid: ₹${(order.totalPaise / 100).toFixed(2)}</p>
          <p>Estimated Delivery: ${order.estimatedDeliveryTime ? order.estimatedDeliveryTime.toLocaleString() : 'shortly'}</p>
        `
      });
    }
  } catch (err) {
    console.error('finalizePaidOrder: confirmation email failed:', err);
  }

  // Notify admin dashboard
  try {
    if (io) {
      const restaurant = await Restaurant.findById(order.restaurantId);
      const populated = order.userId && order.userId.name
        ? order
        : await Order.findById(order._id).populate('userId', 'name');
      io.to('admin_room').emit('new_order', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: order.totalPaise / 100,
        user: populated.userId && populated.userId.name,
        restaurant: restaurant ? restaurant.name : 'Restaurant'
      });
    }
  } catch (err) {
    console.error('finalizePaidOrder: socket emit failed:', err);
  }

  return { alreadyFinalized: false, order, payment };
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const {
      addressId,
      deliveryAddress,
      paymentMethod,
      specialInstructions,
      promoCode,
      items: bodyItems
    } = req.body;

    // Try server-side cart first, fall back to items sent in request body
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.menuItem');
    const hasServerCart = cart && cart.items.length > 0;

    // If server cart is empty, build cart items from request body
    let resolvedItems = [];
    if (hasServerCart) {
      resolvedItems = cart.items;
    } else if (bodyItems && bodyItems.length > 0) {
      // Fetch menu items from DB to validate and get prices
      const menuItemIds = bodyItems.map(i => i.menuItemId);
      const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
      const menuMap = {};
      menuItems.forEach(m => { menuMap[m._id.toString()] = m; });

      for (const bi of bodyItems) {
        const menuItem = menuMap[bi.menuItemId];
        if (!menuItem) {
          return res.status(400).json({
            success: false,
            message: `Menu item not found: ${bi.menuItemId}`
          });
        }
        resolvedItems.push({
          menuItem,
          quantity: bi.quantity || 1,
          customizations: bi.customizations || []
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Determine restaurantId from the first item
    const firstMenuItem = resolvedItems[0].menuItem;
    if (!firstMenuItem || !firstMenuItem.restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items in cart: missing restaurant association'
      });
    }
    const restaurantId = firstMenuItem.restaurantId;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Associated restaurant not found'
      });
    }

    // Resolve address
    let finalDeliveryAddress = {};
    let finalAddressId = null;

    if (addressId) {
      const addr = await Address.findOne({ _id: addressId, userId: req.user.id });
      if (addr) {
        finalAddressId = addr._id;
        finalDeliveryAddress = {
          street: addr.street,
          area: addr.area,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          lat: addr.lat,
          lng: addr.lng,
          phone: req.user.phone || ''
        };
      }
    } else if (deliveryAddress && typeof deliveryAddress === 'object') {
      finalDeliveryAddress = deliveryAddress;
    } else {
      // Try default address
      const defaultAddr = await Address.findOne({ userId: req.user.id, isDefault: true });
      if (defaultAddr) {
        finalAddressId = defaultAddr._id;
        finalDeliveryAddress = {
          street: defaultAddr.street,
          area: defaultAddr.area,
          city: defaultAddr.city,
          state: defaultAddr.state,
          pincode: defaultAddr.pincode,
          lat: defaultAddr.lat,
          lng: defaultAddr.lng,
          phone: req.user.phone || ''
        };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Please provide a delivery address'
        });
      }
    }

    // Calculate subtotal in paise directly from items
    let subtotalPaise = 0;
    const orderItems = resolvedItems.map(item => {
      let itemPricePaise = item.menuItem.pricePaise;
      
      // Calculate customizations in paise
      const customizations = (item.customizations || []).map(c => {
        const extraPaise = Math.round((c.price || 0) * 100);
        itemPricePaise += extraPaise;
        return {
          name: c.name,
          option: c.option,
          extraPaise
        };
      });

      const itemSubtotalPaise = itemPricePaise * item.quantity;
      subtotalPaise += itemSubtotalPaise;

      return {
        menuItemId: item.menuItem._id,
        item_name: item.menuItem.name,
        unitPricePaise: item.menuItem.pricePaise,
        quantity: item.quantity,
        subtotalPaise: itemSubtotalPaise,
        isVeg: item.menuItem.isVeg,
        imgUrl: item.menuItem.image,
        customizations
      };
    });

    // Check min order validation
    if (restaurant.minOrderPaise && subtotalPaise < restaurant.minOrderPaise) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value for ${restaurant.name} is ₹${restaurant.minOrderPaise / 100}`
      });
    }

    // Tax in paise (5% GST)
    const taxPaise = Math.round(subtotalPaise * 0.05);

    // Delivery fee in paise
    let deliveryFeePaise = restaurant.deliveryFeePaise || 0;

    // Apply promo if valid
    let discountPaise = 0;
    let promoCodeId = null;
    let promoCodeStr = '';

    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() });
      if (promo) {
        const validation = promo.validate(subtotalPaise, restaurant._id);
        if (validation.valid) {
          // Check per-user limit
          const usedCount = await Order.countDocuments({
            userId: req.user.id,
            promoCodeId: promo._id,
            status: { $ne: 'cancelled' }
          });
          
          if (promo.perUserLimit === null || usedCount < promo.perUserLimit) {
            discountPaise = validation.discountPaise;
            promoCodeId = promo._id;
            promoCodeStr = promo.code;
            // NOTE: promo.usedCount is incremented in finalizePaidOrder() after
            // successful payment (or immediately on COD via finalizeCodOrder path).
            // Doing it here would inflate usage counts when users abandon checkout.
          }
        }
      }
    }

    // Calculate payment gateway MDR/transaction fee in paise based on paymentMethod
    let gatewayFeePaise = 0;
    if (paymentMethod === 'card') {
      gatewayFeePaise = Math.round(subtotalPaise * 0.02); // 2% MDR
    } else if (paymentMethod === 'netbanking') {
      gatewayFeePaise = 1000; // Flat ₹10
    } else if (paymentMethod === 'wallet') {
      gatewayFeePaise = Math.round(subtotalPaise * 0.015); // 1.5%
    } else if (paymentMethod === 'cod' || paymentMethod === 'cash') {
      gatewayFeePaise = 1500; // Flat ₹15 cash handling fee
    }

    // Total in paise
    const totalPaise = Math.max(0, subtotalPaise + taxPaise + deliveryFeePaise + gatewayFeePaise - discountPaise);

    // Normalize payment method to match database schema enum
    const normalizedPaymentMethod = paymentMethod === 'cod' ? 'cash' : (paymentMethod || 'cash');

    // Create Razorpay Order if not COD, UNLESS the client is using an
    // externally-hosted collection link (razorpay.me / payment page). Those
    // links don't need a Checkout-SDK order_id and would fail without valid
    // merchant API keys.
    const skipGatewayOrder = req.body.skipGatewayOrder === true;
    let gatewayOrderId = null;
    if (normalizedPaymentMethod !== 'cash' && !skipGatewayOrder) {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: totalPaise,
          currency: 'INR',
          receipt: `receipt_order_${Date.now()}`
        });
        gatewayOrderId = rzpOrder.id;
      } catch (err) {
        console.error('Razorpay order creation failed:', err);
        return res.status(400).json({
          success: false,
          message: 'Failed to create payment gateway order: ' + err.message
        });
      }
    }

    // Create order
    const order = new Order({
      userId: req.user.id,
      restaurantId,
      addressId: finalAddressId,
      items: orderItems,
      deliveryAddress: finalDeliveryAddress,
      subtotalPaise,
      taxPaise,
      deliveryFeePaise,
      discountPaise,
      gatewayFeePaise,
      gatewayOrderId,
      totalPaise,
      promoCodeId,
      promoCode: promoCodeStr,
      promoDiscountPaise: discountPaise,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: 'pending', // Starts as pending for all
      specialInstructions,
      estimatedDeliveryTime: new Date(Date.now() + 40 * 60 * 1000) // 40 minutes
    });

    // Commission engine
    order.calculateCommission(restaurant.commissionPct || 15);

    // Update restaurant running commission total
    restaurant.totalCommissionEarnedPaise += order.commissionPaise;
    await restaurant.save();

    // Add initial status log
    order.updateStatus('pending', req.user.id, req.user.role, 'Order placed successfully');
    await order.save();

    // Clear user cart ONLY if Cash on Delivery (since COD is confirmed immediately)
    if (normalizedPaymentMethod === 'cash' && hasServerCart && cart) {
      cart.items = [];
      await cart.save();
    }

    // Increment popularity on MenuItem ONLY if Cash on Delivery
    // (paid orders bump popularity from finalizePaidOrder after payment succeeds)
    if (normalizedPaymentMethod === 'cash') {
      for (const item of orderItems) {
        await MenuItem.findByIdAndUpdate(item.menuItemId, {
          $inc: { popularity: item.quantity }
        });
      }

      // Register promo usage globally for COD orders (paid orders do this in finalizePaidOrder)
      if (promoCodeId) {
        try {
          await PromoCode.findByIdAndUpdate(promoCodeId, { $inc: { usedCount: 1 } });
        } catch (err) {
          console.error('createOrder: promo usedCount bump failed:', err);
        }
      }
    }

    // Populate user and restaurant info
    await order.populate('userId', 'name email phone');
    await order.populate('restaurantId', 'name logoUrl address');

    // Send confirmation email ONLY if Cash on Delivery
    if (normalizedPaymentMethod === 'cash') {
      try {
        await sendEmail({
          to: req.user.email,
          subject: `Order Confirmation - ${order.orderNumber}`,
          html: `
            <h2>Order Confirmed!</h2>
            <p>Thank you for your order. Your order number is <strong>${order.orderNumber}</strong></p>
            <p>Restaurant: ${restaurant.name}</p>
            <p>Total Amount: ₹${(order.totalPaise / 100).toFixed(2)}</p>
            <p>Estimated Delivery: ${order.estimatedDeliveryTime.toLocaleString()}</p>
          `
        });
      } catch (err) {
        console.error('Confirmation email failed:', err);
      }
    }

    // Emit socket event to admin ONLY if Cash on Delivery
    if (normalizedPaymentMethod === 'cash') {
      const io = req.app.get('io');
      if (io) {
        io.to('admin_room').emit('new_order', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          total: order.totalPaise / 100,
          user: req.user.name,
          restaurant: restaurant.name
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error placing order'
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;

    let query = { userId: req.user.id };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('restaurantId', 'name logoUrl bannerUrl')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your orders'
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('restaurantId', 'name logoUrl address deliveryFeePaise commissionPct')
      .populate('riderId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Authorize roles
    const adminRoles = ['admin', 'super_admin', 'rest_admin', 'kds', 'rider'];
    if (order.userId._id.toString() !== req.user.id && !adminRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order details'
    });
  }
};

// @desc    Cancel order
// @route   POST /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Can only cancel if pending or confirmed
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at its current status'
      });
    }

    order.updateStatus('cancelled', req.user.id, req.user.role, reason || 'Cancelled');
    order.cancelReason = reason;
    await order.save();

    // Emit event
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('order_cancelled', {
        orderId: order._id,
        orderNumber: order.orderNumber
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling order'
    });
  }
};

// @desc    Rate order
// @route   POST /api/orders/:id/rate
// @access  Private
exports.rateOrder = async (req, res) => {
  try {
    const { rating, review } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this order'
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be rated'
      });
    }

    order.rating = rating;
    order.review = review;
    await order.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: order
    });
  } catch (error) {
    console.error('Rate order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting rating'
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 50, page = 1 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .populate('restaurantId', 'name address')
      .populate('riderId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    console.error('Get all orders admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching admin orders'
    });
  }
};

// @desc    Update order status (Admin/KDS/Rider)
// @route   PATCH /api/orders/:id/status
// @access  Private/Admin/KDS/Rider
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.updateStatus(status, req.user.id, req.user.role, note);

    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    // Send update email
    try {
      const statusMessages = {
        confirmed: 'Your order has been confirmed by the restaurant!',
        preparing: 'Your order is being prepared',
        ready: 'Your order is ready and waiting for the rider',
        out_for_delivery: 'Your order is on the way with our rider!',
        delivered: 'Your order has been successfully delivered! Enjoy your meal!',
        cancelled: 'Your order was cancelled'
      };

      await sendEmail({
        to: order.userId.email,
        subject: `Order Status Update: ${status.toUpperCase()} - ${order.orderNumber}`,
        html: `
          <h2>Order Update</h2>
          <p>${statusMessages[status] || 'Your order status has changed.'}</p>
          <p>Order Number: <strong>${order.orderNumber}</strong></p>
          ${note ? `<p>Note: <i>${note}</i></p>` : ''}
        `
      });
    } catch (err) {
      console.error('Email status update failed:', err);
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.userId._id}`).emit('order_status_update', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status
      });
    }

    res.json({
      success: true,
      message: `Order status successfully updated to ${status}`,
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating order status'
    });
  }
};

// @desc    Verify Razorpay payment signature (browser callback)
// @route   POST /api/orders/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for payment verification'
      });
    }

    const order = await Order.findById(orderId).populate('userId', 'name email phone');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Ownership check — never let one user verify another user's order
    const orderUserId = order.userId._id ? order.userId._id.toString() : order.userId.toString();
    if (orderUserId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this order' });
    }

    // CRITICAL: the Razorpay order id must match the one we stored when the
    // order was created. Without this check, an attacker could submit a valid
    // signature for one Razorpay order together with a different (more
    // expensive) internal orderId and get that order marked paid.
    if (!order.gatewayOrderId || order.gatewayOrderId !== razorpay_order_id) {
      console.warn(`verifyPayment: gatewayOrderId mismatch for order ${order._id}. Expected ${order.gatewayOrderId}, got ${razorpay_order_id}`);
      return res.status(400).json({
        success: false,
        message: 'Razorpay order does not belong to this order'
      });
    }

    // Timing-safe HMAC-SHA256 signature check
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    let signatureValid = false;
    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(String(razorpay_signature), 'utf8');
      signatureValid = expectedBuf.length === actualBuf.length &&
        crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (_) {
      signatureValid = false;
    }

    if (!signatureValid) {
      order.paymentStatus = 'failed';
      await order.save();

      // Record the failed attempt for the audit trail
      try {
        await Payment.findOneAndUpdate(
          { gatewayTxnId: razorpay_payment_id },
          {
            $setOnInsert: {
              orderId: order._id,
              userId: orderUserId,
              amountPaise: order.totalPaise,
              method: order.paymentMethod,
              gateway: 'razorpay',
              gatewayOrderId: razorpay_order_id,
              gatewayTxnId: razorpay_payment_id
            },
            $set: {
              status: 'failed',
              failureReason: 'Signature verification failed'
            }
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('verifyPayment: failed-payment record write failed:', err);
      }

      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // Signature is valid — as defense in depth, fetch the payment from
    // Razorpay's API and confirm the amount + order id match what we expect.
    // Best-effort: if the fetch itself fails (network / Razorpay 5xx) we still
    // trust the signature since only the merchant secret could produce it.
    let gatewayPayment = null;
    try {
      gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (fetchErr) {
      console.warn(`verifyPayment: unable to fetch payment ${razorpay_payment_id} from Razorpay:`, fetchErr.message);
    }

    if (gatewayPayment) {
      if (gatewayPayment.order_id !== razorpay_order_id) {
        console.warn(`verifyPayment: payment ${razorpay_payment_id} belongs to order ${gatewayPayment.order_id}, not ${razorpay_order_id}`);
        return res.status(400).json({
          success: false,
          message: 'Payment does not belong to this Razorpay order'
        });
      }
      if (gatewayPayment.amount !== order.totalPaise) {
        console.warn(`verifyPayment: amount mismatch for order ${order._id}. Expected ${order.totalPaise} paise, gateway reports ${gatewayPayment.amount}`);
        return res.status(400).json({
          success: false,
          message: 'Payment amount does not match order total'
        });
      }
      if (gatewayPayment.status !== 'captured' && gatewayPayment.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          message: `Payment is in an unexpected state at the gateway: ${gatewayPayment.status}`
        });
      }
    }

    // All checks passed — hand off to the shared finalizer
    const io = req.app.get('io');
    const { alreadyFinalized } = await exports.finalizePaidOrder(order, {
      gatewayPaymentId: razorpay_payment_id,
      gatewayResponse: {
        source: 'browser_verify',
        razorpay_order_id,
        razorpay_signature,
        gateway_amount: gatewayPayment ? gatewayPayment.amount : null,
        gateway_status: gatewayPayment ? gatewayPayment.status : null
      },
      io
    });

    res.json({
      success: true,
      message: alreadyFinalized
        ? 'Payment already confirmed'
        : 'Payment verified and order confirmed successfully',
      data: order
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
};

// @desc    Refund a paid order via Razorpay
// @route   POST /api/orders/:id/refund
// @access  Private/Admin
exports.refundOrder = async (req, res) => {
  try {
    const { amountPaise, reason } = req.body;

    const order = await Order.findById(req.params.id).populate('userId', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot refund order — payment status is "${order.paymentStatus}"`
      });
    }

    if (!order.gatewayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'No gateway payment ID recorded for this order'
      });
    }

    // Default to a full refund if no amount specified
    const refundPaise = Number.isInteger(amountPaise) && amountPaise > 0
      ? Math.min(amountPaise, order.totalPaise - (order.refundedAmountPaise || 0))
      : order.totalPaise - (order.refundedAmountPaise || 0);

    if (refundPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nothing left to refund on this order'
      });
    }

    let refund;
    try {
      refund = await razorpay.payments.refund(order.gatewayPaymentId, {
        amount: refundPaise,
        notes: {
          reason: reason || 'requested_by_admin',
          orderNumber: order.orderNumber
        }
      });
    } catch (err) {
      console.error('Razorpay refund failed:', err);
      return res.status(502).json({
        success: false,
        message: 'Razorpay refund request failed: ' + (err.error?.description || err.message)
      });
    }

    // Update Payment record
    const isFullRefund = refundPaise >= order.totalPaise;
    await Payment.findOneAndUpdate(
      { gatewayTxnId: order.gatewayPaymentId },
      {
        $set: {
          status: isFullRefund ? 'refunded' : 'partially_refunded',
          refundedAt: new Date()
        },
        $inc: { refundAmountPaise: refundPaise }
      }
    );

    order.paymentStatus = 'refunded';
    order.updateStatus('cancelled', req.user.id, req.user.role, `Refunded ₹${(refundPaise / 100).toFixed(2)} — ${reason || 'no reason'}`);
    await order.save();

    // Best-effort email
    try {
      if (order.userId?.email) {
        await sendEmail({
          to: order.userId.email,
          subject: `Refund Initiated - ${order.orderNumber}`,
          html: `
            <h2>Refund Initiated</h2>
            <p>Order <strong>${order.orderNumber}</strong></p>
            <p>Amount: ₹${(refundPaise / 100).toFixed(2)}</p>
            <p>${reason ? `Reason: ${reason}` : ''}</p>
            <p>The amount will reflect in your original payment method within 5-7 business days.</p>
          `
        });
      }
    } catch (err) {
      console.error('Refund email failed:', err);
    }

    res.json({
      success: true,
      message: `Refund of ₹${(refundPaise / 100).toFixed(2)} initiated`,
      data: { order, refund }
    });
  } catch (error) {
    console.error('Refund order error:', error);
    res.status(500).json({ success: false, message: 'Server error processing refund' });
  }
};

// @desc    Assign a rider to an order and create Delivery record
// @route   PATCH /api/orders/:id/assign-rider
// @access  Private/Admin
exports.assignRider = async (req, res) => {
  try {
    const { riderId } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('restaurantId', 'name address');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['confirmed', 'preparing', 'ready'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign rider to order with status: ${order.status}`
      });
    }

    const rider = await Rider.findById(riderId).populate('userId', 'name phone');
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    if (!rider.isOnline || !rider.isActive) {
      return res.status(400).json({ success: false, message: 'Rider is not available' });
    }

    // Update order
    order.riderId = riderId;
    order.updateStatus('out_for_delivery', req.user.id, req.user.role, `Assigned to rider ${rider.userId?.name || riderId}`);
    await order.save();

    // Update rider's active order
    rider.activeOrderId = order._id;
    await rider.save();

    // Create or update Delivery record
    let delivery = await Delivery.findOne({ orderId: order._id });
    if (!delivery) {
      delivery = await Delivery.create({
        orderId: order._id,
        riderId: riderId,
        restaurantId: order.restaurantId._id,
        pickupAddress: order.restaurantId?.address ? `${order.restaurantId.address.street}, ${order.restaurantId.address.area}` : '',
        dropAddress: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
        dropLat: order.deliveryAddress.lat,
        dropLng: order.deliveryAddress.lng,
        status: 'assigned'
      });
    } else {
      delivery.riderId = riderId;
      delivery.status = 'assigned';
      await delivery.save();
    }

    // Emit real-time events
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.userId._id}`).emit('order_status_update', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: 'out_for_delivery',
        riderName: rider.userId?.name,
        riderPhone: rider.userId?.phone
      });
      io.to('admin_room').emit('rider_assigned', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        riderId,
        riderName: rider.userId?.name
      });
    }

    res.json({
      success: true,
      message: `Rider ${rider.userId?.name || 'assigned'} successfully assigned to order ${order.orderNumber}`,
      data: { order, delivery, rider }
    });
  } catch (error) {
    console.error('Assign rider error:', error);
    res.status(500).json({ success: false, message: 'Server error assigning rider' });
  }
};
