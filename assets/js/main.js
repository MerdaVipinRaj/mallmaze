const STORAGE_KEYS = {
  user: 'mm_user',
  location: 'mm_location',
  cart: 'mm_cart',
  rewards: 'mm_rewards',
  orders: 'mm_orders',
  queue: 'mm_queue',
  wishlist: 'mm_wishlist',
  customMalls: 'mm_custom_malls',
  customStores: 'mm_custom_stores',
  managers: 'mm_managers',
  stock: 'mm_stock'
};

const read = (k, f) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; }
  catch { return f; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const el = (id) => document.getElementById(id);
const money = (n) => `Rs ${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function prefetchPages(pages) {
  try {
    const can = document?.head && typeof document.createElement === 'function';
    if (!can) return;
    (pages || []).forEach((href) => {
      const url = String(href || '').trim();
      if (!url) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  } catch {}
}

function toast(message, opts) {
  const o = opts || {};
  const title = o.title || (o.type === 'ok' ? 'Done' : o.type === 'bad' ? 'Something went wrong' : 'MallMaze');
  const type = o.type || 'info';
  let wrap = document.querySelector('.mm-toasts');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'mm-toasts';
    document.body.appendChild(wrap);
  }

  // ARIA live region for screen readers
  let live = document.getElementById('mm-toast-live');
  if (!live) {
    live = document.createElement('div');
    live.id = 'mm-toast-live';
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
  }
  live.textContent = `${title}. ${String(message || '')}`;

  const node = document.createElement('div');
  node.className = `mm-toast ${type === 'ok' ? 'ok' : type === 'bad' ? 'bad' : ''}`;
  node.innerHTML = `
    <span class="mm-toast-dot" aria-hidden="true"></span>
    <div>
      <p class="mm-toast-title">${escapeHtml(title)}</p>
      <p class="mm-toast-msg">${escapeHtml(String(message || ''))}</p>
    </div>
    <button class="mm-toast-x" type="button" aria-label="Dismiss">×</button>
  `;
  wrap.appendChild(node);
  const remove = () => node.remove();
  node.querySelector('.mm-toast-x')?.addEventListener('click', remove);
  setTimeout(remove, Number(o.ms || 3200));
}

function emptyState(opts) {
  const o = opts || {};
  const title = escapeHtml(String(o.title || 'Nothing here yet'));
  const subtitle = escapeHtml(String(o.subtitle || ''));
  const href = o.href ? String(o.href) : '';
  const cta = escapeHtml(o.cta ? String(o.cta) : '');
  const iconSvg = String(o.icon || '');
  return `
    <div class="mm-card mm-card-pad max-w-2xl mx-auto">
      <div class="flex items-start gap-4">
        <div class="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
          ${iconSvg || '<span class="text-lg font-black">MM</span>'}
        </div>
        <div class="min-w-0">
          <h2 class="text-xl font-extrabold">${title}</h2>
          ${subtitle ? `<p class="mm-page-sub">${subtitle}</p>` : ''}
          ${href && cta ? `<a href="${href}" class="inline-flex mt-4 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white font-semibold">${cta} <span aria-hidden="true">→</span></a>` : ''}
        </div>
      </div>
    </div>
  `;
}

function loadingState(opts) {
  const o = opts || {};
  const title = String(o.title || 'Loading…');
  return `
    <div class="mm-card mm-card-pad max-w-2xl mx-auto">
      <div class="flex items-start gap-4">
        <div class="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse"></div>
        <div class="flex-1">
          <p class="font-extrabold">${title}</p>
          <div class="mt-3 space-y-2">
            <div class="h-3 w-5/6 rounded bg-slate-100 border border-slate-200 animate-pulse"></div>
            <div class="h-3 w-2/3 rounded bg-slate-100 border border-slate-200 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

const state = {
  user: read(STORAGE_KEYS.user, null),
  location: read(STORAGE_KEYS.location, ''),
  cart: read(STORAGE_KEYS.cart, []),
  rewards: read(STORAGE_KEYS.rewards, { total: 0, earned: 0, redeemed: 0 }),
  orders: read(STORAGE_KEYS.orders, []),
  queue: read(STORAGE_KEYS.queue, []),
  wishlist: read(STORAGE_KEYS.wishlist, []),
  customMalls: read(STORAGE_KEYS.customMalls, []),
  customStores: read(STORAGE_KEYS.customStores, []),
  managers: read(STORAGE_KEYS.managers, []),
  stock: read(STORAGE_KEYS.stock, {})
};

function supa() {
  return window.MM_SUPABASE?.getClient?.() || null;
}

async function supaSessionUser() {
  const client = supa();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user || null;
}

async function ensureProfile() {
  const client = supa();
  if (!client) return;
  const user = await supaSessionUser();
  if (!user) return;
  const existing = await client.from('profiles').select('user_id').eq('user_id', user.id).maybeSingle();
  if (existing?.data?.user_id) return;
  await client.from('profiles').insert({ user_id: user.id, name: state.user?.name || null, phone: null, default_city: state.location || null });
}

async function loadAppData() {
  const client = supa();
  if (!client) {
    const raw = await fetch('./data/mock-data.json')
      .then((r) => r.ok ? r.json() : ({ malls: [], stores: [], products: [], categories: [], flashDeals: [] }))
      .catch(() => ({ malls: [], stores: [], products: [], categories: [], flashDeals: [] }));
    return mergeData(raw);
  }

  // Supabase-driven catalog (minimal v1 mapping)
  const city = state.location || '';
  const mallsQ = client.from('malls').select('*');
  const storesQ = client.from('stores').select('*');
  const productsQ = client.from('products').select('*').eq('is_active', true);

  const [{ data: malls }, { data: stores }, { data: products }, { data: inv }] = await Promise.all([
    city ? mallsQ.eq('city', city) : mallsQ,
    city ? storesQ.eq('city', city) : storesQ,
    productsQ,
    client.from('inventory').select('*')
  ]);

  const invByProduct = new Map((inv || []).map((x) => [x.product_id, x]));
  const mallById = new Map((malls || []).map((m) => [m.id, m]));
  const storeById = new Map((stores || []).map((s) => [s.id, s]));

  const mappedMalls = (malls || []).map((m) => ({
    id: m.id,
    name: m.name,
    location: `${m.address || ''}${m.address ? ', ' : ''}${m.city}`,
    image: m.image_url || 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800',
    rating: 4.4,
    storeCount: 0,
    openHours: m.open_hours || '',
    description: m.description || '',
    floors: m.floors || 0,
    deliveryTime: '35 min'
  }));

  const mappedStores = (stores || []).map((s) => ({
    id: s.id,
    mallId: s.mall_id,
    name: s.name,
    category: s.category || '',
    image: s.image_url || 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600',
    rating: 4.3,
    floor: s.floor || '',
    isOpen: Boolean(s.is_open),
    productCount: 0
  }));

  const mappedProducts = (products || []).map((p) => {
    const invRow = invByProduct.get(p.id);
    const stockCount = invRow ? Number(invRow.available_qty || 0) : 0;
    const store = storeById.get(p.store_id);
    const mall = p.mall_id ? mallById.get(p.mall_id) : null;
    return {
      id: p.id,
      storeId: p.store_id,
      mallId: p.mall_id,
      name: p.name,
      price: Number(p.price_inr || 0),
      originalPrice: Number(p.original_price_inr || 0),
      image: p.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      category: p.category || '',
      rating: 4.5,
      reviews: 0,
      inStock: stockCount > 0,
      stockCount,
      variants: [],
      storeName: store?.name || 'Store',
      mallName: mall?.name || 'Mall',
      deliveryTime: '35 min',
      badge: ''
    };
  });

  const catCounts = new Map();
  mappedProducts.forEach((p) => {
    if (!p.category) return;
    catCounts.set(p.category, (catCounts.get(p.category) || 0) + 1);
  });
  const categories = [...catCounts.entries()].map(([name, count]) => ({ name, count }));

  return { malls: mappedMalls, stores: mappedStores, products: mappedProducts, categories, flashDeals: [] };
}

function persist() {
  write(STORAGE_KEYS.user, state.user);
  write(STORAGE_KEYS.location, state.location);
  write(STORAGE_KEYS.cart, state.cart);
  write(STORAGE_KEYS.rewards, state.rewards);
  write(STORAGE_KEYS.orders, state.orders);
  write(STORAGE_KEYS.queue, state.queue);
  write(STORAGE_KEYS.wishlist, state.wishlist);
  write(STORAGE_KEYS.customMalls, state.customMalls);
  write(STORAGE_KEYS.customStores, state.customStores);
  write(STORAGE_KEYS.managers, state.managers);
  write(STORAGE_KEYS.stock, state.stock);
}

function cityOf(location) {
  if (!location) return '';
  const p = String(location).split(',').map((x) => x.trim()).filter(Boolean);
  return p[p.length - 1] || '';
}

function downloadTextFile(filename, content) {
  try {
    const blob = new Blob([String(content || '')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = String(filename || 'download.txt');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  } catch {}
}

function icon(name) {
  const x = {
    map: '<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    cart: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 3H5l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.7L22 7H6.2"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    heart: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m12 21-1.1-1C5.1 14.8 2 12 2 8.5A4.5 4.5 0 0 1 6.5 4c1.7 0 3.3.8 4.5 2.1A6.1 6.1 0 0 1 15.5 4 4.5 4.5 0 0 1 20 8.5c0 3.5-3.1 6.3-8.9 11.5z"/></svg>',
    pin: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m6 9 6 6 6-6"/></svg>',
    catFashion: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    catElectronics: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/></svg>',
    catBeauty: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.5 3.3L17 7.5l-2.5 2.4.6 3.5-3.1-1.6-3.1 1.6.6-3.5L7 7.5l3.5-1.2z"/></svg>',
    catSports: '<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="9.5" width="2.5" height="5"/><rect x="6" y="8.5" width="2.5" height="7"/><line x1="8.8" y1="12" x2="15.2" y2="12"/><rect x="15.5" y="8.5" width="2.5" height="7"/><rect x="19" y="9.5" width="2.5" height="5"/></svg>',
    catHome: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M6 9.5V20h12V9.5"/></svg>',
    catBooks: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21z"/><path d="M8 7h8"/></svg>',
    catKids: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="2.2"/><path d="M8.2 13.2h7.6"/><rect x="7.5" y="13.5" width="9" height="5.5" rx="2"/><circle cx="10" cy="19.2" r="1"/><circle cx="14" cy="19.2" r="1"/></svg>',
    catFood: '<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="4.6"/><line x1="5.2" y1="6" x2="5.2" y2="18"/><line x1="7.2" y1="6" x2="7.2" y2="18"/><line x1="5.2" y1="10" x2="7.2" y2="10"/><line x1="18.2" y1="6" x2="18.2" y2="18"/><path d="M18.2 6h1a1 1 0 0 1 1 1v2.2a2.2 2.2 0 0 1-2.2 2.2h-.8"/></svg>'
  };
  return x[name] || '';
}

function renderNavbar() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  const file = location.pathname.split('/').pop() || 'index.html';
  const CITIES = [
    { city: 'Hyderabad', state: 'Telangana' },
    { city: 'New Delhi', state: 'Delhi' },
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Bangalore', state: 'Karnataka' },
    { city: 'Chennai', state: 'Tamil Nadu' },
    { city: 'Pune', state: 'Maharashtra' },
    { city: 'Kolkata', state: 'West Bengal' }
  ];
  const locationValue = state.location || 'Hyderabad';
  const navItem = (href, label, active) =>
    `<a href="${href}" class="sm-nav-link rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'active' : ''}">${label}</a>`;
  const citiesMarkup = CITIES.map((c) => {
    const active = c.city === locationValue;
    return `
      <button type="button" class="sm-city-item ${active ? 'active' : ''}" data-city="${c.city}">
        <span class="sm-city-left">${icon('pin')}<span class="sm-city-name">${c.city}</span></span>
        <span class="sm-state-name">${c.state}</span>
      </button>
    `;
  }).join('');

  nav.className = 'sm-header';
  nav.innerHTML = `
    <div class="container mx-auto flex min-h-16 items-center justify-between gap-4 px-4 py-2">
      <div class="sm-left flex items-center gap-3 min-w-0">
        <a href="index.html" class="sm-logo font-extrabold text-lg whitespace-nowrap">SmartMall India</a>
        <div class="sm-location-wrap">
          <button type="button" id="sm-location-btn" class="sm-location-btn" aria-haspopup="true" aria-expanded="false">
            <span class="sm-location-main">${icon('pin')}<span id="sm-selected-city">${locationValue}</span></span>
            <span class="sm-location-arrow">${icon('chevronDown')}</span>
          </button>
          <div id="sm-location-panel" class="sm-location-panel" role="menu" aria-hidden="true">
            <div class="sm-location-head">
              <p class="sm-location-title">Select Your City</p>
              <p class="sm-location-sub">Choose your shopping location</p>
            </div>
            <div class="sm-city-list">${citiesMarkup}</div>
          </div>
        </div>
      </div>

      <div class="sm-nav hidden md:flex items-center gap-2">
        ${navItem('index.html', 'Home', file === 'index.html' || file === 'dashboard.html')}
        ${navItem('malls.html', 'Malls', file === 'malls.html' || file === 'mall.html')}
        ${navItem('products.html', 'Products', file === 'products.html' || file === 'product.html')}
        ${navItem('deals.html', 'Deals', file === 'deals.html')}
        ${navItem('compare.html', 'Compare', file === 'compare.html')}
        ${navItem('scan.html', 'Scan&Go', file === 'scan.html')}
      </div>

      <div class="sm-right flex items-center gap-2">
        <a href="products.html" class="sm-icon-btn rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Search">${icon('search')}</a>
        <a href="wishlist.html" class="sm-icon-btn rounded-full p-2 text-slate-700 hover:bg-slate-100 relative" aria-label="Wishlist">${icon('heart')}<span class="sm-count absolute -right-1 -top-1 rounded-full px-1.5 text-[10px] font-semibold text-white">${state.wishlist.length}</span></a>
        <a href="cart.html" class="sm-icon-btn rounded-full p-2 text-slate-700 hover:bg-slate-100 relative" aria-label="Cart">${icon('cart')}<span class="sm-count absolute -right-1 -top-1 rounded-full px-1.5 text-[10px] font-semibold text-white">${state.cart.length}</span></a>
        <a href="orders.html" class="sm-icon-btn rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Orders">Orders</a>
        <a href="notifications.html" class="sm-icon-btn rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Notifications">Updates</a>
        <a href="support.html" class="sm-icon-btn rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Support">Support</a>
        <a href="${state.user ? 'dashboard.html' : 'login.html'}" class="sm-sign-btn rounded-full px-4 py-2 text-sm font-semibold text-white">${state.user ? 'Account' : 'Sign In'}</a>
      </div>
    </div>
  `;

  // Mark active icon links for accessibility
  const setActive = (href) => {
    const a = nav.querySelector(`a[href="${href}"]`);
    if (!a) return;
    a.setAttribute('aria-current', 'page');
  };
  if (file === 'index.html' || file === 'dashboard.html') setActive('index.html');
  if (file === 'malls.html' || file === 'mall.html') setActive('malls.html');
  if (file === 'products.html' || file === 'product.html') setActive('products.html');
  if (file === 'deals.html') setActive('deals.html');
  if (file === 'compare.html') setActive('compare.html');
  if (file === 'scan.html') setActive('scan.html');
  if (file === 'orders.html') setActive('orders.html');
  if (file === 'notifications.html') setActive('notifications.html');
  if (file === 'support.html') setActive('support.html');
  if (file === 'store.html') setActive('malls.html');
  if (file === 'order.html') setActive('orders.html');

  const locWrap = nav.querySelector('.sm-location-wrap');
  const locBtn = el('sm-location-btn');
  const locPanel = el('sm-location-panel');
  const cityLabel = el('sm-selected-city');

  const closePanel = () => {
    locPanel?.classList.remove('open');
    locBtn?.setAttribute('aria-expanded', 'false');
    locPanel?.setAttribute('aria-hidden', 'true');
  };
  const openPanel = () => {
    locPanel?.classList.add('open');
    locBtn?.setAttribute('aria-expanded', 'true');
    locPanel?.setAttribute('aria-hidden', 'false');
  };

  locBtn?.addEventListener('click', () => {
    const isOpen = locPanel?.classList.contains('open');
    if (isOpen) closePanel();
    else openPanel();
  });

  nav.querySelectorAll('.sm-city-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextCity = btn.getAttribute('data-city') || 'Hyderabad';
      state.location = nextCity;
      cityLabel.textContent = nextCity;
      persist();
      closePanel();
      window.location.reload();
    });
  });

  if (window.__smLocOutsideClick) document.removeEventListener('click', window.__smLocOutsideClick);
  if (window.__smLocEscapeKey) document.removeEventListener('keydown', window.__smLocEscapeKey);

  window.__smLocOutsideClick = (e) => {
    if (!locWrap || !locPanel?.classList.contains('open')) return;
    if (!locWrap.contains(e.target)) closePanel();
  };

  window.__smLocEscapeKey = (e) => {
    if (e.key === 'Escape') closePanel();
  };

  document.addEventListener('click', window.__smLocOutsideClick);
  document.addEventListener('keydown', window.__smLocEscapeKey);

}

async function trySyncAuthFromSupabase() {
  const client = supa();
  if (!client) return;
  try {
    const { data } = await client.auth.getSession();
    const user = data?.session?.user || null;
    if (user) {
      state.user = { name: user.user_metadata?.name || user.email || 'User', email: user.email, role: state.user?.role || 'user', supabaseUserId: user.id };
      persist();
    }
  } catch {}
}
function showLocationRibbon() { const nodes = document.querySelectorAll("#location-ribbon"); nodes.forEach((x) => x.remove()); }

function showLocationModal(data, force) {
  const old = document.getElementById('location-modal-overlay');
  if (old) old.remove();
  return;
}

function mergeData(raw) {
  const malls = [...(raw.malls || []), ...state.customMalls];
  const stores = [...(raw.stores || []), ...state.customStores];
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const mallById = new Map(malls.map((m) => [m.id, m]));

  const products = (raw.products || []).map((p) => {
    const stockOverride = state.stock[p.id];
    const stockCount = Number.isFinite(stockOverride) ? stockOverride : p.stockCount;
    return {
      ...p,
      stockCount,
      inStock: stockCount > 0,
      mallName: p.mallName || mallById.get(p.mallId)?.name || 'Mall',
      storeName: p.storeName || storeById.get(p.storeId)?.name || 'Store'
    };
  });

  return { ...raw, malls, stores, products };
}

function scoped(data) {
  if (!state.location) return data;
  const city = state.location.toLowerCase();
  const malls = data.malls.filter((m) => cityOf(m.location).toLowerCase() === city);
  if (!malls.length) return data;
  const ids = new Set(malls.map((m) => m.id));
  const stores = data.stores.filter((s) => ids.has(s.mallId));
  const products = data.products.filter((p) => ids.has(p.mallId));
  const cm = new Map();
  products.forEach((p) => cm.set(p.category, (cm.get(p.category) || 0) + 1));
  const categories = [...cm.entries()].map(([name, count]) => ({ name, count }));
  return { ...data, malls, stores, products, categories };
}

function productCard(p) {
  const discountPct = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  const wishActive = state.wishlist.some((w) => w.id === p.id);
  return `
    <a href="product.html?id=${p.id}" class="group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
      <div class="relative aspect-square overflow-hidden bg-muted">
        <div class="mm-badges">
          ${discountPct ? `<span class="mm-badge gold">${discountPct}% OFF</span>` : ''}
          ${p.inStock ? `<span class="mm-badge green">In stock</span>` : `<span class="mm-badge red">Out of stock</span>`}
        </div>
        <div class="mm-card-actions">
          <button class="mm-icon-btn ${wishActive ? 'active' : ''} wishlist-toggle" type="button" aria-label="${wishActive ? 'Remove from wishlist' : 'Save to wishlist'}" data-id="${p.id}">${icon('heart')}</button>
        </div>
        <img src="${p.image}" alt="${escapeHtml(p.name)}" class="h-full w-full object-cover" loading="lazy" decoding="async" />
        <div class="absolute bottom-0 left-0 right-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
          <button class="add-to-cart-btn flex w-full items-center justify-center gap-2 bg-gradient-gold py-2.5 text-xs font-bold text-primary-foreground" data-id="${p.id}" aria-label="Add ${escapeHtml(p.name)} to cart">${icon('cart')} Add to Cart</button>
        </div>
      </div>
      <div class="p-3.5">
        <p class="mb-0.5 truncate text-[11px] font-medium text-muted-foreground">${p.storeName} . ${p.mallName}</p>
        <h3 class="mb-1.5 line-clamp-2 text-sm font-bold leading-tight">${p.name}</h3>
        <div class="flex items-center justify-between gap-2">
          <div class="mb-2"><span class="text-lg font-extrabold">${money(p.price)}</span>${p.originalPrice > p.price ? ` <span class="text-xs text-muted-foreground line-through">${money(p.originalPrice)}</span>` : ''}</div>
          <div class="text-xs font-semibold text-slate-600">${(p.rating || 0).toFixed(1)}★</div>
        </div>
      </div>
    </a>
  `;
}

function parseHmsToSeconds(value) {
  const [h, m, s] = String(value || '00:00:00').split(':').map((x) => Number(x) || 0);
  return (h * 3600) + (m * 60) + s;
}

function formatTimerHms(total) {
  const safe = Math.max(0, Number(total) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0'));
}

function renderTimerParts(total) {
  const [h, m, s] = formatTimerHms(total);
  return [h, m, s].map((part, i) =>
    `<span class="inline-flex items-center">${i > 0 ? '<span class="mx-1 text-xs font-bold text-white/70">:</span>' : ''}<span class="rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-xs font-bold text-white">${part}</span></span>`
  ).join('');
}

function flashDealCard(deal, idx) {
  const overlays = [
    'linear-gradient(135deg, rgba(249,115,22,.92), rgba(15,118,110,.88))',
    'linear-gradient(135deg, rgba(59,130,246,.92), rgba(30,64,175,.88))',
    'linear-gradient(135deg, rgba(16,185,129,.92), rgba(6,78,59,.88))'
  ];
  const overlay = overlays[idx % overlays.length];
  const totalSeconds = parseHmsToSeconds(deal.endsIn);
  const timer = renderTimerParts(totalSeconds);
  const subtitle = String(deal.subtitle || '')
    .replaceAll('â‚¹', '₹')
    .replaceAll('â€”', '-')
    .trim();

  return `
    <a href="deals.html" class="flash-card group relative block overflow-hidden rounded-2xl" data-flash-seconds="${totalSeconds}" data-flash-initial="${Math.max(1, totalSeconds)}">
      <div class="flash-media relative overflow-hidden">
        <img src="${deal.image}" alt="${escapeHtml(deal.title)}" class="flash-image h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
        <div class="absolute inset-0 flash-overlay" style="background:${overlay}"></div>
        <div class="absolute inset-0 flash-content flex flex-col justify-between p-5">
          <div>
            <span class="flash-badge">Hurry</span>
            <h3 class="flash-title font-display text-lg font-bold text-white md:text-xl">${deal.title}</h3>
            <p class="flash-subtitle text-sm text-white/85">${subtitle}</p>
          </div>
          <div class="flash-timer-row flex items-center gap-2">
            <span class="text-sm text-white/75">⏱</span>
            <span class="text-xs font-medium text-white/75">Ends in</span>
            <span class="flash-countdown flex items-center">${timer}</span>
          </div>
          <div class="flash-progress"><span class="flash-progress-fill" style="width:100%"></span></div>
        </div>
      </div>
    </a>
  `;
}

function categoryConfig(name) {
  const map = {
    Fashion: { iconKey: 'catFashion', gradient: 'linear-gradient(135deg, rgba(241,245,249,.95), rgba(248,250,252,.95))' },
    Electronics: { iconKey: 'catElectronics', gradient: 'linear-gradient(135deg, rgba(239,246,255,.95), rgba(248,250,252,.95))' },
    Beauty: { iconKey: 'catBeauty', gradient: 'linear-gradient(135deg, rgba(245,243,255,.95), rgba(248,250,252,.95))' },
    Sports: { iconKey: 'catSports', gradient: 'linear-gradient(135deg, rgba(240,253,244,.95), rgba(248,250,252,.95))' },
    'Home & Living': { iconKey: 'catHome', gradient: 'linear-gradient(135deg, rgba(255,251,235,.95), rgba(248,250,252,.95))' },
    Books: { iconKey: 'catBooks', gradient: 'linear-gradient(135deg, rgba(255,247,237,.95), rgba(248,250,252,.95))' },
    Kids: { iconKey: 'catKids', gradient: 'linear-gradient(135deg, rgba(240,249,255,.95), rgba(248,250,252,.95))' },
    'Food & Dining': { iconKey: 'catFood', gradient: 'linear-gradient(135deg, rgba(254,242,242,.95), rgba(248,250,252,.95))' }
  };
  return map[name] || { iconKey: 'catHome', gradient: 'linear-gradient(135deg, rgba(148,163,184,.2), rgba(203,213,225,.1))' };
}

function categoryCard(cat) {
  const cfg = categoryConfig(cat.name);
  return `
    <a href="products.html?category=${encodeURIComponent(cat.name)}" class="category-card">
      <div class="category-icon-wrap" style="background:${cfg.gradient}">
        ${icon(cfg.iconKey)}
      </div>
      <div>
        <p class="category-title">${cat.name}</p>
        <p class="category-count">${Number(cat.count || 0).toLocaleString('en-IN')}+ items</p>
      </div>
    </a>
  `;
}

function normalizeText(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(v) {
  return normalizeText(v).split(' ').filter((x) => x && x.length > 1);
}

function canonicalProductName(name) {
  const stop = new Set(['premium', 'classic', 'ultra', 'pro', 'plus', 'new', 'set', 'pack', 'collection']);
  return tokenize(name).filter((t) => !stop.has(t) && !/^\d+$/.test(t)).join(' ');
}

function toMinutes(v) {
  const t = String(v || '').toLowerCase().trim();
  if (!t) return 999;
  if (t.includes('hr')) return (parseInt(t, 10) || 0) * 60;
  return parseInt(t, 10) || 999;
}

function similarityScore(a, b) {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  sa.forEach((t) => { if (sb.has(t)) inter += 1; });
  return inter / new Set([...sa, ...sb]).size;
}

function findProductFromInput(products, query) {
  const q = normalizeText(query);
  if (!q) return null;
  const exact = products.find((p) => normalizeText(p.name) === q);
  if (exact) return exact;
  return products
    .map((p) => {
      const name = normalizeText(p.name);
      let score = 0;
      if (name.includes(q)) score += 100;
      score += Math.round(similarityScore(name, q) * 80);
      if (normalizeText(p.category).includes(q)) score += 20;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.p || null;
}

function buildComparisonPool(products, selected) {
  if (!selected) return { list: [], mode: 'none' };
  const key = canonicalProductName(selected.name);
  const exact = products.filter((p) => canonicalProductName(p.name) === key);
  const byId = new Set();
  const exactUnique = exact.filter((p) => {
    const k = `${normalizeText(p.name)}|${p.storeId}`;
    if (byId.has(k)) return false;
    byId.add(k);
    return true;
  });

  if (exactUnique.length >= 2) return { list: exactUnique, mode: 'exact' };

  const similar = products
    .filter((p) => p.id !== selected.id && p.category === selected.category)
    .map((p) => ({ p, s: similarityScore(selected.name, p.name) }))
    .filter((x) => x.s >= 0.2)
    .sort((a, b) => b.s - a.s || a.p.price - b.p.price)
    .slice(0, 5)
    .map((x) => x.p);

  const combined = [selected, ...similar];
  return { list: combined, mode: 'similar' };
}

function scoreValue(item) {
  const discountPct = item.originalPrice > item.price ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) : 0;
  const eta = toMinutes(item.deliveryTime);
  const valueScore = (item.rating * 18) + discountPct + Math.max(0, 40 - Math.min(40, eta)) - (item.price / 1800);
  return { ...item, discountPct, eta, valueScore };
}

function rankComparison(items, sortMode) {
  const ranked = items.map(scoreValue);
  if (sortMode === 'price') ranked.sort((a, b) => a.price - b.price);
  else if (sortMode === 'rating') ranked.sort((a, b) => b.rating - a.rating || a.price - b.price);
  else if (sortMode === 'delivery') ranked.sort((a, b) => a.eta - b.eta || a.price - b.price);
  else ranked.sort((a, b) => b.valueScore - a.valueScore);
  return ranked;
}

function renderPriceComparisonResults(products, query, selectedId) {
  const container = el('spc-results');
  if (!container) return;

  if (!query.trim()) {
    container.innerHTML = '<div class="spc-empty">Pick a product and compare the same/closest offers across malls.</div>';
    return;
  }

  const selected = products.find((p) => p.id === selectedId) || findProductFromInput(products, query);
  if (!selected) {
    container.innerHTML = `<div class="spc-empty">No product found for "<b>${query}</b>" in selected location.</div>`;
    return;
  }

  const { list, mode } = buildComparisonPool(products, selected);
  if (!list.length) {
    container.innerHTML = `<div class="spc-empty">No comparable offers available for "<b>${selected.name}</b>".</div>`;
    return;
  }

  const sortMode = el('spc-sort')?.value || 'value';
  const ranked = rankComparison(list, sortMode);
  const minPrice = Math.min(...ranked.map((m) => m.price));
  const maxPrice = Math.max(...ranked.map((m) => m.price));
  const best = ranked[0];
  const savings = maxPrice - minPrice;
  const mallsCount = new Set(ranked.map((r) => r.mallId)).size;
  const storesCount = new Set(ranked.map((r) => r.storeId)).size;

  const rows = ranked.map((m, idx) => `
    <div class="spc-row ${idx === 0 ? 'best' : ''}">
      <div class="spc-main">
        <p class="spc-name">${m.name}</p>
        <p class="spc-meta">${m.storeName} . ${m.mallName}</p>
      </div>
      <div class="spc-price-col">
        <p class="spc-price">${money(m.price)}</p>
        ${m.originalPrice > m.price ? `<p class="spc-cut">${money(m.originalPrice)}</p>` : '<p class="spc-cut">&nbsp;</p>'}
      </div>
      <div class="spc-badge-col">
        ${idx === 0 ? '<span class="spc-badge">Best Pick</span>' : ''}
        <p class="spc-micro">${m.discountPct}% off . ${m.rating.toFixed(1)}★ . ${m.eta} min</p>
      </div>
      <div class="spc-action-col">
        <button class="spc-add-btn" data-id="${m.id}">Add</button>
      </div>
    </div>
  `).join('');

  const modeText = mode === 'exact'
    ? 'Exact product offers compared across multiple malls'
    : 'Closest alternatives compared (exact match unavailable)';

  container.innerHTML = `
    <div class="spc-summary">
      <div>
        <p class="spc-summary-title">Best affordable: ${best.name}</p>
        <p class="spc-summary-sub">${modeText} . ${storesCount} stores . ${mallsCount} malls</p>
      </div>
      <div class="spc-save">Save up to ${money(savings)}</div>
    </div>
    <div class="spc-table">${rows}</div>
  `;

  container.querySelectorAll('.spc-add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const product = products.find((p) => p.id === id);
      if (!product) return;
      addToCart(product);
      btn.textContent = 'Added';
      btn.disabled = true;
    });
  });
}

function bindPriceComparison(products) {
  const form = el('spc-form');
  const input = el('spc-input');
  const sort = el('spc-sort');
  const datalist = el('spc-products');
  const container = el('spc-results');
  if (!form || !input || !container || !sort || !datalist) return;

  let selectedProductId = '';
  const options = products
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `<option value="${p.name}" data-id="${p.id}">${p.storeName} - ${p.mallName}</option>`)
    .join('');
  datalist.innerHTML = options;

  renderPriceComparisonResults(products, '', '');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const exact = products.find((p) => normalizeText(p.name) === normalizeText(input.value));
    selectedProductId = exact ? exact.id : selectedProductId;
    renderPriceComparisonResults(products, input.value || '', selectedProductId);
  });

  input.addEventListener('input', () => {
    const exact = products.find((p) => normalizeText(p.name) === normalizeText(input.value));
    selectedProductId = exact ? exact.id : '';
  });

  sort.addEventListener('change', () => renderPriceComparisonResults(products, input.value || '', selectedProductId));

  document.querySelectorAll('.spc-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query') || '';
      input.value = q;
      const exact = products.find((p) => normalizeText(p.name) === normalizeText(q));
      selectedProductId = exact ? exact.id : '';
      renderPriceComparisonResults(products, q, selectedProductId);
    });
  });
}

function bindFlashCountdown() {
  if (window.__flashDealInterval) clearInterval(window.__flashDealInterval);
  const update = () => {
    document.querySelectorAll('.flash-card[data-flash-seconds]').forEach((card) => {
      const current = Number(card.getAttribute('data-flash-seconds') || 0);
      const initial = Number(card.getAttribute('data-flash-initial') || 1);
      const countdown = card.querySelector('.flash-countdown');
      const fill = card.querySelector('.flash-progress-fill');
      if (countdown) countdown.innerHTML = renderTimerParts(current);
      if (fill) {
        const width = Math.max(0, Math.min(100, Math.round((current / Math.max(1, initial)) * 100)));
        fill.style.width = `${width}%`;
      }
      if (current > 0) card.setAttribute('data-flash-seconds', String(current - 1));
    });
  };
  update();
  window.__flashDealInterval = setInterval(update, 1000);
}

function addToCart(product) {
  const existing = state.cart.find((x) => x.id === product.id);
  if (existing) existing.quantity = (existing.quantity || 1) + 1;
  else state.cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
  persist();
  renderNavbar();
}

function toggleWishlist(product) {
  const idx = state.wishlist.findIndex((x) => x.id === product.id);
  if (idx >= 0) state.wishlist.splice(idx, 1);
  else state.wishlist.unshift({ id: product.id, name: product.name, price: product.price, image: product.image });
  persist();
  renderNavbar();
}

async function startStripeCheckoutFromCart() {
  const cfg = window.MM_CONFIG || {};
  const publishableKey = String(cfg.STRIPE_PUBLISHABLE_KEY || '').trim();
  const functionsBase = window.MM_SUPABASE?.functionsBaseUrl?.() || '';

  if (!publishableKey) throw new Error('Missing STRIPE_PUBLISHABLE_KEY in assets/js/config.js');
  if (!functionsBase) throw new Error('Missing Supabase functions base URL. Set SUPABASE_URL in assets/js/config.js');

  const items = state.cart.map((i) => ({
    product_id: i.id,
    name: i.name,
    unit_amount_paise: Math.round(Number(i.price || 0) * 100), // Stripe expects paise
    qty: Number(i.quantity || 1)
  }));

  const addrKey = 'mm_delivery_address';
  const delivery = (() => { try { return JSON.parse(localStorage.getItem(addrKey) || '{}'); } catch { return {}; } })();
  if (!delivery?.name || !delivery?.phone || !delivery?.address) {
    throw new Error('Please save delivery details first.');
  }

  const client = supa();
  const { data } = client ? await client.auth.getSession() : { data: { session: null } };
  const token = data?.session?.access_token || '';

  const res = await fetch(`${functionsBase}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ items, city: state.location || '', delivery: { name: delivery.name, phone: delivery.phone, address: { text: delivery.address } }, success_path: '/checkout-success.html', cancel_path: '/cart.html' })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to create checkout session');

  if (json.url) {
    window.location.href = json.url;
    return;
  }
  // If URL missing, attempt redirect using Stripe.js
  if (!window.Stripe) throw new Error('Stripe.js not loaded');
  const stripe = window.Stripe(publishableKey);
  const { error } = await stripe.redirectToCheckout({ sessionId: json.id });
  if (error) throw new Error(error.message);
}

function trackRecentlyViewed(product) {
  try {
    if (!product?.id) return;
    const key = 'mm_recently_viewed';
    const prev = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })();
    const next = [{ id: String(product.id), at: Date.now() }, ...prev.filter((x) => String(x.id) !== String(product.id))].slice(0, 18);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}

function renderRecentlyViewedRail(allProducts) {
  const rail = el('rv-rail');
  if (!rail) return;
  const key = 'mm_recently_viewed';
  const ids = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })();
  const products = Array.isArray(allProducts) ? allProducts : [];
  const items = ids.map((x) => products.find((p) => String(p.id) === String(x.id))).filter(Boolean).slice(0, 12);
  if (!items.length) {
    rail.innerHTML = `<div class="mm-card mm-card-pad w-full"><p class="font-extrabold">No history yet</p><p class="mm-page-sub">Open a product and it will appear here.</p></div>`;
    return;
  }
  rail.innerHTML = items.map((p) => `
    <a href="product.html?id=${encodeURIComponent(String(p.id))}" class="shrink-0 w-[220px] group overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-card-hover">
      <div class="aspect-square overflow-hidden bg-muted">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      </div>
      <div class="p-3">
        <p class="font-extrabold line-clamp-2">${escapeHtml(p.name)}</p>
        <p class="text-sm text-primary font-semibold mt-1">${money(p.price)}</p>
      </div>
    </a>
  `).join('');
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  persist();
}

function renderIndex(data) {
  const s = scoped(data);
  if (el('top-malls-rail')) {
    el('top-malls-rail').innerHTML = s.malls.slice(0, 10).map((m) => `
      <a href="mall.html?id=${encodeURIComponent(String(m.id))}" class="shrink-0 w-[260px] group overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-card-hover">
        <div class="relative aspect-[16/10] overflow-hidden bg-muted">
          <img src="${m.image}" alt="${escapeHtml(m.name)}" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        </div>
        <div class="p-3">
          <p class="font-extrabold truncate">${escapeHtml(m.name)}</p>
          <p class="text-xs text-muted-foreground truncate mt-0.5">${escapeHtml(m.location || '')}</p>
        </div>
      </a>
    `).join('');
  }
  if (el('malls-near-list')) {
    el('malls-near-list').innerHTML = s.malls.slice(0, 4).map((m) => `
      <div class="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <a href="walkthrough.html?mallId=${m.id}"><div class="relative aspect-[16/9] overflow-hidden bg-muted"><img src="${m.image}" alt="${escapeHtml(m.name)}" class="h-full w-full object-cover" loading="lazy" decoding="async" /></div></a>
        <div class="p-3"><h5 class="text-sm font-bold mb-0.5">${m.name}</h5><p class="text-xs text-muted-foreground">${m.location}</p></div>
      </div>
    `).join('');
  }
  if (el('flash-deals-list')) {
    const deals = Array.isArray(s.flashDeals) ? s.flashDeals : [];
    el('flash-deals-list').innerHTML = deals.slice(0, 3).map(flashDealCard).join('');
    bindFlashCountdown();
  }
  if (el('top-deals-rail')) {
    const deals = (s.products || []).filter((p) => Number(p.originalPrice || 0) > Number(p.price || 0)).slice(0, 12);
    el('top-deals-rail').innerHTML = deals.map((p) => `
      <a href="product.html?id=${encodeURIComponent(String(p.id))}" class="shrink-0 w-[260px] group overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-card-hover">
        <div class="relative aspect-[4/3] overflow-hidden bg-muted">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          <div class="absolute left-3 top-3">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
              ${Math.max(0, Math.round(((Number(p.originalPrice) - Number(p.price)) / Math.max(1, Number(p.originalPrice))) * 100))}% OFF
            </span>
          </div>
        </div>
        <div class="p-3">
          <p class="font-extrabold line-clamp-2">${escapeHtml(p.name)}</p>
          <p class="text-xs text-muted-foreground truncate mt-1">${escapeHtml(p.storeName || '')} · ${escapeHtml(p.mallName || '')}</p>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-lg font-extrabold">${money(p.price)}</span>
            <span class="text-xs text-muted-foreground line-through">${money(p.originalPrice)}</span>
          </div>
        </div>
      </a>
    `).join('');
  }
  if (el('categories-list')) {
    const counts = new Map((s.categories || []).map((c) => [c.name, c.count]));
    const ordered = [
      'Fashion',
      'Electronics',
      'Beauty',
      'Sports',
      'Home & Living',
      'Books',
      'Kids',
      'Food & Dining'
    ].map((name) => ({ name, count: counts.get(name) || 0 }));
    el('categories-list').innerHTML = ordered.map(categoryCard).join('');
  }
  bindPriceComparison(s.products || []);
  if (el('malls-list')) {
    el('malls-list').innerHTML = s.malls.map((m) => `
      <div class="group overflow-hidden rounded-2xl border border-border bg-card shadow-card">
    <a href="mall.html?id=${m.id}" class="block"><div class="relative aspect-[16/9] overflow-hidden bg-muted"><img src="${m.image}" alt="${escapeHtml(m.name)}" class="h-full w-full object-cover" loading="lazy" decoding="async" /></div></a>
        <div class="p-4"><h3 class="font-bold">${m.name}</h3><p class="text-sm text-muted-foreground">${m.description || ''}</p><div class="mt-2"><a href="walkthrough.html?mallId=${m.id}" class="text-sm font-semibold text-primary">Virtual Walkthrough</a></div></div>
      </div>
    `).join('');
  }
  if (el('products-list')) el('products-list').innerHTML = s.products.slice(0, 10).map(productCard).join('');
  if (el('top-deals-list')) el('top-deals-list').innerHTML = s.products.filter((p) => p.originalPrice > p.price).slice(0, 8).map(productCard).join('');
  renderRecentlyViewedRail(s.products || []);
}

function renderMalls(data) {
  const s = scoped(data);
  if (!el('malls-list')) return;
  el('malls-list').innerHTML = s.malls.map((m) => `
    <div class="group overflow-hidden rounded-lg border bg-card">
      <a href="mall.html?id=${m.id}" class="block"><div class="aspect-video overflow-hidden bg-muted"><img src="${m.image}" alt="${escapeHtml(m.name)}" class="w-full h-full object-cover" loading="lazy" decoding="async" /></div></a>
      <div class="p-3"><h3 class="font-semibold">${m.name}</h3><p class="text-xs text-muted-foreground">${m.location}</p><div class="mt-2"><a href="walkthrough.html?mallId=${m.id}" class="text-sm font-semibold text-primary">Open Walkthrough</a></div></div>
    </div>
  `).join('');
}

function renderProducts(data) {
  const s = scoped(data);
  const list = el('products-list');
  if (!list) return;
  // skeletons (fast perceived performance)
  try {
    const skel = () => `
      <div class="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div class="aspect-square bg-slate-100 animate-pulse"></div>
        <div class="p-3.5 space-y-2">
          <div class="h-3 w-2/3 bg-slate-100 rounded animate-pulse"></div>
          <div class="h-4 w-full bg-slate-100 rounded animate-pulse"></div>
          <div class="h-4 w-5/6 bg-slate-100 rounded animate-pulse"></div>
          <div class="h-4 w-1/3 bg-slate-100 rounded animate-pulse mt-3"></div>
        </div>
      </div>
    `;
    list.innerHTML = new Array(10).fill(0).map(skel).join('');
  } catch {}
  const params = new URLSearchParams(location.search);
  const categoryInput = el('category-filter');
  const searchInput = el('search-input');
  const sortInput = el('sort-filter');
  const priceInput = el('price-filter');
  const allCategories = Array.from(new Set(s.products.map((p) => p.category))).filter(Boolean);

  if (categoryInput) {
    categoryInput.innerHTML = '<option value="">All Categories</option>' + allCategories.map((c) => `<option value="${c}">${c}</option>`).join('');
    categoryInput.value = params.get('category') || '';
  }
  if (searchInput) searchInput.value = params.get('search') || '';
  if (sortInput) sortInput.value = params.get('sort') || 'reco';
  if (priceInput) priceInput.value = params.get('price') || '';

  // Meta + pagination controls (injected to avoid editing every template)
  const ensureMeta = () => {
    const host = list.parentElement;
    if (!host) return { meta: null, more: null };
    let meta = el('products-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.id = 'products-meta';
      meta.className = 'mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between';
      host.insertBefore(meta, list);
    }
    let more = el('products-load-more');
    if (!more) {
      more = document.createElement('div');
      more.id = 'products-load-more';
      more.className = 'mt-8 flex justify-center';
      host.appendChild(more);
    }
    return { meta, more };
  };
  const { meta, more } = ensureMeta();

  const PAGE_SIZE = 24;
  let page = 1;

  const debounce = (fn, ms) => {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  // Search UX: clear button + recent searches (local)
  const RECENT_KEY = 'mm_recent_searches';
  const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
  const writeRecent = (v) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(v.slice(0, 10))); } catch {} };
  const ensureSearchUx = () => {
    if (!searchInput) return;
    const wrap = searchInput.parentElement;
    if (!wrap) return;
    wrap.classList.add('relative');
    let btn = el('search-clear');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'search-clear';
      btn.className = 'hidden absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold hover:bg-muted';
      btn.textContent = 'Clear';
      wrap.appendChild(btn);
      btn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        draw(true);
      });
    }
    const toggle = () => btn.classList.toggle('hidden', !String(searchInput.value || '').trim());
    toggle();
    searchInput.addEventListener('input', toggle);

    // Datalist suggestions from recent searches (lightweight, no UI changes)
    let dl = el('mm-recent-searches');
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = 'mm-recent-searches';
      document.body.appendChild(dl);
    }
    searchInput.setAttribute('list', 'mm-recent-searches');
    const paintRecent = () => {
      const rec = readRecent();
      dl.innerHTML = rec.map((x) => `<option value="${escapeHtml(String(x || '').replaceAll('"', '&quot;'))}"></option>`).join('');
    };
    paintRecent();

    // Save recent on blur/Enter
    searchInput.addEventListener('change', () => {
      const v = String(searchInput.value || '').trim();
      if (!v) return;
      const next = [v, ...readRecent().filter((x) => String(x).toLowerCase() !== v.toLowerCase())];
      writeRecent(next);
      paintRecent();
    });
  };

  const draw = (resetPage = false) => {
    if (resetPage) page = 1;
    const c = categoryInput ? categoryInput.value : '';
    const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const sort = sortInput ? sortInput.value : 'reco';
    const price = priceInput ? priceInput.value : '';
    let products = s.products;
    if (c) products = products.filter((p) => p.category === c);
    if (q) products = products.filter((p) => p.name.toLowerCase().includes(q));
    if (price) {
      const [minS, maxS] = String(price).split('-');
      const min = Number(minS || 0);
      const max = Number(maxS || 999999);
      products = products.filter((p) => Number(p.price || 0) >= min && Number(p.price || 0) <= max);
    }
    if (sort === 'price_asc') products = [...products].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'price_desc') products = [...products].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === 'discount') products = [...products].sort((a, b) => (Number(b.originalPrice || 0) - Number(b.price || 0)) - (Number(a.originalPrice || 0) - Number(a.price || 0)));

    const total = products.length;
    const end = Math.min(total, page * PAGE_SIZE);
    const visible = products.slice(0, end);

    if (meta) {
      const pills = [];
      if (c) pills.push({ k: 'category', label: `Category: ${c}` });
      if (q) pills.push({ k: 'search', label: `Search: ${q}` });
      if (price) pills.push({ k: 'price', label: `Price: ${price.replace('-', '–')}` });
      if (sort && sort !== 'reco') pills.push({ k: 'sort', label: `Sort: ${sort.replace('_', ' ')}` });
      meta.innerHTML = `
        <div>
          <p class="text-sm font-semibold">${total.toLocaleString('en-IN')} results</p>
          <p class="text-xs text-muted-foreground mt-0.5">${(c || q || price) ? 'Filtered results based on your selection.' : 'Showing popular picks near you.'}</p>
        </div>
        <div class="flex flex-col items-start gap-2 sm:items-end">
          <div class="flex items-center gap-2">
            ${total ? `<span class="text-xs text-muted-foreground">Showing <b>${end.toLocaleString('en-IN')}</b> of <b>${total.toLocaleString('en-IN')}</b></span>` : ''}
            ${(c || q || price || (sort && sort !== 'reco')) ? `<button type="button" id="filters-reset" class="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Reset</button>` : ''}
          </div>
          ${pills.length ? `
            <div class="flex flex-wrap justify-end gap-1.5">
              ${pills.map((p) => `<button type="button" class="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:bg-muted" data-clear="${p.k}">${escapeHtml(p.label)} ✕</button>`).join('')}
            </div>
          ` : ''}
        </div>
      `;

      // Bind reset + pill clears (re-render safe)
      el('filters-reset')?.addEventListener('click', () => {
        if (categoryInput) categoryInput.value = '';
        if (searchInput) searchInput.value = '';
        if (priceInput) priceInput.value = '';
        if (sortInput) sortInput.value = 'reco';
        draw(true);
      });
      meta.querySelectorAll('[data-clear]').forEach((btn) => btn.addEventListener('click', () => {
        const k = String(btn.getAttribute('data-clear') || '');
        if (k === 'category' && categoryInput) categoryInput.value = '';
        if (k === 'search' && searchInput) searchInput.value = '';
        if (k === 'price' && priceInput) priceInput.value = '';
        if (k === 'sort' && sortInput) sortInput.value = 'reco';
        draw(true);
      }));
    }

    list.innerHTML = total
      ? visible.map(productCard).join('')
      : `<div class="col-span-full text-center py-12">
          <p class="text-lg font-extrabold">No products found</p>
          <p class="text-sm text-muted-foreground mt-2">Try clearing filters or searching a different name.</p>
        </div>`;

    if (more) {
      const canLoadMore = end < total;
      more.innerHTML = canLoadMore
        ? `<button type="button" id="btn-load-more" class="mm-action mm-action-outline">Load more</button>`
        : (total > PAGE_SIZE ? `<p class="text-xs text-muted-foreground">You’ve reached the end.</p>` : '');
      el('btn-load-more')?.addEventListener('click', () => {
        page += 1;
        draw(false);
      });
    }
  };
  draw(true);
  ensureSearchUx();
  categoryInput?.addEventListener('change', () => draw(true));
  const debouncedDraw = debounce(() => draw(true), 250);
  searchInput?.addEventListener('input', debouncedDraw);
  sortInput?.addEventListener('change', () => draw(true));
  priceInput?.addEventListener('change', () => draw(true));

  document.querySelectorAll('.mm-chip[data-q]').forEach((b) => b.addEventListener('click', () => {
    const k = String(b.getAttribute('data-q') || '');
    if (k === 'discount') { if (sortInput) sortInput.value = 'discount'; }
    if (k === 'best') { if (sortInput) sortInput.value = 'reco'; }
    if (k === 'new') { if (sortInput) sortInput.value = 'reco'; }
    if (k === 'fast') { /* placeholder */ }
    draw(true);
  }));

  renderRecentlyViewedRail(s.products || []);
}

function renderProductDetail(data) {
  const s = scoped(data);
  const id = new URLSearchParams(location.search).get('id');
  const p = s.products.find((x) => x.id === id);
  const container = el('product-detail');
  if (!container) return;
  if (!p) {
    container.innerHTML = '<div class="text-center py-12"><p>Product not available in selected location.</p></div>';
    return;
  }
  trackRecentlyViewed(p);
  const discountPct = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  const wishActive = state.wishlist.some((w) => w.id === p.id);
  const deliverCity = cityOf(state.location || '') || String(state.location || 'Hyderabad');
  const etaText = (() => {
    const raw = String(p.deliveryTime || '').trim();
    if (raw) return raw;
    // Simple realistic fallback by city density (demo)
    const c = deliverCity.toLowerCase();
    const fast = ['mumbai', 'new delhi', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'pune', 'chennai', 'kolkata'];
    return fast.some((x) => c.includes(x)) ? '45–90 min' : '1–2 days';
  })();
  container.innerHTML = `
    <div class="mm-pdp">
      <div class="mm-pdp-media">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
        <div class="p-3 border-t border-border bg-card">
          <div class="flex gap-2 overflow-x-auto">
            ${[p.image, p.image, p.image].map((src, idx) => `
              <button type="button" class="shrink-0 rounded-xl border border-border bg-muted overflow-hidden w-[72px] h-[72px]" data-mm-thumb="${idx}">
                <img src="${src}" alt="${escapeHtml(p.name)} thumbnail ${idx + 1}" class="w-full h-full object-cover" loading="lazy" />
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="mm-pdp-buy">
        <p class="text-sm text-muted-foreground mb-1">${p.storeName} . ${p.mallName}</p>
        <h1 class="text-3xl font-bold mb-2">${p.name}</h1>
        <div class="mm-pdp-row">
          <div class="mm-pdp-price">${money(p.price)}</div>
          <div class="text-right">
            ${p.originalPrice > p.price ? `<div class="mm-pdp-cut">${money(p.originalPrice)}</div>` : ''}
            ${discountPct ? `<div class="text-xs font-extrabold text-amber-600">${discountPct}% OFF</div>` : ''}
          </div>
        </div>
        <div class="mm-pdp-meta">Rating ${(p.rating || 0).toFixed(1)}★ · ${p.inStock ? `${p.stockCount || 0} left` : 'Out of stock'} · Deliver to <b>${escapeHtml(deliverCity)}</b> in <b>${escapeHtml(etaText)}</b></div>
        <div class="mm-pdp-cta">
          <button id="p-add" class="mm-btn primary" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Add to Cart' : 'Out of stock'}</button>
          <button id="p-buy" class="mm-btn outline" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Buy now' : 'Unavailable'}</button>
          <button id="p-wish" class="mm-btn outline">${wishActive ? 'Saved' : 'Save'}</button>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div class="rounded-xl border border-border bg-card p-3"><p class="font-extrabold">Genuine</p><p class="text-xs text-muted-foreground mt-1">Verified mall inventory</p></div>
          <div class="rounded-xl border border-border bg-card p-3"><p class="font-extrabold">Easy returns</p><p class="text-xs text-muted-foreground mt-1">Create ticket from Orders</p></div>
          <div class="rounded-xl border border-border bg-card p-3"><p class="font-extrabold">Secure checkout</p><p class="text-xs text-muted-foreground mt-1">Stripe-powered payments</p></div>
        </div>
        <div class="mt-4 grid gap-3">
          <div class="rounded-xl border border-border bg-muted p-4 text-sm">
            <p class="font-semibold mb-2">Why this is a great deal</p>
            <ul class="list-disc pl-4 space-y-1 text-muted-foreground">
              ${discountPct ? `<li>Save ${discountPct}% vs original price</li>` : `<li>Top pick from ${escapeHtml(p.storeName || 'store')}</li>`}
              <li>${p.inStock ? `In stock · ${Number(p.stockCount || 0)} left` : 'Currently out of stock'}</li>
              <li>Trusted mall inventory</li>
            </ul>
          </div>
          <div class="rounded-xl border border-border bg-card p-4 text-sm">
            <p class="font-semibold mb-1">Delivery ETA</p>
            <p class="text-muted-foreground">Deliver to <b>${escapeHtml(deliverCity)}</b> in <b>${escapeHtml(etaText)}</b>.</p>
            <p class="text-xs text-muted-foreground mt-2">Real-time tracking appears after checkout.</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-4 text-sm">
            <p class="font-semibold mb-1">Returns &amp; support</p>
            <p class="text-muted-foreground">Report an issue from Orders. Refund tickets show status updates.</p>
            <a href="support.html" class="inline-flex mt-2 text-sm font-semibold text-primary hover:underline">Open support →</a>
          </div>
        </div>
      </div>
    </div>
  `;
  el('p-add')?.addEventListener('click', () => { addToCart(p); toast('Added to cart', { type: 'ok', title: 'Cart' }); });
  el('p-buy')?.addEventListener('click', () => {
    addToCart(p);
    toast('Taking you to cart…', { type: 'ok', title: 'Checkout', ms: 1200 });
    window.location.href = 'cart.html';
  });
  el('p-wish')?.addEventListener('click', () => { toggleWishlist(p); toast(wishActive ? 'Removed from wishlist' : 'Saved to wishlist', { type: 'ok', title: 'Wishlist' }); renderProductDetail(data); });
  renderRecentlyViewedRail(s.products || []);
}

function renderMallDetail(data) {
  const s = scoped(data);
  const id = new URLSearchParams(location.search).get('id');
  const mall = s.malls.find((m) => m.id === id);
  const container = el('mall-detail');
  if (!container) return;
  if (!mall) return (container.innerHTML = '<div class="text-center py-12"><p>Mall not found in selected location.</p></div>');
  const stores = s.stores.filter((x) => x.mallId === mall.id);
  const managers = state.managers.filter((x) => x.mallId === mall.id);
  container.innerHTML = `
    <div class="space-y-6">
      <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div class="aspect-[16/8] bg-muted">
          <img src="${mall.image}" alt="${escapeHtml(mall.name)}" class="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
        <div class="p-5">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <h2 class="text-2xl md:text-3xl font-extrabold">${escapeHtml(mall.name)}</h2>
              <p class="text-sm text-muted-foreground mt-1">${escapeHtml(mall.description || '')}</p>
              <p class="text-xs text-muted-foreground mt-2">${escapeHtml(mall.location || '')}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <a href="walkthrough.html?mallId=${encodeURIComponent(String(mall.id))}" class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Virtual walkthrough</a>
              <a href="products.html" class="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted">Shop products</a>
              <a href="scan.html" class="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted">Scan&Go</a>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        ${['Fashion','Electronics','Beauty','Sports','Home & Living','Books','Kids','Food & Dining']
          .slice(0, 8)
          .map((cat) => {
            const count = stores.filter((st) => String(st.category || '').toLowerCase() === String(cat).toLowerCase()).length;
            return `
              <a class="mm-card mm-card-pad hover:shadow-card-hover" href="malls.html">
                <p class="font-extrabold">${escapeHtml(cat)}</p>
                <p class="text-sm text-muted-foreground mt-1">${count} stores</p>
              </a>
            `;
          }).join('')}
      </div>

      <div>
        <div class="flex items-end justify-between gap-4 mb-3">
          <h3 class="text-xl font-extrabold">Stores</h3>
          <a href="malls.html" class="text-sm font-semibold text-primary hover:underline">All malls →</a>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${stores.map((st) => `
            <a href="store.html?id=${encodeURIComponent(String(st.id))}" class="mm-card mm-card-pad hover:shadow-card-hover">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-extrabold truncate">${escapeHtml(st.name)}</p>
                  <p class="text-xs text-muted-foreground mt-1">${escapeHtml(st.category || '')}${st.floor ? ` · ${escapeHtml(st.floor)}` : ''}</p>
                </div>
                <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">Open</span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">Scan&Go</span>
                <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">Delivery</span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>

      <div>
        <h3 class="text-xl font-extrabold mb-3">Store managers</h3>
        ${managers.length ? managers.map((m) => `<div class="rounded-xl border border-border bg-card p-3 text-sm mb-2">${escapeHtml(m.name)} · ${escapeHtml(m.email)} · ${escapeHtml(m.status)}</div>`).join('') : '<p class="text-sm text-muted-foreground">No managers assigned.</p>'}
      </div>
    </div>
  `;
}

function renderDeals(data) {
  const s = scoped(data);
  const list = el('deals-list');
  if (!list) return;
  list.innerHTML = s.products.map((p) => `
    <a href="product.html?id=${p.id}" class="block overflow-hidden rounded-lg border bg-card">
      <div class="aspect-video bg-muted"><img src="${p.image}" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover" loading="lazy" decoding="async" /></div>
      <div class="p-3"><h3 class="font-semibold">${p.name}</h3><p class="text-sm text-primary">${money(p.price)}</p></div>
    </a>
  `).join('');
}

function renderStorePage(data) {
  const s = scoped(data);
  const storeId = new URLSearchParams(location.search).get('id') || '';
  const title = el('store-title');
  const sub = el('store-sub');
  const grid = el('store-products');
  const qInput = el('store-search');
  const sortInput = el('store-sort');
  const scanLink = el('store-scan');
  if (!grid) return;

  const store = (s.stores || []).find((st) => String(st.id) === String(storeId));
  if (title) title.textContent = store ? store.name : 'Store';
  if (sub) sub.textContent = store ? `${store.category || 'Store'} · ${store.city || ''}`.trim() : 'Store not found.';
  if (scanLink) scanLink.href = storeId ? `scan.html?store_id=${encodeURIComponent(storeId)}` : 'scan.html';

  // Store hero (inject to make page feel like a real storefront)
  try {
    const host = grid.parentElement;
    if (host && !el('store-hero')) {
      const hero = document.createElement('section');
      hero.id = 'store-hero';
      hero.className = 'mm-card mm-card-pad mb-6';
      const hours = store?.hours || '10:00 AM – 10:00 PM';
      const policy = store?.policy || '7-day returns on eligible items · Instant support from Orders.';
      hero.innerHTML = `
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Storefront</p>
            <p class="text-xl md:text-2xl font-extrabold">${escapeHtml(store?.name || 'Store')}</p>
            <p class="text-sm text-muted-foreground mt-1">${escapeHtml((store?.category || 'Store') + (store?.city ? ` · ${store.city}` : ''))}</p>
            <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span class="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1">Hours: ${escapeHtml(hours)}</span>
              <span class="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1">Policy: ${escapeHtml(policy)}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <a href="compare.html" class="mm-action mm-action-outline mm-action-sm">Compare</a>
            <a href="support.html" class="mm-action mm-action-ghost mm-action-sm">Support</a>
            <a href="${scanLink?.href || 'scan.html'}" class="mm-action mm-action-primary mm-action-sm">Scan&Go here</a>
          </div>
        </div>
      `;
      host.insertBefore(hero, grid);
    }
  } catch {}

  const base = (s.products || []).filter((p) => String(p.storeId || '') === String(storeId));
  if (!base.length) {
    grid.innerHTML = emptyState({
      title: 'No products found for this store',
      subtitle: 'Try another store from the mall list.',
      href: 'malls.html',
      cta: 'Browse malls',
      icon: icon('store')
    });
    return;
  }

  const draw = () => {
    const q = String(qInput?.value || '').trim().toLowerCase();
    const sort = String(sortInput?.value || 'reco');
    let items = base;
    if (q) items = items.filter((p) => String(p.name || '').toLowerCase().includes(q));
    if (sort === 'price_asc') items = [...items].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'price_desc') items = [...items].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === 'discount') items = [...items].sort((a, b) => (Number(b.originalPrice || 0) - Number(b.price || 0)) - (Number(a.originalPrice || 0) - Number(a.price || 0)));
    grid.innerHTML = items.map(productCard).join('');
  };
  draw();
  qInput?.addEventListener('input', draw);
  sortInput?.addEventListener('change', draw);
}

function renderComparePage(data) {
  const s = scoped(data);
  const input = el('cmp-input');
  const dl = el('cmp-products');
  const form = el('cmp-form');
  const list = el('cmp-list');
  const results = el('cmp-results');
  const clearBtn = el('cmp-clear');
  if (!input || !dl || !form || !list || !results || !clearBtn) return;

  const key = 'mm_compare';
  const readPinned = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const writePinned = (v) => localStorage.setItem(key, JSON.stringify(v));

  const products = s.products || [];
  dl.innerHTML = products.slice(0, 400).map((p) => `<option value="${escapeHtml(String(p.name || '').replaceAll('"', '&quot;'))}"></option>`).join('');

  const normalize = (t) => String(t || '').trim().toLowerCase();
  const findProduct = (q) => {
    const qq = normalize(q);
    if (!qq) return null;
    return products.find((p) => normalize(p.name) === qq) || products.find((p) => normalize(p.name).includes(qq)) || null;
  };

  // Shareable compare URL (?pinned=id1,id2&active=id)
  const qp = new URLSearchParams(location.search);
  const parsePinnedFromUrl = () => {
    const raw = String(qp.get('pinned') || '').trim();
    if (!raw) return [];
    return raw.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12);
  };
  const applyUrlPinned = () => {
    const ids = parsePinnedFromUrl();
    if (!ids.length) return;
    const uniq = [];
    for (const id of ids) if (!uniq.includes(id)) uniq.push(id);
    const next = uniq
      .map((id) => products.find((p) => String(p.id) === String(id)) || null)
      .filter(Boolean)
      .map((p) => ({ id: String(p.id), name: String(p.name || ''), price: Number(p.price || 0), originalPrice: Number(p.originalPrice || 0) }));
    if (next.length) writePinned(next);
  };

  const setUrl = (pinnedIds, activeId) => {
    try {
      const u = new URL(location.href);
      if (pinnedIds?.length) u.searchParams.set('pinned', pinnedIds.join(','));
      else u.searchParams.delete('pinned');
      if (activeId) u.searchParams.set('active', String(activeId));
      else u.searchParams.delete('active');
      history.replaceState({}, '', u.toString());
    } catch {}
  };

  const renderPinned = (activeId) => {
    const pinned = readPinned();
    if (!pinned.length) {
      list.innerHTML = `<div class="text-sm text-muted-foreground">No pinned items yet.</div>`;
      return;
    }
    list.innerHTML = pinned.map((p) => `
      <div class="rounded-xl border border-border bg-card p-3 hover:bg-muted ${String(p.id) === String(activeId) ? 'ring-2 ring-amber-300' : ''}">
        <button type="button" class="w-full text-left" data-cmp-id="${escapeHtml(p.id)}">
          <p class="font-extrabold truncate">${escapeHtml(p.name)}</p>
          <p class="text-xs text-muted-foreground mt-1">${money(p.price)} ${p.originalPrice > p.price ? `· <span class="line-through">${money(p.originalPrice)}</span>` : ''}</p>
        </button>
        <div class="mt-2 flex gap-2">
          <button type="button" class="mm-action mm-action-ghost mm-action-sm cmp-remove" data-cmp-remove="${escapeHtml(p.id)}">Remove</button>
        </div>
      </div>
    `).join('');
  };

  const renderResults = (p) => {
    if (!p?.id) {
      results.innerHTML = emptyState({ title: 'Pick an item to compare', subtitle: 'Add a product above or select a pinned one.' });
      return;
    }
    // This demo dataset already contains a “best offer” per product, so we simulate multi-offer compare:
    // We generate variants by looking for same name in other stores (if any), otherwise show store + mall as best.
    const offersBase = products
      .filter((x) => normalize(x.name) === normalize(p.name))
      .map((x) => ({
        id: x.id,
        storeName: x.storeName || 'Store',
        mallName: x.mallName || 'Mall',
        price: Number(x.price || 0),
        originalPrice: Number(x.originalPrice || 0),
        rating: Number(x.rating || 0),
        delivery: x.deliveryTime || '—',
        url: `product.html?id=${encodeURIComponent(String(x.id))}`
      }))
      ;

    const sortKey = String(new URLSearchParams(location.search).get('sort') || 'price');
    const sortOffers = (arr) => {
      if (sortKey === 'rating') return [...arr].sort((a, b) => b.rating - a.rating);
      if (sortKey === 'delivery') return [...arr].sort((a, b) => String(a.delivery || '').localeCompare(String(b.delivery || '')));
      if (sortKey === 'save') return [...arr].sort((a, b) => (b.originalPrice - b.price) - (a.originalPrice - a.price));
      return [...arr].sort((a, b) => a.price - b.price);
    };
    const offers = sortOffers(offersBase);

    const best = offers[0];
    const pinnedIds = readPinned().map((x) => String(x.id));
    setUrl(pinnedIds, p.id);
    results.innerHTML = `
      <div class="mm-card mm-card-pad">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Comparing</p>
            <p class="text-xl font-extrabold">${escapeHtml(p.name)}</p>
            <p class="text-sm text-muted-foreground mt-1">Best price highlighted.</p>
          </div>
          <div class="flex flex-wrap gap-2 justify-end">
            <select id="cmp-sort" class="rounded-xl border px-3 py-2 text-sm font-semibold">
              <option value="price" ${sortKey === 'price' ? 'selected' : ''}>Lowest price</option>
              <option value="save" ${sortKey === 'save' ? 'selected' : ''}>Best savings</option>
              <option value="rating" ${sortKey === 'rating' ? 'selected' : ''}>Top rated</option>
              <option value="delivery" ${sortKey === 'delivery' ? 'selected' : ''}>Fastest delivery</option>
            </select>
            <button type="button" id="cmp-share" class="mm-action mm-action-outline mm-action-sm">Share</button>
            <a href="product.html?id=${encodeURIComponent(String(p.id))}" class="mm-action mm-action-ghost mm-action-sm">Open product</a>
          </div>
        </div>
      </div>
      <div class="mt-4 space-y-2">
        ${offers.map((o) => `
          <a href="${o.url}" class="block rounded-2xl border border-border bg-card p-4 hover:shadow-card-hover ${o.id === best.id ? 'ring-2 ring-emerald-300' : ''}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-extrabold truncate">${escapeHtml(o.storeName)} · ${escapeHtml(o.mallName)}</p>
                <p class="text-xs text-muted-foreground mt-1">Delivery ${escapeHtml(o.delivery)} · Rating ${o.rating.toFixed(1)}★</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-extrabold">${money(o.price)}</p>
                ${o.originalPrice > o.price ? `<p class="text-xs text-muted-foreground line-through">${money(o.originalPrice)}</p>` : ''}
                ${o.id === best.id ? `<p class="text-xs font-extrabold text-emerald-700 mt-1">Best price</p>` : ''}
              </div>
            </div>
          </a>
        `).join('') || `<div class="text-sm text-muted-foreground">No offers found.</div>`}
      </div>
    `;

    el('cmp-sort')?.addEventListener('change', () => {
      try {
        const u = new URL(location.href);
        u.searchParams.set('sort', String(el('cmp-sort')?.value || 'price'));
        history.replaceState({}, '', u.toString());
      } catch {}
      renderResults(p);
    });
    el('cmp-share')?.addEventListener('click', async () => {
      const u = location.href;
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(u);
        toast('Link copied.', { type: 'ok', title: 'Compare', ms: 1200 });
      } catch {
        toast('Could not copy link. You can copy the URL from the address bar.', { type: 'info', title: 'Compare', ms: 2400 });
      }
    });
  };

  const addPinned = (p) => {
    const pinned = readPinned();
    if (pinned.some((x) => String(x.id) === String(p.id))) return;
    pinned.unshift({ id: String(p.id), name: String(p.name || ''), price: Number(p.price || 0), originalPrice: Number(p.originalPrice || 0) });
    writePinned(pinned.slice(0, 12));
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = findProduct(input.value);
    if (!p) return toast('Pick a valid product name.', { type: 'bad', title: 'Compare' });
    addPinned(p);
    renderPinned(p.id);
    renderResults(p);
    toast('Added to compare.', { type: 'ok', title: 'Compare', ms: 1200 });
  });

  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmp-id]');
    if (!b) return;
    const id = String(b.getAttribute('data-cmp-id') || '');
    const pinned = readPinned();
    const hit = pinned.find((x) => String(x.id) === id);
    if (!hit) return;
    // Find full product record for offers
    const p = products.find((x) => String(x.id) === id) || hit;
    renderPinned(id);
    renderResults(p);
  });

  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmp-remove]');
    if (!b) return;
    const id = String(b.getAttribute('data-cmp-remove') || '');
    const pinned = readPinned().filter((x) => String(x.id) !== id);
    writePinned(pinned);
    renderPinned('');
    const first = pinned[0] ? products.find((x) => String(x.id) === String(pinned[0].id)) : null;
    renderPinned(first?.id || '');
    renderResults(first);
    toast('Removed.', { type: 'ok', title: 'Compare', ms: 900 });
  });

  clearBtn.addEventListener('click', () => {
    writePinned([]);
    renderPinned('');
    renderResults(null);
    toast('Cleared compare list.', { type: 'ok', title: 'Compare', ms: 1200 });
  });

  // Apply URL pinned once on load (share links)
  applyUrlPinned();
  const pinned = readPinned();
  const activeFromUrl = String(new URLSearchParams(location.search).get('active') || '').trim();
  const first = activeFromUrl
    ? products.find((x) => String(x.id) === activeFromUrl) || (pinned[0] ? products.find((x) => String(x.id) === String(pinned[0].id)) : null)
    : (pinned[0] ? products.find((x) => String(x.id) === String(pinned[0].id)) : null);
  renderPinned(first?.id || '');
  renderResults(first);
}

