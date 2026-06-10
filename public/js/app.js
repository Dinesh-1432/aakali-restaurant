// API Configuration
const API_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let socket = null;

// Initialize Socket.IO
function initSocket() {
  socket = io('http://localhost:5000');
  
  if (currentUser) {
    if (currentUser.role === 'admin') {
      socket.emit('join_admin');
    } else {
      socket.emit('join', currentUser.id);
    }
  }

  // Listen for order updates
  socket.on('order_status_update', (data) => {
    showNotification(`Order ${data.orderNumber} status: ${data.status}`, 'success');
    if (window.location.hash === '#orders') {
      loadMyOrders();
    }
  });

  // Admin: Listen for new orders
  socket.on('new_order', (data) => {
    if (currentUser && currentUser.role === 'admin') {
      showNotification(`New order from ${data.user}: ₹${data.total}`, 'info');
      loadAdminOrders();
    }
  });
}

// API Helper Functions
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==================== AUTH FUNCTIONS ====================

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('authError');

  const userData = {
    name: form.querySelector('[name="name"]').value,
    email: form.querySelector('[name="email"]').value,
    password: form.querySelector('[name="password"]').value,
    phone: form.querySelector('[name="phone"]')?.value
  };

  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showNotification(data.message, 'success');
    
    // Navigate to appropriate panel
    routeByRole(currentUser);
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('authError');

  const credentials = {
    email: form.querySelector('[name="email"]').value,
    password: form.querySelector('[name="password"]').value
  };

  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showNotification('Login successful!', 'success');
    
    // Navigate to appropriate panel
    routeByRole(currentUser);
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  
  if (socket) {
    socket.disconnect();
  }
  
  showAuthScreen();
  showNotification('Logged out successfully', 'success');
}

// ==================== MENU FUNCTIONS ====================

let menuItems = [];
let cart = [];

async function loadMenuItems(category = 'All') {
  try {
    const params = new URLSearchParams();
    if (category !== 'All') params.append('category', category);
    
    const data = await apiCall(`/menu?${params}`);
    menuItems = data.data;
    renderMenuItems(menuItems);
  } catch (error) {
    showNotification('Failed to load menu items', 'error');
  }
}

function renderMenuItems(items) {
  const grid = document.getElementById('foodGrid');
  if (!grid) return;

  grid.innerHTML = items.map(item => `
    <div class="food-card" data-id="${item._id}">
      <div class="food-card-img">
        <img src="${item.image}" alt="${item.name}">
        <div class="veg-badge ${item.isVeg ? 'veg' : 'nonveg'}"></div>
      </div>
      <div class="food-card-body">
        <div class="food-rating">
          <span class="stars">${'★'.repeat(Math.floor(item.rating))}${'☆'.repeat(5 - Math.floor(item.rating))}</span>
          <span class="rat-num">${item.rating} (${item.reviews})</span>
        </div>
        <div class="food-name">${item.name}</div>
        <div class="food-desc">${item.description}</div>
        <div class="food-footer">
          <div class="food-price">₹${item.price}</div>
          <button class="add-btn" onclick="addToCart('${item._id}')">Add +</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function searchMenu(query) {
  if (!query) {
    loadMenuItems();
    return;
  }

  try {
    const data = await apiCall(`/menu/search?q=${encodeURIComponent(query)}`);
    renderMenuItems(data.data);
  } catch (error) {
    showNotification('Search failed', 'error');
  }
}

// ==================== CART FUNCTIONS ====================

async function loadCart() {
  if (!authToken) return;

  try {
    const data = await apiCall('/cart');
    cart = data.data.cart.items;
    updateCartUI(data.data);
  } catch (error) {
    console.error('Failed to load cart:', error);
  }
}

async function addToCart(menuItemId) {
  if (!authToken) {
    showNotification('Please login to add items to cart', 'error');
    return;
  }

  try {
    const data = await apiCall('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ menuItemId, quantity: 1 })
    });

    cart = data.data.cart.items;
    updateCartUI(data.data);
    showNotification('Item added to cart', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function updateCartItemQuantity(itemId, quantity) {
  try {
    const data = await apiCall(`/cart/update/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    });

    cart = data.data.cart.items;
    updateCartUI(data.data);
  } catch (error) {
    showNotification('Failed to update cart', 'error');
  }
}

async function removeFromCart(itemId) {
  try {
    const data = await apiCall(`/cart/remove/${itemId}`, {
      method: 'DELETE'
    });

    cart = data.data.cart.items;
    updateCartUI(data.data);
    showNotification('Item removed from cart', 'success');
  } catch (error) {
    showNotification('Failed to remove item', 'error');
  }
}

