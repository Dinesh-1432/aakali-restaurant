// ===== TASKBAR FUNCTIONALITY =====
function taskbarAction(action) {
  // Remove active class from all taskbar items
  document.querySelectorAll('.taskbar-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Perform action
  switch(action) {
    case 'menu':
      backToMenu();
      const elMenu = document.querySelector(`.taskbar-item[data-action="menu"]`);
      if (elMenu) elMenu.classList.add('active');
      break;
    case 'search':
      toggleMobileSearch(true);
      break;
    case 'cart':
      toggleCart();
      break;
    case 'orders':
      showSection('orders');
      const elOrders = document.querySelector(`.taskbar-item[data-action="orders"]`);
      if (elOrders) elOrders.classList.add('active');
      break;
    case 'profile':
      showSection('profile');
      const elProfile = document.querySelector(`.taskbar-item[data-action="profile"]`);
      if (elProfile) elProfile.classList.add('active');
      break;
  }
}

// Update taskbar cart badge
function updateTaskbarCartBadge() {
  const badge = document.getElementById('taskbarCartBadge');
  const count = cart.reduce((sum, item) => sum + (item.qty || item.quantity || 0), 0);
  
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Update taskbar time
function updateTaskbarTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  document.getElementById('taskbarTime').textContent = timeStr;
}

// Show taskbar when user is logged in
function showTaskbar() {
  // Show desktop flat taskbar
  const tb = document.getElementById('taskbar');
  if (tb) {
    tb.style.display = 'flex';
  }
  // Show mobile premium taskbar
  const mobTb = document.getElementById('mobileTaskbar');
  if (mobTb) {
    mobTb.classList.remove('tb-hidden');
  }
  
  // Add bottom padding to user panel to prevent content from being hidden behind taskbar
  const userPanel = document.getElementById('userPanel');
  if (userPanel) {
    userPanel.style.paddingBottom = '80px';
  }
  
  // Update time immediately and then every minute
  updateTaskbarTime();
  if (window.taskbarTimeInterval) clearInterval(window.taskbarTimeInterval);
  window.taskbarTimeInterval = setInterval(updateTaskbarTime, 60000);
  
  // Update cart badge
  updateTaskbarCartBadge();
}

// Hide taskbar when user logs out
function hideTaskbar() {
  // Hide desktop flat taskbar
  const tb = document.getElementById('taskbar');
  if (tb) {
    tb.style.display = 'none';
  }
  // Hide mobile premium taskbar
  const mobTb = document.getElementById('mobileTaskbar');
  if (mobTb) {
    mobTb.classList.add('tb-hidden');
  }
  
  const userPanel = document.getElementById('userPanel');
  if (userPanel) {
    userPanel.style.paddingBottom = '0';
  }
  if (window.taskbarTimeInterval) {
    clearInterval(window.taskbarTimeInterval);
  }
}

function triggerFlyingCartAnimation() {
  const event = window.event;
  let startX = window.innerWidth / 2;
  let startY = window.innerHeight / 2;
  if (event && event.clientX && event.clientY) {
    startX = event.clientX;
    startY = event.clientY;
  }

  let targetBtn = document.querySelector('.cart-btn');
  if (window.innerWidth <= 768) {
    targetBtn = document.getElementById('taskbarCartBadge') || document.querySelector('[data-action="cart"]') || document.querySelector('.taskbar-item:nth-child(3)');
  }

  if (!targetBtn) return;

  const rect = targetBtn.getBoundingClientRect();
  const endX = rect.left + rect.width / 2;
  const endY = rect.top + rect.height / 2;

  const flyer = document.createElement('div');
  flyer.className = 'flying-cart-item';
  flyer.innerHTML = '🍔';
  flyer.style.left = startX + 'px';
  flyer.style.top = startY + 'px';
  document.body.appendChild(flyer);

  const duration = 750;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const currentX = startX + (endX - startX) * progress;
    const linearY = startY + (endY - startY) * progress;
    const peakHeight = 150;
    const currentY = linearY - Math.sin(progress * Math.PI) * peakHeight;

    flyer.style.left = currentX + 'px';
    flyer.style.top = currentY + 'px';
    flyer.style.transform = `translate(-50%, -50%) scale(${1 - progress * 0.4})`;
    flyer.style.opacity = 1 - progress * 0.15;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      flyer.remove();
      targetBtn.classList.add('cart-bounce');
      setTimeout(() => targetBtn.classList.remove('cart-bounce'), 400);

      const mobCartBadge = document.getElementById('taskbarCartBadge');
      if (mobCartBadge) {
        mobCartBadge.classList.add('cart-bounce');
        setTimeout(() => mobCartBadge.classList.remove('cart-bounce'), 400);
      }
      const desktopBadge = document.getElementById('cartBadge');
      if (desktopBadge) {
        desktopBadge.classList.add('cart-bounce');
        setTimeout(() => desktopBadge.classList.remove('cart-bounce'), 400);
      }
    }
  }

  requestAnimationFrame(animate);
}

// Override existing functions to update taskbar + floating cart bar
const originalAddToCart = addToCart;
addToCart = function(id) {
  originalAddToCart(id);
  updateTaskbarCartBadge();
  if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
  try { triggerFlyingCartAnimation(); } catch(e) { console.error(e); }
};

const originalChangeQty = changeQty;
changeQty = function(id, delta) {
  originalChangeQty(id, delta);
  updateTaskbarCartBadge();
  if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
};

const originalRemoveFromCart = removeFromCart;
removeFromCart = function(id) {
  originalRemoveFromCart(id);
  updateTaskbarCartBadge();
  if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
};

const originalChangeQtyMenu = changeQtyMenu;
changeQtyMenu = function(id, delta) {
  originalChangeQtyMenu(id, delta);
  updateTaskbarCartBadge();
  if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
};

const originalMobSearchAddToCart = mobSearchAddToCart;
mobSearchAddToCart = function(id) {
  originalMobSearchAddToCart(id);
  if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
  try { triggerFlyingCartAnimation(); } catch(e) { console.error(e); }
};

const originalMobSearchChangeQty = mobSearchChangeQty;
mobSearchChangeQty = function(id, d) {
  originalMobSearchChangeQty(id, d);
  if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
};

// ===== FLOATING CART BAR FUNCTIONALITY =====
function updateFloatingCartBar() {
  const bar = document.getElementById('cart-bar');
  if (!bar) return;
  
  const isUser = currentUser && currentUser.role !== 'admin';
  const hasItems = cart && cart.length > 0;
  
  // removed: legacy checkout cleanup (dropped paymentEl visibility check)
  // Check if checkoutPage or orderSuccessPage is currently displayed
  const checkoutEl = document.getElementById('checkoutPage');
  const successEl = document.getElementById('orderSuccessPage');
  const isCheckoutOrSuccess = (checkoutEl && checkoutEl.style.display !== 'none') || 
                              (successEl && successEl.style.display !== 'none');
  
  if (isUser && hasItems && !isCheckoutOrSuccess) {
    renderFloatingCartBarItems();
    bar.classList.add('visible');
  } else {
    bar.classList.remove('visible');
  }
}

function renderFloatingCartBarItems() {
  const menu = getMenu();
  // Total items count and price
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce((s, c) => s + c.price * c.qty, 0);

  // Show first item's image
  const firstItem = cart[0];
  const imgEl = document.getElementById('cb-food-img');
  if (imgEl && firstItem) {
    const menuItem = menu.find(m => m.id === firstItem.id);
    imgEl.src = (menuItem && menuItem.img) ? menuItem.img : 'https://via.placeholder.com/80x80?text=🍽️';
    imgEl.onerror = function() { this.src = 'https://via.placeholder.com/80x80?text=🍽️'; };
  }

  // Update title: show item name if only 1 unique item, else show count
  const titleEl = document.getElementById('cb-title');
  if (titleEl) {
    if (cart.length === 1) {
      titleEl.textContent = firstItem.name;
    } else {
      titleEl.textContent = cart.map(c => c.name).join(', ');
    }
  }

  // Update checkout button
  const btnTop = document.getElementById('cb-btn-top');
  const btnBottom = document.getElementById('cb-btn-bottom');
  if (btnTop) btnTop.textContent = `${totalQty} item${totalQty !== 1 ? 's' : ''} | ₹${totalPrice}`;
  if (btnBottom) btnBottom.textContent = 'View Cart';
}

function clearCart() {
  if (confirm('Are you sure you want to clear your cart?')) {
    cart = [];
    updateCartBadge();
    renderCartDrawer();
    renderMenu($('navSearch') ? $('navSearch').value : '');
    toast('Cart cleared successfully', 'info');
  }
}

// Update initUser function to show taskbar & floating bar
const originalInitUser = initUser;
initUser = function() {
  originalInitUser();
  showTaskbar();
  updateFloatingCartBar();
  initLocation();
};

// Update logout function to hide taskbar & floating bar
const originalLogout = logout;
logout = function() {
  hideTaskbar();
  originalLogout();
  updateFloatingCartBar();
  localStorage.removeItem('swad_detected_location');
};

// Update showSection function to update taskbar active state & floating bar
const originalShowSection = showSection;
showSection = function(section) {
  originalShowSection(section);
  
  // Update taskbar active state
  document.querySelectorAll('.taskbar-item').forEach(item => {
    item.classList.remove('active');
  });
  
  if (section === 'orders') {
    const el = document.querySelector('[data-action="orders"]');
    if (el) el.classList.add('active');
  } else if (section === 'profile') {
    const el = document.querySelector('[data-action="profile"]');
    if (el) el.classList.add('active');
  } else {
    const el = document.querySelector('[data-action="menu"]');
    if (el) el.classList.add('active');
  }
  updateFloatingCartBar();
};

// Update backToMenu function to update taskbar active state & floating bar
const originalBackToMenu = backToMenu;
backToMenu = function() {
  originalBackToMenu();
  
  // Update taskbar active state
  document.querySelectorAll('.taskbar-item').forEach(item => {
    item.classList.remove('active');
  });
  const el = document.querySelector('[data-action="menu"]');
  if (el) el.classList.add('active');
  updateFloatingCartBar();
};

// Update goToCheckout function to hide floating bar
const originalGoToCheckout = goToCheckout;
goToCheckout = function() {
  originalGoToCheckout();
  updateFloatingCartBar();
  
  // Sync location to checkout fields when entering checkout
  const cached = localStorage.getItem('swad_detected_location');
  if (cached) {
    try {
      const loc = JSON.parse(cached);
      updateLocationUI(loc.displayName, loc.area, loc.city, loc.pincode);
    } catch(e) {}
  }
};

// Override renderCartDrawer to keep floating cart bar updated
const originalRenderCartDrawer = renderCartDrawer;
renderCartDrawer = function() {
  originalRenderCartDrawer();
  if (typeof updateFloatingCartBar === 'function') {
    updateFloatingCartBar();
  }
};

// ===== GEOLOCATION & HUB SELECTOR LOGIC =====
const CULINARY_HUBS = [
  { name: "Madhapur, Hyderabad", lat: 17.4483, lon: 78.3915, area: "Madhapur", city: "Hyderabad", pin: "500081" },
  { name: "Banjara Hills, Hyderabad", lat: 17.4156, lon: 78.4347, area: "Banjara Hills", city: "Hyderabad", pin: "500034" },
  { name: "Gachibowli, Hyderabad", lat: 17.4401, lon: 78.3489, area: "Gachibowli", city: "Hyderabad", pin: "500032" },
  { name: "Indiranagar, Bengaluru", lat: 12.9719, lon: 77.6412, area: "Indiranagar", city: "Bengaluru", pin: "560038" },
  { name: "Koramangala, Bengaluru", lat: 12.9352, lon: 77.6245, area: "Koramangala", city: "Bengaluru", pin: "560034" },
  { name: "Bandra West, Mumbai", lat: 19.0600, lon: 72.8311, area: "Bandra West", city: "Mumbai", pin: "400050" },
  { name: "Connaught Place, New Delhi", lat: 28.6304, lon: 77.2177, area: "Connaught Place", city: "New Delhi", pin: "110001" },
  { name: "Koregaon Park, Pune", lat: 18.5362, lon: 73.8940, area: "Koregaon Park", city: "Pune", pin: "411001" }
];

function toggleLocationDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('locationDropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
}

function selectLocationHub(displayName, area, city, pincode) {
  updateLocationUI(displayName, area, city, pincode);
  const dropdown = document.getElementById('locationDropdown');
  if (dropdown) {
    dropdown.classList.remove('open');
  }
}

function updateLocationUI(displayName, area, city, pincode) {
  const navText = document.getElementById('navLocationText');
  if (navText) {
    navText.textContent = displayName;
  }
  
  localStorage.setItem('swad_detected_location', JSON.stringify({ displayName, area, city, pincode }));
  
  const coAddr2 = document.getElementById('co-addr2');
  const coCity = document.getElementById('co-city');
  const coPin = document.getElementById('co-pin');
  if (coAddr2) coAddr2.value = area;
  if (coCity) coCity.value = city;
  if (coPin) coPin.value = pincode;
  
  if (typeof window.updateCheckoutHeaderAddress === 'function') {
    window.updateCheckoutHeaderAddress();
  } else {
    const coHeaderAddr = document.querySelector('.sco-address-line');
    if (coHeaderAddr) coHeaderAddr.textContent = `📍 Delivering to: ${displayName}`;
  }
}

async function detectUserLocation(event) {
  if (event) event.stopPropagation();
  
  const navBtn = document.getElementById('navLocationBtn');
  const navText = document.getElementById('navLocationText');
  if (navBtn) navBtn.classList.add('loading');
  if (navText) navText.textContent = 'Detecting...';
  
  if (!navigator.geolocation) {
    toast('Geolocation not supported', 'error');
    useDefaultLocation();
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      let resolved = false;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' }
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const area = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.road || "";
            const city = data.address.city || data.address.town || data.address.village || "";
            const postcode = data.address.postcode || "";
            
            if (area || city) {
              const displayName = (area && city) ? `${area}, ${city}` : (area || city);
              updateLocationUI(displayName, area || "Madhapur", city || "Hyderabad", postcode || "500081");
              resolved = true;
              toast(`Detected location: ${displayName}`, 'success');
            }
          }
        }
      } catch (e) {
        console.log("Could not use online API for geolocation, trying offline matching.", e);
      }
      
      if (!resolved) {
        let closestHub = CULINARY_HUBS[0];
        let minDistance = Infinity;
        
        for (const hub of CULINARY_HUBS) {
          const dLat = hub.lat - lat;
          const dLon = hub.lon - lon;
          const dist = Math.sqrt(dLat * dLat + dLon * dLon);
          if (dist < minDistance) {
            minDistance = dist;
            closestHub = hub;
          }
        }
        
        updateLocationUI(closestHub.name, closestHub.area, closestHub.city, closestHub.pin);
        toast(`Auto-detected: ${closestHub.name} (offline)`, 'success');
      }
      
      if (navBtn) navBtn.classList.remove('loading');
      const dropdown = document.getElementById('locationDropdown');
      if (dropdown) dropdown.classList.remove('open');
    },
    (error) => {
      console.log("Geolocation error: ", error);
      toast('Could not detect location. Using default.', 'error');
      useDefaultLocation();
    },
    { timeout: 8000 }
  );
}

function useDefaultLocation() {
  const defaultHub = CULINARY_HUBS[0];
  updateLocationUI(defaultHub.name, defaultHub.area, defaultHub.city, defaultHub.pin);
  const navBtn = document.getElementById('navLocationBtn');
  if (navBtn) navBtn.classList.remove('loading');
}

function initLocation() {
  const cached = localStorage.getItem('swad_detected_location');
  if (cached) {
    try {
      const loc = JSON.parse(cached);
      updateLocationUI(loc.displayName, loc.area, loc.city, loc.pincode);
    } catch(e) {
      detectUserLocation();
    }
  } else {
    detectUserLocation();
  }
}

// removed: legacy checkout cleanup (goToPaymentPage only showed the removed #paymentPage and populated its DOM)

// removed: legacy checkout cleanup (backToCheckout was only called from the removed #paymentPage HTML)

function selectUPIAppNew(btn, app, event) {
  if (event) event.stopPropagation();
  _pgSubMethod = app;
  document.querySelectorAll('#pgSection-recommended-upi .pg-recommended-item').forEach(b => b.classList.remove('pg-upi-active'));
  btn.classList.add('pg-upi-active');
  selectPGMethod('upi', 'recommended-upi');
}

function selectWalletApp(btn, wallet, event) {
  if (event) event.stopPropagation();
  _pgSubMethod = wallet;
  document.querySelectorAll('.pg-wallet-btn').forEach(b => b.classList.remove('pg-wallet-active'));
  btn.classList.add('pg-wallet-active');
  selectPGMethod('wallets', 'wallets');
}

function onBankSelectChange(sel) {
  if(sel && sel.value) {
    document.querySelectorAll('.pg-bank-btn').forEach(b => b.classList.remove('pg-bank-active'));
    selectPGMethod('netbanking', 'netbanking');
  }
}


// Close location dropdown when clicking outside
document.addEventListener('click', (event) => {
  const dropdown = document.getElementById('locationDropdown');
  const navBtn = document.getElementById('navLocationBtn');
  if (dropdown && dropdown.classList.contains('open')) {
    if (!dropdown.contains(event.target) && !navBtn.contains(event.target)) {
      dropdown.classList.remove('open');
    }
  }
});

// On page load, if user is logged in, hide auth screen and route user based on their role
if (typeof currentUser !== 'undefined' && currentUser) {
  const auth = document.getElementById('authScreen');
  if (auth) auth.style.display = 'none';
  window.addEventListener('load', () => {
    if (typeof routeByRole === 'function') {
      routeByRole(currentUser);
    } else {
      initUser();
    }
  }, { once: true });
}

// ============================================================
// TEMPORARY: GUEST BYPASS — skip the login gate and open the
// Aakali marketplace home directly. Set to false to restore login.
// (Guests can browse; placing an order still requires signing in.)
// ============================================================
const AAKALI_GUEST_BYPASS = true;
if (AAKALI_GUEST_BYPASS && (typeof currentUser === 'undefined' || !currentUser)) {
  currentUser = { id: 'guest', name: 'Guest', email: '', phone: '', role: 'user' };
  const authEl = document.getElementById('authScreen');
  if (authEl) authEl.style.display = 'none';
  window.addEventListener('load', () => {
    if (typeof showSwadHome === 'function') showSwadHome();
    else if (typeof initUser === 'function') initUser();
  }, { once: true });
}
initializeGoogleSignIn();

// ═══════════════════════════════════════════════════════
// SWAD MULTI-RESTAURANT PLATFORM
// ═══════════════════════════════════════════════════════

// Restaurant data
const SWAD_RESTAURANTS = [
  {
    id: 'swad-kitchen',
    name: 'SWAD Kitchen',
    cuisine: 'North Indian • Mughlai • Tandoor',
    rating: 4.5,
    ratingCount: '2.1k',
    deliveryTime: '25–35 min',
    priceRange: '₹200 for two',
    discount: '40% OFF up to ₹80',
    isVeg: false,
    isNew: false,
    isClosed: false,
    tags: ['biryani','north','tandoor'],
    img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    menuCategory: 'nonveg'
  },
  {
    id: 'biryani-blues',
    name: 'Biryani Blues',
    cuisine: 'Biryani • Hyderabadi • Mughlai',
    rating: 4.3,
    ratingCount: '4.8k',
    deliveryTime: '30–40 min',
    priceRange: '₹300 for two',
    discount: 'Free Delivery',
    isVeg: false,
    isNew: false,
    isClosed: false,
    tags: ['biryani','north'],
    img: 'https://images.unsplash.com/photo-1563379091339-03246963a92a?w=600&q=80',
    menuCategory: 'nonveg'
  },
  {
    id: 'pizza-palace',
    name: 'Pizza Palace',
    cuisine: 'Pizza • Italian • Pasta',
    rating: 4.2,
    ratingCount: '1.6k',
    deliveryTime: '20–30 min',
    priceRange: '₹350 for two',
    discount: '₹100 OFF above ₹399',
    isVeg: false,
    isNew: false,
    isClosed: false,
    tags: ['pizza'],
    img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
    menuCategory: 'veg'
  },
  {
    id: 'burger-barn',
    name: 'Burger Barn',
    cuisine: 'Burgers • Wraps • American',
    rating: 4.4,
    ratingCount: '3.2k',
    deliveryTime: '15–25 min',
    priceRange: '₹250 for two',
    discount: 'Buy 1 Get 1 Free',
    isVeg: false,
    isNew: true,
    isClosed: false,
    tags: ['burger'],
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    menuCategory: 'nonveg'
  },
  {
    id: 'dosa-delight',
    name: 'Dosa Delight',
    cuisine: 'South Indian • Idli • Dosa',
    rating: 4.6,
    ratingCount: '5.3k',
    deliveryTime: '20–30 min',
    priceRange: '₹150 for two',
    discount: '20% OFF on first order',
    isVeg: true,
    isNew: false,
    isClosed: false,
    tags: ['south'],
    img: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600&q=80',
    menuCategory: 'veg'
  },
  {
    id: 'dragon-wok',
    name: 'Dragon Wok',
    cuisine: 'Chinese • Asian • Indo-Chinese',
    rating: 4.1,
    ratingCount: '987',
    deliveryTime: '35–45 min',
    priceRange: '₹280 for two',
    discount: 'Free Delivery',
    isVeg: false,
    isNew: false,
    isClosed: false,
    tags: ['chinese'],
    img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
    menuCategory: 'nonveg'
  },
  {
    id: 'sweet-treats',
    name: 'Sweet Treats',
    cuisine: 'Desserts • Ice Cream • Bakery',
    rating: 4.7,
    ratingCount: '2.4k',
    deliveryTime: '25–35 min',
    priceRange: '₹180 for two',
    discount: '30% OFF up to ₹60',
    isVeg: true,
    isNew: false,
    isClosed: false,
    tags: ['dessert','drinks'],
    img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80',
    menuCategory: 'dessert'
  },
  {
    id: 'tandoor-tales',
    name: 'Tandoor Tales',
    cuisine: 'Tandoor • Punjabi • Kebabs',
    rating: 4.3,
    ratingCount: '1.8k',
    deliveryTime: '30–40 min',
    priceRange: '₹320 for two',
    discount: '₹50 OFF on orders above ₹299',
    isVeg: false,
    isNew: true,
    isClosed: false,
    tags: ['tandoor','north'],
    img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80',
    menuCategory: 'nonveg'
  }
];

let swadActiveCat = 'all';
let swadActiveSort = 'all';
let swadSearchQuery = '';
let swadSelectedRestaurant = null;