function renderCart() {
  const container = el('cart-container');
  if (!container) return;
  if (!state.cart.length) {
    container.innerHTML = emptyState({
      title: 'Your cart is empty',
      subtitle: 'Add products from nearby malls and checkout with live tracking.',
      href: 'products.html',
      cta: 'Browse products',
      icon: icon('cart')
    });
    return;
  }
  const total = state.cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
  const gst = Math.round(total * 0.18);
  const grand = total + gst;
  const couponsKey = 'mm_coupons';
  const coupon = (() => { try { return JSON.parse(localStorage.getItem(couponsKey) || '{}'); } catch { return {}; } })();
  const available = [
    { code: 'FIRST50', title: 'FIRST50', desc: 'Rs 50 off on orders above Rs 499', min: 499, flat: 50 },
    { code: 'SAVE10', title: 'SAVE10', desc: '10% off up to Rs 120', min: 999, pct: 10, cap: 120 },
    { code: 'FREESHIP', title: 'FREESHIP', desc: 'No delivery fee (demo)', min: 299, flat: 0 }
  ];
  const addrKey = 'mm_delivery_address';
  const addrBookKey = 'mm_address_book';
  const addrBook = (() => { try { return JSON.parse(localStorage.getItem(addrBookKey) || '[]'); } catch { return []; } })();
  const selectedId = (() => { try { return JSON.parse(localStorage.getItem(addrKey) || '{}'); } catch { return {}; } })()?.id || '';
  const selected = addrBook.find((a) => String(a.id) === String(selectedId)) || addrBook.find((a) => a.is_default) || addrBook[0] || null;
  const addr = selected || (() => { try { return JSON.parse(localStorage.getItem(addrKey) || '{}'); } catch { return {}; } })();
  const applyCoupon = (code) => {
    const c = available.find((x) => x.code === code) || null;
    if (!c) return { code: '', off: 0 };
    if (grand < c.min) return { code: c.code, off: 0, err: `Add ${money(c.min - grand)} more to use ${c.code}.` };
    if (c.flat != null) return { code: c.code, off: Number(c.flat || 0) };
    if (c.pct != null) return { code: c.code, off: Math.min(Number(c.cap || 999999), Math.round((grand * Number(c.pct || 0)) / 100)) };
    return { code: c.code, off: 0 };
  };
  const applied = coupon?.code ? applyCoupon(String(coupon.code)) : { code: '', off: 0 };
  const payable = Math.max(0, grand - Number(applied.off || 0));

  const payKey = 'mm_payment_method';
  const payMethod = (() => { try { return String(localStorage.getItem(payKey) || 'upi'); } catch { return 'upi'; } })();
  container.innerHTML = `
    <div class="mb-6 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <span class="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1">1 · Cart</span>
          <span class="text-muted-foreground">→</span>
          <span class="inline-flex items-center rounded-full bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1">2 · Address</span>
          <span class="text-muted-foreground">→</span>
          <span class="inline-flex items-center rounded-full bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1">3 · Payment</span>
          <span class="text-muted-foreground">→</span>
          <span class="inline-flex items-center rounded-full bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1">4 · Done</span>
        </div>
        <div class="text-xs text-muted-foreground">Secure checkout · Real-time tracking after payment</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <h2 class="text-2xl font-bold mb-4">Cart (${state.cart.length})</h2>
        ${state.cart.map((item, idx) => `
          <div class="border rounded-2xl p-4 flex gap-4 mb-3 bg-card">
            <img src="${item.image || ''}" alt="${escapeHtml(item.name)}" class="w-20 h-20 object-cover rounded-xl bg-muted" loading="lazy" />
            <div class="flex-1 min-w-0">
              <h3 class="font-extrabold truncate">${escapeHtml(item.name)}</h3>
              <p class="font-semibold text-primary mt-1">${money(item.price)}</p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <div class="inline-flex items-center rounded-xl border border-border overflow-hidden">
                  <button type="button" class="cart-dec px-3 py-2 text-sm font-extrabold hover:bg-muted" data-idx="${idx}" aria-label="Decrease quantity">−</button>
                  <span class="px-3 py-2 text-sm font-semibold min-w-10 text-center">${Number(item.quantity || 1)}</span>
                  <button type="button" class="cart-inc px-3 py-2 text-sm font-extrabold hover:bg-muted" data-idx="${idx}" aria-label="Increase quantity">+</button>
                </div>
                <button type="button" class="save-later rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted" data-idx="${idx}">Save for later</button>
                <button type="button" class="rm-cart rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted" data-idx="${idx}">Remove</button>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs text-muted-foreground">Subtotal</p>
              <p class="font-extrabold">${money(Number(item.price || 0) * Number(item.quantity || 1))}</p>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="space-y-4">
        <div class="border rounded-lg p-4">
          <p class="font-bold mb-3">Delivery details</p>
          <div class="mb-3 ${addrBook.length ? '' : 'hidden'}">
            <label class="text-xs font-semibold text-muted-foreground" for="addr-pick">Saved addresses</label>
            <select id="addr-pick" class="mt-1 w-full rounded-xl border px-3.5 py-2.5">
              ${addrBook.map((a) => `<option value="${a.id}" ${String(a.id)===String(selected?.id||'')?'selected':''}>${escapeHtml(a.name || 'Address')} · ${escapeHtml(String(a.address || '').slice(0, 28))}${a.is_default ? ' (default)' : ''}</option>`).join('')}
            </select>
            <div class="mt-2 flex gap-2">
              <button type="button" id="addr-default" class="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted">Make default</button>
              <button type="button" id="addr-delete" class="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted">Delete</button>
            </div>
          </div>
          <form id="delivery-form" class="space-y-3">
            <input id="del-name" placeholder="Full name" value="${escapeHtml(addr.name || '').replaceAll('&quot;','\"')}" required />
            <input id="del-phone" placeholder="Phone" value="${escapeHtml(addr.phone || '').replaceAll('&quot;','\"')}" required />
            <textarea id="del-address" placeholder="Address (House, Street, Area, City, Pincode)" rows="3" required>${escapeHtml(addr.address || '')}</textarea>
            <div class="flex gap-2">
              <button type="submit" class="rounded-lg border px-4 py-2 text-sm font-semibold">Save</button>
              <button type="button" id="addr-save-new" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Save as new</button>
            </div>
          </form>
        </div>
        <div class="border rounded-lg p-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <p class="font-bold">Coupons & wallet</p>
            <p class="text-xs text-muted-foreground">Rewards: ${Number(state.rewards?.total || 0)} pts</p>
          </div>
          <div class="grid gap-2">
            ${available.map((c) => `
              <button type="button" class="w-full text-left rounded-xl border border-border bg-card p-3 hover:bg-muted" data-coupon="${c.code}">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-extrabold">${c.title}</p>
                    <p class="text-xs text-muted-foreground mt-1">${c.desc}</p>
                  </div>
                  <span class="text-xs font-extrabold text-primary">Apply</span>
                </div>
              </button>
            `).join('')}
            ${applied?.code ? `<button type="button" id="coupon-remove" class="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted">Remove coupon (${escapeHtml(applied.code)})</button>` : ''}
            ${applied?.err ? `<p class="text-xs text-rose-600 font-semibold">${escapeHtml(applied.err)}</p>` : ''}
          </div>
        </div>
        <div class="border rounded-lg p-4">
          <p>Subtotal: ${money(total)}</p>
          <p>GST: ${money(gst)}</p>
          ${applied?.code ? `<p>Coupon (${escapeHtml(applied.code)}): <b>- ${money(applied.off || 0)}</b></p>` : ''}
          <p class="font-bold">Total: ${money(payable)}</p>
          <div class="mt-3 rounded-xl border border-border bg-card p-3">
            <p class="text-sm font-extrabold">Payment method (demo)</p>
            <div class="mt-2 grid gap-2 text-sm">
              <label class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted">
                <span class="font-semibold">UPI</span>
                <input type="radio" name="mm-pay" value="upi" ${payMethod === 'upi' ? 'checked' : ''} />
              </label>
              <label class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted">
                <span class="font-semibold">Card</span>
                <input type="radio" name="mm-pay" value="card" ${payMethod === 'card' ? 'checked' : ''} />
              </label>
              <label class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted">
                <span class="font-semibold">Cash on Delivery</span>
                <input type="radio" name="mm-pay" value="cod" ${payMethod === 'cod' ? 'checked' : ''} />
              </label>
            </div>
            <p class="mt-2 text-xs text-muted-foreground">If Stripe is configured, online payment is used at checkout.</p>
          </div>
          <button id="checkout-btn" class="mt-3 w-full mm-action mm-action-primary">Proceed to Checkout</button>
          <p class="text-xs text-muted-foreground mt-2">Address is required for real delivery creation.</p>
        </div>
      </div>
    </div>
  `;
  container.querySelectorAll('input[name="mm-pay"]').forEach((r) => r.addEventListener('change', () => {
    const v = String(container.querySelector('input[name="mm-pay"]:checked')?.value || 'upi');
    try { localStorage.setItem(payKey, v); } catch {}
  }));
  const savedKey = 'mm_saved_for_later';
  const readSaved = () => { try { return JSON.parse(localStorage.getItem(savedKey) || '[]'); } catch { return []; } };
  const writeSaved = (v) => { try { localStorage.setItem(savedKey, JSON.stringify(v.slice(0, 40))); } catch {} };

  document.querySelectorAll('.cart-inc').forEach((b) => b.addEventListener('click', () => {
    const idx = Number(b.getAttribute('data-idx'));
    const it = state.cart[idx];
    if (!it) return;
    it.quantity = Math.min(20, Number(it.quantity || 1) + 1);
    persist();
    renderCart();
    renderNavbar();
  }));
  document.querySelectorAll('.cart-dec').forEach((b) => b.addEventListener('click', () => {
    const idx = Number(b.getAttribute('data-idx'));
    const it = state.cart[idx];
    if (!it) return;
    it.quantity = Math.max(1, Number(it.quantity || 1) - 1);
    persist();
    renderCart();
    renderNavbar();
  }));
  document.querySelectorAll('.save-later').forEach((b) => b.addEventListener('click', () => {
    const idx = Number(b.getAttribute('data-idx'));
    const it = state.cart[idx];
    if (!it) return;
    const saved = readSaved();
    saved.unshift({ ...it, quantity: Number(it.quantity || 1), savedAt: Date.now() });
    writeSaved(saved);
    state.cart.splice(idx, 1);
    persist();
    toast('Saved for later.', { type: 'ok', title: 'Cart', ms: 1200 });
    renderCart();
    renderNavbar();
  }));
  document.querySelectorAll('.rm-cart').forEach((b) => b.addEventListener('click', () => {
    removeFromCart(Number(b.getAttribute('data-idx')));
    renderCart();
    renderNavbar();
  }));

  el('delivery-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const next = { id: String(selected?.id || `addr-${Date.now()}`), name: el('del-name').value, phone: el('del-phone').value, address: el('del-address').value, is_default: Boolean(selected?.is_default) };
    const book = (() => { try { return JSON.parse(localStorage.getItem(addrBookKey) || '[]'); } catch { return []; } })();
    const idx = book.findIndex((a) => String(a.id) === String(next.id));
    if (idx >= 0) book[idx] = { ...book[idx], ...next };
    else book.unshift(next);
    localStorage.setItem(addrBookKey, JSON.stringify(book.slice(0, 10)));
    localStorage.setItem(addrKey, JSON.stringify(next));
    toast('Delivery address saved.', { type: 'ok', title: 'Delivery' });
    renderCart();
  });

  el('addr-save-new')?.addEventListener('click', () => {
    const next = { id: `addr-${Date.now()}`, name: el('del-name').value, phone: el('del-phone').value, address: el('del-address').value, is_default: false };
    const book = (() => { try { return JSON.parse(localStorage.getItem(addrBookKey) || '[]'); } catch { return []; } })();
    book.unshift(next);
    localStorage.setItem(addrBookKey, JSON.stringify(book.slice(0, 10)));
    localStorage.setItem(addrKey, JSON.stringify(next));
    toast('Saved as new address.', { type: 'ok', title: 'Delivery' });
    renderCart();
  });

  el('addr-pick')?.addEventListener('change', () => {
    const id = el('addr-pick')?.value || '';
    const book = (() => { try { return JSON.parse(localStorage.getItem(addrBookKey) || '[]'); } catch { return []; } })();
    const hit = book.find((a) => String(a.id) === String(id));
    if (hit) localStorage.setItem(addrKey, JSON.stringify(hit));
    renderCart();
  });

  el('addr-default')?.addEventListener('click', () => {
    const id = el('addr-pick')?.value || selected?.id || '';
    const book = (() => { try { return JSON.parse(localStorage.getItem(addrBookKey) || '[]'); } catch { return []; } })();
    const next = book.map((a) => ({ ...a, is_default: String(a.id) === String(id) }));
    localStorage.setItem(addrBookKey, JSON.stringify(next));
    const hit = next.find((a) => a.is_default);
    if (hit) localStorage.setItem(addrKey, JSON.stringify(hit));
    toast('Default address set.', { type: 'ok', title: 'Delivery' });
    renderCart();
  });

  el('addr-delete')?.addEventListener('click', () => {
    const id = el('addr-pick')?.value || '';
    const book = (() => { try { return JSON.parse(localStorage.getItem(addrBookKey) || '[]'); } catch { return []; } })();
    const next = book.filter((a) => String(a.id) !== String(id));
    localStorage.setItem(addrBookKey, JSON.stringify(next));
    if (String(selected?.id) === String(id)) localStorage.removeItem(addrKey);
    toast('Address removed.', { type: 'ok', title: 'Delivery' });
    renderCart();
  });

  el('checkout-btn')?.addEventListener('click', () => {
    if (!state.user) return (window.location.href = 'login.html');
    // If Stripe config exists, use real checkout; otherwise fallback to demo order.
    const stripeKey = String((window.MM_CONFIG || {}).STRIPE_PUBLISHABLE_KEY || '').trim();
    if (stripeKey && window.MM_SUPABASE?.functionsBaseUrl?.()) {
      startStripeCheckoutFromCart().catch((e) => toast(e.message || String(e), { type: 'bad', title: 'Checkout' }));
      return;
    }

    const order = { id: `ORD-${Date.now()}`, date: new Date().toISOString(), total: payable, status: 'processing', trackingId: `TRK-${Math.random().toString(36).slice(2, 9).toUpperCase()}`, items: state.cart.map((x) => ({ ...x })) };
    state.orders.unshift(order);
    state.cart = [];
    const earn = Math.floor(grand * 0.05);
    state.rewards.earned += earn;
    state.rewards.total += earn;
    persist();
    window.location.href = 'checkout-success.html';
  });

  container.querySelectorAll('[data-coupon]').forEach((b) => b.addEventListener('click', () => {
    const code = String(b.getAttribute('data-coupon') || '');
    localStorage.setItem(couponsKey, JSON.stringify({ code }));
    toast(`Coupon applied: ${code}`, { type: 'ok', title: 'Coupon' });
    renderCart();
  }));
  el('coupon-remove')?.addEventListener('click', () => {
    localStorage.removeItem(couponsKey);
    toast('Coupon removed.', { type: 'ok', title: 'Coupon' });
    renderCart();
  });
}
function renderCheckoutSuccess() {
  const container = el('checkout-container');
  if (!container) return;
  const o = state.orders[0];
  container.innerHTML = `
    <div class="text-center py-12"><h1 class="text-3xl font-bold mb-2">Order Confirmed</h1><p class="text-muted-foreground mb-6">Thank you for shopping in ${state.location || 'All India'}.</p>${o ? `<div class="bg-muted rounded-lg p-6 mb-6 max-w-md mx-auto text-left"><p><span class="font-semibold">Order ID:</span> ${o.id}</p><p><span class="font-semibold">Tracking ID:</span> ${o.trackingId}</p><p><span class="font-semibold">Total:</span> ${money(o.total)}</p></div>` : ''}<div class="flex gap-4 justify-center"><a href="orders.html" class="px-6 py-2 bg-primary text-white rounded-lg">View Orders</a><a href="index.html" class="px-6 py-2 border rounded-lg">Back Home</a></div></div>
  `;
}

function renderLogin() {
  const container = el('login-container');
  if (!container) return;
  const useSupa = Boolean(supa());
  container.innerHTML = useSupa ? `
    <div class="max-w-md mx-auto border rounded-lg p-6">
      <h1 class="text-2xl font-bold mb-2">Sign in</h1>
      <p class="text-sm text-muted-foreground mb-6">Production auth via Supabase (email OTP).</p>
      <form id="login-form" class="space-y-4">
        <input type="email" id="login-email" placeholder="you@example.com" required />
        <input type="text" id="login-name" placeholder="Your name (optional)" />
        <button type="submit" class="w-full py-2 bg-primary text-white rounded-lg">Send OTP</button>
      </form>
      <div class="mt-4 text-xs text-muted-foreground">
        <p>To enable: set <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> in <code>assets/js/config.js</code>.</p>
      </div>
      <div class="mt-4">
        <button id="logout-btn" class="w-full py-2 border rounded-lg">Logout</button>
      </div>
    </div>
  ` : `
    <div class="max-w-md mx-auto border rounded-lg p-6"><h1 class="text-2xl font-bold mb-6">Login to MallMaze</h1><form id="login-form" class="space-y-4"><input type="email" id="login-email" placeholder="you@example.com" required /><input type="text" id="login-name" placeholder="Your name" required /><select id="login-role"><option value="user">User</option><option value="admin">Admin</option></select><button type="submit" class="w-full py-2 bg-primary text-white rounded-lg">Login</button></form></div>
  `;

  if (useSupa) {
    el('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const client = supa();
      if (!client) return;
      const email = el('login-email').value;
      const name = (el('login-name')?.value || '').trim();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { data: name ? { name } : undefined }
      });
      if (error) return toast(error.message, { type: 'bad', title: 'Login' });
      toast('OTP sent. Check your email to sign in.', { type: 'ok', title: 'Login' });
    });
    el('logout-btn')?.addEventListener('click', async () => {
      const client = supa();
      if (!client) return;
      await client.auth.signOut();
      state.user = null;
      persist();
      renderNavbar();
      toast('Logged out.', { type: 'ok', title: 'Account' });
    });
    return;
  }

  el('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.user = { name: el('login-name').value, email: el('login-email').value, role: el('login-role').value };
    persist();
    window.location.href = 'index.html';
  });
}

function renderWishlist() {
  const container = el('wishlist-container');
  if (!container) return;
  const priceDropKey = 'mm_price_drop_demo';
  const priceDrops = (() => { try { return JSON.parse(localStorage.getItem(priceDropKey) || '{}'); } catch { return {}; } })();
  // Demo: randomly assign a small price drop once per item
  const ensureDrop = (id, price) => {
    try {
      if (priceDrops[id] != null) return Number(priceDrops[id] || 0);
      const drop = Math.random() < 0.35 ? Math.max(0, Math.round(Number(price || 0) * (0.05 + Math.random() * 0.12))) : 0;
      priceDrops[id] = drop;
      localStorage.setItem(priceDropKey, JSON.stringify(priceDrops));
      return drop;
    } catch { return 0; }
  };

  if (!state.wishlist.length) {
    container.innerHTML = emptyState({
      title: 'No saved items yet',
      subtitle: 'Tap the heart on any product to save it here.',
      href: 'products.html',
      cta: 'Browse products',
      icon: icon('heart')
    });
    return;
  }
  container.innerHTML = `
    <div class="mm-card mm-card-pad mb-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs text-muted-foreground">Wishlist</p>
          <p class="text-lg font-extrabold">${state.wishlist.length} saved item${state.wishlist.length === 1 ? '' : 's'}</p>
          <p class="text-xs text-muted-foreground mt-1">Move items to cart when you’re ready to checkout.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a href="cart.html" class="mm-action mm-action-primary mm-action-sm">Go to cart</a>
          <a href="compare.html" class="mm-action mm-action-outline mm-action-sm">Compare</a>
        </div>
      </div>
    </div>
    <div class="space-y-2">
      ${state.wishlist.map((w, idx) => {
        const drop = ensureDrop(String(w.id), Number(w.price || 0));
        const newPrice = Math.max(0, Number(w.price || 0) - drop);
        return `
          <div class="mm-card mm-card-pad">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-extrabold truncate">${escapeHtml(w.name)}</p>
                <p class="text-sm font-semibold text-primary mt-1">${money(newPrice)} ${drop ? `<span class="ml-2 text-xs font-extrabold text-emerald-700">Price drop</span>` : ''}</p>
                ${drop ? `<p class="text-xs text-muted-foreground mt-1">Was ${money(w.price)} · Save ${money(drop)}</p>` : `<p class="text-xs text-muted-foreground mt-1">Saved for later</p>`}
              </div>
              <div class="flex flex-wrap gap-2 justify-end">
                <button type="button" class="mm-action mm-action-outline mm-action-sm wl-move" data-idx="${idx}">Move to cart</button>
                <button type="button" class="mm-action mm-action-ghost mm-action-sm rm-w" data-idx="${idx}">Remove</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.wl-move').forEach((b) => b.addEventListener('click', () => {
    const idx = Number(b.getAttribute('data-idx'));
    const it = state.wishlist[idx];
    if (!it) return;
    // Add to cart (id/name/price/image if present)
    const existing = state.cart.find((x) => String(x.id) === String(it.id));
    if (existing) existing.quantity = (existing.quantity || 1) + 1;
    else state.cart.push({ id: it.id, name: it.name, price: it.price, image: it.image || '', quantity: 1 });
    state.wishlist.splice(idx, 1);
    persist();
    renderNavbar();
    toast('Moved to cart.', { type: 'ok', title: 'Wishlist', ms: 1100 });
    renderWishlist();
  }));
  container.querySelectorAll('.rm-w').forEach((b) => b.addEventListener('click', () => {
    state.wishlist.splice(Number(b.getAttribute('data-idx')), 1);
    persist();
    renderWishlist();
    renderNavbar();
  }));
}

function renderOrders() {
  const container = el('orders-container');
  if (!container) return;
  const client = supa();
  if (client) {
    renderOrdersSupabase().catch(() => renderOrdersLocal());
    return;
  }
  renderOrdersLocal();
}

function renderOrdersLocal() {
  const container = el('orders-container');
  if (!container) return;
  if (!state.orders.length) {
    container.innerHTML = emptyState({
      title: 'No orders yet',
      subtitle: 'Place your first order and you’ll see tracking updates here.',
      href: 'products.html',
      cta: 'Start shopping',
      icon: icon('map')
    });
    return;
  }
  container.innerHTML = state.orders.map((o, idx) => `
    <div class="mm-card mm-card-pad mb-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <a class="font-extrabold hover:underline" href="order.html?id=${encodeURIComponent(String(o.id))}">${o.id}</a>
          <p class="text-xs text-muted-foreground">${new Date(o.date).toLocaleString()}</p>
        </div>
        <div class="flex gap-2">
          <button class="reorder-btn mm-action mm-action-outline mm-action-sm" data-idx="${idx}">Reorder</button>
          <button class="invoice-btn mm-action mm-action-ghost mm-action-sm" data-idx="${idx}">Invoice</button>
          <button class="issue-btn mm-action mm-action-outline mm-action-sm" data-idx="${idx}">Report issue</button>
        </div>
      </div>
      <div class="mt-2 text-sm">
        <p><b>Status:</b> ${o.status}</p>
        <p><b>Total:</b> ${money(o.total)}</p>
        <p><b>Tracking:</b> ${o.trackingId}</p>
      </div>
      <div id="issue-${idx}" class="mt-3 hidden rounded-lg border p-3 bg-muted">
        <p class="text-sm font-semibold mb-2">Report an issue</p>
        <input type="range" min="30" max="100" value="70" class="w-full" id="refund-range-${idx}" />
        <div class="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>30%</span><span id="refund-val-${idx}">70%</span><span>100%</span>
        </div>
        <button class="claim-refund mt-3 mm-action mm-action-primary mm-action-sm" data-idx="${idx}">Claim refund</button>
        <p class="text-xs text-muted-foreground mt-2">Login to create a support ticket.</p>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.reorder-btn').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.getAttribute('data-idx'));
    const o = state.orders[i];
    if (!o?.items?.length) return toast('This order has no saved items (older order).', { type: 'bad', title: 'Reorder' });
    state.cart = o.items.map((x) => ({ ...x }));
    persist();
    renderNavbar();
    window.location.href = 'cart.html';
  }));

  container.querySelectorAll('.invoice-btn').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.getAttribute('data-idx'));
    const o = state.orders[i];
    if (!o) return;
    const lines = [
      `MallMaze Invoice`,
      ``,
      `Order: ${o.id}`,
      `Date: ${new Date(o.date).toLocaleString()}`,
      `Status: ${o.status}`,
      `Tracking: ${o.trackingId}`,
      ``,
      `Items:`,
      ...(o.items || []).map((it) => `- ${it.name} × ${it.quantity || 1} = ${money(Number(it.price || 0) * Number(it.quantity || 1))}`),
      ``,
      `Total: ${money(o.total)}`
    ].join('\n');
    downloadTextFile(`${String(o.id).replace(/[^a-z0-9_-]+/ig,'_')}_invoice.txt`, lines);
  }));

  container.querySelectorAll('.issue-btn').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.getAttribute('data-idx'));
    const panel = el(`issue-${i}`);
    panel?.classList.toggle('hidden');
    const range = el(`refund-range-${i}`);
    const val = el(`refund-val-${i}`);
    range?.addEventListener('input', () => { if (val) val.textContent = `${range.value}%`; }, { once: true });
  }));

  container.querySelectorAll('.claim-refund').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.getAttribute('data-idx'));
    const pct = Number(el(`refund-range-${i}`)?.value || 0);
    toast(`Refund request: ${pct}%`, { type: 'ok', title: 'Support' });
    toast('For real support tickets, login and use Orders (Supabase).', { type: 'info', title: 'Support', ms: 4200 });
  }));
}

