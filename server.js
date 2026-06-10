const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const cartRoutes = require('./routes/cart');
const deliveryRoutes = require('./routes/delivery');
const restaurantRoutes = require('./routes/restaurants');
const promoRoutes = require('./routes/promos');
const riderRoutes = require('./routes/riders');
const addressRoutes = require('./routes/addresses');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting (Disabled in development for smoother testing)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
if (process.env.NODE_ENV !== 'development') {
  app.use('/api/', limiter);
} else {
  console.log('🛡️ API Rate Limiter is disabled in development mode');
}

// Static file serving with caching for performance
const staticOptions = {
  maxAge: '7d',       // Cache CSS, JS, images for 7 days
  etag: true,         // Enable ETags for conditional GETs
  lastModified: true, // Enable Last-Modified headers
  immutable: false,   // Don't mark as immutable (files can change during dev)
  setHeaders: (res, filePath) => {
    // Fonts get a longer cache (30 days) since they rarely change
    if (/\.(woff2?|ttf|otf|eot)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    }
    // Large images (> background images) get 7 days
    else if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    }
    // JS/CSS get 1 day with revalidation
    else if (/\.(js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate'); // 1 day
    }
  }
};

// Serve static files
app.use('/uploads', express.static('uploads', staticOptions));
app.use(express.static('public', staticOptions));
app.use('/css', express.static('css', staticOptions));
app.use('/js', express.static('js', staticOptions));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => {
  // HTML never cached — users always get latest version
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/index.html');
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Aakali Restaurant API',
    version: '1.0.0',
    status: 'running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/addresses', addressRoutes);

// Error handling middleware
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Join user-specific room
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join admin room
  socket.on('join_admin', () => {
    socket.join('admin_room');
    console.log('Admin joined admin room');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };
