# SVAD Restaurant - Full Stack Food Delivery Application

A complete, production-ready restaurant food delivery application with real-time features, built with Node.js, Express, MongoDB, and Socket.IO.

## 🚀 Features

### User Features
- ✅ User authentication (Email/Password, Social Login ready)
- ✅ Browse menu with filters (Category, Veg/Non-veg, Price, Rating)
- ✅ Search functionality
- ✅ Shopping cart with real-time updates
- ✅ Multiple delivery addresses
- ✅ Order placement with multiple payment methods
- ✅ Real-time order tracking
- ✅ Order history and ratings
- ✅ Email notifications

### Admin Features
- ✅ Dashboard with statistics
- ✅ Order management with status updates
- ✅ Menu management (CRUD operations)
- ✅ User management
- ✅ Revenue analytics
- ✅ Real-time order notifications

### Technical Features
- ✅ RESTful API architecture
- ✅ JWT authentication
- ✅ Real-time updates with Socket.IO
- ✅ File upload support
- ✅ Email notifications
- ✅ Input validation
- ✅ Error handling
- ✅ Security best practices (Helmet, Rate limiting)
- ✅ MongoDB with Mongoose ODM

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd swad_restaurent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   - MongoDB connection string
   - JWT secret
   - Email credentials (Gmail, SendGrid, etc.)
   - Other API keys as needed

4. **Create uploads directory**
   ```bash
   mkdir uploads
   ```

5. **Seed the database**
   ```bash
   npm run seed
   ```
   
   This will create:
   - Admin user: admin@svadrestaurant.com / Admin@123
   - Regular user: user@example.com / User@123
   - Sample menu items

6. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## 📁 Project Structure

```
swad_restaurent/
├── controllers/          # Request handlers
│   ├── authController.js
│   ├── menuController.js
│   ├── orderController.js
│   ├── cartController.js
│   ├── userController.js
│   └── adminController.js
├── models/              # Database models
│   ├── User.js
│   ├── MenuItem.js
│   ├── Order.js
│   └── Cart.js
├── routes/              # API routes
│   ├── auth.js
│   ├── menu.js
│   ├── orders.js
│   ├── cart.js
│   ├── users.js
│   └── admin.js
├── middleware/          # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── upload.js
├── utils/               # Utility functions
│   └── email.js
├── uploads/             # Uploaded files
├── server.js            # Entry point
├── seed.js              # Database seeder
├── package.json
└── .env.example
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/verify-email` - Verify email
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Menu
- `GET /api/menu` - Get all menu items
- `GET /api/menu/:id` - Get menu item by ID
- `GET /api/menu/search?q=query` - Search menu items
- `GET /api/menu/category/:category` - Get items by category
- `POST /api/menu` - Create menu item (Admin)
- `PUT /api/menu/:id` - Update menu item (Admin)
- `DELETE /api/menu/:id` - Delete menu item (Admin)
- `PATCH /api/menu/:id/availability` - Toggle availability (Admin)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update/:itemId` - Update cart item
- `DELETE /api/cart/remove/:itemId` - Remove from cart
- `DELETE /api/cart/clear` - Clear cart

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/my-orders` - Get user's orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders/:id/cancel` - Cancel order
- `POST /api/orders/:id/rate` - Rate order
- `GET /api/orders/admin/all` - Get all orders (Admin)
- `PATCH /api/orders/:id/status` - Update order status (Admin)

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/address` - Add address
- `PUT /api/users/address/:addressId` - Update address
- `DELETE /api/users/address/:addressId` - Delete address
- `PATCH /api/users/address/:addressId/default` - Set default address

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id/status` - Toggle user status
- `GET /api/admin/revenue` - Get revenue statistics
- `GET /api/admin/popular-items` - Get popular items

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 🌐 Socket.IO Events

### Client to Server
- `join` - Join user-specific room
- `join_admin` - Join admin room

### Server to Client
- `new_order` - New order notification (Admin)
- `order_status_update` - Order status changed (User)
- `order_cancelled` - Order cancelled (Admin)

## 📧 Email Configuration

The application supports email notifications for:
- User registration verification
- Password reset
- Order confirmation
- Order status updates

Configure your email service in `.env`:

### Gmail Example
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

**Note:** For Gmail, you need to enable "Less secure app access" or use an App Password.

## 🚀 Deployment

### MongoDB Atlas (Database)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### Heroku (Backend)
```bash
# Install Heroku CLI
heroku login
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret
# Set other environment variables
git push heroku main
```

### Environment Variables for Production
Make sure to set all required environment variables in your hosting platform:
- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_SECRET`
- `EMAIL_*` variables
- `FRONTEND_URL`

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- Helmet.js for security headers
- Input validation
- CORS configuration
- XSS protection

## 🧪 Testing

You can test the API using:
- Postman
- Thunder Client (VS Code extension)
- cURL

Import the API endpoints and test with the seeded credentials.

## 📝 Default Credentials

After running the seed script:

**Admin:**
- Email: admin@svadrestaurant.com
- Password: Admin@123

**User:**
- Email: user@example.com
- Password: User@123

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access (for MongoDB Atlas)

### Email Not Sending
- Verify email credentials
- Check firewall settings
- For Gmail, use App Password

### Port Already in Use
- Change PORT in `.env`
- Kill process using the port

## 📞 Support

For issues and questions, please create an issue in the repository.

## 🎉 Acknowledgments

- Express.js
- MongoDB & Mongoose
- Socket.IO
- JWT
- Nodemailer