async function renderOrdersSupabase() {
  const container = el('orders-container');
  if (!container) return;
  const client = supa();
  const user = await supaSessionUser();
  if (!client || !user) return renderOrdersLocal();

  container.innerHTML = loadingState({ title: 'Loading your orders…' });

  const { data: orders } = await client
    .from('orders')
    .select('id, created_at, status, total_inr, stripe_checkout_session_id, deliveries(id,tracking_id,status,eta_minutes,updated_at)')
    .order('created_at', { ascending: false });

  if (!orders?.length) {
    container.innerHTML = emptyState({
      title: 'No orders yet',
      subtitle: 'Once you checkout, delivery status and support will appear here.',
      href: 'products.html',
      cta: 'Browse products',
      icon: icon('map')
    });
    return;
  }

      const render = (ordersNow) => {
    container.innerHTML = ordersNow.map((o, idx) => {
    const d = Array.isArray(o.deliveries) ? o.deliveries[0] : null;
      const statusSteps = ['pending_payment', 'paid', 'preparing', 'out_for_delivery', 'delivered'];
      const currentIdx = Math.max(0, statusSteps.indexOf(o.status));
      const stepPill = (label, i) => `<span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${i <= currentIdx ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}">${label}</span>`;
      const deliverySteps = ['created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
      const dStatus = String(d?.status || '').trim();
      const dIdx = Math.max(0, deliverySteps.indexOf(dStatus));
      const dPill = (label, i) => `<span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${dStatus && i <= dIdx ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}">${label}</span>`;
      const dBadge = dStatus === 'failed'
        ? `<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Delivery failed</span>`
        : dStatus === 'cancelled'
        ? `<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Delivery cancelled</span>`
        : '';
      return `
      <div class="mm-card mm-card-pad mb-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <a class="font-bold hover:underline" href="order.html?id=${encodeURIComponent(String(o.id))}">${o.id}</a>
            <p class="text-xs text-muted-foreground">${new Date(o.created_at).toLocaleString()}</p>
          </div>
          <div class="flex gap-2">
            <button class="reorder-btn mm-action mm-action-outline mm-action-sm" data-order="${o.id}" data-idx="${idx}">Reorder</button>
            <button class="invoice-btn mm-action mm-action-ghost mm-action-sm" data-order="${o.id}" data-idx="${idx}">Invoice</button>
            <button class="issue-btn mm-action mm-action-outline mm-action-sm" data-order="${o.id}" data-idx="${idx}">Report issue</button>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          ${stepPill('Payment', 1)}
          ${stepPill('Preparing', 2)}
          ${stepPill('Out for delivery', 3)}
          ${stepPill('Delivered', 4)}
        </div>
        ${d ? `
          <div class="mt-3 flex flex-wrap gap-2">
            ${dBadge || `
              ${dPill('Created', 0)}
              ${dPill('Picked up', 1)}
              ${dPill('In transit', 2)}
              ${dPill('Out for delivery', 3)}
              ${dPill('Delivered', 4)}
            `}
          </div>
        ` : ''}
        <div class="mt-2 text-sm">
          <p><b>Status:</b> ${o.status}</p>
          <p><b>Total:</b> ${money(o.total_inr)}</p>
          <p><b>Tracking:</b> ${d?.tracking_id || '-'}</p>
          <p><b>ETA:</b> ${d?.eta_minutes ? `${d.eta_minutes} min` : '-'}</p>
          ${d?.updated_at ? `<p class="text-xs text-muted-foreground mt-1">Updated ${new Date(d.updated_at).toLocaleTimeString()}</p>` : ''}
        </div>
        <div id="issue-${idx}" class="mt-3 hidden rounded-lg border p-3 bg-muted">
          <p class="text-sm font-semibold mb-2">Report an issue</p>
          <input type="range" min="30" max="100" value="70" class="w-full" id="refund-range-${idx}" />
          <div class="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>30%</span><span id="refund-val-${idx}">70%</span><span>100%</span>
          </div>
          <textarea id="refund-msg-${idx}" class="w-full rounded-lg border px-3 py-2 mt-3" rows="3" placeholder="Tell us what went wrong (missing item, damaged, late, etc.)"></textarea>
          <button class="claim-refund mt-3 mm-action mm-action-primary mm-action-sm" data-order="${o.id}" data-idx="${idx}">Submit</button>
          <p class="text-xs text-muted-foreground mt-2">We’ll review and process refunds to your original payment method.</p>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('.reorder-btn').forEach((b) => b.addEventListener('click', async () => {
      const orderId = String(b.getAttribute('data-order') || '');
      const client = supa();
      if (!client) return;
      const { data: items } = await client
        .from('order_items')
        .select('name, unit_price_inr, qty, product_id')
        .eq('order_id', orderId)
        .order('id', { ascending: true });
      const its = Array.isArray(items) ? items : [];
      if (!its.length) return toast('No items to reorder.', { type: 'bad', title: 'Reorder' });
      for (const it of its) {
        const id = String(it.product_id || it.name || `custom-${Math.random().toString(36).slice(2, 9)}`);
        const existing = state.cart.find((x) => String(x.id) === id);
        if (existing) existing.quantity = (existing.quantity || 1) + Number(it.qty || 1);
        else state.cart.push({ id, name: it.name, price: Number(it.unit_price_inr || 0), image: '', quantity: Number(it.qty || 1) });
      }
      persist();
      renderNavbar();
      toast('Added items to cart.', { type: 'ok', title: 'Reorder' });
      window.location.href = 'cart.html';
    }));

    container.querySelectorAll('.invoice-btn').forEach((b) => b.addEventListener('click', async () => {
      const orderId = String(b.getAttribute('data-order') || '');
      const client = supa();
      if (!client) return;
      const [{ data: order }, { data: items }] = await Promise.all([
        client.from('orders').select('id, created_at, status, total_inr').eq('id', orderId).maybeSingle(),
        client.from('order_items').select('name, unit_price_inr, qty').eq('order_id', orderId).order('id', { ascending: true })
      ]);
      if (!order?.id) return;
      const lines = [
        `MallMaze Invoice`,
        ``,
        `Order: ${order.id}`,
        `Date: ${new Date(order.created_at).toLocaleString()}`,
        `Status: ${order.status}`,
        ``,
        `Items:`,
        ...(Array.isArray(items) ? items : []).map((it) => `- ${it.name} × ${it.qty || 1} = ${money(Number(it.unit_price_inr || 0) * Number(it.qty || 1))}`),
        ``,
        `Total: ${money(order.total_inr || 0)}`
      ].join('\n');
      downloadTextFile(`${String(order.id).replace(/[^a-z0-9_-]+/ig,'_')}_invoice.txt`, lines);
    }));

    container.querySelectorAll('.issue-btn').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.getAttribute('data-idx'));
    const panel = el(`issue-${i}`);
    panel?.classList.toggle('hidden');
    const range = el(`refund-range-${i}`);
    const val = el(`refund-val-${i}`);
    range?.addEventListener('input', () => { if (val) val.textContent = `${range.value}%`; });
    }));

    container.querySelectorAll('.claim-refund').forEach((b) => b.addEventListener('click', async () => {
    const orderId = String(b.getAttribute('data-order') || '');
    const i = Number(b.getAttribute('data-idx'));
    const pct = Number(el(`refund-range-${i}`)?.value || 0);
    const msg = String(el(`refund-msg-${i}`)?.value || '').trim();
    const client = supa();
    if (!client) return;
    const { error } = await client.from('support_tickets').insert({ user_id: (await supaSessionUser())?.id, order_id: orderId, type: 'refund', refund_percent: pct, message: msg });
    if (error) return toast(error.message, { type: 'bad', title: 'Support' });
    toast('Support ticket created. Our team will review your refund request.', { type: 'ok', title: 'Support' });
    el(`issue-${i}`)?.classList.add('hidden');
    }));
  };

  render(orders || []);

  // Realtime updates (delivery + status)
  try {
    if (window.__mmOrdersChannel) client.removeChannel(window.__mmOrdersChannel);
    window.__mmOrdersChannel = client
      .channel('mm-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { data: refreshed } = await client
          .from('orders')
          .select('id, created_at, status, total_inr, stripe_checkout_session_id, deliveries(id,tracking_id,status,eta_minutes,updated_at)')
          .order('created_at', { ascending: false });
        render(refreshed || []);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, async () => {
        const { data: refreshed } = await client
          .from('orders')
          .select('id, created_at, status, total_inr, stripe_checkout_session_id, deliveries(id,tracking_id,status,eta_minutes,updated_at)')
          .order('created_at', { ascending: false });
        render(refreshed || []);
      })
      .subscribe();
  } catch {}

  // Polling fallback (covers cases where Realtime is unavailable)
  try {
    if (window.__mmOrdersPoll) clearInterval(window.__mmOrdersPoll);
    window.__mmOrdersPoll = setInterval(async () => {
      try {
        const { data: refreshed } = await client
          .from('orders')
          .select('id, created_at, status, total_inr, stripe_checkout_session_id, deliveries(id,tracking_id,status,eta_minutes,updated_at)')
          .order('created_at', { ascending: false });
        render(refreshed || []);
      } catch {}
    }, 20000);
  } catch {}
}

function renderReservations() {
  const container = el('reservations-container');
  if (!container) return;
  container.innerHTML = '<div class="text-center py-12"><h2 class="text-2xl font-bold mb-2">Reservations</h2><p class="text-muted-foreground">Reserve products during walkthrough and manage pickup windows here.</p></div>';
}

function renderQueue(data) {
  const container = el('queue-container');
  if (!container) return;
  const s = scoped(data);
  if (!state.queue.length) {
    container.innerHTML = `
      <div class="space-y-4"><h2 class="text-2xl font-bold">Book Queue Slot</h2><form id="queue-form" class="space-y-4"><select id="queue-mall">${s.malls.map((m) => `<option value="${m.name}">${m.name}</option>`).join('')}</select><input type="date" id="queue-date" required /><select id="queue-time"><option>10:00 AM</option><option>10:30 AM</option><option>11:00 AM</option></select><input type="number" id="queue-people" min="1" max="10" value="1" /><button type="submit" class="w-full py-2 bg-primary text-white rounded-lg">Book Queue Slot</button></form></div>
    `;
    el('queue-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      state.queue.unshift({ id: `QUEUE-${Date.now()}`, mall: el('queue-mall').value, date: el('queue-date').value, time: el('queue-time').value, people: el('queue-people').value });
      persist();
      renderQueue(data);
    });
    return;
  }
  container.innerHTML = `<h2 class="text-2xl font-bold mb-4">Your Queue Bookings</h2>` + state.queue.map((q) => `<div class="border rounded-lg p-4 mb-2"><h3 class="font-bold">${q.id}</h3><p>${q.mall} - ${q.time} - ${q.people} people</p></div>`).join('');
}

function renderStoreDashboard(data) {
  const s = scoped(data);
  const container = el('dashboard-container');
  if (!container) return;
  const client = supa();
  if (client) {
    renderStoreDashboardSupabase().catch(() => renderStoreDashboardLocal(data));
    return;
  }
  renderStoreDashboardLocal(data);
}

function renderStoreDashboardLocal(data) {
  const s = scoped(data);
  const container = el('dashboard-container');
  if (!container) return;
  container.innerHTML = `
    <div class="space-y-6"><h1 class="text-3xl font-bold">Store Manager Control Room</h1><div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div class="border rounded-lg p-4 bg-blue-50"><p class="text-sm text-muted-foreground">Total Sales</p><p class="text-2xl font-bold">${money(state.orders.reduce((sum, o) => sum + o.total, 0))}</p></div><div class="border rounded-lg p-4 bg-green-50"><p class="text-sm text-muted-foreground">Orders Today</p><p class="text-2xl font-bold">${state.orders.length}</p></div><div class="border rounded-lg p-4 bg-yellow-50"><p class="text-sm text-muted-foreground">Managed Products</p><p class="text-2xl font-bold">${s.products.length}</p></div><div class="border rounded-lg p-4 bg-purple-50"><p class="text-sm text-muted-foreground">Active Managers</p><p class="text-2xl font-bold">${state.managers.filter((m) => m.status === 'active').length}</p></div></div><div class="border rounded-xl p-4"><h2 class="text-xl font-bold mb-3">Inventory Backend Workbench</h2><form id="stock-form" class="space-y-3"><select id="stock-product">${s.products.slice(0, 100).map((p) => `<option value="${p.id}">${p.name} (${p.stockCount})</option>`).join('')}</select><input id="stock-count" type="number" min="0" placeholder="Set new stock count" required /><button type="submit" class="rounded-lg bg-primary px-4 py-2 text-white">Update Inventory</button></form></div></div>
  `;
  el('stock-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.stock[el('stock-product').value] = Number(el('stock-count').value);
    persist();
    renderStoreDashboard(data);
  });
}

function renderAdminDashboard(data) {
  const container = el('dashboard-container');
  if (!container) return;
  const client = supa();
  if (client) {
    renderAdminDashboardSupabase().catch(() => renderAdminDashboardLocal(data));
    return;
  }
  renderAdminDashboardLocal(data);
}

function renderAdminDashboardLocal(data) {
  const container = el('dashboard-container');
  if (!container) return;
  container.innerHTML = `
    <div class="space-y-6"><h1 class="text-3xl font-bold">Shopping Mall Admin Suite</h1><div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div class="border rounded-lg p-4 bg-blue-50"><p class="text-sm text-muted-foreground">Total Malls</p><p class="text-2xl font-bold">${data.malls.length}</p></div><div class="border rounded-lg p-4 bg-green-50"><p class="text-sm text-muted-foreground">Total Stores</p><p class="text-2xl font-bold">${data.stores.length}</p></div><div class="border rounded-lg p-4 bg-yellow-50"><p class="text-sm text-muted-foreground">Store Managers</p><p class="text-2xl font-bold">${state.managers.length}</p></div><div class="border rounded-lg p-4 bg-purple-50"><p class="text-sm text-muted-foreground">Total Orders</p><p class="text-2xl font-bold">${state.orders.length}</p></div></div><div class="grid grid-cols-1 xl:grid-cols-3 gap-6"><section class="border rounded-xl p-4"><h2 class="text-lg font-bold mb-3">Add New Mall</h2><form id="add-mall" class="space-y-3"><input id="mall-name" placeholder="Mall name" required /><input id="mall-location" placeholder="Area, City" required /><input id="mall-image" placeholder="Image URL" required /><input id="mall-floors" type="number" min="1" placeholder="Floors" /><button type="submit" class="rounded-lg bg-primary px-4 py-2 text-white">Create Mall</button></form></section><section class="border rounded-xl p-4"><h2 class="text-lg font-bold mb-3">Add Store</h2><form id="add-store" class="space-y-3"><select id="store-mall">${data.malls.map((m) => `<option value="${m.id}">${m.name}</option>`).join('')}</select><input id="store-name" placeholder="Store name" required /><input id="store-category" placeholder="Category" required /><input id="store-floor" placeholder="Floor" /><input id="store-image" placeholder="Image URL" required /><button type="submit" class="rounded-lg bg-primary px-4 py-2 text-white">Create Store</button></form></section><section class="border rounded-xl p-4"><h2 class="text-lg font-bold mb-3">Assign Store Manager</h2><form id="add-mgr" class="space-y-3"><input id="mgr-name" placeholder="Manager name" required /><input id="mgr-email" type="email" placeholder="manager@mall.com" required /><select id="mgr-mall">${data.malls.map((m) => `<option value="${m.id}">${m.name}</option>`).join('')}</select><select id="mgr-store">${data.stores.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select><button type="submit" class="rounded-lg bg-primary px-4 py-2 text-white">Assign Manager</button></form></section></div></div>
  `;

  el('add-mall')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.customMalls.unshift({ id: `cm-${Date.now()}`, name: el('mall-name').value, location: el('mall-location').value, image: el('mall-image').value, floors: Number(el('mall-floors').value || 3), rating: 4.2, storeCount: 0, description: 'New mall onboarded by shopping mall admin.', deliveryTime: '35 min' });
    persist();
    window.location.reload();
  });

  el('add-store')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.customStores.unshift({ id: `cs-${Date.now()}`, mallId: el('store-mall').value, name: el('store-name').value, category: el('store-category').value, floor: el('store-floor').value || '1st Floor', image: el('store-image').value, rating: 4.3, isOpen: true, productCount: 0 });
    persist();
    window.location.reload();
  });

  el('add-mgr')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.managers.unshift({ id: `mgr-${Date.now()}`, name: el('mgr-name').value, email: el('mgr-email').value, mallId: el('mgr-mall').value, storeId: el('mgr-store').value, status: 'active' });
    persist();
    window.location.reload();
  });
}

async function renderAdminDashboardSupabase() {
  const container = el('dashboard-container');
  if (!container) return;
  const client = supa();
  const user = await supaSessionUser();
  if (!client || !user) return;

  container.innerHTML = loadingState({ title: 'Loading admin dashboard…' });

  // Role gate (avoid confusing RLS errors)
  const { data: roleRow } = await client.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  const role = String(roleRow?.role || '');
  if (role !== 'admin') {
    container.innerHTML = `
      <div class="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 class="text-2xl font-bold">Admin access required</h1>
        <p class="text-sm text-muted-foreground mt-2">Your account is <b>${role || 'unknown'}</b>. Ask an admin to set your role in <code>user_roles</code> to <code>admin</code>.</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="index.html" class="rounded-lg border px-4 py-2 font-semibold hover:bg-muted">Home</a>
          <a href="login.html" class="rounded-lg bg-primary px-4 py-2 text-white font-semibold">Login</a>
        </div>
      </div>
    `;
    return;
  }

  const [
    { data: malls },
    { data: stores },
    { data: products },
    { data: tickets },
    { data: orders },
    { data: deliveries }
  ] = await Promise.all([
    client.from('malls').select('id,name,city').order('created_at', { ascending: false }),
    client.from('stores').select('id,name,city,mall_id,category').order('created_at', { ascending: false }),
    client.from('products').select('id,name,price_inr,store_id,is_active').order('created_at', { ascending: false }),
    client.from('support_tickets').select('id, created_at, status, type, refund_percent, message, order_id, user_id').order('created_at', { ascending: false }).limit(25),
    client.from('orders').select('id,status,total_inr,created_at').order('created_at', { ascending: false }).limit(200),
    client.from('deliveries').select('id,status,updated_at').order('updated_at', { ascending: false }).limit(200)
  ]);

  const ordersArr = Array.isArray(orders) ? orders : [];
  const deliveriesArr = Array.isArray(deliveries) ? deliveries : [];
  const countBy = (arr, key) => arr.reduce((m, x) => { const k = String(x[key] || ''); m[k] = (m[k] || 0) + 1; return m; }, {});
  const orderCounts = countBy(ordersArr, 'status');
  const deliveryCounts = countBy(deliveriesArr, 'status');
  const pendingRefunds = (tickets || []).filter((t) => String(t.type) === 'refund' && !['resolved', 'rejected'].includes(String(t.status))).length;

  container.innerHTML = `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">Shopping Mall Admin Suite</h1>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="border rounded-lg p-4 bg-blue-50"><p class="text-sm text-muted-foreground">Total Malls</p><p class="text-2xl font-bold">${malls?.length || 0}</p></div>
        <div class="border rounded-lg p-4 bg-green-50"><p class="text-sm text-muted-foreground">Total Stores</p><p class="text-2xl font-bold">${stores?.length || 0}</p></div>
        <div class="border rounded-lg p-4 bg-yellow-50"><p class="text-sm text-muted-foreground">Total Products</p><p class="text-2xl font-bold">${products?.length || 0}</p></div>
        <div class="border rounded-lg p-4 bg-purple-50"><p class="text-sm text-muted-foreground">Your Account</p><p class="text-sm font-semibold truncate">${user.email}</p></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="border rounded-lg p-4 bg-slate-50"><p class="text-sm text-muted-foreground">Orders (paid)</p><p class="text-2xl font-bold">${orderCounts.paid || 0}</p><p class="text-xs text-muted-foreground mt-1">Preparing ${orderCounts.preparing || 0} · Ongoing ${orderCounts.out_for_delivery || 0}</p></div>
        <div class="border rounded-lg p-4 bg-emerald-50"><p class="text-sm text-muted-foreground">Delivered</p><p class="text-2xl font-bold">${orderCounts.delivered || 0}</p><p class="text-xs text-muted-foreground mt-1">Last 200 orders</p></div>
        <div class="border rounded-lg p-4 bg-amber-50"><p class="text-sm text-muted-foreground">Refund tickets pending</p><p class="text-2xl font-bold">${pendingRefunds}</p><p class="text-xs text-muted-foreground mt-1">Open/triaging/approved</p></div>
        <div class="border rounded-lg p-4 bg-indigo-50"><p class="text-sm text-muted-foreground">Active deliveries</p><p class="text-2xl font-bold">${(deliveryCounts.in_transit || 0) + (deliveryCounts.out_for_delivery || 0)}</p><p class="text-xs text-muted-foreground mt-1">Created ${deliveryCounts.created || 0}</p></div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section class="border rounded-xl p-4">
          <h2 class="text-lg font-bold mb-3">Add New Mall</h2>
          <form id="sb-add-mall" class="space-y-3">
            <input id="sb-mall-name" placeholder="Mall name" required />
            <input id="sb-mall-city" placeholder="City" required />
            <input id="sb-mall-address" placeholder="Address (optional)" />
            <input id="sb-mall-image" placeholder="Image URL (optional)" />
            <textarea id="sb-mall-desc" placeholder="Description (optional)" rows="3"></textarea>
            <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-white">Create Mall</button>
          </form>
        </section>

        <section class="border rounded-xl p-4">
          <h2 class="text-lg font-bold mb-3">Add Store</h2>
          <form id="sb-add-store" class="space-y-3">
            <select id="sb-store-mall">
              <option value="">Independent store (no mall)</option>
              ${(malls || []).map((m) => `<option value="${m.id}">${m.name} (${m.city})</option>`).join('')}
            </select>
            <input id="sb-store-name" placeholder="Store name" required />
            <input id="sb-store-city" placeholder="City" required />
            <input id="sb-store-category" placeholder="Category" />
            <input id="sb-store-floor" placeholder="Floor (optional)" />
            <input id="sb-store-image" placeholder="Image URL (optional)" />
            <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-white">Create Store</button>
          </form>
        </section>

        <section class="border rounded-xl p-4">
          <h2 class="text-lg font-bold mb-3">Add Product</h2>
          <form id="sb-add-product" class="space-y-3">
            <select id="sb-product-store" required>
              ${(stores || []).map((s) => `<option value="${s.id}">${s.name} (${s.city})</option>`).join('')}
            </select>
            <input id="sb-product-name" placeholder="Product name" required />
            <input id="sb-product-category" placeholder="Category" />
            <input id="sb-product-price" type="number" min="0" placeholder="Price (INR)" required />
            <input id="sb-product-image" placeholder="Image URL (optional)" />
            <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-white">Create Product</button>
          </form>
        </section>
      </div>

      <section class="border rounded-xl p-4">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h2 class="text-lg font-bold">Support tickets</h2>
          <button id="sb-refresh-tickets" class="rounded-lg border px-3 py-2 text-sm font-semibold">Refresh</button>
        </div>
        <div class="space-y-3">
          ${(tickets || []).length ? (tickets || []).map((t) => `
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">${new Date(t.created_at).toLocaleString()}</p>
                  <p class="font-semibold truncate">Ticket ${t.id}</p>
                  <p class="text-sm text-muted-foreground">Order: <span class="font-mono">${t.order_id || '-'}</span></p>
                  <p class="text-sm">${String(t.message || '').slice(0, 180)}</p>
                </div>
                <div class="flex flex-col gap-2 md:items-end">
                  <div class="flex items-center gap-2 justify-end">
                    <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${t.status === 'open' ? 'bg-amber-50 text-amber-700 border-amber-200' : t.status === 'approved' ? 'bg-amber-50 text-amber-700 border-amber-200' : t.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : t.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}">${t.status}</span>
                    <select class="rounded-lg border px-2 py-1 text-xs" data-ticket-status="${t.id}" data-ticket-type="${t.type || ''}" data-ticket-order="${t.order_id || ''}">
                      ${['open','triaging','approved','rejected','resolved'].map((s) => `<option value="${s}" ${String(t.status)===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                  </div>
                  ${t.type === 'refund' ? `
                    <div class="flex items-center gap-2">
                      <input class="rounded-lg border px-2 py-1 text-sm w-[88px]" type="number" min="0" max="100" value="${Number(t.refund_percent ?? 100)}" data-refund-pct="${t.id}" />
                      <button class="sb-refund-btn rounded-lg bg-primary px-3 py-2 text-white text-sm font-semibold" data-ticket="${t.id}" data-order="${t.order_id || ''}">Refund</button>
                    </div>
                  ` : `
                    <button class="sb-resolve-btn rounded-lg border px-3 py-2 text-sm font-semibold" data-ticket="${t.id}">Mark resolved</button>
                  `}
                </div>
              </div>
            </div>
          `).join('') : '<div class="text-sm text-muted-foreground">No recent tickets.</div>'}
        </div>
      </section>
    </div>
  `;

  el('sb-add-mall')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await client.from('malls').insert({
      name: el('sb-mall-name').value,
      city: el('sb-mall-city').value,
      address: el('sb-mall-address').value || null,
      image_url: el('sb-mall-image').value || null,
      description: el('sb-mall-desc').value || null
    });
    if (error) return toast(error.message, { type: 'bad', title: 'Admin' });
    toast('Mall created.', { type: 'ok', title: 'Admin' });
    renderAdminDashboardSupabase();
  });

  el('sb-add-store')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mallId = el('sb-store-mall').value || null;
    const { error } = await client.from('stores').insert({
      mall_id: mallId,
      name: el('sb-store-name').value,
      city: el('sb-store-city').value,
      category: el('sb-store-category').value || null,
      floor: el('sb-store-floor').value || null,
      image_url: el('sb-store-image').value || null,
      is_open: true
    });
    if (error) return toast(error.message, { type: 'bad', title: 'Admin' });
    toast('Store created.', { type: 'ok', title: 'Admin' });
    renderAdminDashboardSupabase();
  });

  el('sb-add-product')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const storeId = el('sb-product-store').value;
    const store = (stores || []).find((s) => s.id === storeId);
    const { error } = await client.from('products').insert({
      store_id: storeId,
      mall_id: store?.mall_id || null,
      name: el('sb-product-name').value,
      category: el('sb-product-category').value || null,
      price_inr: Number(el('sb-product-price').value || 0),
      image_url: el('sb-product-image').value || null,
      is_active: true
    });
    if (error) return toast(error.message, { type: 'bad', title: 'Admin' });
    toast('Product created.', { type: 'ok', title: 'Admin' });
    renderAdminDashboardSupabase();
  });

  el('sb-refresh-tickets')?.addEventListener('click', () => renderAdminDashboardSupabase());

  container.querySelectorAll('[data-ticket-status]').forEach((sel) => sel.addEventListener('change', async () => {
    const id = String(sel.getAttribute('data-ticket-status') || '');
    const next = String(sel.value || 'open');
    const type = String(sel.getAttribute('data-ticket-type') || '');
    const orderId = String(sel.getAttribute('data-ticket-order') || '');
    if (!id) return;
    if (!['open', 'triaging', 'approved', 'rejected', 'resolved'].includes(next)) return;
    if (next === 'approved' && type === 'refund' && !orderId) return toast('Cannot approve refund ticket without an order id.', { type: 'bad', title: 'Support' });
    const { error } = await client.from('support_tickets').update({ status: next }).eq('id', id);
    if (error) return toast(error.message, { type: 'bad', title: 'Support' });
    toast('Ticket updated.', { type: 'ok', title: 'Support' });
    renderAdminDashboardSupabase();
  }));

  container.querySelectorAll('.sb-resolve-btn').forEach((b) => b.addEventListener('click', async () => {
    const id = String(b.getAttribute('data-ticket') || '');
    const { error } = await client.from('support_tickets').update({ status: 'resolved' }).eq('id', id);
    if (error) return toast(error.message, { type: 'bad', title: 'Support' });
    toast('Ticket resolved.', { type: 'ok', title: 'Support' });
    renderAdminDashboardSupabase();
  }));

  container.querySelectorAll('.sb-refund-btn').forEach((b) => b.addEventListener('click', async () => {
    const ticketId = String(b.getAttribute('data-ticket') || '');
    const orderId = String(b.getAttribute('data-order') || '');
    const pct = Number(container.querySelector(`[data-refund-pct="${ticketId}"]`)?.value || 100);
    if (!orderId) return toast('Missing order id on ticket.', { type: 'bad', title: 'Refund' });
    const functionsBase = window.MM_SUPABASE?.functionsBaseUrl?.() || '';
    if (!functionsBase) return toast('Missing functions URL.', { type: 'bad', title: 'Refund' });
    const { data } = await client.auth.getSession();
    const token = data?.session?.access_token || '';
    if (!token) return toast('Login required.', { type: 'bad', title: 'Refund' });

    toast('Submitting refund…', { type: 'ok', title: 'Refund', ms: 1400 });
    const resp = await fetch(`${functionsBase}/refund-order`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ order_id: orderId, support_ticket_id: ticketId, refund_percent: pct })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return toast(json?.error || 'Refund failed.', { type: 'bad', title: 'Refund' });
    toast(`Refund started: ${json.amount_inr} INR`, { type: 'ok', title: 'Refund' });
    renderAdminDashboardSupabase();
  }));
}

async function renderStoreDashboardSupabase() {
  const container = el('dashboard-container');
  if (!container) return;
  const client = supa();
  const user = await supaSessionUser();
  if (!client || !user) return;

  container.innerHTML = loadingState({ title: 'Loading store dashboard…' });

  const { data: roleRow } = await client.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  const role = String(roleRow?.role || '');
  if (!['store_manager', 'admin'].includes(role)) {
    container.innerHTML = `
      <div class="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 class="text-2xl font-bold">Store access required</h1>
        <p class="text-sm text-muted-foreground mt-2">Your account is <b>${role || 'unknown'}</b>. Ask an admin to set your role in <code>user_roles</code> to <code>store_manager</code> (or <code>admin</code>).</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="index.html" class="rounded-lg border px-4 py-2 font-semibold hover:bg-muted">Home</a>
          <a href="login.html" class="rounded-lg bg-primary px-4 py-2 text-white font-semibold">Login</a>
        </div>
      </div>
    `;
    return;
  }

  // v1: show inventory editor for all products (admin-only updates are enforced by RLS)
  const { data: products } = await client
    .from('products')
    .select('id,name,price_inr,inventory(available_qty,reserved_qty)')
    .order('created_at', { ascending: false })
    .limit(200);

  container.innerHTML = `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">Store Manager Control Room</h1>
      <div class="border rounded-xl p-4">
        <h2 class="text-xl font-bold mb-3">Inventory</h2>
        <form id="sb-stock-form" class="space-y-3">
          <select id="sb-stock-product" required>
            ${(products || []).map((p) => {
              const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
              const qty = inv?.available_qty ?? 0;
              return `<option value="${p.id}">${p.name} (stock: ${qty})</option>`;
            }).join('')}
          </select>
          <input id="sb-stock-count" type="number" min="0" placeholder="Set available stock" required />
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-white">Update Inventory</button>
        </form>
        <p class="text-xs text-muted-foreground mt-2">If this fails, assign your user the admin role in <code>user_roles</code> (RLS).</p>
      </div>
    </div>
  `;

  el('sb-stock-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = el('sb-stock-product').value;
    const next = Number(el('sb-stock-count').value || 0);
    const { error } = await client.from('inventory').upsert({ product_id: pid, available_qty: next, reserved_qty: 0 });
    if (error) return toast(error.message, { type: 'bad', title: 'Inventory' });
    toast('Inventory updated.', { type: 'ok', title: 'Inventory' });
    renderStoreDashboardSupabase();
  });
}

function renderWalkthrough(data) {
  const container = el('walkthrough-container');
  if (!container) return;
  const s = scoped(data);
  const mallId = new URLSearchParams(location.search).get('mallId') || s.malls[0]?.id;
  const mall = s.malls.find((m) => m.id === mallId);
  if (!mall) return (container.innerHTML = '<div class="text-center py-12"><p>No mall available for selected location.</p></div>');
  const stores = s.stores.filter((x) => x.mallId === mall.id);
  container.innerHTML = `
    <section class="space-y-6"><div class="rounded-2xl border bg-white p-5 shadow-sm"><h1 class="text-3xl font-bold">${mall.name} Walkthrough</h1><p class="text-sm text-slate-600">${mall.location} - Shopping in ${state.location || 'All India'}</p></div><div class="walkthrough-stage"><img src="${mall.image}" alt="${escapeHtml(mall.name)}" class="walkthrough-image" loading="lazy" decoding="async" /><div class="walkthrough-overlay"></div><div class="walkthrough-content"><h2 class="text-2xl font-bold">Explore the mall virtually</h2><p class="text-sm text-slate-200">Move through stores and jump to products.</p></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${stores.map((st) => `<div class="rounded-xl border p-3"><p class="font-semibold">${escapeHtml(st.name)}</p><p class="text-xs text-muted-foreground">${escapeHtml(st.category)} - ${escapeHtml(st.floor)}</p><a href="products.html?search=${encodeURIComponent(st.name)}" class="text-xs rounded-md border px-2 py-1 hover:bg-muted">View Products</a></div>`).join('')}</div></section>
  `;
}