function updateCartUI(cartData) {
  const cartBadge = document.querySelector('.cart-badge');
  const cartItems = document.querySelector('.cart-items');
  const cartFooter = document.querySelector('.cart-footer');

  if (cartBadge) {
    cartBadge.textContent = cartData.itemCount || 0;
    cartBadge.style.display = cartData.itemCount > 0 ? 'flex' : 'none';
  }

  if (cartItems) {
    if (cart.length === 0) {
      cartItems.innerHTML = '<div class="cart-empty-msg">Your cart is empty</div>';
    } else {
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
          <div style="flex: 1;">
            <div class="cart-item-name">${item.menuItem.name}</div>
            <div class="cart-item-price">₹${item.menuItem.price}</div>
            <div class="cart-qty">
              <button class="qty-btn" onclick="updateCartItemQuantity('${item._id}', ${item.quantity - 1})">−</button>
              <span class="qty-num">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartItemQuantity('${item._id}', ${item.quantity + 1})">+</button>
            </div>
          </div>
          <div class="cart-item-sub">₹${item.menuItem.price * item.quantity}</div>
          <button class="remove-item-btn" onclick="removeFromCart('${item._id}')">×</button>
        </div>
      `).join('');
    }
  }

  if (cartFooter && cartData.subtotal) {
    document.querySelector('.cart-footer').innerHTML = `
      <div class="cart-total-row">
        <span>Subtotal</span>
        <span>₹${cartData.subtotal}</span>
      </div>
      <div class="cart-total-row">
        <span>Tax (5%)</span>
        <span>₹${cartData.tax}</span>
      </div>
      <div class="cart-total-row">
        <span>Delivery Fee</span>
        <span>₹${cartData.deliveryFee}</span>
      </div>
      <div class="cart-grand-row">
        <span>Total</span>
        <span>₹${cartData.total}</span>
      </div>
      <button class="checkout-btn" onclick="proceedToCheckout()">Proceed to Checkout</button>
    `;
  }
}

function toggleCart() {
  const overlay = document.querySelector('.cart-overlay');
  const drawer = document.querySelector('.cart-drawer');
  
  overlay.classList.toggle('open');
  drawer.classList.toggle('open');
}

// ==================== ORDER FUNCTIONS ====================

async function proceedToCheckout() {
  if (cart.length === 0) {
    showNotification('Your cart is empty', 'error');
    return;
  }

  // Close cart drawer
  toggleCart();

  // Show checkout page
  showCheckoutPage();
}

async function placeOrder(orderData) {
  try {
    const data = await apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });

    showNotification('Order placed successfully!', 'success');
    
    // Clear cart
    cart = [];
    updateCartUI({ itemCount: 0, subtotal: 0, tax: 0, deliveryFee: 0, total: 0 });
    
    // Show order confirmation
    showOrderConfirmation(data.data);
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function loadMyOrders() {
  try {
    const data = await apiCall('/orders/my-orders');
    renderMyOrders(data.data);
  } catch (error) {
    showNotification('Failed to load orders', 'error');
  }
}

function renderMyOrders(orders) {
  const container = document.getElementById('myOrdersContainer');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:3rem;">No orders yet</p>';
    return;
  }

  container.innerHTML = orders.map(order => `
    <div class="order-card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius2);padding:1.5rem;margin-bottom:1rem;">
      <div style="display:flex;justify-content:space-between;margin-bottom:1rem;">
        <div>
          <h4 style="font-size:1rem;font-weight:700;">${order.orderNumber}</h4>
          <p style="font-size:0.85rem;color:var(--muted);">${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <span class="badge badge-${order.status}">${order.status.replace('_', ' ')}</span>
        </div>
      </div>
      <div style="margin-bottom:1rem;">
        ${order.items.map(item => `
          <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
            <span>${item.quantity}x</span>
            <span>${item.name}</span>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:1rem;border-top:1px solid var(--border);">
        <span style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:900;">₹${order.total}</span>
        <button class="btn-sm" onclick="viewOrderDetails('${order._id}')" style="background:var(--accent);color:#fff;border:none;">View Details</button>
      </div>
    </div>
  `).join('');
}

async function viewOrderDetails(orderId) {
  try {
    const data = await apiCall(`/orders/${orderId}`);
    showOrderDetailsModal(data.data);
  } catch (error) {
    showNotification('Failed to load order details', 'error');
  }
}

// ==================== ADMIN FUNCTIONS ====================

async function loadAdminDashboard() {
  try {
    const data = await apiCall('/admin/dashboard');
    renderAdminDashboard(data.data);
  } catch (error) {
    showNotification('Failed to load dashboard', 'error');
  }
}

function renderAdminDashboard(data) {
  // Update stats
  document.getElementById('statTotalOrders').textContent = data.stats.totalOrders;
  document.getElementById('statTodayOrders').textContent = data.stats.todayOrders;
  document.getElementById('statTotalRevenue').textContent = `₹${data.stats.totalRevenue}`;
  document.getElementById('statActiveOrders').textContent = data.stats.activeOrders;

  // Render recent orders
  const ordersTable = document.getElementById('adminOrdersTable');
  if (ordersTable) {
    ordersTable.innerHTML = data.recentOrders.map(order => `
      <tr>
        <td>${order.orderNumber}</td>
        <td>${order.user.name}</td>
        <td>₹${order.total}</td>
        <td><span class="badge badge-${order.status}">${order.status}</span></td>
        <td>${new Date(order.createdAt).toLocaleString()}</td>
        <td>
          <button class="btn-sm" onclick="viewOrderDetails('${order._id}')">View</button>
        </td>
      </tr>
    `).join('');
  }
}

async function loadAdminOrders() {
  try {
    const data = await apiCall('/orders/admin/all');
    renderAdminOrders(data.data);
  } catch (error) {
    showNotification('Failed to load orders', 'error');
  }
}

function renderAdminOrders(orders) {
  const table = document.getElementById('adminAllOrdersTable');
  if (!table) return;

  table.innerHTML = orders.map(order => `
    <tr>
      <td>${order.orderNumber}</td>
      <td>${order.user.name}</td>
      <td>₹${order.total}</td>
      <td>
        <select onchange="updateOrderStatus('${order._id}', this.value)" style="padding:0.3rem;border-radius:5px;">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
          <option value="out_for_delivery" ${order.status === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>${new Date(order.createdAt).toLocaleString()}</td>
    </tr>
  `).join('');
}

async function updateOrderStatus(orderId, status) {
  try {
    await apiCall(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    showNotification('Order status updated', 'success');
    loadAdminOrders();
  } catch (error) {
    showNotification('Failed to update order status', 'error');
  }
}

async function loadAdminMenu() {
  try {
    const data = await apiCall('/menu?limit=100');
    renderAdminMenu(data.data);
  } catch (error) {
    showNotification('Failed to load menu', 'error');
  }
}

function renderAdminMenu(items) {
  const grid = document.getElementById('adminMenuGrid');
  if (!grid) return;

  grid.innerHTML = items.map(item => `
    <div class="menu-mgr-card">
      <img src="${item.image}" alt="${item.name}">
      <div class="menu-mgr-card-body">
        <div class="mmname">${item.name}</div>
        <div class="mmprice">₹${item.price}</div>
        <span class="mmcat">${item.category}</span>
        <div class="menu-mgr-actions">
          <button class="btn-sm" onclick="editMenuItem('${item._id}')" style="background:var(--blue-bg);color:var(--blue);">Edit</button>
          <button class="btn-sm btn-sm-danger" onclick="deleteMenuItem('${item._id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function deleteMenuItem(itemId) {
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    await apiCall(`/menu/${itemId}`, { method: 'DELETE' });
    showNotification('Menu item deleted', 'success');
    loadAdminMenu();
  } catch (error) {
    showNotification('Failed to delete item', 'error');
  }
}

// ==================== UI NAVIGATION ====================

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('userPanel').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'none';
}

function showUserPanel() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('userPanel').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  
  loadMenuItems();
  loadCart();
}

function showAdminPanel() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('userPanel').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  
  loadAdminDashboard();
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  if (authToken && currentUser) {
    routeByRole(currentUser);
  } else {
    showAuthScreen();
  }

  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Auth form listeners
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  // Search listener
  const searchInput = document.querySelector('.nav-search-wrap input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (query.length > 2 || query.length === 0) {
        searchMenu(query);
      }
    });
  }

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadMenuItems(e.target.textContent);
    });
  });
}

// Make functions globally available
window.addToCart = addToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.handleLogout = handleLogout;
window.proceedToCheckout = proceedToCheckout;
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.deleteMenuItem = deleteMenuItem;
window.loadMyOrders = loadMyOrders;
window.loadAdminOrders = loadAdminOrders;
window.loadAdminMenu = loadAdminMenu;


// ==================== DELIVERY MANAGEMENT (ADMIN) ====================

async function loadDeliveryOrders(status = '') {
  try {
    const params = status ? `?status=${status}` : '';
    const data = await apiCall(`/delivery/orders${params}`);
    renderDeliveryOrders(data.data);
  } catch (error) {
    showNotification('Failed to load delivery orders', 'error');
  }
}

function renderDeliveryOrders(orders) {
  const container = document.getElementById('deliveryOrdersContainer');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:3rem;">No active delivery orders</p>';
    return;
  }

  container.innerHTML = orders.map(order => `
    <div class="delivery-order-card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius2);padding:1.5rem;margin-bottom:1.5rem;box-shadow:var(--shadow);">
      <!-- Order Header -->
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:2px solid var(--border);">
        <div>
          <h3 style="font-size:1.2rem;font-weight:900;color:var(--text);margin-bottom:.3rem;">
            ${order.orderNumber}
          </h3>
          <p style="font-size:.85rem;color:var(--muted);">
            Ordered ${new Date(order.orderTime).toLocaleString()}
          </p>
        </div>
        <span class="badge badge-${order.status}" style="font-size:.85rem;padding:.4rem 1rem;">
          ${order.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <!-- Customer Information -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:1rem;">
        <h4 style="font-size:.9rem;font-weight:700;color:var(--text);margin-bottom:.8rem;display:flex;align-items:center;gap:.5rem;">
          <span style="font-size:1.2rem;">👤</span> Customer Details
        </h4>
        <div style="display:grid;gap:.5rem;">
          <div style="display:flex;gap:.5rem;">
            <strong style="min-width:60px;color:var(--muted);">Name:</strong>
            <span style="color:var(--text);font-weight:600;">${order.customer.name}</span>
          </div>
          <div style="display:flex;gap:.5rem;">
            <strong style="min-width:60px;color:var(--muted);">Phone:</strong>
            <a href="tel:${order.customer.phone}" style="color:var(--accent);font-weight:600;text-decoration:none;">
              ${order.customer.phone}
            </a>
          </div>
          <div style="display:flex;gap:.5rem;">
            <strong style="min-width:60px;color:var(--muted);">Email:</strong>
            <span style="color:var(--text);">${order.customer.email}</span>
          </div>
        </div>
      </div>

      <!-- Delivery Address -->
      <div style="background:var(--accent-xlight);border:1px solid #fcd9c9;border-radius:var(--radius);padding:1rem;margin-bottom:1rem;">
        <h4 style="font-size:.9rem;font-weight:700;color:var(--text);margin-bottom:.8rem;display:flex;align-items:center;gap:.5rem;">
          <span style="font-size:1.2rem;">📍</span> Delivery Address
        </h4>
        <p style="color:var(--text);line-height:1.6;font-weight:500;margin-bottom:.5rem;">
          ${order.deliveryAddress.fullAddress}
        </p>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress.fullAddress)}" 
           target="_blank" 
           style="display:inline-flex;align-items:center;gap:.3rem;color:var(--accent);font-size:.85rem;font-weight:600;text-decoration:none;">
          <span>🗺️</span> Open in Google Maps
        </a>
      </div>

      <!-- Order Items -->
      <div style="margin-bottom:1rem;">
        <h4 style="font-size:.9rem;font-weight:700;color:var(--text);margin-bottom:.8rem;">
          Order Items (${order.items.length})
        </h4>
        <div style="display:flex;flex-direction:column;gap:.5rem;">
          ${order.items.map(item => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem;background:var(--bg2);border-radius:8px;">
              <div style="display:flex;align-items:center;gap:.6rem;">
                <span style="background:${item.isVeg ? '#16a34a' : '#dc2626'};color:#fff;width:20px;height:20px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;">
                  ${item.isVeg ? 'V' : 'N'}
                </span>
                <span style="font-weight:600;color:var(--text);">${item.quantity}x ${item.name}</span>
              </div>
              <span style="font-weight:700;color:var(--accent);">₹${item.subtotal}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Order Summary -->
      <div style="background:var(--bg3);border-radius:var(--radius);padding:1rem;margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.85rem;">
          <span style="color:var(--muted);">Subtotal:</span>
          <span style="font-weight:600;">₹${order.orderDetails.subtotal}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.85rem;">
          <span style="color:var(--muted);">Tax:</span>
          <span style="font-weight:600;">₹${order.orderDetails.tax}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.85rem;">
          <span style="color:var(--muted);">Delivery Fee:</span>
          <span style="font-weight:600;">₹${order.orderDetails.deliveryFee}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:.6rem;border-top:2px solid var(--border);margin-top:.4rem;">
          <span style="font-weight:700;font-size:1rem;">Total:</span>
          <span style="font-weight:900;font-size:1.2rem;color:var(--accent);font-family:'Playfair Display',serif;">₹${order.orderDetails.total}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:.6rem;padding-top:.6rem;border-top:1px solid var(--border);font-size:.85rem;">
          <span style="color:var(--muted);">Payment:</span>
          <span style="font-weight:600;text-transform:uppercase;">${order.orderDetails.paymentMethod}</span>
        </div>
      </div>

      ${order.specialInstructions ? `
        <div style="background:var(--gold-bg);border:1px solid #fde68a;border-radius:var(--radius);padding:.8rem;margin-bottom:1rem;">
          <strong style="color:var(--gold);font-size:.85rem;">⚠️ Special Instructions:</strong>
          <p style="color:var(--text);margin-top:.3rem;font-size:.85rem;">${order.specialInstructions}</p>
        </div>
      ` : ''}

      <!-- Action Buttons -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.6rem;margin-top:1rem;">
        ${order.status === 'confirmed' ? `
          <button onclick="updateDeliveryOrderStatus('${order._id}', 'preparing')" 
                  style="background:var(--accent);color:#fff;border:none;padding:.7rem;border-radius:8px;font-weight:600;cursor:pointer;font-size:.85rem;">
            Start Preparing
          </button>
        ` : ''}
        ${order.status === 'preparing' ? `
          <button onclick="updateDeliveryOrderStatus('${order._id}', 'ready')" 
                  style="background:var(--blue);color:#fff;border:none;padding:.7rem;border-radius:8px;font-weight:600;cursor:pointer;font-size:.85rem;">
            Mark Ready
          </button>
        ` : ''}
        ${order.status === 'ready' ? `
          <button onclick="updateDeliveryOrderStatus('${order._id}', 'out_for_delivery')" 
                  style="background:var(--gold);color:#fff;border:none;padding:.7rem;border-radius:8px;font-weight:600;cursor:pointer;font-size:.85rem;">
            Out for Delivery
          </button>
        ` : ''}
        ${order.status === 'out_for_delivery' ? `
          <button onclick="updateDeliveryOrderStatus('${order._id}', 'delivered')" 
                  style="background:var(--green);color:#fff;border:none;padding:.7rem;border-radius:8px;font-weight:600;cursor:pointer;font-size:.85rem;">
            Mark Delivered
          </button>
        ` : ''}
        <button onclick="viewDeliveryOrderDetails('${order._id}')" 
                style="background:#fff;color:var(--text);border:1.5px solid var(--border);padding:.7rem;border-radius:8px;font-weight:600;cursor:pointer;font-size:.85rem;">
          View Full Details
        </button>
      </div>
    </div>
  `).join('');
}

async function updateDeliveryOrderStatus(orderId, status) {
  try {
    const statusMessages = {
      preparing: 'Started preparing the order',
      ready: 'Order is ready for pickup',
      out_for_delivery: 'Order is out for delivery',
      delivered: 'Order has been delivered'
    };

    await apiCall(`/delivery/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        status,
        note: statusMessages[status]
      })
    });

    showNotification(`Order status updated to ${status.replace('_', ' ')}`, 'success');
    loadDeliveryOrders();
  } catch (error) {
    showNotification('Failed to update order status', 'error');
  }
}

async function viewDeliveryOrderDetails(orderId) {
  try {
    const data = await apiCall(`/delivery/orders/${orderId}`);
    showDeliveryOrderModal(data.data);
  } catch (error) {
    showNotification('Failed to load order details', 'error');
  }
}

function showDeliveryOrderModal(order) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:700px;max-height:90vh;overflow-y:auto;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      
      <h2 style="font-size:1.5rem;font-weight:900;margin-bottom:.5rem;text-align:center;">
        ${order.orderNumber}
      </h2>
      <p style="text-align:center;color:var(--muted);margin-bottom:1.5rem;">
        Complete Order Details
      </p>

      <!-- Customer Info -->
      <div style="background:var(--bg2);border-radius:var(--radius);padding:1.2rem;margin-bottom:1rem;">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;color:var(--text);">👤 Customer Information</h3>
        <div style="display:grid;gap:.6rem;">
          <div><strong>Name:</strong> ${order.customer.name}</div>
          <div><strong>Phone:</strong> <a href="tel:${order.customer.phone}" style="color:var(--accent);">${order.customer.phone}</a></div>
          <div><strong>Email:</strong> ${order.customer.email}</div>
        </div>
      </div>

      <!-- Delivery Address -->
      <div style="background:var(--accent-xlight);border-radius:var(--radius);padding:1.2rem;margin-bottom:1rem;">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;color:var(--text);">📍 Delivery Address</h3>
        <p style="line-height:1.6;margin-bottom:.8rem;">${order.deliveryAddress.fullAddress}</p>
        <a href="${order.deliveryAddress.googleMapsLink}" target="_blank" 
           style="display:inline-flex;align-items:center;gap:.3rem;color:var(--accent);font-weight:600;text-decoration:none;">
          🗺️ Open in Google Maps →
        </a>
      </div>

      <!-- Order Items -->
      <div style="margin-bottom:1rem;">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;">🍽️ Order Items</h3>
        ${order.items.map(item => `
          <div style="display:flex;justify-content:space-between;padding:.8rem;background:var(--bg2);border-radius:8px;margin-bottom:.5rem;">
            <div>
              <div style="font-weight:600;">${item.quantity}x ${item.name}</div>
              ${item.customizations && item.customizations.length > 0 ? `
                <div style="font-size:.8rem;color:var(--muted);margin-top:.2rem;">
                  ${item.customizations.map(c => `${c.name}: ${c.option}`).join(', ')}
                </div>
              ` : ''}
            </div>
            <div style="font-weight:700;color:var(--accent);">₹${item.subtotal}</div>
          </div>
        `).join('')}
      </div>

      <!-- Order Summary -->
      <div style="background:var(--bg3);border-radius:var(--radius);padding:1.2rem;margin-bottom:1rem;">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;">💰 Order Summary</h3>
        <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;">
          <span>Subtotal:</span><span>₹${order.orderSummary.subtotal}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;">
          <span>Tax:</span><span>₹${order.orderSummary.tax}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;">
          <span>Delivery Fee:</span><span>₹${order.orderSummary.deliveryFee}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:.8rem;border-top:2px solid var(--border);margin-top:.4rem;font-size:1.2rem;font-weight:900;">
          <span>Total:</span><span style="color:var(--accent);">₹${order.orderSummary.total}</span>
        </div>
      </div>

      <!-- Status Timeline -->
      <div style="margin-bottom:1rem;">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:.8rem;">📋 Status Timeline</h3>
        ${order.statusHistory.map((history, index) => `
          <div style="display:flex;gap:.8rem;margin-bottom:.6rem;">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0;">
              ${index + 1}
            </div>
            <div style="flex:1;">
              <div style="font-weight:600;text-transform:capitalize;">${history.status.replace('_', ' ')}</div>
              <div style="font-size:.8rem;color:var(--muted);">${history.timeAgo}</div>
              ${history.note ? `<div style="font-size:.85rem;color:var(--text2);margin-top:.2rem;">${history.note}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <button onclick="this.closest('.modal-overlay').remove()" class="modal-btn">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function loadDeliveryStats() {
  try {
    const data = await apiCall('/delivery/stats');
    updateDeliveryStats(data.data);
  } catch (error) {
    console.error('Failed to load delivery stats:', error);
  }
}

function updateDeliveryStats(stats) {
  const elements = {
    activeDeliveries: document.getElementById('statActiveDeliveries'),
    outForDelivery: document.getElementById('statOutForDelivery'),
    readyForPickup: document.getElementById('statReadyForPickup'),
    todayDeliveries: document.getElementById('statTodayDeliveries')
  };

  if (elements.activeDeliveries) elements.activeDeliveries.textContent = stats.activeDeliveries;
  if (elements.outForDelivery) elements.outForDelivery.textContent = stats.outForDelivery;
  if (elements.readyForPickup) elements.readyForPickup.textContent = stats.readyForPickup;
  if (elements.todayDeliveries) elements.todayDeliveries.textContent = stats.todayDeliveries;
}

// Make functions globally available
window.loadDeliveryOrders = loadDeliveryOrders;
window.updateDeliveryOrderStatus = updateDeliveryOrderStatus;
window.viewDeliveryOrderDetails = viewDeliveryOrderDetails;
window.loadDeliveryStats = loadDeliveryStats;

// ==================== UNIFIED ROLE ROUTER ====================
function routeByRole(user) {
  if (!user) {
    showAuthScreen();
    return;
  }
  
  currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(user));
  
  // Hide all screens
  const screens = ['authScreen', 'userPanel', 'adminPanel', 'superAdminPanel', 'restAdminPanel', 'kdsPanel', 'riderPanel'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (user.role === 'super_admin') {
    showSuperAdminPanel();
  } else if (user.role === 'admin') {
    showAdminPanel();
  } else if (user.role === 'rest_admin') {
    showRestAdminPanel();
  } else if (user.role === 'kds') {
    showKdsPanel();
  } else if (user.role === 'rider') {
    showRiderPanel();
  } else {
    showUserPanel();
  }
  
  initSocket();
}

function showSuperAdminPanel() {
  document.getElementById('superAdminPanel').style.display = 'block';
  document.getElementById('superName').textContent = currentUser.name || 'Super Admin';
  document.getElementById('superAv').textContent = (currentUser.name || 'S')[0].toUpperCase();
  updateSuperClock();
  if (window.superClockInterval) clearInterval(window.superClockInterval);
  window.superClockInterval = setInterval(updateSuperClock, 30000);
  
  superNav('settings');
}

function updateSuperClock() {
  const el = document.getElementById('superClock');
  if (el) {
    el.textContent = new Date().toLocaleString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }
}

function superNav(tab, el) {
  if (el) {
    document.querySelectorAll('#superAdminPanel .super-nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
  }
  
  // Hide sections
  document.querySelectorAll('#superAdminPanel .super-card').forEach(sec => sec.style.display = 'none');
  const activeSec = document.getElementById('super-sec-' + tab);
  if (activeSec) activeSec.style.display = 'block';
  
  const titleMap = { settings: 'System Settings', hubs: 'Culinary Hubs', revenue: 'Global Revenue' };
  document.getElementById('superPageTitle').textContent = titleMap[tab] || 'Super Dashboard';
  
  if (tab === 'hubs') loadSuperHubs();
  if (tab === 'revenue') loadSuperRevenue();
}

async function loadSuperHubs() {
  const list = document.getElementById('superHubsTable');
  if (!list) return;
  
  // Hubs defined on frontend config, loaded locally
  const hubs = [
    { name: "Madhapur, Hyderabad", city: "Hyderabad", pin: "500081", status: "Active" },
    { name: "Banjara Hills, Hyderabad", city: "Hyderabad", pin: "500034", status: "Active" },
    { name: "Gachibowli, Hyderabad", city: "Hyderabad", pin: "500032", status: "Active" },
    { name: "Indiranagar, Bengaluru", city: "Bengaluru", pin: "560038", status: "Active" },
    { name: "Koramangala, Bengaluru", city: "Bengaluru", pin: "560034", status: "Active" },
    { name: "Bandra West, Mumbai", city: "Mumbai", pin: "400050", status: "Active" },
    { name: "Connaught Place, New Delhi", city: "New Delhi", pin: "110001", status: "Active" }
  ];
  
  list.innerHTML = hubs.map(h => `
    <tr style="border-bottom:1px solid #334155;">
      <td style="padding:0.75rem;">${h.name}</td>
      <td style="padding:0.75rem;">${h.city}</td>
      <td style="padding:0.75rem;">${h.pin}</td>
      <td style="padding:0.75rem;"><span class="badge badge-delivered" style="background:#047857; color:#fff; border:none; padding:0.25rem 0.5rem; font-size:0.75rem;">${h.status}</span></td>
    </tr>
  `).join('');
}

async function loadSuperRevenue() {
  try {
    const data = await apiCall('/orders/admin/all');
    const totalSales = data.data.reduce((sum, o) => sum + (o.total || 0), 0);
    const commission = totalSales * 0.15;
    
    document.getElementById('superTotalSales').textContent = `₹${totalSales.toLocaleString('en-IN')}`;
    document.getElementById('superCommission').textContent = `₹${commission.toLocaleString('en-IN')}`;
  } catch (error) {
    showNotification('Failed to load global revenue data', 'error');
  }
}

function saveSystemSettings() {
  const tax = document.getElementById('sysTax').value;
  const delFee = document.getElementById('sysDelFee').value;
  
  localStorage.setItem('swad_sys_tax', tax);
  localStorage.setItem('swad_sys_delfee', delFee);
  
  showNotification('System configurations updated successfully!', 'success');
}

// ==================== RESTAURANT ADMIN WORLD ====================
function showRestAdminPanel() {
  document.getElementById('restAdminPanel').style.display = 'block';
  document.getElementById('restName').textContent = currentUser.name || 'Store Admin';
  document.getElementById('restAv').textContent = (currentUser.name || 'R')[0].toUpperCase();
  updateRestClock();
  if (window.restClockInterval) clearInterval(window.restClockInterval);
  window.restClockInterval = setInterval(updateRestClock, 30000);
  
  restNav('menu');
}

function updateRestClock() {
  const el = document.getElementById('restClock');
  if (el) {
    el.textContent = new Date().toLocaleString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }
}

function restNav(tab, el) {
  if (el) {
    document.querySelectorAll('#restAdminPanel .rest-nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
  }
  
  document.getElementById('rest-sec-menu').style.display = tab === 'menu' ? 'block' : 'none';
  document.getElementById('rest-sec-orders').style.display = tab === 'orders' ? 'block' : 'none';
  
  document.getElementById('restPageTitle').textContent = tab === 'menu' ? 'Menu Catalog' : 'Kitchen Incoming Orders';
  
  if (tab === 'menu') loadRestMenu();
  if (tab === 'orders') loadRestOrders('all');
}

async function loadRestMenu() {
  try {
    const data = await apiCall('/menu?limit=100');
    const items = data.data;
    const grid = document.getElementById('restMenuGrid');
    if (!grid) return;
    
    grid.innerHTML = items.map(m => `
      <div class="menu-mgr-card">
        <img src="${m.image}" alt="${m.name}" onerror="this.src='https://via.placeholder.com/300x148?text=No+Image'"/>
        <div class="menu-mgr-card-body">
          <div class="mmname">${m.name}</div>
          <div class="mmprice">₹${m.price}</div>
          <div class="mmcat">${m.category}</div>
          <div class="menu-mgr-actions">
            <button class="btn-sm btn-sm-danger" onclick="restDeleteMenuItem('${m._id}')">🗑 Remove</button>
            <label style="display:flex;align-items:center;gap:.4rem;font-size:.77rem;color:var(--text2);cursor:pointer;margin-left:auto">
              <input type="checkbox" ${m.isAvailable?'checked':''} onchange="restToggleAvail('${m._id}', this.checked)"/> Available
            </label>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showNotification('Failed to load restaurant menu catalog', 'error');
  }
}

async function restAddMenuItem() {
  const name = document.getElementById('restNiName').value.trim();
  const price = parseInt(document.getElementById('restNiPrice').value);
  const category = document.getElementById('restNiCat').value;
  const image = document.getElementById('restNiImg').value.trim();
  const description = document.getElementById('restNiDesc').value.trim();
  
  if (!name || !price || price < 1) {
    showNotification('Dish name and price are required', 'error');
    return;
  }
  
  const payload = {
    name,
    price,
    category,
    description: description || 'Freshly prepared specialty dish.',
    image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'
  };
  
  try {
    await apiCall('/menu', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    showNotification(`Added ${name} to catalog!`, 'success');
    loadRestMenu();
    ['restNiName', 'restNiPrice', 'restNiImg', 'restNiDesc'].forEach(id => {
      document.getElementById(id).value = '';
    });
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function restDeleteMenuItem(id) {
  if (!confirm('Remove this dish from the menu catalog?')) return;
  try {
    await apiCall(`/menu/${id}`, { method: 'DELETE' });
    showNotification('Menu item removed', 'success');
    loadRestMenu();
  } catch (error) {
    showNotification('Failed to delete menu item', 'error');
  }
}

async function restToggleAvail(id, checked) {
  try {
    await apiCall(`/menu/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable: checked })
    });
    showNotification(checked ? 'Item marked available' : 'Item marked unavailable', 'success');
  } catch (error) {
    showNotification('Failed to update availability', 'error');
  }
}

async function loadRestOrders(status = 'all') {
  try {
    const data = await apiCall('/orders/admin/all');
    let orders = data.data;
    if (status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }
    
    const table = document.getElementById('restOrdersTable');
    if (!table) return;
    
    if (orders.length === 0) {
      table.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#78716c; padding:2rem;">No kitchen orders found.</td></tr>';
      return;
    }
    
    table.innerHTML = orders.map(o => {
      const itemsStr = o.items.map(i => `${i.name}×${i.quantity}`).join(', ');
      
      let actionsHtml = '';
      if (o.status === 'pending') {
        actionsHtml = `<button class="btn-sm" style="background:#f97316; color:#fff;" onclick="restUpdateOrderStatus('${o._id}', 'confirmed')">Confirm</button>`;
      } else if (o.status === 'confirmed') {
        actionsHtml = `<button class="btn-sm" style="background:#eab308; color:#fff;" onclick="restUpdateOrderStatus('${o._id}', 'preparing')">Start Prep</button>`;
      } else if (o.status === 'preparing') {
        actionsHtml = `<span style="font-weight:600; color:#eab308;">In Prep (KDS)</span>`;
      } else if (o.status === 'ready') {
        actionsHtml = `<span style="font-weight:600; color:#2563eb;">Ready (Rider)</span>`;
      } else {
        actionsHtml = `<span style="text-transform:capitalize; color:#78716c;">${o.status.replace('_', ' ')}</span>`;
      }
      
      return `
        <tr>
          <td style="font-family:monospace; font-size:0.8rem;">#${o.orderNumber}</td>
          <td style="font-weight:600;">${o.user.name}</td>
          <td>${itemsStr}</td>
          <td style="font-weight:700; color:#c8392b;">₹${o.total}</td>
          <td><span class="badge badge-${o.status}">${o.status.replace('_', ' ')}</span></td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showNotification('Failed to load kitchen orders', 'error');
  }
}

async function restUpdateOrderStatus(id, status) {
  try {
    await apiCall(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note: `Status updated by Restaurant Admin to ${status}` })
    });
    showNotification(`Order status updated to ${status}!`, 'success');
    loadRestOrders(document.getElementById('restOrderFilter').value);
  } catch (error) {
    showNotification('Failed to update status', 'error');
  }
}

// ==================== KITCHEN DISPLAY SCREEN (KDS) ====================
function showKdsPanel() {
  document.getElementById('kdsPanel').style.display = 'block';
  updateKdsClock();
  if (window.kdsClockInterval) clearInterval(window.kdsClockInterval);
  window.kdsClockInterval = setInterval(updateKdsClock, 10000);
  
  loadKdsOrders();
  if (window.kdsPollInterval) clearInterval(window.kdsPollInterval);
  window.kdsPollInterval = setInterval(loadKdsOrders, 20000); // Poll kitchen orders every 20 seconds
}

function updateKdsClock() {
  const el = document.getElementById('kdsClock');
  if (el) {
    el.textContent = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
    });
  }
}

async function loadKdsOrders() {
  try {
    const data = await apiCall('/orders/admin/all');
    // KDS screen displays orders in 'confirmed' or 'preparing' status
    const orders = data.data.filter(o => ['confirmed', 'preparing'].includes(o.status));
    const grid = document.getElementById('kdsGrid');
    if (!grid) return;
    
    if (orders.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#64748b; padding:4rem; font-size:1.2rem;">🍳 Kitchen Queue Empty - No Active Orders.</div>';
      return;
    }
    
    grid.innerHTML = orders.map(o => {
      const elapsedMins = Math.floor((Date.now() - new Date(o.createdAt)) / 60000);
      const itemsList = o.items.map((item, idx) => `
        <div class="kds-item-row">
          <input type="checkbox" id="check-${o._id}-${idx}" class="kds-item-check"/>
          <label for="check-${o._id}-${idx}" style="cursor:pointer; flex:1;">
            <strong>${item.quantity}x</strong> ${item.name}
          </label>
        </div>
      `).join('');
      
      const buttonHtml = o.status === 'confirmed'
        ? `<button class="rider-btn" onclick="kdsChangeStatus('${o._id}', 'preparing')">🧑‍🍳 Start Preparing</button>`
        : `<button class="rider-btn rider-btn-success" onclick="kdsChangeStatus('${o._id}', 'ready')">🔔 Mark Ready</button>`;
        
      return `
        <div class="kds-card kds-${o.status}">
          <div class="kds-card-head">
            <span class="kds-order-num">#${o.orderNumber.slice(-6)}</span>
            <span class="kds-timer">⏱️ ${elapsedMins} mins</span>
          </div>
          <div class="kds-card-body">
            <div style="font-size:0.9rem; color:#94a3b8; margin-bottom:1rem; border-bottom:1px solid #334155; padding-bottom:0.5rem;">
              Customer: <strong>${o.user.name}</strong>
            </div>
            <div style="display:flex; flex-direction:column;">
              ${itemsList}
            </div>
            ${o.specialInstructions ? `
              <div class="kds-instruction">
                ⚠️ Note: ${o.specialInstructions}
              </div>
            ` : ''}
          </div>
          <div class="kds-card-footer">
            ${buttonHtml}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load KDS queue', error);
  }
}

async function kdsChangeStatus(id, status) {
  try {
    const note = status === 'preparing' ? 'Kitchen started preparation' : 'Kitchen marked order ready';
    await apiCall(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note })
    });
    
    showNotification(status === 'preparing' ? 'Started preparing!' : 'Order is ready!', 'success');
    loadKdsOrders();
  } catch (error) {
    showNotification('Failed to update kitchen status', 'error');
  }
}

// ==================== RIDER PORTAL WORLD ====================
let riderActiveTab = 'available';

function showRiderPanel() {
  document.getElementById('riderPanel').style.display = 'block';
  document.getElementById('riderNameHeader').textContent = `Delivery Partner: ${currentUser.name}`;
  switchRiderTab('available');
}

function switchRiderTab(tab) {
  riderActiveTab = tab;
  document.querySelectorAll('#riderPanel .rider-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-rider-' + tab).classList.add('active');
  
  document.getElementById('rider-sec-available').style.display = tab === 'available' ? 'block' : 'none';
  document.getElementById('rider-sec-active').style.display = tab === 'active' ? 'block' : 'none';
  document.getElementById('rider-sec-earnings').style.display = tab === 'earnings' ? 'block' : 'none';
  
  if (tab === 'available') loadRiderAvailableOrders();
  if (tab === 'active') loadRiderActiveTask();
  if (tab === 'earnings') loadRiderEarnings();
}

async function loadRiderAvailableOrders() {
  try {
    const data = await apiCall('/delivery/orders?status=ready');
    const orders = data.data;
    const tabEl = document.getElementById('tab-rider-available');
    if (tabEl) tabEl.textContent = `Available (${orders.length})`;
    
    const list = document.getElementById('riderAvailableList');
    if (!list) return;
    
    if (orders.length === 0) {
      list.innerHTML = '<div class="rider-card" style="text-align:center; color:#64748b; padding:3rem;">🏍️ No orders ready for pickup. Keep waiting!</div>';
      return;
    }
    
    list.innerHTML = orders.map(o => `
      <div class="rider-card">
        <div style="display:flex; justify-content:space-between; margin-bottom:1rem; padding-bottom:0.5rem; border-bottom:1px solid #e2e8f0;">
          <strong>Order #${o.orderNumber.slice(-6)}</strong>
          <span style="font-weight:700; color:#4f46e5;">₹${o.orderDetails.total}</span>
        </div>
        <div style="margin-bottom:1rem; font-size:0.9rem; display:grid; gap:0.4rem;">
          <div>🏢 <strong>Restaurant:</strong> SVAD Hub, Madhapur</div>
          <div>📍 <strong>Customer Area:</strong> ${o.deliveryAddress.city}</div>
          <div>💳 <strong>Payment Method:</strong> ${o.orderDetails.paymentMethod.toUpperCase()}</div>
        </div>
        <button class="rider-btn" onclick="riderAcceptOrder('${o._id}')">Claim Delivery Task</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Rider open list load error', error);
  }
}

async function riderAcceptOrder(id) {
  try {
    await apiCall(`/delivery/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'out_for_delivery', note: 'Rider claimed delivery' })
    });
    
    showNotification('Task accepted! Head to restaurant.', 'success');
    switchRiderTab('active');
  } catch (error) {
    showNotification('Failed to accept order task', 'error');
  }
}