async function showSwadHome() {
  $('authScreen').style.display = 'none';
  document.querySelectorAll('#userPanel, #adminPanel, #superAdminPanel, #restAdminPanel, #kdsPanel, #riderPanel').forEach(el => {
    if (el) el.style.display = 'none';
  });
  $('swadHome').style.display = 'block';
  showRestaurantsSkeleton();
  // Update user avatar
  const swadBtn = document.getElementById('swadNavUserBtn');
  if (swadBtn && currentUser) swadBtn.textContent = currentUser.name[0].toUpperCase();
  
  // Load from API
  try {
    const res = await fetch(API_BASE_URL + '/api/restaurants');
    const data = await res.json();
    if (data.success && data.data) {
      const mapped = data.data.map(r => ({
        id: r._id,
        name: r.name,
        cuisine: (r.cuisine || []).join(' • '),
        rating: r.rating || 4.0,
        ratingCount: r.ratingCount || 0,
        deliveryTime: `${r.deliveryTimeMins?.min || 25}–${r.deliveryTimeMins?.max || 35} min`,
        priceRange: `₹${((r.minOrderPaise || 15000) / 100)} for two`,
        discount: r.discountTag || (r.deliveryFeePaise === 0 ? 'Free Delivery' : ''),
        isVeg: r.isVeg,
        isNew: r.isNew || false,
        isClosed: !r.isOpen,
        tags: r.tags || [],
        img: r.bannerUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
        menuCategory: r.isVeg ? 'veg' : 'nonveg',
        // Keep deliveryFeePaise as a number so checkout can compute the delivery fee
        deliveryFeePaise: r.deliveryFeePaise || 0
      }));
      SWAD_RESTAURANTS.splice(0, SWAD_RESTAURANTS.length, ...mapped);
    }
  } catch (error) {
    console.error('Failed to load restaurants from API, using fallback:', error);
  }

  // Render restaurants
  renderSwadRestaurants();
  renderPopularNearYou(SWAD_RESTAURANTS);
  // Set location
  const cached = localStorage.getItem('swad_detected_location');
  if (cached) {
    try {
      const loc = JSON.parse(cached);
      const locEl = document.getElementById('swadNavLoc');
      if (locEl) locEl.textContent = loc.area || loc.city || 'Hyderabad';
    } catch(e) {}
  }
  if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function renderSwadRestaurants() {
  const grid = document.getElementById('swadRestGrid');
  const label = document.getElementById('swadSectionLabel');
  if (!grid) return;

  let restaurants = SWAD_RESTAURANTS.slice();

  // Filter by category
  if (swadActiveCat !== 'all') {
    restaurants = restaurants.filter(r => r.tags.includes(swadActiveCat));
  }

  // Filter by search
  if (swadSearchQuery) {
    const q = swadSearchQuery.toLowerCase();
    restaurants = restaurants.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.cuisine.toLowerCase().includes(q) ||
      r.tags.some(t => t.includes(q))
    );
  }

  // Sort / filter tab
  if (swadActiveSort === 'rating') {
    restaurants = restaurants.sort((a,b) => b.rating - a.rating);
  } else if (swadActiveSort === 'fast') {
    restaurants = restaurants.sort((a,b) => parseInt(a.deliveryTime) - parseInt(b.deliveryTime));
  } else if (swadActiveSort === 'offer') {
    restaurants = restaurants.filter(r => r.discount && r.discount !== 'Free Delivery');
  } else if (swadActiveSort === 'veg') {
    restaurants = restaurants.filter(r => r.isVeg);
  } else if (swadActiveSort === 'new') {
    restaurants = restaurants.filter(r => r.isNew);
  }

  // Update label
  if (label) {
    if (swadSearchQuery) {
      label.textContent = `Search results for "${swadSearchQuery}" (${restaurants.length})`;
    } else if (swadActiveCat !== 'all') {
      const catMap = {biryani:'Biryani', pizza:'Pizza', burger:'Burgers', south:'South Indian', chinese:'Chinese', dessert:'Desserts', tandoor:'Tandoor', drinks:'Drinks', north:'North Indian'};
      label.textContent = `${catMap[swadActiveCat] || swadActiveCat} Restaurants (${restaurants.length})`;
    } else {
      const sortMap = {all:'All Restaurants', rating:'Top Rated', fast:'Fastest Delivery', offer:'Best Offers', veg:'Pure Veg', new:'New Arrivals'};
      label.textContent = `${sortMap[swadActiveSort] || 'All Restaurants'} (${restaurants.length})`;
    }
  }

  if (!restaurants.length) {
    grid.innerHTML = `<div class="swad-no-results" style="grid-column:1/-1">
      <div class="nr-emoji">🍽️</div>
      <p>No restaurants found</p>
      <small style="color:rgba(255,255,255,0.2);font-size:0.8rem">Try a different category or search</small>
    </div>`;
    return;
  }

  grid.innerHTML = restaurants.map(r => `
    <div class="swad-rest-card" onclick="openRestaurant('${r.id}')" data-id="${r.id}">
      <div class="swad-rest-img-wrap">
        <img src="${r.img}" alt="${r.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80'"/>
        <div class="swad-rest-img-gradient"></div>
        ${r.discount ? `<div class="swad-rest-discount-tag">${r.discount}</div>` : ''}
        ${r.isVeg ? `<div class="swad-veg-only-tag"><span>&#9679;</span> Pure Veg</div>` : ''}
        ${r.isClosed ? `<div class="swad-rest-closed-tag">CLOSED</div>` : ''}
        ${r.isNew ? `<div class="swad-rest-new-tag">NEW</div>` : ''}
        <div class="swad-rest-time-badge">${r.deliveryTime}</div>
      </div>
      <div class="swad-rest-body">
        <div class="swad-rest-header">
          <div class="swad-rest-name">${r.name}</div>
          <div class="swad-rest-rating-pill"><span>★</span> ${r.rating}</div>
        </div>
        <div class="swad-rest-cuisine">${r.cuisine}</div>
        <div class="swad-rest-footer">
          <div class="swad-rest-price-range">${r.priceRange}</div>
          <button class="swad-rest-open-btn" type="button" onclick="event.stopPropagation(); openRestaurant('${r.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function swadCatFilter(cat, el) {
  swadActiveCat = cat;
  document.querySelectorAll('.swad-cat-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderSwadRestaurants();
}

function swadSortFilter(sort, el) {
  swadActiveSort = sort;
  document.querySelectorAll('.swad-filter-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderSwadRestaurants();
}

let swadSearchTimeout = null;

function swadHomeFilter(q) {
  swadSearchQuery = q.trim();
  renderSwadRestaurants();

  if (swadSearchTimeout) {
    clearTimeout(swadSearchTimeout);
    swadSearchTimeout = null;
  }

  const dishSection = document.getElementById('swadDishSearchSection');
  const dishGrid = document.getElementById('swadDishGrid');

  if (swadSearchQuery.length < 3) {
    if (dishSection) dishSection.style.display = 'none';
    if (dishGrid) dishGrid.innerHTML = '';
    return;
  }

  swadSearchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(API_BASE_URL + `/api/menu/search?q=${encodeURIComponent(swadSearchQuery)}`);
      const data = await res.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        if (dishSection) dishSection.style.display = 'block';
        if (dishGrid) {
          dishGrid.innerHTML = `
            <div class="swad-no-results" style="grid-column: 1/-1; padding: 1.5rem; text-align: center; color: var(--muted);">
              <p>No matching dishes found.</p>
            </div>
          `;
        }
        return;
      }

      if (dishSection) dishSection.style.display = 'block';
      if (dishGrid) {
        dishGrid.innerHTML = data.data.map(item => {
          const isVeg = item.isVeg !== false;
          const price = (item.pricePaise / 100).toFixed(0);
          const restName = item.restaurantId ? item.restaurantId.name : 'Aakali Kitchen';
          const restId = item.restaurantId ? item.restaurantId._id : '';
          const imgUrl = item.image || 'https://via.placeholder.com/400x180?text=Food';

          return `
            <div class="swad-dish-card" onclick="searchDishClick('${item._id}', '${restId}')">
              <div class="swad-dish-badge ${isVeg ? 'veg' : 'nonveg'}"></div>
              <img class="swad-dish-img" src="${imgUrl}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/400x180?text=Food'"/>
              <div class="swad-dish-body">
                <div>
                  <div class="swad-dish-name" title="${item.name}">${item.name}</div>
                  <div class="swad-dish-rest">by <em>${restName}</em></div>
                </div>
                <div class="swad-dish-footer">
                  <span class="swad-dish-price">₹${price}</span>
                  <button class="swad-go-btn" title="View Menu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:14px;height:14px"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Error fetching dish search results:', err);
    }
  }, 300);
}

async function searchDishClick(dishId, restaurantId) {
  if (!restaurantId) return;
  window.targetDishToHighlight = dishId;
  await openRestaurant(restaurantId);
}

function showRestaurantsSkeleton() {
  const grid = document.getElementById('swadRestGrid');
  const popGrid = document.getElementById('aakaliPopularGrid');
  if (grid) grid.innerHTML = generateRestCardSkeleton(6);
  if (popGrid) popGrid.innerHTML = generatePopularSkeleton(3);
}

function showMenuSkeleton() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-rest-card">
      <div class="sk-img"></div>
      <div class="sk-body">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-sub"></div>
        <div class="sk-line" style="width:90%;height:10px"></div>
        <div class="sk-footer">
          <div class="sk-pill" style="width:55px"></div>
          <div class="sk-pill" style="width:65px;height:28px;border-radius:8px"></div>
        </div>
      </div>
    </div>
  `).join('');
}

async function openRestaurant(id) {
  const rest = SWAD_RESTAURANTS.find(r => r.id === id);
  if (!rest) return;
  swadSelectedRestaurant = rest;

  // Hide home, show user panel immediately
  $('swadHome').style.display = 'none';
  $('userPanel').style.display = 'block';
  
  // Render loading skeleton immediately
  showMenuSkeleton();

  // Load menu items from database
  try {
    const res = await fetch(API_BASE_URL + `/api/restaurants/${id}/menu`);
    const data = await res.json();
    if (data.success && data.data) {
      window.activeRestaurantMenu = data.data.map(r => ({
        id: r._id,
        name: r.name,
        desc: r.description || '',
        price: r.pricePaise / 100,
        category: (r.category === 'Dessert' || r.category === 'Drinks') ? r.category.toLowerCase() : (r.isVeg ? 'veg' : 'nonveg'),
        rating: r.rating || 4.5,
        reviews: r.ratingCount || 100,
        preparationTime: r.preparationTimeMins || 20,
        tags: r.tags || [],
        img: r.image || 'https://via.placeholder.com/400x180?text=Food',
        available: r.isAvailable !== false
      }));
    }
  } catch (error) {
    console.error('Failed to load menu from API:', error);
  }

  // Update top navbar for restaurant mode (no Aakali brand)
  const userBrandBox = document.getElementById('userBrandBox');
  const navLocationBtn = document.getElementById('navLocationBtn');
  const userRestNavBox = document.getElementById('userRestNavBox');
  const navSearch = document.getElementById('navSearch');
  const delPillSpan = document.querySelector('.nav-delivery-pill span:last-child');

  if (userBrandBox) userBrandBox.style.display = 'none';
  if (navLocationBtn) navLocationBtn.style.display = 'none';
  if (userRestNavBox) userRestNavBox.style.display = 'flex';
  
  const userNavRestName = document.getElementById('userNavRestName');
  const userNavRestMeta = document.getElementById('userNavRestMeta');
  if (userNavRestName) userNavRestName.textContent = rest.name;
  if (userNavRestMeta) userNavRestMeta.textContent = rest.cuisine;

  if (navSearch) navSearch.placeholder = `Search in ${rest.name}...`;
  if (delPillSpan) delPillSpan.textContent = `⭐ ${rest.rating} • 🕐 ${rest.deliveryTime}`;

  // Populate Swiggy Restaurant Hero Card
  const heroWrap = document.getElementById('swiggyRestHeroWrap');
  const filterBar = document.getElementById('swiggyFilterBar');
  if (heroWrap) heroWrap.style.display = 'block';
  if (filterBar) filterBar.style.display = 'flex';

  const bcLoc = document.getElementById('swiggyBreadcrumbLoc');
  const bcName = document.getElementById('swiggyBreadcrumbName');
  const heroName = document.getElementById('swiggyHeroRestName');
  const heroCuisine = document.getElementById('swiggyHeroRestCuisine');
  const heroOutlet = document.getElementById('swiggyHeroRestOutlet');
  const heroRating = document.getElementById('swiggyHeroRestRating');
  const heroPrice = document.getElementById('swiggyHeroPriceForTwo');

  const locEl = document.getElementById('swadNavLoc');
  const locText = locEl ? locEl.textContent : 'Hyderabad';

  if (bcLoc) bcLoc.textContent = locText;
  if (bcName) bcName.textContent = rest.name;
  if (heroName) heroName.textContent = rest.name;
  if (heroCuisine) heroCuisine.textContent = rest.cuisine;
  if (heroOutlet) heroOutlet.textContent = `📍 Outlet: ${locText.split(',')[0]} • 🕐 ${rest.deliveryTime}`;
  if (heroRating) heroRating.textContent = `★ ${rest.rating}`;
  if (heroPrice) heroPrice.textContent = rest.priceRange || '₹200 for two';

  const dishSearch = document.getElementById('swiggyDishSearch');
  if (dishSearch) dishSearch.placeholder = `Search in ${rest.name}...`;

  const menuFab = document.getElementById('swiggyMenuFab');
  if (menuFab) menuFab.style.display = 'flex';

  // Hide duplicate old restDetailHeader if present
  const rdhEl = document.getElementById('restDetailHeader');
  if (rdhEl) rdhEl.style.display = 'none';

  // Initialize menu with restaurant's category filter
  renderMenu();
  updateCartBadge();
  backToMenu();
  
  // Apply category filter to show restaurant's relevant items
  if (rest.menuCategory && rest.menuCategory !== 'all') {
    setTimeout(() => {
      const allBtn = document.querySelector('.filter-btn');
      if (allBtn) { activeFilter = 'all'; }
      renderMenu();
    }, 100);
  }

  if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
  window.scrollTo(0,0);
  toast(`Welcome to ${rest.name}! 🍽️`, 'success');

  if (window.targetDishToHighlight) {
    const dishId = window.targetDishToHighlight;
    window.targetDishToHighlight = null; // Clear immediately
    setTimeout(() => {
      const dishEl = document.getElementById(`dish-${dishId}`);
      if (dishEl) {
        dishEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dishEl.classList.add('highlight-pulse');
        setTimeout(() => {
          dishEl.classList.remove('highlight-pulse');
        }, 3000);
      }
    }, 400); // Wait for transition & render to finish
  }
}

let isSwiggyVegOnly = false;
let isSwiggyNonVegOnly = false;
let isSwiggyBestsellerOnly = false;

function toggleSwiggyVegFilter() {
  isSwiggyVegOnly = !isSwiggyVegOnly;
  if (isSwiggyVegOnly) isSwiggyNonVegOnly = false;
  
  const vegSwitch = document.getElementById('swiggyVegSwitch');
  const nonVegSwitch = document.getElementById('swiggyNonVegSwitch');
  if (vegSwitch) vegSwitch.classList.toggle('active', isSwiggyVegOnly);
  if (nonVegSwitch) nonVegSwitch.classList.remove('active');
  
  applySwiggyCombinedFilters();
}

function toggleSwiggyNonVegFilter() {
  isSwiggyNonVegOnly = !isSwiggyNonVegOnly;
  if (isSwiggyNonVegOnly) isSwiggyVegOnly = false;
  
  const vegSwitch = document.getElementById('swiggyVegSwitch');
  const nonVegSwitch = document.getElementById('swiggyNonVegSwitch');
  if (nonVegSwitch) nonVegSwitch.classList.toggle('active', isSwiggyNonVegOnly);
  if (vegSwitch) vegSwitch.classList.remove('active');

  applySwiggyCombinedFilters();
}

function toggleSwiggyBestsellersFilter() {
  isSwiggyBestsellerOnly = !isSwiggyBestsellerOnly;
  const bestBtn = document.getElementById('swiggyBestsellerBtn');
  if (bestBtn) bestBtn.classList.toggle('active', isSwiggyBestsellerOnly);

  applySwiggyCombinedFilters();
}

function applySwiggyCombinedFilters() {
  if (isSwiggyVegOnly) {
    activeFilter = 'veg';
  } else if (isSwiggyNonVegOnly) {
    activeFilter = 'nonveg';
  } else {
    activeFilter = 'all';
  }
  
  const q = document.getElementById('swiggyDishSearch') ? document.getElementById('swiggyDishSearch').value : '';
  renderMenu(q);

  if (isSwiggyBestsellerOnly) {
    const grid = document.getElementById('menuGrid');
    const menu = getMenu().filter(m => m.available && (m.rating >= 4.5 || (m.tags && m.tags.includes('bestseller'))));
    if (grid && menu.length) {
      grid.innerHTML = menu.map(m => {
        const inCart = cart.find(c => c.id === m.id);
        return `
        <div class="food-card" id="dish-${m.id}">
          <div class="food-card-img">
            <img src="${m.img}" alt="${m.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x180?text=Food'"/>
            <div class="veg-badge ${m.category === 'nonveg' ? 'nonveg' : 'veg'}"></div>
          </div>
          <div class="food-card-body">
            <div class="food-rating"><span class="stars">${'★'.repeat(Math.round(m.rating))}</span><span class="rat-num">${m.rating}</span></div>
            <div class="food-name">${m.name}</div>
            <div class="food-desc">${m.desc}</div>
            <div class="food-footer">
              <span class="food-price">₹${m.price}</span>
              ${inCart ? `
                <div class="cart-qty" style="display:flex;align-items:center;gap:.45rem">
                  <button class="qty-btn" onclick="changeQtyMenu('${m.id}',-1)">−</button>
                  <span class="qty-num">${inCart.qty}</span>
                  <button class="qty-btn" onclick="changeQtyMenu('${m.id}',1)">+</button>
                </div>
              ` : `
                <button class="add-btn" onclick="addToCart('${m.id}')">+ Add</button>
              `}
            </div>
          </div>
        </div>`;
      }).join('');
    }
  }
}

function openSwiggyCategoryDrawer() {
  const modal = document.getElementById('swiggyCatModal');
  const list = document.getElementById('swiggyCatList');
  if (!modal || !list) return;

  const menu = getMenu();
  const categories = {};
  menu.forEach(item => {
    const cat = item.category || 'Dishes';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  list.innerHTML = Object.keys(categories).map(cat => `
    <div class="swiggy-cat-item" onclick="jumpToSwiggyCategory('${cat}')">
      <span style="text-transform:capitalize;">${cat}</span>
      <span class="swiggy-cat-count">${categories[cat]}</span>
    </div>
  `).join('');

  modal.style.display = 'flex';
}

function closeSwiggyCategoryDrawer() {
  const modal = document.getElementById('swiggyCatModal');
  if (modal) modal.style.display = 'none';
}

function jumpToSwiggyCategory(cat) {
  closeSwiggyCategoryDrawer();
  activeFilter = cat;
  renderMenu();
  const grid = document.getElementById('menuGrid');
  if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterRestaurantDishes(q) {
  renderMenu(q);
}

function backToSwadHome() {
  // Restore navbar for global home mode
  const userBrandBox = document.getElementById('userBrandBox');
  const navLocationBtn = document.getElementById('navLocationBtn');
  const userRestNavBox = document.getElementById('userRestNavBox');
  const navSearch = document.getElementById('navSearch');
  const delPillSpan = document.querySelector('.nav-delivery-pill span:last-child');

  if (userBrandBox) userBrandBox.style.display = 'flex';
  if (navLocationBtn) navLocationBtn.style.display = 'flex';
  if (userRestNavBox) userRestNavBox.style.display = 'none';
  if (navSearch) navSearch.placeholder = 'What are you craving today?';
  if (delPillSpan) delPillSpan.textContent = '~35 min delivery';

  // Hide Swiggy Restaurant Hero Card & Filter Bar
  const heroWrap = document.getElementById('swiggyRestHeroWrap');
  const filterBar = document.getElementById('swiggyFilterBar');
  const menuFab = document.getElementById('swiggyMenuFab');
  const catModal = document.getElementById('swiggyCatModal');
  if (heroWrap) heroWrap.style.display = 'none';
  if (filterBar) filterBar.style.display = 'none';
  if (menuFab) menuFab.style.display = 'none';
  if (catModal) catModal.style.display = 'none';

  isSwiggyVegOnly = false;
  isSwiggyNonVegOnly = false;
  isSwiggyBestsellerOnly = false;
  const vegSwitch = document.getElementById('swiggyVegSwitch');
  const nonVegSwitch = document.getElementById('swiggyNonVegSwitch');
  const bestBtn = document.getElementById('swiggyBestsellerBtn');
  if (vegSwitch) vegSwitch.classList.remove('active');
  if (nonVegSwitch) nonVegSwitch.classList.remove('active');
  if (bestBtn) bestBtn.classList.remove('active');

  // Hide user panel and restaurant header
  $('userPanel').style.display = 'none';
  const rdhEl = document.getElementById('restDetailHeader');
  if (rdhEl) rdhEl.style.display = 'none';
  swadSelectedRestaurant = null;
  window.activeRestaurantMenu = null;
  // Show SWAD home
  $('swadHome').style.display = 'block';
  if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
  window.scrollTo(0,0);
}

function swadUserMenu() {
  // Show user dropdown or logout option
  const opts = [
    { label: '👤 Profile', action: () => { openRestaurant(SWAD_RESTAURANTS[0].id); setTimeout(() => showSection('profile'), 300); } },
    { label: '📦 My Orders', action: () => { openRestaurant(SWAD_RESTAURANTS[0].id); setTimeout(() => showSection('orders'), 300); } },
    { label: '←🚪 Sign Out', action: () => { $('swadHome').style.display = 'none'; logout(); } }
  ];
  // Simple dropdown
  const existing = document.getElementById('swadUserDropdown');
  if (existing) { existing.remove(); return; }
  const dd = document.createElement('div');
  dd.id = 'swadUserDropdown';
  dd.style.cssText = 'position:fixed;top:70px;right:1.5rem;background:#1a1007;border:1px solid rgba(245,192,122,0.2);border-radius:14px;padding:0.5rem;z-index:500;min-width:180px;box-shadow:0 12px 40px rgba(0,0,0,0.6);animation:pgFadeIn 0.2s ease;';
  dd.innerHTML = opts.map((o,i) => `<div onclick="document.getElementById('swadUserDropdown').remove();" style="padding:0.7rem 1rem;font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.8);cursor:pointer;border-radius:10px;transition:all 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'" data-idx="${i}">${o.label}</div>`).join('');
  dd.querySelectorAll('[data-idx]').forEach((el, i) => el.addEventListener('click', () => { opts[i].action(); dd.remove(); }));
  document.body.appendChild(dd);
  setTimeout(() => document.addEventListener('click', function removeDd(e) { if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', removeDd); } }), 100);
}

function openSwadLocDropdown() {
  // Toggle the user panel's existing location dropdown if it exists
  const locText = document.getElementById('swadNavLoc');
  const locs = ['Madhapur, Hyderabad', 'Banjara Hills, Hyderabad', 'Indiranagar, Bengaluru', 'Connaught Place, New Delhi', 'Bandra West, Mumbai'];
  const existing = document.getElementById('swadLocPicker');
  if (existing) { existing.remove(); return; }
  const dd = document.createElement('div');
  dd.id = 'swadLocPicker';
  dd.style.cssText = 'position:fixed;top:70px;left:1rem;background:#1a1007;border:1px solid rgba(245,192,122,0.2);border-radius:14px;padding:0.5rem;z-index:500;min-width:220px;box-shadow:0 12px 40px rgba(0,0,0,0.6);animation:pgFadeIn 0.2s ease;';
  dd.innerHTML = '<div style="font-size:0.65rem;font-weight:800;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.1em;padding:0.5rem 1rem 0.3rem;">Select Location</div>' +
    locs.map(loc => `<div style="padding:0.7rem 1rem;font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.75);cursor:pointer;border-radius:10px;display:flex;align-items:center;gap:0.5rem;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'" onclick="document.getElementById('swadNavLoc').textContent=this.dataset.loc;document.getElementById('swadLocPicker').remove();" data-loc="${loc.split(',')[0]}">📍 ${loc}</div>`).join('');
  document.body.appendChild(dd);
  setTimeout(() => document.addEventListener('click', function removeDd(e) { if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', removeDd); } }), 100);
}

// Override the logout to also hide swadHome
const _origLogout = logout;
logout = function() {
  const sh = document.getElementById('swadHome');
  if (sh) sh.style.display = 'none';
  _origLogout();
};

// Also override backToMenu to respect swadHome context
const _origBackToMenuSwadHome = backToMenu;
backToMenu = function() {
  // If we came from swadHome and there's a selected restaurant, do normal back but hide general heroSection
  if (swadSelectedRestaurant) {
    _origBackToMenuSwadHome();
    if ($('heroSection')) $('heroSection').style.display = 'none';
  } else if ($('swadHome') && $('swadHome').style.display !== 'none') {
    // Already on home, do nothing
  } else if (swadSelectedRestaurant === null && $('userPanel').style.display === 'block') {
    // If no restaurant selected, go home
    backToSwadHome();
  } else {
    _origBackToMenuSwadHome();
  }
};

// Theme — Earth (light) and Dark Premium toggle
function setTheme(theme) {
  document.body.classList.remove('theme-earth', 'theme-dark');
  document.body.classList.add('theme-' + theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = localStorage.getItem('theme') || 'earth';
  const next = current === 'earth' ? 'dark' : 'earth';
  setTheme(next);
}

function toggleProfileTheme() { toggleTheme(); }
function updateThemeUI() {}
function setupSystemThemeListener() {}
function handleSystemThemeChange() {}

// --- Navbar: Shrink on scroll ---
(function() {
  let ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        const nav = document.getElementById('swadNav');
        if (nav) {
          if (window.scrollY > 50) {
            nav.classList.add('scrolled');
          } else {
            nav.classList.remove('scrolled');
          }
        }
        // Parallax hero background
        const heroBg = document.querySelector('.aakali-hero-bg');
        if (heroBg) {
          const scrolled = window.scrollY;
          const heroHeight = document.querySelector('.aakali-hero').offsetHeight;
          if (scrolled < heroHeight) {
            heroBg.style.transform = 'scale(' + (1.05 + scrolled * 0.0002) + ') translateY(' + (scrolled * 0.3) + 'px)';
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  });
})();

// --- Navbar: Animated typing placeholder ---
(function() {
  const words = ['Biryani', 'Pizza', 'Burger', 'Chinese', 'Desserts', 'Tandoor', 'South Indian', 'Drinks'];
  let wordIdx = 0, charIdx = 0, deleting = false;
  function typePlaceholder() {
    const input = document.getElementById('swadHomeSearch');
    if (!input || document.activeElement === input) {
      setTimeout(typePlaceholder, 200);
      return;
    }
    const word = words[wordIdx];
    if (!deleting) {
      charIdx++;
      input.placeholder = 'Search for ' + word.substring(0, charIdx) + '...';
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(typePlaceholder, 1800);
        return;
      }
      setTimeout(typePlaceholder, 80);
    } else {
      charIdx--;
      input.placeholder = 'Search for ' + word.substring(0, charIdx) + '...';
      if (charIdx === 0) {
        deleting = false;
        wordIdx = (wordIdx + 1) % words.length;
        setTimeout(typePlaceholder, 300);
        return;
      }
      setTimeout(typePlaceholder, 40);
    }
  }
  document.addEventListener('DOMContentLoaded', function() { setTimeout(typePlaceholder, 1000); });
})();

// --- Cart badge bounce ---
function updateNavCartBadge(count) {
  const badge = document.getElementById('swadNavCartBadge');
  if (!badge) return;
  badge.textContent = count;
  badge.setAttribute('data-count', count);
  if (count > 0) {
    badge.style.display = 'flex';
    badge.classList.remove('bounce');
    void badge.offsetWidth;
    badge.classList.add('bounce');
  } else {
    badge.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════
// SKELETON LOADING SYSTEM
// ═══════════════════════════════════════════════════
function generateRestCardSkeleton(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-rest-card">
      <div class="sk-img"></div>
      <div class="sk-body">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-sub"></div>
        <div class="sk-footer">
          <div class="sk-pill"></div>
          <div class="sk-circle"></div>
        </div>
      </div>
    </div>`;
  }
  return html;
}

function generatePopularSkeleton(count) {
  // Phase 3: shimmer skeleton mirroring the premium featured-card layout
  let html = '';
  const n = Math.max(3, count || 3);
  for (let i = 0; i < n; i++) {
    html += `
      <div class="skeleton-pop-card skeleton-pop-card-lg">
        <div class="sk-pop-img"></div>
        <div class="sk-pop-body">
          <div class="sk-line sk-pop-title"></div>
          <div class="sk-line sk-pop-sub"></div>
          <div class="sk-line sk-pop-chip"></div>
        </div>
      </div>`;
  }
  return html;
}

function generateChipSkeleton(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-chip"></div>`;
  }
  return html;
}

function generateOfferSkeleton(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-offer"></div>`;
  }
  return html;
}

function showSkeletons() {
  showRestaurantsSkeleton();
}

let swadBannerCurrent = 0;
let swadBannerInterval = null;

function swadBannerGoTo(idx) {
  const track = document.getElementById('swadBannerTrack');
  if (!track) return;
  const total = 4;
  if (idx < 0) idx = total - 1;
  if (idx >= total) idx = 0;
  swadBannerCurrent = idx;
  track.style.transform = `translateX(-${idx * 100}%)`;
  
  const dots = document.querySelectorAll('.swad-banner-dot');
  dots.forEach(d => d.classList.remove('active'));
  if (dots[idx]) dots[idx].classList.add('active');
  
  if (swadBannerInterval) {
    clearInterval(swadBannerInterval);
    swadBannerStart();
  }
}

function swadBannerStart() {
  // guard: no-op when banner markup is absent (prevents a pointless 5s timer)
  if (!document.getElementById('swadBannerTrack')) return;
  if (swadBannerInterval) clearInterval(swadBannerInterval);
  swadBannerInterval = setInterval(() => {
    swadBannerGoTo(swadBannerCurrent + 1);
  }, 5000);
}

// Load saved theme on startup
(function() {
  const saved = localStorage.getItem('theme') || 'earth';
  document.body.classList.add('theme-' + saved);
})();

// Hook into initUser
const _origInitUserTheme = initUser;
initUser = function() { _origInitUserTheme(); };

// Kick off banner on load
window.addEventListener('load', () => { swadBannerGoTo(0); swadBannerStart(); });

// --- Popular right now (Phase 3): Zomato-style featured cards ---
// Renders the top-5 highest-rated restaurants as premium horizontal cards
// with rating pill, delivery-time chip, trending/new tag and an offer banner.
function renderPopularNearYou(restaurants) {
  const section = document.getElementById('aakaliPopular');
  const grid = document.getElementById('aakaliPopularGrid');
  if (!grid) return;

  // Hide the whole section entirely when there are literally no restaurants
  if (!restaurants || !restaurants.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  const top = [...restaurants].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);

  // Fallback: mark the top-2 rated as trending if no explicit trending flag exists
  const trendingIds = new Set(top.slice(0, 2).map(r => r.id));

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Extract a short "28 min" style delivery hint from "25–35 min"
  const shortTime = (t) => {
    if (!t) return '';
    const nums = String(t).match(/\d+/g);
    if (!nums || !nums.length) return t;
    return nums[nums.length - 1] + ' min';
  };

  grid.innerHTML = top.map((r) => {
    const isTrending = r.trending === true || trendingIds.has(r.id);
    const isNew = r.isNew === true;
    let tag = '';
    if (isTrending) tag = '<span class="aakali-pop-tag aakali-pop-tag-trending">TRENDING 🔥</span>';
    else if (isNew) tag = '<span class="aakali-pop-tag aakali-pop-tag-new">NEW ⭐</span>';

    const offer = r.discount ? `<div class="aakali-pop-offer">${esc(r.discount)}</div>` : '';
    const rating = (r.rating || 0).toFixed(1);
    const timeChip = shortTime(r.deliveryTime);
    const cost = r.priceRange || '';

    return `
      <article class="aakali-pop-card" role="listitem" tabindex="0"
               onclick="openRestaurant('${esc(r.id)}')"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openRestaurant('${esc(r.id)}')}">
        <div class="aakali-pop-img">
          <img src="${esc(r.img)}" alt="${esc(r.name)}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80'"/>
          <div class="aakali-pop-overlay"></div>
          ${timeChip ? `<span class="aakali-pop-badge-time">⏱ ${esc(timeChip)}</span>` : ''}
          <span class="aakali-pop-badge-rating">${esc(rating)} ★</span>
          ${tag}
        </div>
        <div class="aakali-pop-body">
          <h3 class="aakali-pop-name">${esc(r.name)}</h3>
          <p class="aakali-pop-cuisine">${esc(r.cuisine)}</p>
          ${cost ? `<span class="aakali-pop-cost">${esc(cost)}</span>` : ''}
        </div>
        ${offer}
      </article>
    `;
  }).join('');
}

// Scroll the main restaurant grid into view when user clicks "See all"
function aakaliPopSeeAll() {
  const grid = document.getElementById('swadRestGrid');
  if (grid && typeof grid.scrollIntoView === 'function') {
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
if (typeof window !== 'undefined') window.aakaliPopSeeAll = aakaliPopSeeAll;

// ============================================================
// Context-aware taskbar
// ============================================================
function getAppTaskbarContext() {
  const swadHome = document.getElementById('swadHome');
  const userPanel = document.getElementById('userPanel');
  const homeVisible = swadHome && swadHome.style.display !== 'none';
  const userVisible = userPanel && userPanel.style.display !== 'none';
  let hasSelectedRestaurant = false;
  try {
    hasSelectedRestaurant = !!swadSelectedRestaurant;
  } catch (e) {
    hasSelectedRestaurant = false;
  }

  if (hasSelectedRestaurant && userVisible) return 'restaurant';
  if (homeVisible || !hasSelectedRestaurant) return 'market';
  return 'restaurant';
}

function getAppTaskbarItems(context) {
  if (context === 'restaurant') {
    return [
      { action: 'menu', label: 'Menu', icon: 'utensils' },
      { action: 'search', label: 'Find', icon: 'search' },
      { action: 'cart', label: 'Cart', icon: 'shopping-bag', fab: true },
      { action: 'orders', label: 'Orders', icon: 'receipt' },
      { action: 'profile', label: 'Account', icon: 'circle-user' }
    ];
  }

  return [
    { action: 'market', label: 'Home', icon: 'store' },
    { action: 'market-search', label: 'Find', icon: 'search' },
    { action: 'offers', label: 'Deals', icon: 'badge-percent' },
    { action: 'orders', label: 'Orders', icon: 'receipt' },
    { action: 'profile', label: 'Account', icon: 'circle-user' }
  ];
}

function getAppTaskbarActiveAction(context) {
  if (context === 'market') {
    return _activeTab === 'orders' || _activeTab === 'profile' ? _activeTab : 'market';
  }
  return _activeTab || 'menu';
}

function appTaskbarButtonTemplate(item, activeAction, target) {
  const activeClass = item.action === activeAction ? ' tb-active active' : '';
  const badge = item.action === 'cart'
    ? '<span class="tb-cart-badge app-taskbar-cart-badge" style="display:none">0</span>'
    : '';
  const className = item.fab ? 'tb-fab app-taskbar-action' : 'tb-item taskbar-item app-taskbar-action';
  const iconSize = item.fab ? 24 : 21;
  const iconWrapClass = item.fab ? 'tb-fab-circle' : 'tb-icon';
  const labelClass = item.fab ? 'tb-fab-label' : 'tb-label';

  return `
    <button type="button" class="${className}${activeClass}" id="${target}-tb-${item.action}" data-action="${item.action}" onclick="handleTaskbarNav('${item.action}')" aria-label="${item.label}">
      <div class="${iconWrapClass}">
        <i data-lucide="${item.icon}" style="width:${iconSize}px;height:${iconSize}px"></i>
        ${badge}
      </div>
      <span class="${labelClass}">${item.label}</span>
    </button>
  `;
}

function renderAppTaskbar() {
  const context = getAppTaskbarContext();
  const items = getAppTaskbarItems(context);
  const activeAction = getAppTaskbarActiveAction(context);
  const mobileTaskbar = document.getElementById('mobileTaskbar');
  const desktopTaskbar = document.getElementById('taskbar');
  const desktopContent = desktopTaskbar ? desktopTaskbar.querySelector('.taskbar-content') : null;

  if (mobileTaskbar) {
    mobileTaskbar.dataset.context = context;
    mobileTaskbar.innerHTML = items.map(item => appTaskbarButtonTemplate(item, activeAction, 'mobile')).join('');
  }

  if (desktopTaskbar && desktopContent) {
    desktopTaskbar.dataset.context = context;
    desktopContent.innerHTML = items.map(item => appTaskbarButtonTemplate(item, activeAction, 'desktop')).join('');
  }

  syncAppTaskbarCartBadges();
  if (window.lucide) window.lucide.createIcons();
}

function syncAppTaskbarCartBadges() {
  const count = cart.reduce((sum, item) => sum + (item.qty || item.quantity || 0), 0);
  document.querySelectorAll('.app-taskbar-cart-badge, #mobCartBadge, #taskbarCartBadge').forEach(badge => {
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    badge.classList.toggle('pulse', count > 0);
  });
}

function updateTaskbarCartBadge() {
  syncAppTaskbarCartBadges();
}

function focusMarketplaceSearch() {
  backToSwadHome();
  setTimeout(() => {
    const search = document.getElementById('swadHomeSearch');
    if (search) {
      search.scrollIntoView({ behavior: 'smooth', block: 'center' });
      search.focus();
    }
  }, 80);
}

function showMarketplaceDeals() {
  backToSwadHome();
  swadActiveSort = 'offers';
  renderSwadRestaurants();
  const section = document.querySelector('.swad-restaurant-section');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('Showing restaurants with offers', 'info');
}

function openAppAccountSection(section) {
  if (!swadSelectedRestaurant) {
    const sh = document.getElementById('swadHome');
    const up = document.getElementById('userPanel');
    const rdh = document.getElementById('restDetailHeader');
    if (sh) sh.style.display = 'none';
    if (up) up.style.display = 'block';
    if (rdh) rdh.style.display = 'none';
  }
  showSection(section);
  updateTaskbarActive(section);
}

function setTaskbarVisibility(visible) {
  const mobileTaskbar = document.getElementById('mobileTaskbar');
  const desktopTaskbar = document.getElementById('taskbar');
  if (mobileTaskbar) mobileTaskbar.style.display = 'none';
  if (desktopTaskbar) desktopTaskbar.style.display = 'none';
  const userPanel = document.getElementById('userPanel');
  if (userPanel) userPanel.style.paddingBottom = '0';
}

function updateTaskbarActive(tabId) {
  _activeTab = tabId === 'market-search' || tabId === 'offers' ? 'market' : tabId;
  renderAppTaskbar();
}

function showTaskbar(visible = true) {
  setTaskbarVisibility(visible);
}

function hideTaskbar() {
  setTaskbarVisibility(false);
}

function taskbarAction(action) {
  handleTaskbarNav(action);
}

function handleTaskbarNav(action) {
  switch (action) {
    case 'market':
      _activeTab = 'market';
      backToSwadHome();
      break;
    case 'market-search':
      _activeTab = 'market';
      focusMarketplaceSearch();
      break;
    case 'offers':
      _activeTab = 'market';
      showMarketplaceDeals();
      break;
    case 'menu':
      _activeTab = 'menu';
      backToMenu();
      break;
    case 'search':
      toggleMobileSearch(true);
      break;
    case 'cart':
      toggleCart();
      break;
    case 'orders':
      openAppAccountSection('orders');
      break;
    case 'profile':
      openAppAccountSection('profile');
      break;
  }
  renderAppTaskbar();
}

const _taskbarOpenRestaurant = openRestaurant;
openRestaurant = async function(id) {
  const result = await _taskbarOpenRestaurant(id);
  _activeTab = 'menu';
  renderAppTaskbar();
  return result;
};

const _taskbarBackToSwadHome = backToSwadHome;
backToSwadHome = function() {
  _taskbarBackToSwadHome();
  _activeTab = 'market';
  renderAppTaskbar();
};

const _taskbarShowSection = showSection;
showSection = function(section) {
  _taskbarShowSection(section);
  if (section === 'orders' || section === 'profile') _activeTab = section;
  renderAppTaskbar();
};

let successMap = null;
let successDriverMarker = null;
let successInterval = null;

function initRealSuccessMap() {
  const mapEl = document.getElementById('orderSuccessRealMap');
  if (!mapEl || typeof L === 'undefined') return;

  if (successMap) {
    try { successMap.remove(); } catch(e){}
    successMap = null;
  }

  const restCoords = [17.4486, 78.3908];   // Udipi Vihar, Madhapur Road
  const userCoords = [17.4375, 78.4482];   // Delivery Address, Hyderabad
  
  const routePoints = [
    [17.4486, 78.3908],
    [17.4460, 78.3960],
    [17.4430, 78.4030],
    [17.4410, 78.4120],
    [17.4395, 78.4250],
    [17.4385, 78.4360],
    [17.4375, 78.4482]
  ];

  let step = 1;

  successMap = L.map('orderSuccessRealMap', {
    zoomControl: true
  }).setView([17.4430, 78.4150], 13);

  // Clean, high-resolution street tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(successMap);

  // Restaurant Marker
  const restIcon = L.divIcon({
    html: '<div style="font-size:20px;background:#fff;border:2px solid #fc8019;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3)">🏬</div>',
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
  L.marker(restCoords, { icon: restIcon }).addTo(successMap).bindPopup('<b>Udipi Vihar</b><br/>Restaurant Outlet');

  // Customer Home Marker
  const homeIcon = L.divIcon({
    html: '<div style="font-size:20px;background:#fff;border:2px solid #16a34a;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3)">🏠</div>',
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
  L.marker(userCoords, { icon: homeIcon }).addTo(successMap).bindPopup('<b>Your Home</b><br/>Delivery Location').openPopup();

  // Polyline
  L.polyline(routePoints, {
    color: '#fc8019',
    weight: 4,
    opacity: 0.85,
    dashArray: '6, 6'
  }).addTo(successMap);

  // Rider Marker
  const bikeIcon = L.divIcon({
    html: '<div style="font-size:22px;background:#16a34a;color:#fff;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(22,163,74,0.5);border:2px solid #fff">🛵</div>',
    className: '',
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });
  successDriverMarker = L.marker(routePoints[1], { icon: bikeIcon }).addTo(successMap);

  // Expose to the realtime bridge so live rider GPS can drive this marker
  window.aakaliRiderMarker = successDriverMarker;
  window.aakaliTrackMap = successMap;
  window.aakaliRiderHasRealGps = false;

  if (successInterval) clearInterval(successInterval);
  successInterval = setInterval(() => {
    // Once real GPS from the rider starts arriving, hand control to it
    if (window.aakaliRiderHasRealGps) { clearInterval(successInterval); successInterval = null; return; }
    step = (step + 1) % routePoints.length;
    const pos = routePoints[step];
    successDriverMarker.setLatLng(pos);
    successMap.panTo(pos);
  }, 3000);
}

// Auto-initialize real Leaflet map when order success page is displayed
const successObserver = new MutationObserver(() => {
  const page = document.getElementById('orderSuccessPage');
  if (page && page.style.display !== 'none') {
    setTimeout(initRealSuccessMap, 150);
  }
});
window.addEventListener('load', () => {
  const page = document.getElementById('orderSuccessPage');
  if (page) {
    successObserver.observe(page, { attributes: true, attributeFilter: ['style'] });
  }
});

const _taskbarBackToMenu = backToMenu;
backToMenu = function() {
  _taskbarBackToMenu();
  _activeTab = swadSelectedRestaurant ? 'menu' : 'market';
  renderAppTaskbar();
};

const _taskbarUpdateCartBadge = updateCartBadge;
updateCartBadge = function() {
  _taskbarUpdateCartBadge();
  syncAppTaskbarCartBadges();
};

const _taskbarInitUser = initUser;
initUser = function() {
  _taskbarInitUser();
  _activeTab = 'market';
  showTaskbar(true);
  renderAppTaskbar();
};

// Scroll listener for Compact Sticky Top Header & Swiggy Scroll Behavior
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY || window.pageYOffset;
  const userNav = document.querySelector('.user-navbar');
  const swadNav = document.getElementById('swadNav');

  if (userNav) {
    if (scrollY > 160 && swadSelectedRestaurant) {
      userNav.classList.add('scrolled-rest-mode');
    } else {
      userNav.classList.remove('scrolled-rest-mode');
    }
  }

  if (swadNav) {
    if (scrollY > 100) {
      swadNav.classList.add('scrolled');
    } else {
      swadNav.classList.remove('scrolled');
    }
  }
});

// Swiggy Opening Splash Screen Animation Dismissal
function dismissSwiggyOpeningSplash() {
  const splash = document.getElementById('swiggyOpeningSplash');
  if (!splash) return;

  setTimeout(() => {
    splash.classList.add('splash-fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
    }, 600);
  }, 1800);
}

window.addEventListener('load', () => {
  renderAppTaskbar();
  syncAppTaskbarCartBadges();
  dismissSwiggyOpeningSplash();
});

// ═══════════════════════════════════════════════════════════════════
// REAL-TIME SOCKET.IO BRIDGE — live order status + rider GPS tracking
// Closes the biggest gap vs Swiggy: the tracking screen now updates from
// real server events instead of only a client-side timer.
// ═══════════════════════════════════════════════════════════════════
let aakaliSocket = null;
let _aakaliJoinedUserId = null;

function _aakaliCurrentUserId() {
  try {
    const u = (typeof currentUser !== 'undefined' && currentUser)
      ? currentUser
      : JSON.parse(localStorage.getItem('currentUser') || 'null');
    return u ? (u.id || u._id || null) : null;
  } catch (e) { return null; }
}

function initRealtimeSocket() {
  // socket.io client script is deferred — retry until it's available
  if (typeof io === 'undefined') { setTimeout(initRealtimeSocket, 800); return; }
  if (aakaliSocket) return;
  const base = (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ? API_BASE_URL : undefined;
  try {
    aakaliSocket = base ? io(base) : io();
    aakaliSocket.on('connect', ensureRealtimeJoin);
    aakaliSocket.on('order_status_update', handleRealtimeStatusUpdate);
    aakaliSocket.on('rider_location_update', handleRealtimeRiderLocation);
    console.log('🔌 Realtime socket initialising…');
  } catch (e) {
    console.warn('Realtime socket init failed:', e);
    return;
  }
  // Re-join automatically if the logged-in user changes after connect
  setInterval(ensureRealtimeJoin, 3000);
}

function ensureRealtimeJoin() {
  if (!aakaliSocket || !aakaliSocket.connected) return;
  const uid = _aakaliCurrentUserId();
  if (uid && uid !== _aakaliJoinedUserId) {
    aakaliSocket.emit('join', uid);
    _aakaliJoinedUserId = uid;
    console.log('🔌 Realtime: joined room user_' + uid);
  }
}

// Map backend order status -> tracking UI (progress %, title, description)
const REALTIME_STATUS_MAP = {
  pending:          { p: 8,   title: 'Order placed',        desc: 'Waiting for the restaurant to confirm' },
  confirmed:        { p: 20,  title: 'Order confirmed',     desc: 'Restaurant accepted your order' },
  preparing:        { p: 40,  title: 'Preparing your meal', desc: 'Chef is cooking fresh specialties' },
  ready:            { p: 55,  title: 'Food is ready',       desc: 'Packed and waiting for rider pickup' },
  out_for_delivery: { p: 78,  title: 'Out for delivery',    desc: 'Rider is on the way to you' },
  delivered:        { p: 100, title: 'Delivered!',          desc: 'Enjoy your meal' },
  cancelled:        { p: 0,   title: 'Order cancelled',     desc: 'This order was cancelled' }
};

function _trackingOrderId() {
  try {
    return (typeof currentTrackingOrder !== 'undefined' && currentTrackingOrder)
      ? (currentTrackingOrder._id || currentTrackingOrder.id)
      : null;
  } catch (e) { return null; }
}

function handleRealtimeStatusUpdate(payload) {
  if (!payload || !payload.orderId) return;
  const tid = _trackingOrderId();

  if (tid && String(payload.orderId) === String(tid)) {
    const map = REALTIME_STATUS_MAP[payload.status];
    if (!map) return;
    // Real status now drives the UI — stop the simulated animation timer
    if (typeof liveTrackingInterval !== 'undefined' && liveTrackingInterval) {
      clearInterval(liveTrackingInterval);
    }
    // Delivery handover OTP — show it so the customer can give it to the rider
    if (payload.deliveryOtp) {
      window.aakaliDeliveryOtp = payload.deliveryOtp;
      showDeliveryOtpBanner(payload.deliveryOtp);
    }
    const statusTextEl = document.getElementById('liveMapStatusText');
    const statusDescEl = document.querySelector('.ms-left div div:last-child');
    const timeTextEl = document.getElementById('liveMapTimeText');
    if (statusTextEl) statusTextEl.textContent = map.title;
    if (statusDescEl) statusDescEl.textContent = map.desc;
    // Hide the OTP banner once delivered/cancelled
    if (payload.status === 'delivered' || payload.status === 'cancelled') {
      const b = document.getElementById('deliveryOtpBanner');
      if (b) b.remove();
    }
    if (timeTextEl) {
      const remaining = Math.max(0, Math.ceil(35 * (1 - map.p / 100)));
      timeTextEl.textContent = payload.status === 'delivered' ? 'Delivered'
        : payload.status === 'cancelled' ? 'Cancelled'
        : remaining + ' mins';
    }
    _moveRiderToProgress(map.p);
    if (payload.status === 'delivered' || payload.status === 'cancelled') {
      const cancelBtn = document.getElementById('btnCancelOrder');
      if (cancelBtn) cancelBtn.style.display = 'none';
    }
    if (typeof toast === 'function') toast('Order update: ' + map.title, 'info');
  } else {
    // Not viewing this order right now — notify + refresh the orders list if visible
    if (typeof toast === 'function') {
      toast('Order status: ' + String(payload.status || '').replace(/_/g, ' '), 'info');
    }
    if (typeof renderUserOrders === 'function') { try { renderUserOrders(); } catch (e) {} }
  }
}

// Move the SVG rider node along the existing delivery path to match progress
function _moveRiderToProgress(progress) {
  const rider = document.getElementById('mapRiderNode');
  if (!rider) return;
  let x, y;
  if (progress <= 50) {
    const t = progress / 50;
    x = (1 - t) * (1 - t) * 60 + 2 * (1 - t) * t * 180 + t * t * 320;
    y = (1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 80 + t * t * 150;
  } else {
    const t = (progress - 50) / 50;
    x = 320 + t * (500 - 320);
    y = 150;
  }
  rider.style.left = x + 'px';
  rider.style.top = y + 'px';
}

// Live rider GPS — updates the real Leaflet marker on the tracking map
function handleRealtimeRiderLocation(payload) {
  if (!payload) return;
  const tid = _trackingOrderId();
  // If we know the tracked order, only accept its updates; otherwise accept anyway
  if (tid && payload.orderId && String(payload.orderId) !== String(tid)) return;
  if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;

  // Hand marker control from the simulation to real GPS
  window.aakaliRiderHasRealGps = true;

  if (window.aakaliRiderMarker) {
    window.aakaliRiderMarker.setLatLng([payload.lat, payload.lng]);
    if (window.aakaliTrackMap) window.aakaliTrackMap.panTo([payload.lat, payload.lng]);
  }
  // Also nudge the SVG fallback node if the Leaflet map isn't the active view
  const statusTextEl = document.getElementById('liveMapStatusText');
  if (statusTextEl && !window.aakaliRiderMarker) {
    statusTextEl.textContent = 'Rider is on the way';
  }
}

// Show a prominent delivery-OTP banner on the tracking screen
function showDeliveryOtpBanner(otp) {
  const page = document.getElementById('orderSuccessPage');
  if (!page) return;
  let banner = document.getElementById('deliveryOtpBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'deliveryOtpBanner';
    banner.style.cssText = 'margin:0 0 1rem;padding:1rem 1.25rem;border-radius:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;justify-content:space-between;gap:1rem;box-shadow:0 8px 24px rgba(var(--accent-rgb),0.3)';
    const map = document.getElementById('orderSuccessRealMap');
    if (map && map.parentNode) {
      map.parentNode.insertBefore(banner, map);
    } else {
      page.prepend(banner);
    }
  }
  banner.innerHTML =
    '<div><div style="font-size:.72rem;opacity:.85;font-weight:600;letter-spacing:.05em;text-transform:uppercase">Delivery OTP</div>' +
    '<div style="font-size:.8rem;opacity:.9;margin-top:2px">Share this code with your rider</div></div>' +
    '<div style="font-size:2rem;font-weight:800;letter-spacing:.25em;font-variant-numeric:tabular-nums">' + otp + '</div>';
}

// Boot the realtime bridge once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRealtimeSocket);
} else {
  initRealtimeSocket();
}

// ═══════════════════════════════════════════════════════════════════
// RIDER DELIVERY FLOW + LIVE GPS STREAMING
// Makes the customer's live map marker actually move: the rider shares
// real device GPS (or a simulated route) which streams to the server and
// out to the customer over sockets.
// ═══════════════════════════════════════════════════════════════════
let _riderOrders = [];
let _riderActiveOrder = null;
let _riderGeoWatchId = null;
let _riderSimTimer = null;
let _riderSharing = false;

async function initRider() {
  const nameEl = document.getElementById('riderNameHeader');
  if (nameEl && currentUser) nameEl.textContent = currentUser.name || 'Delivery Partner';
  await ensureRiderProfile();
  switchRiderTab('available');
  loadRiderOrders();
}

// Make sure the logged-in rider has a Rider profile and is marked online,
// so the admin can assign them and GPS streaming has an active order to target.
async function ensureRiderProfile() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    let res = await fetch(API_BASE_URL + '/api/riders/profile', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.status === 404) {
      // Auto-register a rider profile for demo/first-time riders
      await fetch(API_BASE_URL + '/api/riders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ vehicleType: 'bike', vehicleNumber: 'TS09AB1234', licenseNumber: 'DL-AAKALI-001' })
      });
    }
    // Go online so the rider is assignable
    await fetch(API_BASE_URL + '/api/riders/online', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ isOnline: true })
    });
  } catch (e) {
    console.warn('ensureRiderProfile failed:', e.message);
  }
}

function switchRiderTab(tab) {
  ['available', 'active', 'earnings'].forEach(t => {
    const sec = document.getElementById('rider-sec-' + t);
    const btn = document.getElementById('tab-rider-' + t);
    if (sec) sec.style.display = t === tab ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'available' || tab === 'active') loadRiderOrders();
  if (tab === 'earnings') loadRiderEarnings();
}

async function loadRiderEarnings() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    const res = await fetch(API_BASE_URL + '/api/riders/profile', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load earnings');
    const r = data.data || {};
    const todayEl = document.getElementById('riderTotalEarnings');
    const countEl = document.getElementById('riderCompletedCount');
    if (todayEl) todayEl.textContent = '₹' + ((r.todayEarningsPaise || 0) / 100).toFixed(2);
    if (countEl) countEl.textContent = (r.completedDeliveries || 0) + ' orders completed';

    const listEl = document.getElementById('riderEarningsList');
    if (listEl) {
      const total = (r.totalEarningsPaise || 0) / 100;
      const rating = r.rating ? r.rating.toFixed(1) : 'New';
      listEl.innerHTML =
        '<div class="detail-item-row" style="display:flex;justify-content:space-between;padding:.5rem 0"><span>Lifetime earnings</span><strong>₹' + total.toFixed(2) + '</strong></div>' +
        '<div class="detail-item-row" style="display:flex;justify-content:space-between;padding:.5rem 0"><span>Completed deliveries</span><strong>' + (r.completedDeliveries || 0) + '</strong></div>' +
        '<div class="detail-item-row" style="display:flex;justify-content:space-between;padding:.5rem 0"><span>Rating</span><strong>⭐ ' + rating + '</strong></div>' +
        '<div class="detail-item-row" style="display:flex;justify-content:space-between;padding:.5rem 0"><span>Vehicle</span><strong>' + (r.vehicleType || '—') + '</strong></div>';
    }
  } catch (e) {
    console.warn('loadRiderEarnings failed:', e.message);
  }
}

async function loadRiderOrders() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    const res = await fetch(API_BASE_URL + '/api/delivery/orders', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load orders');
    _riderOrders = data.data || [];
    renderRiderOrders();
  } catch (e) {
    console.warn('loadRiderOrders failed:', e.message);
    const list = document.getElementById('riderAvailableList');
    if (list) list.innerHTML = '<div class="rider-card" style="text-align:center;color:var(--muted)">Could not load orders. Pull to refresh.</div>';
  }
}

function renderRiderOrders() {
  // Active = the order assigned to this rider (out_for_delivery). Available = ready/preparing/confirmed.
  const active = _riderOrders.filter(o => o.status === 'out_for_delivery');
  const available = _riderOrders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status));

  const availBtn = document.getElementById('tab-rider-available');
  if (availBtn) availBtn.textContent = `Available (${available.length})`;

  const availList = document.getElementById('riderAvailableList');
  if (availList) {
    availList.innerHTML = available.length ? available.map(riderOrderCard).join('')
      : '<div class="rider-card" style="text-align:center;color:var(--muted)">No orders waiting for pickup right now.</div>';
  }

  const activeWrap = document.getElementById('riderActiveTaskContainer');
  if (activeWrap) {
    _riderActiveOrder = active[0] || null;
    activeWrap.innerHTML = active.length ? active.map(o => riderActiveCard(o)).join('')
      : '<div class="rider-card" style="text-align:center;color:var(--muted)">No active delivery. Accept an order from the Available tab.</div>';
  }
}

function riderOrderCard(o) {
  const addr = o.deliveryAddress ? o.deliveryAddress.fullAddress : '';
  const total = o.orderDetails ? o.orderDetails.totalRupees : 0;
  return `
    <div class="rider-card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:.5rem">
        <div>
          <strong>#${o.orderNumber || ''}</strong>
          <div style="font-size:.78rem;color:var(--muted)">${o.customer ? o.customer.name : ''}</div>
        </div>
        <span style="background:var(--accent-light);color:var(--accent);padding:2px 8px;border-radius:6px;font-size:.7rem;font-weight:700;text-transform:uppercase">${o.status}</span>
      </div>
      <div style="font-size:.8rem;color:var(--text2);margin-bottom:.5rem">📍 ${addr}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>₹${Number(total).toFixed(2)}</strong>
        <button onclick="riderAdvanceStatus('${o._id}','out_for_delivery')" style="background:var(--accent);color:#fff;border:none;padding:.5rem 1rem;border-radius:8px;font-weight:700;cursor:pointer">Accept & Pick Up</button>
      </div>
    </div>`;
}

function riderActiveCard(o) {
  const addr = o.deliveryAddress ? o.deliveryAddress.fullAddress : '';
  return `
    <div class="rider-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
        <strong>#${o.orderNumber || ''}</strong>
        <span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:6px;font-size:.7rem;font-weight:700">OUT FOR DELIVERY</span>
      </div>
      <div style="font-size:.82rem;color:var(--text2);margin-bottom:.4rem">👤 ${o.customer ? o.customer.name : ''} · ${o.customer ? (o.customer.phone||'') : ''}</div>
      <div style="font-size:.82rem;color:var(--text2);margin-bottom:.8rem">📍 ${addr}</div>
      <button id="riderShareLocBtn" onclick="toggleRiderLocationShare()" style="width:100%;background:${_riderSharing ? '#dc2626' : '#4f46e5'};color:#fff;border:none;padding:.7rem;border-radius:8px;font-weight:700;cursor:pointer;margin-bottom:.5rem">
        ${_riderSharing ? '⏹ Stop Sharing Location' : '📡 Share Live Location'}
      </button>
      <div style="display:flex;gap:.5rem;margin-bottom:.5rem">
        <input id="riderOtpInput" inputmode="numeric" maxlength="4" placeholder="Enter 4-digit OTP" style="flex:1;padding:.7rem;border:1px solid var(--border);border-radius:8px;font-size:1rem;letter-spacing:.2em;text-align:center;font-weight:700"/>
      </div>
      <button onclick="riderCompleteDelivery('${o._id}')" style="width:100%;background:#16a34a;color:#fff;border:none;padding:.7rem;border-radius:8px;font-weight:700;cursor:pointer">✓ Verify OTP & Deliver</button>
    </div>`;
}

async function riderCompleteDelivery(orderId) {
  const input = document.getElementById('riderOtpInput');
  const otp = input ? input.value.trim() : '';
  if (!otp || otp.length !== 4) {
    if (typeof toast === 'function') toast('Ask the customer for their 4-digit delivery OTP', 'error');
    return;
  }
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    const res = await fetch(API_BASE_URL + '/api/delivery/orders/' + orderId + '/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ otp })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'OTP verification failed');
    if (typeof toast === 'function') toast('✓ Delivery confirmed!', 'success');
    stopRiderLocationShare();
    switchRiderTab('earnings');
    loadRiderEarnings();
  } catch (e) {
    if (typeof toast === 'function') toast(e.message, 'error');
  }
}

async function riderAdvanceStatus(orderId, status) {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    const res = await fetch(API_BASE_URL + '/api/delivery/orders/' + orderId + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status, note: 'Updated by rider' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Status update failed');
    if (typeof toast === 'function') toast('Order marked ' + status.replace(/_/g, ' '), 'success');
    if (status === 'out_for_delivery') switchRiderTab('active');
    if (status === 'delivered') { stopRiderLocationShare(); switchRiderTab('available'); }
    loadRiderOrders();
  } catch (e) {
    if (typeof toast === 'function') toast(e.message, 'error');
  }
}

function toggleRiderLocationShare() {
  if (_riderSharing) { stopRiderLocationShare(); }
  else { startRiderLocationShare(); }
  renderRiderOrders();
}

function startRiderLocationShare() {
  _riderSharing = true;
  if (typeof toast === 'function') toast('📡 Sharing live location with customer', 'info');

  if (navigator.geolocation) {
    _riderGeoWatchId = navigator.geolocation.watchPosition(
      pos => pushRiderLocation(pos.coords.latitude, pos.coords.longitude),
      err => {
        console.warn('Geolocation denied/failed, using simulated route:', err.message);
        startSimulatedRoute();
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );
  } else {
    startSimulatedRoute();
  }
}

// Fallback: walk a realistic Hyderabad route, streaming REAL coords to the API
function startSimulatedRoute() {
  const route = [
    [17.4486, 78.3908], [17.4470, 78.3955], [17.4448, 78.4010],
    [17.4425, 78.4075], [17.4408, 78.4160], [17.4396, 78.4260],
    [17.4388, 78.4370], [17.4375, 78.4482]
  ];
  let i = 0;
  if (_riderSimTimer) clearInterval(_riderSimTimer);
  _riderSimTimer = setInterval(() => {
    if (i >= route.length) { clearInterval(_riderSimTimer); _riderSimTimer = null; return; }
    pushRiderLocation(route[i][0], route[i][1]);
    i++;
  }, 4000);
}

async function pushRiderLocation(lat, lng) {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    await fetch(API_BASE_URL + '/api/riders/location', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ lat, lng })
    });
  } catch (e) { /* best-effort */ }
}

function stopRiderLocationShare() {
  _riderSharing = false;
  if (_riderGeoWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(_riderGeoWatchId);
    _riderGeoWatchId = null;
  }
  if (_riderSimTimer) { clearInterval(_riderSimTimer); _riderSimTimer = null; }
}


/* ═══════════════════════════════════════════════════
   NAV OVERHAUL — Premium Warm Glass Navigation System
   Handles: scroll-shrink, cart badge pop-bounce, idle
   cart wiggle, location text sync.
   ═══════════════════════════════════════════════════ */
(function aakaliNavOverhaul(){
  var reducedMotion = false;
  try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}

  // ── Scroll-shrink for top nav + user nav ──
  var lastY = window.scrollY || 0;
  var scrolledClassOn = false;
  var rafPending = false;

  function onScroll(){
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function(){
      var y = window.scrollY || 0;

      // Top nav shrink
      var wantScrolled = y > 20;
      if (wantScrolled !== scrolledClassOn) {
        scrolledClassOn = wantScrolled;
        document.querySelectorAll('.aknav.aknav-top, .aknav.aknav-ctx').forEach(function(n){
          n.classList.toggle('scrolled', wantScrolled);
        });
      }

      lastY = y;
      rafPending = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Cart badge pop-bounce + count sync across all three badges ──
  var LAST_CART_COUNT = -1;
  function computeCartCount(){
    try {
      if (typeof cart !== 'undefined' && Array.isArray(cart)) {
        return cart.reduce(function(s, c){ return s + (c.qty || c.quantity || 0); }, 0);
      }
    } catch(e){}
    return 0;
  }
  function applyCartBadge(el, count){
    if (!el) return;
    el.textContent = count > 99 ? '99+' : String(count);
    el.setAttribute('data-count', String(count));
    if (count > 0) {
      el.style.display = 'inline-flex';
    } else {
      el.style.display = 'none';
    }
  }
  function bounceBadges(){
    ['swadNavCartBadge','cartBadge'].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('bounce');
      // eslint-disable-next-line no-unused-expressions
      void el.offsetWidth;
      el.classList.add('bounce');
      setTimeout(function(){ el.classList.remove('bounce'); }, 620);
    });
  }
  function syncCartBadges(force){
    var count = computeCartCount();
    ['swadNavCartBadge','cartBadge'].forEach(function(id){
      applyCartBadge(document.getElementById(id), count);
    });
    if (count !== LAST_CART_COUNT) {
      if (LAST_CART_COUNT >= 0 && count > LAST_CART_COUNT && !reducedMotion) {
        bounceBadges();
      }
      LAST_CART_COUNT = count;
    } else if (force && !reducedMotion) {
      bounceBadges();
    }
    // reset idle timer on cart change
    scheduleCartIdleWiggle();
  }
  window.aakaliSyncCartBadges = syncCartBadges;

  // Wrap existing updateCartBadge if present so every call syncs all three UIs.
  if (typeof window.updateCartBadge === 'function' && !window.updateCartBadge.__aakaliWrapped) {
    var _origUpdate = window.updateCartBadge;
    window.updateCartBadge = function(){
      try { _origUpdate.apply(this, arguments); } catch(e){}
      syncCartBadges(false);
    };
    window.updateCartBadge.__aakaliWrapped = true;
  }
  // Poll briefly in case scripts wrap it later, then run initial sync.
  var polls = 0;
  var pollId = setInterval(function(){
    polls++;
    if (typeof window.updateCartBadge === 'function' && !window.updateCartBadge.__aakaliWrapped) {
      var _o = window.updateCartBadge;
      window.updateCartBadge = function(){
        try { _o.apply(this, arguments); } catch(e){}
        syncCartBadges(false);
      };
      window.updateCartBadge.__aakaliWrapped = true;
    }
    syncCartBadges(false);
    if (polls > 20) clearInterval(pollId);
  }, 500);

  // ── Idle cart wiggle after 30s if items in cart ──
  var wiggleTimer = null;
  function scheduleCartIdleWiggle(){
    if (reducedMotion) return;
    if (wiggleTimer) clearTimeout(wiggleTimer);
    if (computeCartCount() <= 0) return;
    wiggleTimer = setTimeout(function(){
      var top = document.getElementById('aknavCartBtnTop');
      var ctx = document.getElementById('aknavCartBtnCtx');
      [top, ctx].forEach(function(btn){
        if (!btn) return;
        btn.classList.remove('is-idle-wiggle');
        void btn.offsetWidth;
        btn.classList.add('is-idle-wiggle');
        setTimeout(function(){ btn.classList.remove('is-idle-wiggle'); }, 1400);
      });
      scheduleCartIdleWiggle();
    }, 30000);
  }
  ['mousemove','click','keydown','touchstart','scroll'].forEach(function(ev){
    window.addEventListener(ev, function(){
      if (wiggleTimer) { clearTimeout(wiggleTimer); wiggleTimer = null; }
      scheduleCartIdleWiggle();
    }, { passive: true });
  });

  // ── Location text sync from localStorage ──
  function readLoc(){
    try {
      var raw = localStorage.getItem('swad_detected_location');
      if (raw) {
        var j = JSON.parse(raw);
        return j.area || j.city || j.displayName || 'Hyderabad';
      }
    } catch(e){}
    return 'Hyderabad';
  }
  function syncLoc(){
    var el = document.getElementById('swadNavLoc');
    if (el) el.textContent = readLoc();
  }
  window.addEventListener('storage', function(e){
    if (e && e.key === 'swad_detected_location') syncLoc();
  });

  // ── Boot: initial state ──
  function boot(){
    // Sync location text into new nav
    syncLoc();
    // Initial cart badge state
    syncCartBadges(false);
    // Kick idle wiggle scheduler
    scheduleCartIdleWiggle();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

// ============================================================
//  ADMIN / OWNER / SUPER-ADMIN PANEL HANDLERS
//  (previously referenced via onclick but undefined)
// ============================================================

// --- Super Admin panel navigation ---
function superNav(section, el) {
  document.querySelectorAll('.super-nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  ['settings', 'hubs', 'revenue'].forEach(s => {
    const v = document.getElementById('super-sec-' + s);
    if (v) v.style.display = (s === section) ? 'block' : 'none';
  });
  const title = document.getElementById('superPageTitle');
  if (title) title.textContent = { settings: 'System Settings', hubs: 'Culinary Hubs', revenue: 'Global Revenue' }[section] || 'System Settings';
}

// --- Super Admin: save global system settings ---
function saveSystemSettings() {
  const tax = document.getElementById('sysTax');
  const del = document.getElementById('sysDelFee');
  const settings = { taxPct: tax ? tax.value : '5', baseDeliveryFee: del ? del.value : '40' };
  try { localStorage.setItem('aakali_system_settings', JSON.stringify(settings)); } catch (e) {}
  if (typeof toast === 'function') toast('System configuration saved', 'success');
}

// --- Restaurant Admin panel navigation ---
function restNav(section, el) {
  document.querySelectorAll('.rest-nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  ['menu', 'orders'].forEach(s => {
    const v = document.getElementById('rest-sec-' + s);
    if (v) v.style.display = (s === section) ? 'block' : 'none';
  });
  const title = document.getElementById('restPageTitle');
  if (title) title.textContent = { menu: 'Menu Catalog', orders: 'Kitchen Orders' }[section] || 'Menu Catalog';
  if (section === 'menu' && typeof renderRestMenu === 'function') renderRestMenu();
  if (section === 'orders' && typeof loadRestOrders === 'function') loadRestOrders('all');
}

// --- Restaurant Admin: render the active menu catalog ---
function renderRestMenu() {
  const grid = document.getElementById('restMenuGrid');
  if (!grid || typeof getMenu !== 'function') return;
  const menu = getMenu();
  grid.innerHTML = menu.map(m => `
    <div class="menu-mgr-card">
      <img src="${m.img}" alt="${m.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x148?text=No+Image'"/>
      <div class="menu-mgr-card-body">
        <div class="mmname">${m.name}</div>
        <div class="mmprice">₹${m.price}</div>
        <div class="mmcat">${m.category}</div>
      </div>
    </div>`).join('');
}

// --- Restaurant Admin: add a dish to the catalog ---
function restAddMenuItem() {
  const name = (document.getElementById('restNiName')?.value || '').trim();
  const price = parseInt(document.getElementById('restNiPrice')?.value || '0', 10);
  const cat = (document.getElementById('restNiCat')?.value || 'Indian');
  const img = (document.getElementById('restNiImg')?.value || '').trim();
  const desc = (document.getElementById('restNiDesc')?.value || '').trim();
  if (!name || !price || price < 1) {
    if (typeof toast === 'function') toast('Name and a valid price are required', 'error');
    return;
  }
  if (typeof getMenu !== 'function' || typeof saveMenu !== 'function') return;
  const menu = getMenu();
  menu.push({
    id: 'm' + Date.now(),
    name,
    price,
    category: cat.toLowerCase(),
    desc: desc || 'Freshly prepared dish.',
    rating: 4.5,
    img: img || ('https://via.placeholder.com/400x300?text=' + encodeURIComponent(name)),
    available: true
  });
  saveMenu(menu);
  ['restNiName', 'restNiPrice', 'restNiImg', 'restNiDesc'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  renderRestMenu();
  if (typeof toast === 'function') toast(name + ' added to catalog', 'success');
}

// --- Restaurant Admin: render incoming orders table ---
function loadRestOrders(filter) {
  const tb = document.getElementById('restOrdersTable');
  if (!tb) return;
  let orders = (typeof getOrders === 'function') ? getOrders().slice().reverse() : [];
  if (filter && filter !== 'all') orders = orders.filter(o => o.status === filter);
  if (!orders.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#999">No orders found.</td></tr>';
    return;
  }
  tb.innerHTML = orders.map(o => {
    const items = (o.items || []).map(i => (i.item_name || i.name || 'Item') + ' × ' + (i.quantity || i.qty || 1)).join(', ');
    const total = o.totalPaise ? (o.totalPaise / 100).toFixed(2) : (o.grand || 0);
    return `<tr>
      <td>#${(o._id || o.id || '').toString().slice(-6)}</td>
      <td>${o.custName || (o.deliveryAddress && o.deliveryAddress.phone) || 'Customer'}</td>
      <td style="max-width:200px">${items}</td>
      <td>₹${total}</td>
      <td>${o.status || 'pending'}</td>
      <td>—</td>
    </tr>`;
  }).join('');
}
