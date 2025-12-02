/**
 * ============================================================
 * ALMANIK PMS - Point of Sale (POS) JavaScript
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 * @developer DEV2
 *
 * Enhanced POS interface with:
 * - Product grid with images/icons
 * - Category filtering
 * - Search functionality
 * - Cart management
 * - Keyboard shortcuts
 */

// ============================================================
// STATE
// ============================================================

let products = [];
let cart = [];
let categories = [];
let currentCategory = 'all';
let searchTerm = '';
let currentPaymentMethod = 'cash';
let currentEditingProduct = null;
let currentProductImageData = null;

// Category icons mapping
const CATEGORY_ICONS = {
  'Bebidas': 'fa-wine-bottle',
  'Snacks': 'fa-cookie',
  'Comida': 'fa-utensils',
  'Servicios': 'fa-concierge-bell',
  'Otros': 'fa-box',
  'all': 'fa-th'
};

// Product icons by category (fallback when no image)
const PRODUCT_ICONS = {
  'Bebidas': 'fa-glass-water',
  'Snacks': 'fa-cookie-bite',
  'Comida': 'fa-burger',
  'Servicios': 'fa-hands-helping',
  'Otros': 'fa-cube'
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupKeyboardShortcuts();
  setupSearchDebounce();
});

// ============================================================
// DATA LOADING
// ============================================================

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Error loading products');

    products = await response.json();

    // Extract unique categories
    categories = [...new Set(products.map(p => p.category))].sort();

    renderCategoryTabs();
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    showToast('Error al cargar productos', 'error');
    document.getElementById('products-grid').innerHTML = `
      <div class="cart-empty" style="grid-column: 1/-1;">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error al cargar productos</p>
        <button class="btn btn-primary" onclick="loadProducts()">Reintentar</button>
      </div>
    `;
  }
}

// ============================================================
// RENDERING
// ============================================================

function renderCategoryTabs() {
  const container = document.getElementById('category-tabs');

  // Count products per category
  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  let html = `
    <button class="category-tab ${currentCategory === 'all' ? 'active' : ''}"
            data-category="all" onclick="filterCategory('all')">
      <i class="fas ${CATEGORY_ICONS['all']}"></i> Todos
      <span class="count">${products.length}</span>
    </button>
  `;

  categories.forEach(cat => {
    const icon = CATEGORY_ICONS[cat] || 'fa-tag';
    const count = categoryCounts[cat] || 0;
    html += `
      <button class="category-tab ${currentCategory === cat ? 'active' : ''}"
              data-category="${cat}" onclick="filterCategory('${cat}')">
        <i class="fas ${icon}"></i> ${cat}
        <span class="count">${count}</span>
      </button>
    `;
  });

  container.innerHTML = html;
}

function renderProducts() {
  const container = document.getElementById('products-grid');

  // Filter products
  let filtered = products;

  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="cart-empty" style="grid-column: 1/-1;">
        <i class="fas fa-search"></i>
        <p>No se encontraron productos</p>
        <small>${searchTerm ? 'Intenta con otra busqueda' : 'Agrega productos para comenzar'}</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => {
    const icon = PRODUCT_ICONS[product.category] || 'fa-box';
    const stockClass = product.stock <= 0 ? 'out' : product.stock <= 5 ? 'low' : '';
    const stockText = product.stock <= 0 ? 'Agotado' : `Stock: ${product.stock}`;
    const outOfStock = product.stock <= 0;

    return `
      <div class="product-card ${outOfStock ? 'out-of-stock' : ''}"
           onclick="${outOfStock ? '' : `addToCart(${product.id})`}"
           data-product-id="${product.id}">
        <div class="product-image">
          ${product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}">`
            : `<i class="fas ${icon}"></i>`
          }
        </div>
        <div class="product-name">${product.name}</div>
        <div class="product-price">$${formatNumber(product.price)}</div>
        <div class="product-stock ${stockClass}">${stockText}</div>
      </div>
    `;
  }).join('');
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const btnClear = document.getElementById('btn-clear-cart');
  const btnPayCash = document.getElementById('btn-pay-cash');
  const btnPayCard = document.getElementById('btn-pay-card');
  const mobileCount = document.getElementById('mobile-cart-count');

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Update mobile badge
  mobileCount.textContent = totalItems;

  // Update totals
  document.getElementById('cart-subtotal').textContent = `$${formatNumber(subtotal)}`;
  document.getElementById('cart-total').textContent = `$${formatNumber(subtotal)}`;

  // Toggle buttons
  const hasItems = cart.length > 0;
  btnClear.style.display = hasItems ? 'inline-flex' : 'none';
  btnPayCash.disabled = !hasItems;
  btnPayCard.disabled = !hasItems;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-shopping-basket"></i>
        <p>Carrito vacio</p>
        <small>Selecciona productos para agregar</small>
      </div>
    `;
    return;
  }

  container.innerHTML = cart.map(item => {
    const icon = PRODUCT_ICONS[item.category] || 'fa-box';
    const itemTotal = item.price * item.quantity;

    return `
      <div class="cart-item" data-cart-id="${item.id}">
        <div class="cart-item-image">
          <i class="fas ${icon}"></i>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${formatNumber(item.price)} c/u</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn minus" onclick="updateCartItem(${item.id}, -1)">
            <i class="fas fa-minus"></i>
          </button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button class="qty-btn plus" onclick="updateCartItem(${item.id}, 1)">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="cart-item-total">$${formatNumber(itemTotal)}</div>
        <span class="cart-item-remove" onclick="removeFromCart(${item.id})">
          <i class="fas fa-times"></i>
        </span>
      </div>
    `;
  }).join('');
}

