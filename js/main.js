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
  
  // Check if checkoutPage or orderSuccessPage or paymentPage is currently displayed
  const checkoutEl = document.getElementById('checkoutPage');
  const successEl = document.getElementById('orderSuccessPage');
  const paymentEl = document.getElementById('paymentPage');
  const isCheckoutOrSuccess = (checkoutEl && checkoutEl.style.display !== 'none') || 
                              (successEl && successEl.style.display !== 'none') ||
                              (paymentEl && paymentEl.style.display !== 'none');
  
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
  
  const coHeaderAddr = document.querySelector('.sco-address-line');
  if (coHeaderAddr) {
    coHeaderAddr.textContent = `📍 Delivering to: ${displayName}`;
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

function goToPaymentPage() {
  ['checkoutPage', 'orderSuccessPage', 'ordersSection', 'profileSection', 'heroSection', 'menuSection'].forEach(id => {
    const e = $(id); if(e) e.style.display = 'none';
  });
  const pe = $('paymentPage'); if(pe) pe.style.display = 'block';
  window.scrollTo(0,0);
  
  // Calculate and update order summary panel
  const sub = cart.reduce((s,c)=>s+c.price*c.qty, 0);
  const totalQty = cart.reduce((s,c)=>s+c.qty, 0);
  const saved = 30; // saved on delivery
  
  const pgItemsEl = document.getElementById('pg-summary-items');
  const pgTotalEl = document.getElementById('pg-summary-total');
  const pgSavingsEl = document.getElementById('pg-summary-savings');
  
  if (pgItemsEl) pgItemsEl.textContent = `${totalQty} Item${totalQty > 1 ? 's' : ''}`;
  if (pgTotalEl) pgTotalEl.textContent = '₹' + sub;
  if (pgSavingsEl) pgSavingsEl.textContent = `Saving ₹${saved}`;

  if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

function backToCheckout() {
  const pe = $('paymentPage'); if(pe) pe.style.display = 'none';
  const co = $('checkoutPage'); if(co) co.style.display = 'block';
  window.scrollTo(0,0);
  if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
}

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
        discount: r.discountTag || (r.deliveryFeePaise === 0 ? 'Free Delivery' : `₹${(r.deliveryFeePaise / 100)} Delivery Fee`),
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
        ${r.discount ? `<div class="swad-rest-discount-tag">🎁 ${r.discount}</div>` : ''}
        ${r.isVeg ? `<div class="swad-veg-only-tag">Pure Veg</div>` : ''}
        ${r.isClosed ? `<div class="swad-rest-closed-tag">CLOSED</div>` : ''}
        ${r.isNew ? `<div style="position:absolute;top:0.6rem;left:0.6rem;background:#7c3aed;color:#fff;font-size:0.6rem;font-weight:800;padding:0.2rem 0.5rem;border-radius:4px;letter-spacing:0.05em;">NEW</div>` : ''}
      </div>
      <div class="swad-rest-body">
        <div class="swad-rest-name">${r.name}</div>
        <div class="swad-rest-cuisine">${r.cuisine}</div>
        <div class="swad-rest-meta">
          <div class="swad-rest-rating">⭐ ${r.rating} (${r.ratingCount})</div>
          <div class="swad-rest-dot"></div>
          <div class="swad-rest-time">🕐 ${r.deliveryTime}</div>
          <div class="swad-rest-price-range">${r.priceRange}</div>
        </div>
        <div class="swad-rest-open-row">
          <span>Open ${r.name}'s restaurant page</span>
          <button class="swad-rest-open-btn" type="button" onclick="event.stopPropagation(); openRestaurant('${r.id}')">View Menu</button>
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
  if (!grid) return;
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-shimmer skeleton-img"></div>
      <div class="skeleton-shimmer skeleton-title" style="margin-top: 0.5rem; height: 18px;"></div>
      <div class="skeleton-shimmer skeleton-text" style="width: 50%; height: 12px; margin-top: 0.25rem;"></div>
      <div style="display: flex; justify-content: space-between; margin-top: 1rem; align-items: center;">
        <div class="skeleton-shimmer skeleton-text" style="width: 30%; height: 16px;"></div>
        <div class="skeleton-shimmer skeleton-text" style="width: 25%; height: 16px;"></div>
      </div>
    </div>
  `).join('');
}

function showMenuSkeleton() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-shimmer skeleton-img"></div>
      <div class="skeleton-shimmer skeleton-title" style="margin-top: 0.5rem; height: 18px;"></div>
      <div class="skeleton-shimmer skeleton-text" style="width: 90%; height: 12px; margin-top: 0.25rem;"></div>
      <div class="skeleton-shimmer skeleton-text" style="width: 70%; height: 12px; margin-top: 0.25rem; margin-bottom: 0.5rem;"></div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="skeleton-shimmer skeleton-text" style="width: 30%; height: 20px;"></div>
        <div class="skeleton-shimmer skeleton-text" style="width: 25%; height: 28px; border-radius: 8px;"></div>
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

  // Show restaurant detail header bar
  let rdhEl = document.getElementById('restDetailHeader');
  if (!rdhEl) {
    rdhEl = document.createElement('div');
    rdhEl.id = 'restDetailHeader';
    rdhEl.innerHTML = `
      <button class="rdh-back-btn" onclick="backToSwadHome()" title="Back to restaurants">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <div class="rdh-info">
        <div class="rdh-name" id="rdh-name"></div>
        <div class="rdh-meta" id="rdh-meta"></div>
      </div>
      <div class="rdh-rating" id="rdh-rating"></div>
      <div class="rdh-time-pill" id="rdh-time"></div>
    `;
    // Keep the restaurant bridge header inside the restaurant page, below the existing nav.
    const userNav = $('userPanel').querySelector('.user-navbar');
    if (userNav && userNav.nextSibling) {
      $('userPanel').insertBefore(rdhEl, userNav.nextSibling);
    } else {
      $('userPanel').insertBefore(rdhEl, $('userPanel').firstChild);
    }
  }
  const userNav = $('userPanel').querySelector('.user-navbar');
  if (userNav && rdhEl.previousElementSibling !== userNav) {
    userNav.insertAdjacentElement('afterend', rdhEl);
  }
  rdhEl.style.display = 'flex';
  document.getElementById('rdh-name').textContent = rest.name;
  document.getElementById('rdh-meta').textContent = rest.cuisine;
  document.getElementById('rdh-rating').textContent = '⭐ ' + rest.rating;
  document.getElementById('rdh-time').textContent = '🕐 ' + rest.deliveryTime;

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

function backToSwadHome() {
  // Hide user panel and restaurant header
  $('userPanel').style.display = 'none';
  const rdhEl = document.getElementById('restDetailHeader');
  if (rdhEl) rdhEl.style.display = 'none';
  swadSelectedRestaurant = null;
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
  // If we came from swadHome and there's a selected restaurant, do normal back
  if (swadSelectedRestaurant) {
    _origBackToMenuSwadHome();
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

// --- Popular Near You: show top 4 rated restaurants ---
function renderPopularNearYou(restaurants) {
  const grid = document.getElementById('aakaliPopularGrid');
  if (!grid || !restaurants || !restaurants.length) return;
  const top4 = [...restaurants].sort((a, b) => b.rating - a.rating).slice(0, 4);
  grid.innerHTML = top4.map(r => `
    <div class="swad-rest-card" onclick="openRestaurant('${r.id}')" data-id="${r.id}">
      <div class="swad-rest-img-wrap">
        <img src="${r.img}" alt="${r.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80'"/>
        ${r.discount ? '<div class="swad-rest-discount-tag">' + r.discount + '</div>' : ''}
      </div>
      <div class="swad-rest-body">
        <div class="swad-rest-name">${r.name}</div>
        <div class="swad-rest-cuisine">${r.cuisine}</div>
        <div class="swad-rest-meta">
          <div class="swad-rest-rating">${r.rating} ★</div>
          <div class="swad-rest-dot"></div>
          <div class="swad-rest-time">${r.deliveryTime}</div>
        </div>
      </div>
    </div>
  `).join('');
}

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
    { action: 'market', label: 'Aakali', icon: 'store' },
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
  if (mobileTaskbar) mobileTaskbar.classList.toggle('tb-hidden', !visible);
  if (desktopTaskbar) desktopTaskbar.style.display = visible ? 'flex' : 'none';
  const userPanel = document.getElementById('userPanel');
  if (userPanel) userPanel.style.paddingBottom = visible ? '90px' : '0';
  if (visible) renderAppTaskbar();
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

window.addEventListener('load', () => {
  renderAppTaskbar();
  syncAppTaskbarCartBadges();
});
