const User = require('../models/User');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Total orders
    const totalOrders = await Order.countDocuments();
    
    // Today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today }
    });

    // Total revenue
    const revenueData = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPaise' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Today's revenue
    const todayRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: today }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPaise' } } }
    ]);
    const todayRevenueAmount = todayRevenue[0]?.total || 0;

    // Total users
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Active orders
    const activeOrders = await Order.countDocuments({
      status: { $in: ['pending', 'confirmed', 'preparing', 'out_for_delivery'] }
    });

    // Recent orders
    const recentOrders = await Order.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Order status breakdown
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Popular menu items
    const popularItems = await MenuItem.find()
      .sort({ popularity: -1 })
      .limit(5)
      .select('name popularity pricePaise image');

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          todayOrders,
          totalRevenue: Math.round((totalRevenue / 100) * 100) / 100,
          todayRevenue: Math.round((todayRevenueAmount / 100) * 100) / 100,
          totalUsers,
          activeOrders
        },
        recentOrders,
        ordersByStatus,
        popularItems
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, isActive, limit = 50, page = 1 } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Toggle user status
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get revenue statistics
// @route   GET /api/admin/revenue
// @access  Private/Admin
exports.getRevenueStats = async (req, res) => {
  try {
    const { period = 'week' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const revenueByDay = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$totalPaise' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: revenueByDay
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get popular items
// @route   GET /api/admin/popular-items
// @access  Private/Admin
exports.getPopularItems = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularItems = await MenuItem.find()
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .select('name popularity pricePaise image category');

    res.json({
      success: true,
      data: popularItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