// ============================================================
// CART OPERATIONS
// ============================================================

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    showToast('Producto agotado', 'warning');
    return;
  }

  const existingItem = cart.find(item => item.id === productId);

  if (existingItem) {
    if (existingItem.quantity >= product.stock) {
      showToast('Stock insuficiente', 'warning');
      return;
    }
    existingItem.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      quantity: 1,
      maxStock: product.stock
    });
  }

  renderCart();
  animateProductAdd(productId);
}

function updateCartItem(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQty > item.maxStock) {
    showToast('Stock insuficiente', 'warning');
    return;
  }

  item.quantity = newQty;
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;

  if (confirm('Vaciar carrito?')) {
    cart = [];
    renderCart();
    showToast('Carrito vaciado', 'success');
  }
}

// ============================================================
// PAYMENT PROCESSING
// ============================================================

function processPayment(method) {
  if (cart.length === 0) return;

  currentPaymentMethod = method;
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Build sale summary
  let summaryHtml = `
    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
      <h4 style="margin-bottom: 0.8rem;">Resumen de Venta</h4>
  `;

  cart.forEach(item => {
    summaryHtml += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem; font-size: 0.9rem;">
        <span>${item.quantity}x ${item.name}</span>
        <span>$${formatNumber(item.price * item.quantity)}</span>
      </div>
    `;
  });

  summaryHtml += `
      <hr style="border: none; border-top: 1px solid #ddd; margin: 0.8rem 0;">
      <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.1rem;">
        <span>TOTAL</span>
        <span>$${formatNumber(total)}</span>
      </div>
      <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #7f8c8d;">
        Metodo: ${method === 'cash' ? 'Efectivo' : 'Tarjeta'}
      </div>
    </div>
  `;

  document.getElementById('sale-summary').innerHTML = summaryHtml;

  // Show change calculator for cash
  const changeSection = document.getElementById('change-section');
  if (method === 'cash') {
    changeSection.style.display = 'block';
    document.getElementById('payment-received').value = '';
    document.getElementById('change-amount').textContent = '$0';

    // Setup change calculator
    document.getElementById('payment-received').oninput = function() {
      const received = parseFloat(this.value) || 0;
      const change = received - total;
      document.getElementById('change-amount').textContent = `$${formatNumber(Math.max(0, change))}`;
      document.getElementById('change-amount').style.color = change >= 0 ? 'var(--success)' : 'var(--danger)';
    };
  } else {
    changeSection.style.display = 'none';
  }

  openModal('sale-modal');
}

async function confirmSale() {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Validate cash payment
  if (currentPaymentMethod === 'cash') {
    const received = parseFloat(document.getElementById('payment-received').value) || 0;
    if (received < total) {
      showToast('Monto insuficiente', 'error');
      return;
    }
  }

  try {
    const response = await fetch('/api/pos/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: currentPaymentMethod,
        total: total
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error processing sale');
    }

    const result = await response.json();

    // Success
    closeModal('sale-modal');
    cart = [];
    renderCart();
    loadProducts(); // Refresh stock

    showToast(`Venta completada - $${formatNumber(total)}`, 'success');

    // Show change if cash
    if (currentPaymentMethod === 'cash') {
      const received = parseFloat(document.getElementById('payment-received').value) || total;
      const change = received - total;
      if (change > 0) {
        setTimeout(() => {
          showToast(`Cambio: $${formatNumber(change)}`, 'warning');
        }, 1500);
      }
    }
  } catch (error) {
    console.error('Error processing sale:', error);
    showToast(error.message || 'Error al procesar venta', 'error');
  }
}

// ============================================================
// CATEGORY & SEARCH
// ============================================================

function filterCategory(category) {
  currentCategory = category;
  renderCategoryTabs();
  renderProducts();
}

function setupSearchDebounce() {
  let timeout;
  const searchInput = document.getElementById('search-input');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      searchTerm = e.target.value.trim();
      renderProducts();
    }, 200);
  });
}

// ============================================================
// PRODUCT MANAGEMENT
// ============================================================

function openProductModal(productId = null) {
  currentEditingProduct = productId;
  currentProductImageData = null;

  const preview = document.getElementById('product-image-preview');
  const removeBtn = document.getElementById('btn-remove-image');
  const fileInput = document.getElementById('product-image-input');

  // Reset file input
  if (fileInput) fileInput.value = '';

  if (productId) {
    // Edit mode
    const product = products.find(p => p.id === productId);
    if (product) {
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-category').value = product.category;
      document.getElementById('product-stock').value = product.stock;

      // Show existing image
      if (product.image_url) {
        preview.innerHTML = `<img src="${product.image_url}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;">`;
        removeBtn.style.display = 'inline-flex';
      } else {
        preview.innerHTML = '<i class="fas fa-camera" style="font-size: 2rem; color: white;"></i>';
        removeBtn.style.display = 'none';
      }
    }
  } else {
    // Create mode
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-stock').value = '0';

    preview.innerHTML = '<i class="fas fa-camera" style="font-size: 2rem; color: white;"></i>';
    removeBtn.style.display = 'none';
  }

  openModal('product-modal');
}

async function saveProduct() {
  const name = document.getElementById('product-name').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const category = document.getElementById('product-category').value;
  const stock = parseInt(document.getElementById('product-stock').value) || 0;

  if (!name || !price || !category) {
    showToast('Completa todos los campos requeridos', 'error');
    return;
  }

  try {
    let productId = currentEditingProduct;

    if (currentEditingProduct) {
      // Update existing product
      const response = await fetch(`/api/products/${currentEditingProduct}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, category, stock })
      });
      if (!response.ok) throw new Error('Error updating product');
    } else {
      // Create new product
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, category, stock })
      });
      if (!response.ok) throw new Error('Error saving product');
      const result = await response.json();
      productId = result.id;
    }

    // Upload image if selected
    if (currentProductImageData && productId) {
      await uploadProductImage(productId, currentProductImageData);
    }

    closeModal('product-modal');
    loadProducts();
    showToast(currentEditingProduct ? 'Producto actualizado' : 'Producto guardado', 'success');
  } catch (error) {
    console.error('Error saving product:', error);
    showToast('Error al guardar producto', 'error');
  }
}

