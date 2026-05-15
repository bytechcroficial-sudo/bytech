(() => {
  const STORAGE_KEY = 'bytech_cart';
  const BUYER_NAME_KEY = 'bytech_buyer_name';
  const BUYER_PHONE_KEY = 'bytech_buyer_phone';
  const BUYER_ADDRESS_KEY = 'bytech_buyer_address';

  const currency = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0
  });

  const cartFab = document.getElementById('cartFab');
  const cartPanel = document.getElementById('cartPanel');
  const cartBackdrop = document.getElementById('cartBackdrop');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartItems = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartCount = document.getElementById('cartCount');
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');
  const buyerName = document.getElementById('buyerName');
  const buyerPhone = document.getElementById('buyerPhone');
  const buyerAddress = document.getElementById('buyerAddress');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const emailCheckoutBtn = document.getElementById('emailCheckoutBtn');
  const whatsappCheckoutBtn = document.getElementById('whatsappCheckoutBtn');

  const PRODUCT_CATALOG =
    (Array.isArray(window.PRODUCTS) && window.PRODUCTS) ||
    (Array.isArray(window.products) && window.products) ||
    [];

  let cart = [];

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(normalizeProduct) : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  function loadBuyerInfo() {
    if (buyerName) buyerName.value = localStorage.getItem(BUYER_NAME_KEY) || '';
    if (buyerPhone) buyerPhone.value = localStorage.getItem(BUYER_PHONE_KEY) || '';
    if (buyerAddress) buyerAddress.value = localStorage.getItem(BUYER_ADDRESS_KEY) || '';
  }

  function saveBuyerInfo() {
    if (buyerName) localStorage.setItem(BUYER_NAME_KEY, buyerName.value);
    if (buyerPhone) localStorage.setItem(BUYER_PHONE_KEY, buyerPhone.value);
    if (buyerAddress) localStorage.setItem(BUYER_ADDRESS_KEY, buyerAddress.value);
  }

  function showToast(message) {
    let toast = document.getElementById('toast');

    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 1800);
  }

  function setCartState(open) {
    if (cartPanel) cartPanel.classList.toggle('open', open);
    if (cartBackdrop) cartBackdrop.classList.toggle('open', open);
    if (document.body) document.body.classList.toggle('cart-open', open);
    if (cartFab) cartFab.setAttribute('aria-expanded', String(open));
  }

  function openCart() {
    setCartState(true);
  }

  function closeCart() {
    setCartState(false);
  }

  function findCatalogProduct(product) {
    const key = String(product?.id || product?.slug || product?.name || '').trim();
    if (!key || !PRODUCT_CATALOG.length) return null;

    return PRODUCT_CATALOG.find(p => {
      const pid = String(p?.id || p?.slug || p?.name || '').trim();
      return pid === key;
    }) || null;
  }

  function normalizeProduct(product) {
    const catalog = findCatalogProduct(product);

    const name = String(
      product?.name ||
      product?.title ||
      catalog?.name ||
      'Producto'
    ).trim();

    const slug = String(
      product?.slug ||
      product?.id ||
      catalog?.id ||
      name
    ).trim();

    const originalPrice = Number(
      product?.price ??
      catalog?.price ??
      0
    );

    const salePrice = Number(
      product?.salePrice ??
      catalog?.salePrice ??
      0
    );

    const hasValidSale =
      Number.isFinite(salePrice) &&
      salePrice > 0 &&
      Number.isFinite(originalPrice) &&
      salePrice < originalPrice;

    const currentPrice = hasValidSale ? salePrice : originalPrice;

    const image = String(
      product?.media?.cover ||
      product?.image ||
      catalog?.media?.cover ||
      catalog?.image ||
      ''
    ).trim();

    const stockRaw = product?.stock ?? catalog?.stock;

    return {
      slug,
      name,
      price: currentPrice,
      originalPrice,
      salePrice: hasValidSale ? salePrice : null,
      hasDiscount: hasValidSale,
      image,
      stock: Number.isFinite(Number(stockRaw)) ? Number(stockRaw) : null,
      qty: Math.max(1, Number(product?.qty || 1))
    };
  }

  function totalQuantity() {
    return cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  function subtotalValue() {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
  }

  function updateBadges() {
    if (cartCount) cartCount.textContent = String(totalQuantity());
  }

  function priceHTML(itemPrice, item) {
    if (item.hasDiscount && Number(item.originalPrice) > Number(itemPrice)) {
      return `
        <span class="old-price">${currency.format(item.originalPrice)}</span>
        <span class="sale-price">${currency.format(itemPrice)}</span>
      `;
    }
    return `<span class="regular-price">${currency.format(itemPrice)}</span>`;
  }

  function renderCart() {
    if (!cartItems || !subtotalEl || !totalEl || !cartCount) return;

    cartItems.innerHTML = '';

    if (!cart.length) {
      if (cartEmpty) cartEmpty.style.display = 'block';
      subtotalEl.textContent = currency.format(0);
      totalEl.textContent = currency.format(0);
      cartCount.textContent = '0';
      saveCart();
      return;
    }

    if (cartEmpty) cartEmpty.style.display = 'none';

    let sum = 0;
    let quantityTotal = 0;

    cart.forEach((item, index) => {
      const itemQty = Number(item.qty || 1);
      const itemPrice = Number(item.price || 0);
      const itemTotal = itemPrice * itemQty;

      sum += itemTotal;
      quantityTotal += itemQty;

      const row = document.createElement('div');
      row.className = 'cart-item';

      row.innerHTML = `
        <img src="${item.image || 'https://via.placeholder.com/150x150?text=Producto'}" alt="${item.name || 'Producto'}" loading="lazy" decoding="async">
        <div>
          <h4>${item.name || 'Producto'}</h4>
          <small class="cart-price-line">
            ${priceHTML(itemPrice, item)}
            <span class="unit-text">c/u</span>
          </small>
          <div class="qty-row">
            <div class="qty-controls">
              <button class="qty-btn" type="button" data-dec="${index}" aria-label="Disminuir">-</button>
              <strong>${itemQty}</strong>
              <button class="qty-btn" type="button" data-inc="${index}" aria-label="Aumentar">+</button>
            </div>
            <button class="remove-btn" type="button" data-remove="${index}">Eliminar</button>
          </div>
        </div>
      `;

      cartItems.appendChild(row);
    });

    cartCount.textContent = String(quantityTotal);
    subtotalEl.textContent = currency.format(sum);
    totalEl.textContent = currency.format(sum);

    cartItems.querySelectorAll('[data-inc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.inc);
        if (!cart[i]) return;

        const nextQty = Number(cart[i].qty || 1) + 1;
        const maxStock = Number(cart[i].stock);

        if (Number.isFinite(maxStock) && maxStock > 0 && nextQty > maxStock) {
          showToast('No hay más stock disponible');
          return;
        }

        cart[i].qty = nextQty;
        saveCart();
        renderCart();
        showToast('Carrito actualizado');
      });
    });

    cartItems.querySelectorAll('[data-dec]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.dec);
        if (!cart[i]) return;

        cart[i].qty = Number(cart[i].qty || 1) - 1;
        if (cart[i].qty <= 0) cart.splice(i, 1);

        saveCart();
        renderCart();
        showToast('Carrito actualizado');
      });
    });

    cartItems.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.remove);
        if (!cart[i]) return;

        cart.splice(i, 1);
        saveCart();
        renderCart();
        showToast('Producto eliminado');
      });
    });

    saveCart();
    updateBadges();
  }

  function addToCart(product) {
    const item = normalizeProduct(product);
    if (!item.name || !item.slug) return;

    const existing = cart.find(current => current.slug === item.slug);

    if (existing) {
      const maxStock = Number(item.stock);
      const nextQty = Number(existing.qty || 1) + 1;

      if (Number.isFinite(maxStock) && maxStock > 0 && nextQty > maxStock) {
        showToast('No hay más stock disponible');
        return;
      }

      existing.qty = nextQty;

      if (item.image) existing.image = item.image;
      if (Number.isFinite(item.price)) existing.price = item.price;
      if (Number.isFinite(item.originalPrice)) existing.originalPrice = item.originalPrice;
      if (Number.isFinite(item.salePrice)) existing.salePrice = item.salePrice;
      if (item.stock !== null) existing.stock = item.stock;
      existing.hasDiscount = item.hasDiscount;
    } else {
      cart.push(item);
    }

    saveCart();
    renderCart();
    openCart();
    showToast('Producto agregado');
  }

  function getBuyerInfo() {
    return {
      name: buyerName ? buyerName.value.trim() : '',
      phone: buyerPhone ? buyerPhone.value.trim() : '',
      address: buyerAddress ? buyerAddress.value.trim() : ''
    };
  }

  function buildOrderText() {
    if (!cart.length) return null;

    const buyer = getBuyerInfo();
    const lines = [
      'Hola Bytech, quiero realizar este pedido:',
      '',
      `Nombre: ${buyer.name || 'No indicado'}`,
      `Teléfono: ${buyer.phone || 'No indicado'}`,
      `Dirección: ${buyer.address || 'No indicada'}`,
      ''
    ];

    let sum = 0;

    cart.forEach(item => {
      const qty = Number(item.qty || 1);
      const price = Number(item.price || 0);
      const lineTotal = price * qty;
      sum += lineTotal;
      lines.push(`- ${item.name} x${qty} — ${currency.format(lineTotal)}`);
    });

    lines.push('', `Total: ${currency.format(sum)}`);
    return lines.join('\n');
  }

  function ensureCheckoutFields() {
    const buyer = getBuyerInfo();
    const missing = [];

    if (!buyer.name) missing.push('nombre');
    if (!buyer.phone) missing.push('teléfono');
    if (!buyer.address) missing.push('dirección');

    if (missing.length) {
      showToast(`Completa: ${missing.join(', ')}`);
      return false;
    }

    return true;
  }

  function sendWhatsAppOrder() {
    if (!cart.length) {
      showToast('Tu carrito está vacío');
      return;
    }

    if (!ensureCheckoutFields()) return;

    const text = encodeURIComponent(buildOrderText());
    window.open(`https://wa.me/50660399665?text=${text}`, '_blank', 'noopener');
  }

  function sendEmailOrder() {
    if (!cart.length) {
      showToast('Tu carrito está vacío');
      return;
    }

    if (!ensureCheckoutFields()) return;

    const subject = encodeURIComponent('Pedido Bytech');
    const body = encodeURIComponent(buildOrderText());
    window.location.href = `mailto:bytech.cr.oficial@gmail.com?subject=${subject}&body=${body}`;
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderCart();
    showToast('Carrito vaciado');
  }

  if (cartFab) cartFab.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);
  if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
  if (whatsappCheckoutBtn) whatsappCheckoutBtn.addEventListener('click', sendWhatsAppOrder);
  if (emailCheckoutBtn) emailCheckoutBtn.addEventListener('click', sendEmailOrder);

  if (buyerName) buyerName.addEventListener('input', saveBuyerInfo);
  if (buyerPhone) buyerPhone.addEventListener('input', saveBuyerInfo);
  if (buyerAddress) buyerAddress.addEventListener('input', saveBuyerInfo);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      cart = loadCart();
      renderCart();
    }
  });

  loadBuyerInfo();
  cart = loadCart();
  renderCart();

  window.addToCart = addToCart;
  window.renderCart = renderCart;
  window.openCart = openCart;
  window.closeCart = closeCart;
})();