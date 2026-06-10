const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const Restaurant = require('./models/Restaurant');
const Rider = require('./models/Rider');
const Address = require('./models/Address');
const PromoCode = require('./models/PromoCode');
const Order = require('./models/Order');
const Payment = require('./models/Payment');
const Delivery = require('./models/Delivery');

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

const seedUsers = [
  {
    name: 'John Doe',
    email: 'user@example.com',
    password: 'User@123',
    phone: '+91 9876543210',
    role: 'user',
    isVerified: true,
    isActive: true
  },
  {
    name: 'Admin User',
    email: 'admin@svad.in',
    password: 'Admin@123',
    role: 'admin',
    isVerified: true,
    isActive: true
  },
  {
    name: 'Super Admin',
    email: 'superadmin@svad.in',
    password: 'Super@123',
    role: 'super_admin',
    isVerified: true,
    isActive: true
  },
  {
    name: 'Restaurant Admin',
    email: 'restadmin@svad.in',
    password: 'Rest@123',
    role: 'rest_admin',
    isVerified: true,
    isActive: true
  },
  {
    name: 'Kitchen Display',
    email: 'kitchen@svad.in',
    password: 'Kitchen@123',
    role: 'kds',
    isVerified: true,
    isActive: true
  },
  {
    name: 'Delivery Rider',
    email: 'rider@svad.in',
    password: 'Rider@123',
    phone: '+91 9999999999',
    role: 'rider',
    isVerified: true,
    isActive: true
  }
];

const seedRestaurants = [
  {
    name: 'Swad Grand',
    description: 'Authentic Hyderabadi Biryani and rich Indian curries',
    cuisine: ['Indian', 'Biryani', 'North Indian'],
    tags: ['biryani', 'curry', 'indian'],
    logoUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=100&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&q=80',
    deliveryFeePaise: 2000,
    minOrderPaise: 15000,
    commissionPct: 15,
    isVeg: false,
    rating: 4.8,
    ratingCount: 340,
    address: { street: 'Road No 1', area: 'Banjara Hills', pincode: '500034' }
  },
  {
    name: 'Burger Club',
    description: 'Juicy burgers, crispy fries, and thick milkshakes',
    cuisine: ['Burger', 'Snacks'],
    tags: ['burger', 'fastfood', 'shakes'],
    logoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
    deliveryFeePaise: 3000,
    minOrderPaise: 10000,
    commissionPct: 18,
    isVeg: false,
    rating: 4.5,
    ratingCount: 220,
    address: { street: 'Metro Lane 3', area: 'Jubilee Hills', pincode: '500033' }
  },
  {
    name: 'Pizza Palace',
    description: 'Woodfired Italian style pizzas and garlic bread',
    cuisine: ['Pizza', 'Pasta', 'Continental'],
    tags: ['pizza', 'italian', 'pasta'],
    logoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&q=80',
    deliveryFeePaise: 2500,
    minOrderPaise: 20000,
    commissionPct: 12,
    isVeg: true,
    rating: 4.6,
    ratingCount: 410,
    address: { street: 'Forum Mall Floor 2', area: 'Kukatpally', pincode: '500072' }
  },
  {
    name: 'China Town',
    description: 'Authentic Hakka noodles, dumplings, and fried rice',
    cuisine: ['Chinese'],
    tags: ['noodles', 'chinese', 'dimsum'],
    logoUrl: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=100&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80',
    deliveryFeePaise: 3000,
    minOrderPaise: 12000,
    commissionPct: 15,
    isVeg: false,
    rating: 4.3,
    ratingCount: 150,
    address: { street: 'Sector 5', area: 'Madhapur', pincode: '500081' }
  },
  {
    name: 'Healthy Bites',
    description: 'Fresh salads, grain bowls, and sugar-free juices',
    cuisine: ['Salad', 'Breakfast'],
    tags: ['healthy', 'fresh', 'diet'],
    logoUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    deliveryFeePaise: 1500,
    minOrderPaise: 15000,
    commissionPct: 10,
    isVeg: true,
    rating: 4.4,
    ratingCount: 95,
    address: { street: 'Main Road', area: 'Gachibowli', pincode: '500032' }
  },
  {
    name: 'Sweet Treats',
    description: 'Delicious chocolate cakes, brownies, and pastries',
    cuisine: ['Dessert', 'Drinks'],
    tags: ['dessert', 'cake', 'sweet'],
    logoUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
    deliveryFeePaise: 2000,
    minOrderPaise: 8000,
    commissionPct: 20,
    isVeg: true,
    rating: 4.7,
    ratingCount: 180,
    address: { street: 'Baker Alley', area: 'Kondapur', pincode: '500084' }
  },
  {
    name: 'Pind Balluchi',
    description: 'Robust North Indian flavors and Tandoori platters',
    cuisine: ['North Indian', 'Tandoor'],
    tags: ['tandoori', 'punjabi', 'curry'],
    logoUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=100&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=800&q=80',
    deliveryFeePaise: 2500,
    minOrderPaise: 18000,
    commissionPct: 15,
    isVeg: false,
    rating: 4.2,
    ratingCount: 130,
    address: { street: 'NH 44 Road', area: 'Secunderabad', pincode: '500003' }
  },
  {
    name: 'Udipi Vihar',
    description: 'Crispy Dosa, soft Idli, and filter coffee',
    cuisine: ['South Indian', 'Breakfast'],
    tags: ['dosa', 'idli', 'southindian'],
    logoUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=100&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80',
    deliveryFeePaise: 1000,
    minOrderPaise: 5000,
    commissionPct: 12,
    isVeg: true,
    rating: 4.9,
    ratingCount: 650,
    address: { street: 'Station Road', area: 'Begumpet', pincode: '500016' }
  }
];