/**
 * Preview product image before upload
 */
function previewProductImage(input) {
  const preview = document.getElementById('product-image-preview');
  const removeBtn = document.getElementById('btn-remove-image');

  if (input.files && input.files[0]) {
    const file = input.files[0];

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen no puede superar 2MB', 'error');
      input.value = '';
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Solo JPG, PNG o WebP permitidos', 'error');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      currentProductImageData = e.target.result;
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width:100%;height:100%;object-fit:cover;">`;
      removeBtn.style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);
  }
}

/**
 * Remove product image
 */
async function removeProductImage() {
  const preview = document.getElementById('product-image-preview');
  const removeBtn = document.getElementById('btn-remove-image');
  const fileInput = document.getElementById('product-image-input');

  // If editing existing product with image, delete from server
  if (currentEditingProduct) {
    const product = products.find(p => p.id === currentEditingProduct);
    if (product && product.image_url) {
      try {
        await fetch(`/api/products/${currentEditingProduct}/image`, {
          method: 'DELETE'
        });
        showToast('Imagen eliminada', 'success');
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  }

  // Reset UI
  currentProductImageData = null;
  if (fileInput) fileInput.value = '';
  preview.innerHTML = '<i class="fas fa-camera" style="font-size: 2rem; color: white;"></i>';
  removeBtn.style.display = 'none';
}

/**
 * Upload product image to server
 */
async function uploadProductImage(productId, imageData) {
  try {
    const response = await fetch(`/api/products/${productId}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error uploading image');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading image:', error);
    showToast('Error al subir imagen', 'warning');
  }
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // F1 - Cash payment
    if (e.key === 'F1') {
      e.preventDefault();
      if (cart.length > 0) processPayment('cash');
    }

    // F2 - Card payment
    if (e.key === 'F2') {
      e.preventDefault();
      if (cart.length > 0) processPayment('card');
    }

    // Ctrl+F - Focus search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }

    // Escape - Clear search or close modal
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        closeModal(activeModal.id);
      } else {
        document.getElementById('search-input').value = '';
        searchTerm = '';
        renderProducts();
      }
    }

    // Enter in sale modal - Confirm
    if (e.key === 'Enter') {
      const saleModal = document.getElementById('sale-modal');
      if (saleModal.classList.contains('active')) {
        confirmSale();
      }
    }
  });
}

// ============================================================
// UI HELPERS
// ============================================================

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function toggleMobileCart() {
  document.getElementById('cart-panel').classList.toggle('open');
}

function animateProductAdd(productId) {
  const card = document.querySelector(`[data-product-id="${productId}"]`);
  if (card) {
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
      card.style.transform = '';
    }, 100);
  }
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'exclamation'}-circle"></i> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function formatNumber(num) {
  return num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Initialize cart render
renderCart();