async function loadRiderActiveTask() {
  const container = document.getElementById('riderActiveTaskContainer');
  if (!container) return;
  
  try {
    const data = await apiCall('/delivery/orders');
    // Find if there is an active order accepted by this driver
    const activeOrder = data.data.find(o => o.status === 'out_for_delivery');
    
    if (!activeOrder) {
      container.innerHTML = '<div class="rider-card" style="text-align:center; color:#64748b; padding:3rem;">🏍️ No active task. Claim one under Available tab.</div>';
      return;
    }
    
    const itemsStr = activeOrder.items.map(item => `
      <div style="display:flex; justify-content:space-between; font-size:0.95rem; margin-bottom:0.25rem;">
        <span>${item.quantity}x ${item.name}</span>
        <span>₹${item.subtotal}</span>
      </div>
    `).join('');
    
    container.innerHTML = `
      <div class="rider-card">
        <h3 style="margin-bottom:1rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.5rem; color:#4f46e5;">Active Task Details</h3>
        <div style="background:#f1f5f9; padding:1rem; border-radius:8px; margin-bottom:1.5rem; display:grid; gap:0.5rem;">
          <div>👤 <strong>Customer:</strong> ${activeOrder.customer.name}</div>
          <div>📞 <strong>Phone:</strong> <a href="tel:${activeOrder.customer.phone}" style="color:#4f46e5; font-weight:700;">${activeOrder.customer.phone}</a></div>
          <div>📍 <strong>Address:</strong> ${activeOrder.deliveryAddress.fullAddress}</div>
          <div style="margin-top:0.5rem;">
            <a href="${activeOrder.deliveryAddress.googleMapsLink}" target="_blank" style="color:#4f46e5; font-weight:700; text-decoration:none;">🗺️ Open in Google Maps →</a>
          </div>
        </div>
        
        <div style="margin-bottom:1.5rem;">
          <h4 style="margin-bottom:0.5rem; font-weight:700;">Order Items</h4>
          ${itemsStr}
        </div>
        
        <div style="border-top:1.5px solid #e2e8f0; padding-top:1rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; font-weight:800; font-size:1.1rem;">
          <span>Collect Cash:</span>
          <span style="color:#c8392b;">₹${activeOrder.orderDetails.total}</span>
        </div>
        
        <button class="rider-btn rider-btn-success" onclick="riderCompleteDelivery('${activeOrder._id}')">✅ Confirm Delivered</button>
      </div>
    `;
  } catch (error) {
    console.error('Rider active task load error', error);
  }
}

