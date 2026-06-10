const Order = require('../models/Order');

// @desc    Get all orders for delivery
// @route   GET /api/delivery/orders
// @access  Private/Admin
exports.getDeliveryOrders = async (req, res) => {
  try {
    const { status } = req.query;

    // Build query for delivery-relevant orders
    let query = {
      status: { 
        $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] 
      }
    };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    // Format orders with complete delivery information
    const deliveryOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      
      // Customer Information
      customer: {
        name: order.userId?.name,
        email: order.userId?.email,
        phone: order.userId?.phone || order.deliveryAddress?.phone
      },
      
      // Delivery Address
      deliveryAddress: {
        street: order.deliveryAddress?.street,
        city: order.deliveryAddress?.city,
        state: order.deliveryAddress?.state,
        pincode: order.deliveryAddress?.pincode,
        phone: order.deliveryAddress?.phone,
        fullAddress: `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.pincode || ''}`
      },
      
      // Order Items (snapshots — no live populate needed)
      items: order.items.map(item => ({
        name: item.item_name,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        unitPriceRupees: item.unitPricePaise / 100,
        isVeg: item.isVeg,
        customizations: item.customizations,
        subtotalPaise: item.subtotalPaise,
        subtotalRupees: item.subtotalPaise / 100
      })),
      
      // Order Details (all in paise + rupee equivalents)
      orderDetails: {
        subtotalPaise: order.subtotalPaise,
        subtotalRupees: order.subtotalPaise / 100,
        taxPaise: order.taxPaise,
        taxRupees: order.taxPaise / 100,
        deliveryFeePaise: order.deliveryFeePaise,
        deliveryFeeRupees: order.deliveryFeePaise / 100,
        discountPaise: order.discountPaise,
        discountRupees: order.discountPaise / 100,
        totalPaise: order.totalPaise,
        totalRupees: order.totalPaise / 100,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus
      },
      
      // Status & Timing
      status: order.status,
      statusHistory: order.statusHistory,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      specialInstructions: order.specialInstructions,
      
      // Timestamps
      orderTime: order.createdAt,
      lastUpdated: order.updatedAt
    }));

    res.json({
      success: true,
      count: deliveryOrders.length,
      data: deliveryOrders
    });
  } catch (error) {
    console.error('Get delivery orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single order for delivery
// @route   GET /api/delivery/orders/:id
// @access  Private/Admin
exports.getDeliveryOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone avatar');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Complete delivery information
    const deliveryOrder = {
      _id: order._id,
      orderNumber: order.orderNumber,
      
      // Customer Information (Full)
      customer: {
        name: order.userId?.name,
        email: order.userId?.email,
        phone: order.userId?.phone || order.deliveryAddress?.phone,
        avatar: order.userId?.avatar
      },
      
      // Delivery Address (Complete)
      deliveryAddress: {
        street: order.deliveryAddress?.street,
        city: order.deliveryAddress?.city,
        state: order.deliveryAddress?.state,
        pincode: order.deliveryAddress?.pincode,
        phone: order.deliveryAddress?.phone,
        fullAddress: `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.pincode || ''}`,
        googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((order.deliveryAddress?.street || '') + ', ' + (order.deliveryAddress?.city || ''))}`
      },
      
      // Order Items (snapshot data — no live refs)
      items: order.items.map(item => ({
        menuItemId: item.menuItemId,
        name: item.item_name,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        unitPriceRupees: item.unitPricePaise / 100,
        isVeg: item.isVeg,
        imgUrl: item.imgUrl,
        customizations: item.customizations,
        subtotalPaise: item.subtotalPaise,
        subtotalRupees: item.subtotalPaise / 100
      })),
      
      // Order Summary (in paise + rupees)
      orderSummary: {
        totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotalPaise: order.subtotalPaise,
        subtotalRupees: order.subtotalPaise / 100,
        taxPaise: order.taxPaise,
        taxRupees: order.taxPaise / 100,
        deliveryFeePaise: order.deliveryFeePaise,
        deliveryFeeRupees: order.deliveryFeePaise / 100,
        discountPaise: order.discountPaise,
        discountRupees: order.discountPaise / 100,
        totalPaise: order.totalPaise,
        totalRupees: order.totalPaise / 100
      },
      
      // Payment Information
      payment: {
        method: order.paymentMethod,
        status: order.paymentStatus
      },
      
      // Status & Timeline
      status: order.status,
      statusHistory: order.statusHistory.map(history => ({
        status: history.status,
        timestamp: history.timestamp,
        note: history.note,
        timeAgo: getTimeAgo(history.timestamp)
      })),
      
      // Timing Information
      timing: {
        orderPlaced: order.createdAt,
        estimatedDelivery: order.estimatedDeliveryTime,
        actualDelivery: order.actualDeliveryTime,
        orderAge: getTimeAgo(order.createdAt)
      },
      
      // Special Instructions
      specialInstructions: order.specialInstructions,
      
      // Timestamps
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };

    res.json({
      success: true,
      data: deliveryOrder
    });
  } catch (error) {
    console.error('Get delivery order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update order status for delivery
// @route   PATCH /api/delivery/orders/:id/status
// @access  Private/Admin
exports.updateDeliveryStatus = async (req, res) => {
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

    // Update status using correct method signature (newStatus, changedBy, role, note)
    order.updateStatus(status, req.user?.id || null, req.user?.role || 'rider', note);

    // Update delivery time if delivered
    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    // Emit socket event to user (use userId._id since we populated it)
    const io = req.app.get('io');
    if (io && order.userId) {
      io.to(`user_${order.userId._id}`).emit('order_status_update', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        note: note
      });
    }

    res.json({
      success: true,
      message: 'Order status updated',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory
      }
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get delivery statistics
// @route   GET /api/delivery/stats
// @access  Private/Admin
exports.getDeliveryStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active deliveries
    const activeDeliveries = await Order.countDocuments({
      status: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] }
    });

    // Out for delivery
    const outForDelivery = await Order.countDocuments({
      status: 'out_for_delivery'
    });

    // Ready for pickup
    const readyForPickup = await Order.countDocuments({
      status: 'ready'
    });

    // Today's deliveries
    const todayDeliveries = await Order.countDocuments({
      status: 'delivered',
      actualDeliveryTime: { $gte: today }
    });

    // Pending orders
    const pendingOrders = await Order.countDocuments({
      status: { $in: ['pending', 'confirmed'] }
    });

    res.json({
      success: true,
      data: {
        activeDeliveries,
        outForDelivery,
        readyForPickup,
        todayDeliveries,
        pendingOrders
      }
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return Math.floor(seconds) + ' seconds ago';
}