async function renderScanReceiptPage() {
  const container = el('scan-receipt-container');
  if (!container) return;

  const client = supa();
  if (!client) {
    container.innerHTML = '<div class="rounded-2xl border border-border bg-card p-5"><p class="font-semibold">Supabase not configured</p><p class="text-sm text-muted-foreground mt-1">Set keys in <code>assets/js/config.js</code> to enable Scan&Go receipts.</p></div>';
    return;
  }

  const { data: userData } = await client.auth.getUser();
  if (!userData?.user) {
    container.innerHTML = '<div class="rounded-2xl border border-border bg-card p-5"><p class="font-semibold">Please sign in</p><p class="text-sm text-muted-foreground mt-1">Login is required to view your receipt.</p><a href="login.html" class="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-white font-semibold">Login</a></div>';
    return;
  }

  const stripeSessionId = new URLSearchParams(location.search).get('session_id') || '';
  if (!stripeSessionId) {
    container.innerHTML = '<div class="rounded-2xl border border-border bg-card p-5"><p class="font-semibold">Missing session</p><p class="text-sm text-muted-foreground mt-1">Open this page from the payment success redirect.</p></div>';
    return;
  }

  const { data: receipt } = await client
    .from('scan_receipts')
    .select('id, token, total_inr, created_at, verified_at')
    .eq('stripe_checkout_session_id', stripeSessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!receipt?.token) {
    container.innerHTML = `
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="font-semibold">Receipt is being generated…</p>
        <p class="text-sm text-muted-foreground mt-1">If you just paid, wait a few seconds and refresh.</p>
        <button id="sr-refresh" class="mt-4 rounded-lg border px-4 py-2 font-semibold">Refresh</button>
      </div>
    `;
    el('sr-refresh')?.addEventListener('click', () => location.reload());
    return;
  }

  const base = location.href.replace(/[#?].*$/, '').replace(/scan-receipt\.html$/, '');
  const verifyUrl = `${base}verify-receipt.html?token=${encodeURIComponent(receipt.token)}`;

  container.innerHTML = `
    <div class="rounded-2xl border border-border bg-card p-5 shadow-card max-w-xl">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs text-muted-foreground">Receipt Token</p>
            <p class="font-mono text-sm mt-1 break-all">${escapeHtml(receipt.token)}</p>
          <p class="mt-3 text-lg font-extrabold">Total ${money(receipt.total_inr || 0)}</p>
          <p class="text-xs text-muted-foreground mt-1">${receipt.verified_at ? 'Verified at exit' : 'Not verified yet'}</p>
        </div>
        <canvas id="mm-receipt-qr" class="h-[240px] w-[240px] rounded-xl border border-border bg-white p-2"></canvas>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <a class="rounded-lg bg-primary px-4 py-2 text-white font-semibold" href="scan.html">Back to Scan</a>
        <a class="rounded-lg border px-4 py-2 font-semibold" href="${verifyUrl}">Open verifier</a>
      </div>
    </div>
  `;

  // Offline-safe QR generation (no external calls)
  try {
    const c = document.getElementById('mm-receipt-qr');
    if (c && window.MM_QR?.draw) window.MM_QR.draw(c, verifyUrl, 240);
  } catch {}
}

async function renderVerifyReceiptPage() {
  const startBtn = el('vr-start');
  const video = el('vr-video');
  const status = el('vr-status');
  const tokenInput = el('vr-token');
  const verifyBtn = el('vr-verify');
  const result = el('vr-result');
  if (!startBtn || !video || !status || !tokenInput || !verifyBtn || !result) return;

  const client = supa();
  if (!client) {
    result.innerHTML = '<div class="rounded-xl border border-border bg-muted p-4 text-sm">Supabase not configured.</div>';
    return;
  }

  const { data: userData } = await client.auth.getUser();
  if (!userData?.user) {
    result.innerHTML = '<div class="rounded-xl border border-border bg-muted p-4 text-sm">Please login as staff/admin to verify.</div><a class="inline-flex mt-3 rounded-lg bg-primary px-4 py-2 text-white font-semibold" href="login.html">Login</a>';
    return;
  }

  const { data: roleRow } = await client.from('user_roles').select('role').eq('user_id', userData.user.id).maybeSingle();
  const role = String(roleRow?.role || '');
  if (!['store_manager', 'admin'].includes(role)) {
    result.innerHTML = '<div class="rounded-xl border border-border bg-muted p-4 text-sm">Your account is not staff/admin. Ask admin to set your role in <code>user_roles</code>.</div>';
    return;
  }

  const qpToken = new URLSearchParams(location.search).get('token') || '';
  if (qpToken) tokenInput.value = qpToken;

  async function verifyToken(token) {
    const t = String(token || '').trim();
    if (!t) return toast('Missing token', { type: 'bad', title: 'Verify' });

    const { data: row } = await client
      .from('scan_receipts')
      .select('id, total_inr, created_at, verified_at, verified_by')
      .eq('token', t)
      .limit(1)
      .maybeSingle();

    if (!row?.id) {
      result.innerHTML = '<div class="rounded-xl border border-border bg-muted p-4 text-sm">Receipt not found.</div>';
      return;
    }

    if (row.verified_at) {
      result.innerHTML = `
        <div class="rounded-xl border border-border bg-muted p-4 text-sm">
          <p class="font-semibold">Already verified</p>
          <p class="mt-1 text-muted-foreground">Total ${money(row.total_inr || 0)}</p>
          <p class="mt-1 text-xs text-muted-foreground">Verified at ${new Date(row.verified_at).toLocaleString()}</p>
        </div>
      `;
      toast('Already verified', { type: 'ok', title: 'Verify' });
      return;
    }

    // Prevent double-verify races: only update when verified_at is still null
    const { data: updated, error } = await client
      .from('scan_receipts')
      .update({ verified_at: new Date().toISOString(), verified_by: userData.user.id })
      .eq('id', row.id)
      .is('verified_at', null)
      .select('id, total_inr, verified_at')
      .maybeSingle();

    if (error) {
      toast(error.message, { type: 'bad', title: 'Verify' });
      return;
    }

    if (!updated?.id) {
      // Someone else verified it between read and update.
      toast('Already verified', { type: 'ok', title: 'Verify' });
      return verifyToken(t);
    }

    result.innerHTML = `
      <div class="rounded-xl border border-border bg-muted p-4 text-sm">
        <p class="font-semibold">Verified</p>
        <p class="mt-1 text-muted-foreground">Total ${money(updated.total_inr || 0)}</p>
        <p class="mt-1 text-xs text-muted-foreground">Verified at ${new Date(updated.verified_at).toLocaleString()}</p>
      </div>
    `;
    toast('Receipt verified', { type: 'ok', title: 'Verify' });
  }

  verifyBtn.addEventListener('click', () => verifyToken(tokenInput.value));

  // Camera QR scan (parses token=... from URL)
  let stream = null;
  startBtn.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = 'Camera not supported. Use manual token.';
      return;
    }
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
      status.textContent = 'Camera started. Scanning…';

      if (!('BarcodeDetector' in window)) {
        status.textContent = 'BarcodeDetector not available. Use manual token.';
        return;
      }
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const loop = async () => {
        if (!stream) return;
        try {
          const codes = await detector.detect(video);
          const raw = codes?.[0]?.rawValue || '';
          if (raw) {
            const m = String(raw).match(/[?&]token=([^&#]+)/i);
            const tok = m ? decodeURIComponent(m[1]) : String(raw).trim();
            tokenInput.value = tok;
            await verifyToken(tok);
            status.textContent = 'Verified. You can scan the next receipt.';
            await new Promise((r) => setTimeout(r, 900));
          }
        } catch {}
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch {
      status.textContent = 'Could not start camera. Check permissions.';
    }
  });
}

async function renderOrderDetailPage() {
  const container = el('order-detail');
  if (!container) return;
  const orderId = new URLSearchParams(location.search).get('id') || '';
  if (!orderId) {
    container.innerHTML = emptyState({ title: 'Missing order id', subtitle: 'Open this page from Orders.' });
    return;
  }

  const client = supa();
  if (!client) {
    const o = state.orders.find((x) => String(x.id) === String(orderId));
    if (!o) {
      container.innerHTML = emptyState({ title: 'Order not found', subtitle: 'This order is not available on this device.' });
      return;
    }
    container.innerHTML = `
      <div class="mm-stack">
        <div class="mm-card mm-card-pad">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">Order</p>
              <p class="text-lg font-extrabold break-all">${o.id}</p>
              <p class="text-xs text-muted-foreground mt-1">${new Date(o.date).toLocaleString()}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground">Status</p>
              <p class="font-extrabold">${o.status}</p>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" id="od-reorder" class="mm-action mm-action-outline">Reorder</button>
            <a href="cart.html" class="mm-action mm-action-ghost">Open cart</a>
            <a href="support.html?order_id=${encodeURIComponent(String(o.id))}&type=refund" class="mm-action mm-action-primary">Get help</a>
          </div>
        </div>
        <div class="mm-card mm-card-pad">
          <p class="font-extrabold mb-3">Items</p>
          <div class="space-y-2">
            ${(o.items || []).map((it) => `
              <div class="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
                <div class="min-w-0">
                  <p class="font-semibold truncate">${it.name}</p>
                  <p class="text-xs text-muted-foreground">${money(it.price)} × ${it.quantity || 1}</p>
                </div>
                <p class="font-extrabold">${money(Number(it.price || 0) * Number(it.quantity || 1))}</p>
              </div>
            `).join('')}
          </div>
          <div class="mt-3 flex items-center justify-between text-sm">
            <p class="font-semibold">Total</p>
            <p class="font-extrabold">${money(o.total || 0)}</p>
          </div>
        </div>
      </div>
    `;
    el('od-reorder')?.addEventListener('click', () => {
      if (!o?.items?.length) return toast('No items to reorder.', { type: 'bad', title: 'Reorder' });
      state.cart = o.items.map((x) => ({ ...x }));
      persist();
      renderNavbar();
      toast('Added items to cart.', { type: 'ok', title: 'Reorder' });
      window.location.href = 'cart.html';
    });
    return;
  }

  container.innerHTML = loadingState({ title: 'Loading order…' });
  const user = await supaSessionUser();
  if (!user) return (window.location.href = 'login.html');

  const [{ data: order }, { data: items }, { data: events }] = await Promise.all([
    client.from('orders').select('id, created_at, status, subtotal_inr, tax_inr, total_inr, deliveries(id,tracking_id,status,eta_minutes,updated_at)').eq('id', orderId).maybeSingle(),
    client.from('order_items').select('id, name, unit_price_inr, qty, product_id').eq('order_id', orderId).order('id', { ascending: true }),
    client.from('order_events').select('id, event, payload, created_at').eq('order_id', orderId).order('created_at', { ascending: false }).limit(50)
  ]);

  if (!order?.id) {
    container.innerHTML = emptyState({ title: 'Order not found', subtitle: 'This order may not exist or you may not have access.' });
    return;
  }

  const d = Array.isArray(order.deliveries) ? order.deliveries[0] : order.deliveries;
  container.innerHTML = `
    <div class="mm-stack">
      <div class="mm-card mm-card-pad">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Order</p>
            <p class="text-lg font-extrabold break-all">${order.id}</p>
            <p class="text-xs text-muted-foreground mt-1">${new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted-foreground">Status</p>
            <p class="font-extrabold">${order.status}</p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" id="od-reorder" class="mm-action mm-action-outline">Reorder</button>
          <a href="cart.html" class="mm-action mm-action-ghost">Open cart</a>
          <a href="support.html?order_id=${encodeURIComponent(String(order.id))}&type=refund" class="mm-action mm-action-primary">Get help</a>
        </div>
      </div>

      <div class="mm-card mm-card-pad">
        <p class="font-extrabold mb-3">Delivery</p>
        ${d?.tracking_id ? `
          <div class="rounded-xl border border-border p-3 text-sm">
            <p><b>Tracking:</b> <span class="font-mono">${d.tracking_id}</span></p>
            <p><b>Status:</b> ${d.status || '-'}</p>
            <p><b>ETA:</b> ${d.eta_minutes ? `${d.eta_minutes} min` : '-'}</p>
            <p class="text-xs text-muted-foreground mt-1">Updated ${d.updated_at ? new Date(d.updated_at).toLocaleString() : '-'}</p>
          </div>
        ` : `<p class="text-sm text-muted-foreground">Delivery will appear here once created.</p>`}
      </div>

      <div class="mm-card mm-card-pad">
        <p class="font-extrabold mb-3">Items</p>
        <div class="space-y-2">
          ${(items || []).map((it) => `
            <div class="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <div class="min-w-0">
                <p class="font-semibold truncate">${it.name}</p>
                <p class="text-xs text-muted-foreground">${money(it.unit_price_inr || 0)} × ${it.qty || 1}</p>
              </div>
              <p class="font-extrabold">${money(Number(it.unit_price_inr || 0) * Number(it.qty || 1))}</p>
            </div>
          `).join('') || `<p class="text-sm text-muted-foreground">No items found.</p>`}
        </div>
        <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div class="rounded-xl border border-border p-3"><p class="text-xs text-muted-foreground">Subtotal</p><p class="font-extrabold">${money(order.subtotal_inr || 0)}</p></div>
          <div class="rounded-xl border border-border p-3"><p class="text-xs text-muted-foreground">Tax</p><p class="font-extrabold">${money(order.tax_inr || 0)}</p></div>
          <div class="rounded-xl border border-border p-3"><p class="text-xs text-muted-foreground">Total</p><p class="font-extrabold">${money(order.total_inr || 0)}</p></div>
        </div>
      </div>

      <div class="mm-card mm-card-pad">
        <p class="font-extrabold mb-3">Timeline</p>
        <div class="space-y-2">
          ${(events || []).map((ev) => `
            <div class="rounded-xl border border-border p-3 text-sm">
              <div class="flex items-start justify-between gap-3">
                <p class="font-semibold">${escapeHtml(String(ev.event || '').replace(/_/g, ' '))}</p>
                <p class="text-xs text-muted-foreground">${new Date(ev.created_at).toLocaleString()}</p>
              </div>
              ${ev.payload ? `<pre class="mt-2 text-xs overflow-auto bg-white border border-border rounded-lg p-2">${escapeHtml(JSON.stringify(ev.payload, null, 2))}</pre>` : ''}
            </div>
          `).join('') || `<p class="text-sm text-muted-foreground">No events yet.</p>`}
        </div>
      </div>
    </div>
  `;

  el('od-reorder')?.addEventListener('click', () => {
    const its = Array.isArray(items) ? items : [];
    if (!its.length) return toast('No items to reorder.', { type: 'bad', title: 'Reorder' });
    // Add items to cart by name/price (product_id not required for checkout fallback; Stripe checkout uses name/amount)
    for (const it of its) {
      const id = String(it.product_id || it.name || `custom-${Math.random().toString(36).slice(2, 9)}`);
      const existing = state.cart.find((x) => String(x.id) === id);
      if (existing) existing.quantity = (existing.quantity || 1) + Number(it.qty || 1);
      else state.cart.push({ id, name: it.name, price: Number(it.unit_price_inr || 0), image: '', quantity: Number(it.qty || 1) });
    }
    persist();
    renderNavbar();
    toast('Added items to cart.', { type: 'ok', title: 'Reorder' });
    window.location.href = 'cart.html';
  });
}

async function renderSupportCenter() {
  const container = el('support-container');
  if (!container) return;
  const client = supa();
  if (!client) {
    container.innerHTML = emptyState({
      title: 'Support requires Supabase',
      subtitle: 'Configure Supabase to see your tickets and statuses.'
    });
    return;
  }
  const user = await supaSessionUser();
  if (!user) return (window.location.href = 'login.html');

  container.innerHTML = loadingState({ title: 'Loading your tickets…' });

  const qp = new URLSearchParams(location.search);
  const prefillOrderId = String(qp.get('order_id') || '').trim();
  const prefillType = String(qp.get('type') || '').trim();
  const prefillMsg = String(qp.get('msg') || '').trim();

  const { data: tickets } = await client
    .from('support_tickets')
    .select('id, created_at, status, type, refund_percent, message, order_id')
    .order('created_at', { ascending: false })
    .limit(100);

  const badge = (s) => {
    const st = String(s || 'open');
    const cls = st === 'resolved'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : st === 'approved'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : st === 'rejected'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : st === 'triaging'
      ? 'bg-slate-100 text-slate-700 border-slate-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';
    return `<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${cls}">${st}</span>`;
  };

  const statusHelp = () => `
    <div class="rounded-2xl border border-border bg-card p-4">
      <p class="font-extrabold">Ticket status meanings</p>
      <div class="mt-3 grid gap-2 text-sm">
        <div class="rounded-xl border border-border bg-muted p-3"><b>open</b> · Submitted and waiting for triage.</div>
        <div class="rounded-xl border border-border bg-muted p-3"><b>triaging</b> · Agent is reviewing details and may request more info.</div>
        <div class="rounded-xl border border-border bg-muted p-3"><b>approved</b> · Approved for refund/credit (processing may take time).</div>
        <div class="rounded-xl border border-border bg-muted p-3"><b>rejected</b> · Not eligible (reason may be in the message).</div>
        <div class="rounded-xl border border-border bg-muted p-3"><b>resolved</b> · Completed.</div>
      </div>
    </div>
  `;

  const createBox = () => `
    <div class="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-muted-foreground">Need help?</p>
          <p class="text-lg font-extrabold">Create a support ticket</p>
          <p class="text-xs text-muted-foreground mt-1">Refunds, missing items, damaged items, delivery issues.</p>
        </div>
        <button type="button" id="st-toggle" class="mm-action mm-action-outline mm-action-sm">New ticket</button>
      </div>
      <form id="st-form" class="mt-4 hidden space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div class="md:col-span-5">
            <label class="text-xs font-semibold text-slate-700" for="st-type">Issue type</label>
            <select id="st-type" class="mt-1 w-full rounded-xl border px-3.5 py-2.5">
              <option value="refund">Refund request</option>
              <option value="missing_item">Missing item</option>
              <option value="damaged">Damaged item</option>
              <option value="late_delivery">Late delivery</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="md:col-span-4">
            <label class="text-xs font-semibold text-slate-700" for="st-order">Order (optional)</label>
            <input id="st-order" class="mt-1 w-full rounded-xl border px-3.5 py-2.5" placeholder="Order id (e.g. ORD-...)" value="${escapeHtml(prefillOrderId)}" />
          </div>
          <div class="md:col-span-3" id="st-refund-wrap">
            <label class="text-xs font-semibold text-slate-700" for="st-refund">Refund %</label>
            <input id="st-refund" type="number" min="0" max="100" step="5" class="mt-1 w-full rounded-xl border px-3.5 py-2.5" value="70" />
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-700" for="st-msg">Message</label>
          <textarea id="st-msg" class="mt-1 w-full rounded-xl border px-3.5 py-2.5" rows="4" placeholder="Tell us what happened (what, when, which items).">${escapeHtml(prefillMsg)}</textarea>
          <p class="text-xs text-muted-foreground mt-2">Tip: include item names and photos reference if available.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="mm-action mm-action-primary">Submit ticket</button>
          <button type="button" id="st-cancel" class="mm-action mm-action-ghost">Cancel</button>
        </div>
      </form>
    </div>
  `;

  container.innerHTML = `
    <div class="mm-stack">
      ${createBox()}
      ${statusHelp()}

      <div class="mm-card mm-card-pad">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <p class="text-xs text-muted-foreground">History</p>
            <p class="font-extrabold">Your tickets</p>
          </div>
          <a href="notifications.html" class="mm-action mm-action-ghost mm-action-sm">Open updates</a>
        </div>
        <div class="space-y-2">
          ${(tickets?.length ? tickets : []).map((t) => `
            <div class="rounded-2xl border border-border bg-card p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">${new Date(t.created_at).toLocaleString()}</p>
                  <p class="font-extrabold truncate">Ticket ${t.id}</p>
                  <p class="text-sm text-muted-foreground">Type: <b>${escapeHtml(String(t.type || 'other'))}</b>${t.refund_percent != null ? ` · Refund ${Number(t.refund_percent)}%` : ''}</p>
                  <p class="text-sm mt-2">${escapeHtml(String(t.message || ''))}</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    ${t.order_id ? `<a class="mm-action mm-action-outline mm-action-sm" href="order.html?id=${encodeURIComponent(String(t.order_id))}">View order</a>` : ''}
                  </div>
                </div>
                <div class="shrink-0">${badge(t.status)}</div>
              </div>
            </div>
          `).join('') || `<div class="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">No tickets yet. Create your first ticket above.</div>`}
        </div>
      </div>
    </div>
  `;

  // Ticket creation bindings
  const toggleBtn = el('st-toggle');
  const form = el('st-form');
  const typeSel = el('st-type');
  const orderIn = el('st-order');
  const refundWrap = el('st-refund-wrap');
  const refundIn = el('st-refund');
  const msgIn = el('st-msg');
  const cancelBtn = el('st-cancel');

  const openForm = () => {
    form?.classList.remove('hidden');
    toggleBtn?.setAttribute('aria-expanded', 'true');
  };
  const closeForm = () => {
    form?.classList.add('hidden');
    toggleBtn?.setAttribute('aria-expanded', 'false');
  };

  // Prefill from URL
  if (typeSel && prefillType) typeSel.value = prefillType;
  if (prefillOrderId || prefillType || prefillMsg) openForm();

  const syncRefundVisibility = () => {
    const t = String(typeSel?.value || 'refund');
    const show = t === 'refund';
    refundWrap?.classList.toggle('hidden', !show);
  };
  typeSel?.addEventListener('change', syncRefundVisibility);
  syncRefundVisibility();

  toggleBtn?.addEventListener('click', () => {
    const isHidden = form?.classList.contains('hidden');
    if (isHidden) openForm();
    else closeForm();
  });
  cancelBtn?.addEventListener('click', closeForm);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = String(typeSel?.value || 'other');
    const orderId = String(orderIn?.value || '').trim() || null;
    const msg = String(msgIn?.value || '').trim();
    const refundPct = type === 'refund' ? Math.max(0, Math.min(100, Number(refundIn?.value || 0))) : null;
    if (!msg) return toast('Please enter a message.', { type: 'bad', title: 'Support' });

    const payload = {
      user_id: user.id,
      order_id: orderId,
      type,
      refund_percent: refundPct,
      message: msg,
      status: 'open'
    };

    const { error } = await client.from('support_tickets').insert(payload);
    if (error) return toast(error.message, { type: 'bad', title: 'Support' });
    toast('Ticket submitted.', { type: 'ok', title: 'Support', ms: 1400 });
    // Clean URL prefill params after submit
    try {
      const u = new URL(location.href);
      u.searchParams.delete('order_id');
      u.searchParams.delete('type');
      u.searchParams.delete('msg');
      history.replaceState({}, '', u.toString());
    } catch {}
    await renderSupportCenter();
  });
}

async function renderNotificationsPage() {
  const container = el('notif-container');
  if (!container) return;
  const client = supa();
  if (!client) {
    container.innerHTML = emptyState({ title: 'Notifications need Supabase', subtitle: 'Configure Supabase to receive realtime updates.' });
    return;
  }
  const user = await supaSessionUser();
  if (!user) return (window.location.href = 'login.html');

  container.innerHTML = loadingState({ title: 'Loading updates…' });

  const [eventsRes, receiptsRes, ticketsRes] = await Promise.all([
    client.from('order_events').select('id, order_id, event, payload, created_at').order('created_at', { ascending: false }).limit(40),
    client.from('scan_receipts').select('id, token, total_inr, created_at, verified_at').order('created_at', { ascending: false }).limit(20),
    client.from('support_tickets').select('id, order_id, status, type, refund_percent, created_at').order('created_at', { ascending: false }).limit(20)
  ]);
  const events = eventsRes?.data || [];
  const receipts = receiptsRes?.data || [];
  const tickets = ticketsRes?.data || [];

  if (!events.length && !receipts.length && !tickets.length) {
    container.innerHTML = emptyState({ title: 'No notifications yet', subtitle: 'Once you place orders or use Scan&Go, updates will show here.', href: 'products.html', cta: 'Start shopping', icon: icon('bell') });
    return;
  }

  // Unread model (local-first): store read IDs by type.
  const READ_KEY = 'mm_notif_read_v1';
  const readState = () => {
    try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; }
  };
  const writeState = (v) => { try { localStorage.setItem(READ_KEY, JSON.stringify(v || {})); } catch {} };
  const s0 = readState();
  const isRead = (type, id) => Boolean(s0?.[type]?.[String(id)]);
  const markRead = (type, id) => {
    const s = readState();
    if (!s[type]) s[type] = {};
    s[type][String(id)] = Date.now();
    writeState(s);
  };
  const markAllRead = () => {
    const s = readState();
    for (const e of events) { if (e?.id != null) { if (!s.order_events) s.order_events = {}; s.order_events[String(e.id)] = Date.now(); } }
    for (const r of receipts) { if (r?.id != null) { if (!s.scan_receipts) s.scan_receipts = {}; s.scan_receipts[String(r.id)] = Date.now(); } }
    for (const t of tickets) { if (t?.id != null) { if (!s.support_tickets) s.support_tickets = {}; s.support_tickets[String(t.id)] = Date.now(); } }
    writeState(s);
  };

  const unreadEvents = events.filter((e) => e?.id != null && !isRead('order_events', e.id)).length;
  const unreadReceipts = receipts.filter((r) => r?.id != null && !isRead('scan_receipts', r.id)).length;
  const unreadTickets = tickets.filter((t) => t?.id != null && !isRead('support_tickets', t.id)).length;
  const unreadTotal = unreadEvents + unreadReceipts + unreadTickets;

  const base = location.href.replace(/[#?].*$/, '').replace(/notifications\.html$/, '');
  const receiptLink = (token) => `${base}scan-receipt.html?token=${encodeURIComponent(String(token || ''))}`;

  const sectionHeader = (title, unread) => `
    <div class="flex items-center justify-between gap-3 mb-3">
      <p class="font-extrabold">${escapeHtml(title)}</p>
      ${unread ? `<span class="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-extrabold">${unread} unread</span>` : `<span class="text-xs text-muted-foreground">All read</span>`}
    </div>
  `;

  container.innerHTML = `
    <div class="mm-stack">
      <div class="mm-card mm-card-pad">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs text-muted-foreground">Inbox</p>
            <p class="text-lg font-extrabold">Updates</p>
            <p class="text-xs text-muted-foreground mt-1">${unreadTotal ? `You have ${unreadTotal} unread update${unreadTotal === 1 ? '' : 's'}.` : 'You’re all caught up.'}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="notif-mark-all" class="mm-action mm-action-outline mm-action-sm">Mark all read</button>
            <a href="orders.html" class="mm-action mm-action-ghost mm-action-sm">Orders</a>
            <a href="support.html" class="mm-action mm-action-ghost mm-action-sm">Support</a>
          </div>
        </div>
      </div>

      ${events.length ? `
        <div class="mm-card mm-card-pad">
          ${sectionHeader('Order updates', unreadEvents)}
          <div class="space-y-2">
            ${events.map((e) => `
              <a class="block rounded-xl border border-border bg-card p-3 hover:bg-muted ${isRead('order_events', e.id) ? '' : 'ring-2 ring-amber-200'}" data-mm-type="order_events" data-mm-id="${escapeHtml(String(e.id))}" href="order.html?id=${encodeURIComponent(String(e.order_id || ''))}">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-extrabold truncate">${escapeHtml(String(e.event || '').replace(/_/g, ' '))}</p>
                    <p class="text-xs text-muted-foreground mt-1">Order ${escapeHtml(String(e.order_id || ''))}</p>
                    ${e.payload ? `<p class="text-xs text-muted-foreground mt-1 line-clamp-2">${escapeHtml(JSON.stringify(e.payload))}</p>` : ''}
                  </div>
                  <p class="text-xs text-muted-foreground">${new Date(e.created_at).toLocaleString()}</p>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${tickets.length ? `
        <div class="mm-card mm-card-pad">
          ${sectionHeader('Support tickets', unreadTickets)}
          <div class="space-y-2">
            ${tickets.map((t) => `
              <a class="block rounded-xl border border-border bg-card p-3 hover:bg-muted ${isRead('support_tickets', t.id) ? '' : 'ring-2 ring-amber-200'}" data-mm-type="support_tickets" data-mm-id="${escapeHtml(String(t.id))}" href="support.html">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-extrabold truncate">Ticket ${escapeHtml(String(t.id))} · ${escapeHtml(String(t.status || 'open'))}</p>
                    <p class="text-xs text-muted-foreground mt-1">${escapeHtml(String(t.type || 'issue'))}${t.refund_percent != null ? ` · Refund ${Number(t.refund_percent)}%` : ''}${t.order_id ? ` · Order ${escapeHtml(String(t.order_id))}` : ''}</p>
                  </div>
                  <p class="text-xs text-muted-foreground">${new Date(t.created_at).toLocaleString()}</p>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${receipts.length ? `
        <div class="mm-card mm-card-pad">
          ${sectionHeader('Scan&Go receipts', unreadReceipts)}
          <div class="space-y-2">
            ${receipts.map((r) => `
              <a class="block rounded-xl border border-border bg-card p-3 hover:bg-muted ${isRead('scan_receipts', r.id) ? '' : 'ring-2 ring-amber-200'}" data-mm-type="scan_receipts" data-mm-id="${escapeHtml(String(r.id))}" href="${receiptLink(r.token)}">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-extrabold">Receipt ${escapeHtml(String(r.token || '').slice(0, 10))}…</p>
                    <p class="text-xs text-muted-foreground mt-1">Total ${money(r.total_inr || 0)} · ${r.verified_at ? 'Verified' : 'Not verified'}</p>
                  </div>
                  <p class="text-xs text-muted-foreground">${new Date(r.created_at).toLocaleString()}</p>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Bind mark-read behavior
  el('notif-mark-all')?.addEventListener('click', () => {
    markAllRead();
    toast('Marked all as read.', { type: 'ok', title: 'Updates', ms: 1200 });
    renderNotificationsPage().catch(() => {});
  });

  container.querySelectorAll('[data-mm-type][data-mm-id]').forEach((a) => {
    a.addEventListener('click', () => {
      const type = String(a.getAttribute('data-mm-type') || '');
      const id = String(a.getAttribute('data-mm-id') || '');
      if (type && id) markRead(type, id);
    });
  });
}

function showConfigBanner(msg, actionHref, actionText) {
  try {
    if (document.getElementById('mm-config-banner')) return;
    const n = document.createElement('div');
    n.id = 'mm-config-banner';
    n.className = 'fixed left-0 right-0 top-0 z-[9999] border-b border-amber-200 bg-amber-50 text-amber-900';
    n.innerHTML = `
      <div class="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <p class="text-sm font-semibold">${escapeHtml(String(msg || 'Configuration missing'))}</p>
        <div class="flex items-center gap-2">
          ${actionHref ? `<a class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-extrabold text-white" href="${actionHref}">${escapeHtml(String(actionText || 'Fix'))}</a>` : ''}
          <button type="button" class="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-extrabold" aria-label="Dismiss" id="mm-config-dismiss">Dismiss</button>
        </div>
      </div>
    `;
    document.body.appendChild(n);
    document.getElementById('mm-config-dismiss')?.addEventListener('click', () => n.remove());
    // Avoid covering the header
    document.documentElement.style.scrollPaddingTop = '56px';
    document.body.style.paddingTop = '56px';
  } catch {}
}

function initPwaUx() {
  try {
    // Offline/online toasts
    window.addEventListener('offline', () => toast('You are offline. Some pages will work from cache.', { type: 'info', title: 'Offline', ms: 2600 }));
    window.addEventListener('online', () => toast('Back online.', { type: 'ok', title: 'Network', ms: 1400 }));
  } catch {}

  // Install prompt (best-effort)
  try {
    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      // Show a subtle install banner once per device
      const key = 'mm_install_prompt_dismissed';
      if (localStorage.getItem(key)) return;
      const id = 'mm-install-banner';
      if (document.getElementById(id)) return;
      const n = document.createElement('div');
      n.id = id;
      n.className = 'fixed left-3 right-3 bottom-3 z-[99999] rounded-2xl border border-border bg-card p-3 shadow-card';
      n.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-extrabold">Install MallMaze</p>
            <p class="text-xs text-muted-foreground mt-1">Faster launches, offline support, app-like experience.</p>
          </div>
          <div class="flex gap-2">
            <button type="button" id="mm-install-btn" class="mm-action mm-action-primary mm-action-sm">Install</button>
            <button type="button" id="mm-install-x" class="mm-action mm-action-ghost mm-action-sm">Later</button>
          </div>
        </div>
      `;
      document.body.appendChild(n);
      document.getElementById('mm-install-x')?.addEventListener('click', () => {
        try { localStorage.setItem(key, '1'); } catch {}
        n.remove();
      });
      document.getElementById('mm-install-btn')?.addEventListener('click', async () => {
        try {
          if (!deferred) return;
          deferred.prompt();
          await deferred.userChoice;
        } catch {}
        try { localStorage.setItem(key, '1'); } catch {}
        n.remove();
        deferred = null;
      });
    });
  } catch {}
}

async function init() {
  renderNavbar();
  

  window.appData = await loadAppData();

  // PWA: register service worker for offline caching
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  } catch {}
  initPwaUx();

  await trySyncAuthFromSupabase();
  await ensureProfile();

  // Location modal intentionally disabled.

  const file = location.pathname.split('/').pop() || 'index.html';
  // Light prefetching of key pages
  try {
    if (file === 'index.html') prefetchPages(['products.html', 'malls.html', 'scan.html', 'compare.html']);
    if (file === 'products.html') prefetchPages(['product.html', 'cart.html', 'compare.html']);
    if (file === 'product.html') prefetchPages(['cart.html', 'compare.html']);
    if (file === 'orders.html') prefetchPages(['order.html', 'support.html', 'notifications.html']);
  } catch {}
  // Friendly config guardrails
  try {
    const cfg = window.MM_CONFIG || {};
    const supaOk = String(cfg.SUPABASE_URL || '').trim() && String(cfg.SUPABASE_ANON_KEY || '').trim();
    const stripeOk = String(cfg.STRIPE_PUBLISHABLE_KEY || '').trim();
    const needsSupa = ['orders.html', 'order.html', 'support.html', 'scan-receipt.html', 'verify-receipt.html', 'admin-dashboard.html', 'store-dashboard.html'].includes(file);
    const needsStripe = ['cart.html', 'scan.html'].includes(file);
    if (needsSupa && !supaOk) showConfigBanner('Supabase is not configured (auth/orders/receipts will not work).', 'README.md', 'Open README');
    if (needsStripe && !stripeOk) showConfigBanner('Stripe key missing (real payments disabled).', 'README.md', 'Open README');
  } catch {}
  if (file === 'index.html' || file === 'dashboard.html') renderIndex(window.appData);
  else if (file === 'malls.html') renderMalls(window.appData);
  else if (file === 'products.html') renderProducts(window.appData);
  else if (file === 'product.html') renderProductDetail(window.appData);
  else if (file === 'mall.html') renderMallDetail(window.appData);
  else if (file === 'deals.html') renderDeals(window.appData);
  else if (file === 'cart.html') renderCart();
  else if (file === 'checkout-success.html') renderCheckoutSuccess();
  else if (file === 'login.html') renderLogin();
  else if (file === 'wishlist.html') renderWishlist();
  else if (file === 'orders.html') renderOrders();
  else if (file === 'order.html') await renderOrderDetailPage();
  else if (file === 'support.html') await renderSupportCenter();
  else if (file === 'store.html') renderStorePage(window.appData);
  else if (file === 'compare.html') renderComparePage(window.appData);
  else if (file === 'notifications.html') await renderNotificationsPage();
  else if (file === 'reservations.html') renderReservations();
  else if (file === 'queue.html') renderQueue(window.appData);
  else if (file === 'store-dashboard.html') renderStoreDashboard(window.appData);
  else if (file === 'admin-dashboard.html') renderAdminDashboard(window.appData);
  else if (file === 'walkthrough.html') renderWalkthrough(window.appData);
  else if (file === 'scan-receipt.html') await renderScanReceiptPage();
  else if (file === 'verify-receipt.html') await renderVerifyReceiptPage();

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.add-to-cart-btn');
    if (!b) return;
    const id = b.getAttribute('data-id');
    const product = scoped(window.appData).products.find((p) => p.id === id);
    if (!product) return toast('Product not available in selected location.', { type: 'bad' });
    if (!product.inStock) return toast('Out of stock.', { type: 'bad' });
    addToCart(product);
    toast('Added to cart', { type: 'ok', title: 'Cart' });
  });

  document.addEventListener('click', (e) => {
    const w = e.target.closest('.wishlist-toggle');
    if (!w) return;
    e.preventDefault();
    e.stopPropagation();
    const id = w.getAttribute('data-id');
    const product = scoped(window.appData).products.find((p) => p.id === id);
    if (!product) return;
    const active = state.wishlist.some((x) => x.id === id);
    toggleWishlist(product);
    toast(active ? 'Removed from wishlist' : 'Saved to wishlist', { type: 'ok', title: 'Wishlist' });
    const file = location.pathname.split('/').pop() || 'index.html';
    if (file === 'index.html' || file === 'dashboard.html') renderIndex(window.appData);
    else if (file === 'products.html') renderProducts(window.appData);
  });

  // Basic keyboard accessibility: allow Escape to close location panel is already implemented.
}

init();