async function riderCompleteDelivery(id) {
  try {
    await apiCall(`/delivery/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'delivered', note: 'Rider marked order delivered' })
    });
    
    showNotification('Order completed successfully! ₹40 earned.', 'success');
    switchRiderTab('earnings');
  } catch (error) {
    showNotification('Failed to complete delivery', 'error');
  }
}

async function loadRiderEarnings() {
  try {
    const data = await apiCall('/delivery/stats');
    // Fetch delivered orders count from API stats or locally
    const stats = data.data;
    const completedCount = stats.todayDeliveries || 0;
    const totalEarnings = completedCount * 40; // Rider earns ₹40 base fee per completed order
    
    document.getElementById('riderTotalEarnings').textContent = `₹${totalEarnings.toFixed(2)}`;
    document.getElementById('riderCompletedCount').textContent = `${completedCount} orders completed`;
    
    // Renders custom completed deliveries list
    const list = document.getElementById('riderEarningsList');
    if (!list) return;
    
    const ordersData = await apiCall('/orders/admin/all');
    const riderDelivered = ordersData.data.filter(o => o.status === 'delivered');
    
    if (riderDelivered.length === 0) {
      list.innerHTML = '<p style="color:#64748b; font-size:0.9rem; text-align:center;">No completed tasks today.</p>';
      return;
    }
    
    list.innerHTML = riderDelivered.map(o => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;">
        <div>
          <span style="font-weight:700;">#${o.orderNumber.slice(-6)}</span>
          <span style="font-size:0.8rem; color:#64748b; margin-left:0.5rem;">${new Date(o.updatedAt).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'})}</span>
        </div>
        <span style="color:#16a34a; font-weight:700;">+₹40.00</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Rider earnings load error', error);
  }
}

// Make functions globally available
window.routeByRole = routeByRole;
window.superNav = superNav;
window.saveSystemSettings = saveSystemSettings;
window.restNav = restNav;
window.restAddMenuItem = restAddMenuItem;
window.restDeleteMenuItem = restDeleteMenuItem;
window.restToggleAvail = restToggleAvail;
window.loadRestOrders = loadRestOrders;
window.restUpdateOrderStatus = restUpdateOrderStatus;
window.kdsChangeStatus = kdsChangeStatus;
window.switchRiderTab = switchRiderTab;
window.riderAcceptOrder = riderAcceptOrder;
window.riderCompleteDelivery = riderCompleteDelivery;