const seedMenuTemplate = [
  {
    name: 'Special Biryani',
    description: 'Fragrant basmati rice cooked with aromatic spices and marinated piece',
    pricePaise: 29900,
    category: 'Biryani',
    isVeg: false,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
    tags: ['biryani', 'spicy']
  },
  {
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella, tomatoes, and basil',
    pricePaise: 24900,
    category: 'Pizza',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80',
    tags: ['italian', 'cheese']
  },
  {
    name: 'Paneer Tikka Pizza',
    description: 'Indian fusion pizza with paneer tikka and spices',
    pricePaise: 32900,
    category: 'Pizza',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80',
    tags: ['indian', 'fusion']
  },
  {
    name: 'Juicy Chicken Burger',
    description: 'Juicy grilled chicken patty with lettuce, tomato, and special sauce',
    pricePaise: 19900,
    category: 'Burger',
    isVeg: false,
    image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&q=80',
    tags: ['chicken', 'grilled']
  },
  {
    name: 'Classic Veg Burger',
    description: 'Crispy veggie patty with fresh vegetables and eggless mayo',
    pricePaise: 14900,
    category: 'Burger',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1525059696034-4967a729002a?w=800&q=80',
    tags: ['vegetarian', 'burger']
  },
  {
    name: 'Fettuccine Alfredo',
    description: 'Creamy fettuccine pasta with parmesan cheese and butter',
    pricePaise: 22900,
    category: 'Pasta',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80',
    tags: ['italian', 'pasta']
  },
  {
    name: 'Caesar Salad Bowl',
    description: 'Fresh romaine lettuce with traditional caesar dressing, croutons, and parmesan',
    pricePaise: 17900,
    category: 'Salad',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&q=80',
    tags: ['healthy', 'fresh']
  },
  {
    name: 'Fudge Brownie with Icecream',
    description: 'Rich chocolate fudge brownie served hot with vanilla scoop',
    pricePaise: 12900,
    category: 'Dessert',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
    tags: ['dessert', 'chocolate']
  },
  {
    name: 'Fresh Mango Smoothie',
    description: 'Pure mango pulp blended sweet with organic yogurt',
    pricePaise: 9900,
    category: 'Drinks',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800&q=80',
    tags: ['drinks', 'fresh']
  },
  {
    name: 'Signature Butter Chicken',
    description: 'Tender tandoori chicken cooked in rich butter tomato gravy',
    pricePaise: 29900,
    category: 'Indian',
    isVeg: false,
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80',
    tags: ['indian', 'popular']
  },
  {
    name: 'Chinese Fried Rice',
    description: 'Fluffy stir-fried rice cooked with seasoned fresh vegetables',
    pricePaise: 16900,
    category: 'Chinese',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80',
    tags: ['chinese', 'rice']
  },
  {
    name: 'Hakka Noodles Veg',
    description: 'Wok tossed noodles with stir fry veggies and seasoning',
    pricePaise: 18900,
    category: 'Chinese',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80',
    tags: ['noodles', 'chinese']
  },
  {
    name: 'Masala Dosa',
    description: 'Crispy rice crepe filled with spiced potato mash served with chutney',
    pricePaise: 8900,
    category: 'South Indian',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&q=80',
    tags: ['southindian', 'crispy']
  },
  {
    name: 'Idli Vada Combo',
    description: 'Two steamed rice idlis and one crispy lentil vada served hot with sambar',
    pricePaise: 7900,
    category: 'South Indian',
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80',
    tags: ['southindian', 'breakfast']
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting full database seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Restaurant.deleteMany({});
    await Rider.deleteMany({});
    await Address.deleteMany({});
    await PromoCode.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Delivery.deleteMany({});
    console.log('🧹 Cleared all collections successfully');

    // Create users (hashed password handled by mongoose hook)
    const users = await User.create(seedUsers);
    console.log('✅ Created 6 default user roles');

    // Find user IDs for linkages
    const userCustomer = users.find(u => u.role === 'user');
    const userRider = users.find(u => u.role === 'rider');
    const userRestAdmin = users.find(u => u.role === 'rest_admin');

    // Create 8 Restaurants
    const restaurantsWithAdmins = seedRestaurants.map(r => ({
      ...r,
      ownerId: userRestAdmin._id
    }));
    const restaurants = await Restaurant.create(restaurantsWithAdmins);
    console.log(`✅ Created ${restaurants.length} Restaurants`);

    // Create menu items for each restaurant
    const allMenuItems = [];
    for (const restaurant of restaurants) {
      // Filter templates matching restaurant cuisines/categories
      const matchedTemplates = seedMenuTemplate.filter(template => {
        // South Indian rest get South Indian items
        if (restaurant.name === 'Udipi Vihar') {
          return template.category === 'South Indian' || template.category === 'Drinks';
        }
        if (restaurant.name === 'Swad Grand') {
          return template.category === 'Biryani' || template.category === 'Indian' || template.category === 'Drinks';
        }
        if (restaurant.name === 'Pizza Palace') {
          return template.category === 'Pizza' || template.category === 'Pasta' || template.category === 'Dessert';
        }
        if (restaurant.name === 'Burger Club') {
          return template.category === 'Burger' || template.category === 'Dessert' || template.category === 'Drinks';
        }
        if (restaurant.name === 'China Town') {
          return template.category === 'Chinese' || template.category === 'Drinks';
        }
        if (restaurant.name === 'Healthy Bites') {
          return template.category === 'Salad' || template.category === 'Drinks';
        }
        if (restaurant.name === 'Sweet Treats') {
          return template.category === 'Dessert' || template.category === 'Drinks';
        }
        if (restaurant.name === 'Pind Balluchi') {
          return template.category === 'Indian' || template.category === 'Drinks' || template.category === 'Biryani';
        }
        return true;
      });

      matchedTemplates.forEach(t => {
        allMenuItems.push({
          ...t,
          restaurantId: restaurant._id
        });
      });
    }

    const createdMenuItems = await MenuItem.create(allMenuItems);
    console.log(`✅ Created ${createdMenuItems.length} MenuItems mapped to restaurants`);

    // Create default user Address
    const address = await Address.create({
      userId: userCustomer._id,
      label: 'home',
      street: '123 Main Street',
      area: 'Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500034',
      lat: 17.4156,
      lng: 78.4423,
      isDefault: true
    });
    console.log('✅ Created user address');

    // Link default address on User
    userCustomer.defaultAddressId = address._id;
    await userCustomer.save();
    console.log('✅ Linked default address to Customer user');

    // Create Rider profile
    const riderProfile = await Rider.create({
      userId: userRider._id,
      vehicleType: 'bike',
      vehicleNumber: 'TS-09-EQ-1234',
      licenseNumber: 'DL-99920384820',
      kycStatus: 'verified',
      isOnline: true,
      currentLat: 17.4162,
      currentLng: 78.4431
    });
    console.log('✅ Created Rider profile');

    // Create Promocodes
    const promos = [
      {
        code: 'SWAD50',
        description: 'Flat ₹50 off on minimum purchase of ₹200',
        discountType: 'fixed',
        discountValue: 5000,
        minOrderPaise: 20000,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        code: 'SWAD20',
        description: '20% off up to ₹100 on minimum purchase of ₹250',
        discountType: 'percentage',
        discountValue: 20,
        minOrderPaise: 25000,
        maxDiscountPaise: 10000,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        code: 'WELCOME50',
        description: '50% off up to ₹150 on your first order!',
        discountType: 'percentage',
        discountValue: 50,
        minOrderPaise: 10000,
        maxDiscountPaise: 15000,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    ];

    await PromoCode.create(promos);
    console.log('✅ Created 3 standard promo codes');

    console.log('\n🎉 Multi-restaurant database seeding completed successfully!');
    console.log('\n📝 Login Credentials for dashboards:');
    users.forEach(u => {
      console.log(`   - Role: ${u.role.toUpperCase().padEnd(12)} | Email: ${u.email.padEnd(24)} | Password: ${u.password || 'User@123 (seeded)'}`);
    });
    console.log('');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
