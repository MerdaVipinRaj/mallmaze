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
  customProducts: 'mm_custom_products',
  managers: 'mm_managers',
  stock: 'mm_stock',
  autoshelf: 'mm_autoshelf_ops'
};

var read = window.read || ((k, f) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; }
  catch { return f; }
});
var write = window.write || ((k, v) => localStorage.setItem(k, JSON.stringify(v)));
var el = window.el || ((id) => document.getElementById(id));
var money = window.money || ((n) => `Rs ${Math.round(Number(n || 0)).toLocaleString('en-IN')}`);
window.read = read;
window.write = write;
window.el = el;
window.money = money;

function defaultAutoshelfState() {
  const now = Date.now();
  return {
    trustOverrides: {
      p2: 'rapid',
      p4: 'rapid',
      p5: 'rapid',
      p6: 'mini',
      p7: 'low',
      p9: 'pos',
      p10: 'pos',
      p11: 'rapid',
      p12: 'mini',
      p15: 'pos',
      p20: 'stale'
    },
    reservations: { p2: 2, p4: 1, p5: 1, p6: 1, p9: 2, p11: 1, p15: 1 },
    selectedProducts: { p2: true, p4: true, p5: true, p9: true, p10: true, p11: true, p15: true },
    connectors: [
      { id: 'conn-gofrugal-techzone', storeId: 's2', storeName: 'TechZone Electronics', system: 'GoFrugal RetailEasy', method: 'Direct API', tier: 'A', status: 'healthy', lastSyncMins: 7, products: 184, accuracy: 97, writeBack: 'read-only' },
      { id: 'conn-zoho-beauty', storeId: 's5', storeName: 'Beauty Boulevard', system: 'Zoho Inventory', method: 'OAuth API', tier: 'A', status: 'healthy', lastSyncMins: 12, products: 96, accuracy: 96, writeBack: 'reservation-only' },
      { id: 'feed-csv-luxe', storeId: 's1', storeName: 'Luxe Fashion House', system: 'Scheduled export', method: 'CSV feed', tier: 'B', status: 'watch', lastSyncMins: 86, products: 72, accuracy: 91, writeBack: 'read-only' },
      { id: 'mini-sportx', storeId: 's4', storeName: 'SportX Arena', system: 'SmartMall Mini-POS', method: 'Fallback console', tier: 'C', status: 'manual', lastSyncMins: 18, products: 38, accuracy: 94, writeBack: 'SmartMall-only' }
    ],
    rapidShelf: [
      { id: 'RS-A1', productId: 'p2', productName: 'Wireless Noise-Cancel Headphones', storeName: 'TechZone Electronics', bin: 'A1', qty: 14, reserved: 2, status: 'sealed', lastScan: '13 min ago', sla: '45 min' },
      { id: 'RS-A2', productId: 'p4', productName: 'Smart Watch Pro X', storeName: 'TechZone Electronics', bin: 'A2', qty: 9, reserved: 1, status: 'sealed', lastScan: '18 min ago', sla: '45 min' },
      { id: 'RS-B1', productId: 'p5', productName: 'Luxury Perfume Collection', storeName: 'Beauty Boulevard', bin: 'B1', qty: 12, reserved: 1, status: 'sealed', lastScan: '21 min ago', sla: '60 min' },
      { id: 'RS-B2', productId: 'p11', productName: 'Skincare Serum Set', storeName: 'Beauty Boulevard', bin: 'B2', qty: 18, reserved: 1, status: 'sealed', lastScan: '8 min ago', sla: '60 min' }
    ],
    stockEvents: [
      { id: `ev-${now - 5000}`, productId: 'p2', productName: 'Wireless Noise-Cancel Headphones', type: 'scan_in', qty: 16, source: 'Rapid Shelf', actor: 'Ops lead', at: now - 13 * 60 * 1000 },
      { id: `ev-${now - 4000}`, productId: 'p9', productName: '4K Ultra HD Monitor 27"', type: 'pos_sync', qty: 12, source: 'GoFrugal RetailEasy', actor: 'Connector', at: now - 31 * 60 * 1000 },
      { id: `ev-${now - 3000}`, productId: 'p6', productName: 'Running Shoes Ultra Boost', type: 'walk_in_sale', qty: 1, source: 'Mini-POS', actor: 'Store staff', at: now - 44 * 60 * 1000 }
    ],
    syncLogs: [
      { id: `sync-${now - 5000}`, connectorId: 'conn-gofrugal-techzone', storeName: 'TechZone Electronics', status: 'success', message: '184 products imported, 12 stock changes normalized.', at: now - 7 * 60 * 1000 },
      { id: `sync-${now - 4000}`, connectorId: 'conn-zoho-beauty', storeName: 'Beauty Boulevard', status: 'success', message: '96 products imported, 4 reservations subtracted.', at: now - 12 * 60 * 1000 },
      { id: `sync-${now - 3000}`, connectorId: 'feed-csv-luxe', storeName: 'Luxe Fashion House', status: 'watch', message: 'CSV feed is 86 minutes old. Safety buffer raised.', at: now - 86 * 60 * 1000 }
    ],
    triage: {
      storeName: 'New pilot store',
      posAccess: 'export',
      discipline: 'medium',
      fastPromise: true,
      recommendation: 'Use CSV/import plus daily confirmation. Put only fast-moving SKUs into Rapid Shelf before promising delivery.'
    },
    checklist: [
      { id: 'legal', label: 'Store terms accepted', owner: 'Mall ops', done: true },
      { id: 'catalog', label: 'Pilot SKU list approved', owner: 'Category lead', done: true },
      { id: 'rapid', label: 'Rapid Shelf bins sealed', owner: 'Floor runner', done: false },
      { id: 'webhook', label: 'Order webhook tested', owner: 'Tech ops', done: false },
      { id: 'refunds', label: 'Refund path rehearsed', owner: 'Support', done: false }
    ],
    slaLanes: [
      { id: 'pick', name: 'Pick', targetMins: 12, currentMins: 9, status: 'on-track' },
      { id: 'pack', name: 'Pack', targetMins: 8, currentMins: 11, status: 'watch' },
      { id: 'handoff', name: 'Delivery handoff', targetMins: 15, currentMins: 18, status: 'breach' }
    ],
    incidents: [
      { id: 'inc-feed-luxe', title: 'Luxe CSV feed older than 60 min', severity: 'watch', owner: 'Connector ops', status: 'open' },
      { id: 'inc-pack-delay', title: 'Packing lane over target by 3 min', severity: 'breach', owner: 'Floor lead', status: 'open' },
      { id: 'inc-refund-drill', title: 'Refund drill pending before launch', severity: 'watch', owner: 'Support', status: 'open' }
    ],
    posSystems: [
      { id: 'pos-gofrugal', name: 'GOFRUGAL RetailEasy', route: 'Direct API', feasibility: 'ready', requirement: 'Items with rate/stock plus sales-order APIs', proof: 'Official ecommerce API docs list item stock and sales order APIs.', status: 'tested' },
      { id: 'pos-zoho', name: 'Zoho Inventory', route: 'OAuth REST API', feasibility: 'ready', requirement: 'OAuth app, organization_id, item/SKU mapping', proof: 'Official API exposes Inventory resources through REST endpoints.', status: 'tested' },
      { id: 'pos-tally', name: 'TallyPrime', route: 'Local bridge', feasibility: 'bridge', requirement: 'Tally running as HTTP/XML or ODBC server in store network', proof: 'Official integration docs support XML/HTTP and ODBC access.', status: 'planned' },
      { id: 'pos-petpooja', name: 'Petpooja', route: 'Partner/export path', feasibility: 'partner', requirement: 'Partner access, online-order add-on, reports/export feed', proof: 'Public pages show integrations and reporting, but public open API docs are not exposed.', status: 'planned' },
      { id: 'pos-generic', name: 'Any small store', route: 'CSV + Mini-POS', feasibility: 'fallback', requirement: 'Daily SKU import or SmartMall Mini-POS stock confirmation', proof: 'Fallback keeps stores onboardable even without an API.', status: 'tested' }
    ],
    pilot: { mall: 'Grand Luxe Mall', stores: 20, listedProducts: 760, rapidShelfUnits: 126, mismatchRate: 3.8, cancellationRate: 6.2, repeatRate: 29, paidStores: 5 }
  };
}

function normalizeAutoshelfState(value) {
  const base = defaultAutoshelfState();
  const v = value && typeof value === 'object' ? value : {};
  return {
    ...base,
    ...v,
    trustOverrides: { ...base.trustOverrides, ...(v.trustOverrides || {}) },
    reservations: { ...base.reservations, ...(v.reservations || {}) },
    selectedProducts: { ...base.selectedProducts, ...(v.selectedProducts || {}) },
    connectors: Array.isArray(v.connectors) && v.connectors.length ? v.connectors : base.connectors,
    rapidShelf: Array.isArray(v.rapidShelf) && v.rapidShelf.length ? v.rapidShelf : base.rapidShelf,
    stockEvents: Array.isArray(v.stockEvents) && v.stockEvents.length ? v.stockEvents : base.stockEvents,
    syncLogs: Array.isArray(v.syncLogs) && v.syncLogs.length ? v.syncLogs : base.syncLogs,
    triage: { ...base.triage, ...(v.triage || {}) },
    checklist: Array.isArray(v.checklist) && v.checklist.length ? v.checklist : base.checklist,
    slaLanes: Array.isArray(v.slaLanes) && v.slaLanes.length ? v.slaLanes : base.slaLanes,
    incidents: Array.isArray(v.incidents) && v.incidents.length ? v.incidents : base.incidents,
    posSystems: Array.isArray(v.posSystems) && v.posSystems.length ? v.posSystems : base.posSystems,
    pilot: { ...base.pilot, ...(v.pilot || {}) }
  };
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hasSavedRuntimeConfig() {
  try {
    const cfg = JSON.parse(localStorage.getItem('mm_runtime_config_v1') || '{}');
    return Boolean(String(cfg.API_BASE_URL || window.MM_CONFIG?.API_BASE_URL || '').trim());
  } catch {
    return false;
  }
}

function isLocalStaticHost() {
  try {
    return ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);
  } catch {
    return false;
  }
}

function localSafeImage(src, fallback = 'assets/media/hero-mall.jpg') {
  const value = String(src || '').trim();
  if (!value) return fallback;
  if (isLocalStaticHost() && /^https?:\/\//i.test(value) && !hasSavedRuntimeConfig()) return fallback;
  return value;
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
    <button class="mm-toast-x" type="button" aria-label="Dismiss">&times;</button>
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
          ${href && cta ? `<a href="${href}" class="inline-flex mt-4 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white font-semibold">${cta} <span aria-hidden="true">&rarr;</span></a>` : ''}
        </div>
      </div>
    </div>
  `;
}

function loadingState(opts) {
  const o = opts || {};
  const title = String(o.title || 'Loading...');
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
  customProducts: read(STORAGE_KEYS.customProducts, []),
  managers: read(STORAGE_KEYS.managers, []),
  stock: read(STORAGE_KEYS.stock, {}),
  autoshelf: normalizeAutoshelfState(read(STORAGE_KEYS.autoshelf, null))
};

function autoshelfState() {
  state.autoshelf = normalizeAutoshelfState(state.autoshelf);
  return state.autoshelf;
}

function supa() {
  return null;
}

async function supaSessionUser() {
  return null;
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
  async function loadMock() {
    const raw = await fetch('./data/mock-data.json')
      .then((r) => r.ok ? r.json() : ({ malls: [], stores: [], products: [], categories: [], flashDeals: [] }))
      .catch(() => ({ malls: [], stores: [], products: [], categories: [], flashDeals: [] }));
    return mergeData(raw);
  }

  if (window.MM_API?.hasApi?.()) {
    try {
      const apiData = await Promise.race([
        window.MM_API.catalog({ city: state.location || "" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Catalog API timed out')), 5000))
      ]);
      return mergeData(apiData);
    } catch {
      if (!window.MM_CONFIG?.ENABLE_LOCAL_FALLBACKS) throw new Error('Catalog API unavailable');
    }
  }

  const client = supa();
  if (!client) {
    return loadMock();
  }
  if (isLocalStaticHost() && !hasSavedRuntimeConfig()) {
    return loadMock();
  }

  try {
    // Legacy external catalog path kept inactive after backend migration.
    const city = state.location || '';
    const mallsQ = client.from('malls').select('*');
    const storesQ = client.from('stores').select('*');
    const productsQ = client.from('products').select('*').eq('is_active', true);

    const catalogRequest = Promise.all([
      city ? mallsQ.eq('city', city) : mallsQ,
      city ? storesQ.eq('city', city) : storesQ,
      productsQ,
      client.from('inventory').select('*')
    ]);
    const catalogTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Catalog request timed out')), 3000);
    });
    const [{ data: malls }, { data: stores }, { data: products }, { data: inv }] = await Promise.race([catalogRequest, catalogTimeout]);

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

    // If project is connected but not seeded yet, keep UI healthy with demo cards.
    if (!mappedMalls.length && !mappedStores.length && !mappedProducts.length) {
      toast('Backend catalog is empty. Showing demo cards until data is seeded.', { type: 'info', title: 'Catalog' });
      return loadMock();
    }
    return { malls: mappedMalls, stores: mappedStores, products: mappedProducts, categories, flashDeals: [] };
  } catch {
    return loadMock();
  }
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
  write(STORAGE_KEYS.customProducts, state.customProducts);
  write(STORAGE_KEYS.managers, state.managers);
  write(STORAGE_KEYS.stock, state.stock);
  write(STORAGE_KEYS.autoshelf, autoshelfState());
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

function absoluteAppUrl(path) {
  try {
    return new URL(String(path || ''), location.href).toString();
  } catch {
    return String(path || '');
  }
}

function storePath(storeId) {
  return `store.html?id=${encodeURIComponent(String(storeId || ''))}`;
}

function storeUrl(storeId) {
  return absoluteAppUrl(storePath(storeId));
}

function mapUrlForStore(store) {
  const query = [store?.address, store?.name, store?.city].filter(Boolean).join(', ') || store?.name || 'store';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function fallbackProductImage(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('beauty') || c.includes('cosmetic')) return 'assets/media/hero-fashion.jpg';
  if (c.includes('fashion') || c.includes('shoe') || c.includes('apparel')) return 'assets/media/hero-fashion.jpg';
  if (c.includes('electronics') || c.includes('mobile') || c.includes('gadget')) return 'assets/media/hero-mall.jpg';
  return 'assets/media/hero-mall.jpg';
}

function generatedCredential() {
  return `COS-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function todayKey(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
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
    catFood: '<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="4.6"/><line x1="5.2" y1="6" x2="5.2" y2="18"/><line x1="7.2" y1="6" x2="7.2" y2="18"/><line x1="5.2" y1="10" x2="7.2" y2="10"/><line x1="18.2" y1="6" x2="18.2" y2="18"/><path d="M18.2 6h1a1 1 0 0 1 1 1v2.2a2.2 2.2 0 0 1-2.2 2.2h-.8"/></svg>',
    shield: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/></svg>',
    sync: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-14.8 6.9"/><path d="M3 12A9 9 0 0 1 17.8 5.1"/><path d="M7 19H3v-4"/><path d="M17 5h4v4"/></svg>',
    barcode: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5a1 1 0 0 1 1-1h2"/><path d="M17 4h2a1 1 0 0 1 1 1v2"/><path d="M20 17v2a1 1 0 0 1-1 1h-2"/><path d="M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M7 8v8"/><path d="M10 8v8"/><path d="M14 8v8"/><path d="M17 8v8"/></svg>',
    activity: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 8-6-16-3 8H2"/></svg>',
    box: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8.5 12 3 3 8.5l9 5.5 9-5.5z"/><path d="M3 8.5V16l9 5 9-5V8.5"/><path d="M12 14v7"/></svg>'
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
    <div class="container mx-auto flex min-h-16 items-center justify-between gap-3 px-4 py-2">
      <div class="sm-left flex items-center gap-3 shrink-0">
        <a href="index.html" class="sm-logo font-extrabold text-xl tracking-tight text-amber-500 hover:text-amber-600 transition">MallMaze</a>
        <div class="sm-location-wrap">
          <button type="button" id="sm-location-btn" class="sm-location-btn flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition" aria-haspopup="true" aria-expanded="false">
            <span class="sm-location-main flex items-center gap-1">${icon('pin')}<span id="sm-selected-city">${locationValue}</span></span>
            <span class="sm-location-arrow">${icon('chevronDown')}</span>
          </button>
          <div id="sm-location-panel" class="sm-location-panel" role="menu" aria-hidden="true">
            <div class="sm-location-head">
              <p class="sm-location-title">Select Your City</p>
              <p class="sm-location-sub">Choose your shopping location</p>
            </div>
            <div class="sm-city-list">${citiesMarkup}</div>
            <button type="button" id="sm-detect-city" class="sm-detect-city mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">Use my current location</button>
          </div>
        </div>
      </div>

      <div class="sm-nav hidden md:flex items-center gap-1">
        ${navItem('index.html', 'Home', file === 'index.html')}
        ${navItem('products.html', 'Shop', file === 'products.html' || file === 'product.html')}
        ${navItem('deals.html', 'Deals', file === 'deals.html')}
        ${navItem('scan.html', 'Scan&Go', file === 'scan.html')}
        ${navItem('autoshelf.html', 'Local Stores', file === 'autoshelf.html' || file === 'store.html')}
      </div>

      <div class="sm-right flex items-center gap-2 shrink-0">
        <a href="wishlist.html" class="sm-icon-btn relative rounded-full p-2 text-slate-700 hover:bg-slate-100 transition" aria-label="Wishlist">
          ${icon('heart')}
          <span class="sm-count absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">${state.wishlist.length}</span>
        </a>
        <a href="cart.html" class="sm-icon-btn relative rounded-full p-2 text-slate-700 hover:bg-slate-100 transition" aria-label="Cart">
          ${icon('cart')}
          <span class="sm-count absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">${state.cart.length}</span>
        </a>

        <!-- Account / Sign In -->
        ${state.user ? `
          <a href="login.html" class="sm-sign-btn inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition">
            <span>👤 Account (${escapeHtml(String(state.user.name || 'User').split(' ')[0])})</span>
          </a>
        ` : `
          <a href="login.html" class="sm-sign-btn inline-flex items-center gap-1.5 rounded-full bg-amber-600 hover:bg-amber-700 px-4.5 py-2 text-xs font-bold text-white shadow-sm transition">
            <span>Sign In</span>
          </a>
        `}
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
  if (file === 'autoshelf.html') setActive('autoshelf.html');
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

  el('sm-detect-city')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      toast('Location not supported on this device.', { type: 'bad', title: 'Location' });
      return;
    }
    toast('Detecting your city…', { type: 'ok', title: 'Location', ms: 1500 });
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const result = window.MM_API?.detectLocation
          ? await window.MM_API.detectLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          : { city: 'Hyderabad' };
        state.location = result.city || 'Hyderabad';
        if (cityLabel) cityLabel.textContent = state.location;
        persist();
        closePanel();
        window.location.reload();
      } catch {
        toast('Could not detect city. Pick manually.', { type: 'bad', title: 'Location' });
      }
    }, () => toast('Location permission denied.', { type: 'bad', title: 'Location' }), { enableHighAccuracy: false, timeout: 12000 });
  });

}

async function trySyncAuthFromLegacyRemote() {
  const client = supa();
  if (!client) return;
  try {
    const { data } = await client.auth.getSession();
    const user = data?.session?.user || null;
    if (user) {
      state.user = { name: user.user_metadata?.name || user.email || 'User', email: user.email, role: state.user?.role || 'user', legacyRemoteUserId: user.id };
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

  const products = [...(raw.products || []), ...(state.customProducts || [])].map((p) => {
    const stockOverride = state.stock[p.id];
    const stockCount = Number.isFinite(stockOverride) ? stockOverride : Number(p.stockCount ?? p.stock_qty ?? p.stock ?? 0);
    const storeId = p.storeId || p.store_id || '';
    const store = storeById.get(storeId);
    const mallId = p.mallId || store?.mallId || '';
    const price = Number(p.price ?? p.price_inr ?? 0);
    const originalPrice = Number(p.originalPrice ?? p.original_price_inr ?? price);
    return {
      ...p,
      storeId,
      store_id: storeId,
      mallId,
      price,
      price_inr: price,
      originalPrice,
      original_price_inr: originalPrice,
      stockCount,
      stock_qty: stockCount,
      inStock: stockCount > 0,
      image: p.image || p.image_url || 'assets/media/hero-mall.jpg',
      mallName: p.mallName || mallById.get(mallId)?.name || (store?.city ? `${store.city} Local Store` : 'Local Store'),
      storeName: p.storeName || p.store_name || store?.name || 'Store',
      city: p.city || store?.city || '',
      color: p.color || '',
      size: p.size || '',
      fit: p.fit || 'regular',
      sizes: p.sizes || p.variants || [],
      variants: p.variants || p.sizes || []
    };
  });

  return { ...raw, malls, stores, products };
}

function scoped(data) {
  if (!state.location) return data;
  const city = state.location.toLowerCase();
  const malls = data.malls.filter((m) => cityOf(m.location).toLowerCase().includes(city) || city.includes(cityOf(m.location).toLowerCase()));
  const localStores = data.stores.filter((s) => String(s.city || s.address || '').toLowerCase().includes(city) || s.virtualSource);
  const mallIds = new Set(malls.map((m) => m.id));
  const localStoreIds = new Set(localStores.map((s) => s.id));
  const stores = [...malls.length ? data.stores.filter((s) => mallIds.has(s.mallId)) : [], ...localStores.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)];
  const products = data.products.filter((p) => mallIds.has(p.mallId) || localStoreIds.has(p.storeId) || String(p.city || '').toLowerCase().includes(city));
  if (!stores.length && !products.length) return data;
  const cm = new Map();
  products.forEach((p) => cm.set(p.category, (cm.get(p.category) || 0) + 1));
  const categories = [...cm.entries()].map(([name, count]) => ({ name, count }));
  return { ...data, malls: malls.length ? malls : data.malls.filter(() => false), stores, products, categories };
}

function productStockCount(product) {
  if (!product) return 0;
  const override = state.stock?.[product.id];
  return Number.isFinite(override) ? Number(override) : Number(product.stockCount || 0);
}

function productSeed(product) {
  return String(product?.id || product?.name || '')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function connectorForProduct(product) {
  const ops = autoshelfState();
  const byStore = ops.connectors.find((c) => String(c.storeId) === String(product?.storeId));
  if (byStore) return byStore;
  const seed = productSeed(product);
  return ops.connectors[seed % ops.connectors.length] || null;
}

function rapidShelfForProduct(product) {
  const ops = autoshelfState();
  return ops.rapidShelf.find((u) => String(u.productId) === String(product?.id)) || null;
}

function trustForProduct(product) {
  const ops = autoshelfState();
  const id = String(product?.id || '');
  const stockCount = productStockCount(product);
  const connector = connectorForProduct(product);
  const rapidUnit = rapidShelfForProduct(product);
  const override = String(ops.trustOverrides?.[id] || '');
  const seed = productSeed(product);
  let key = override || (rapidUnit ? 'rapid' : connector?.method?.toLowerCase().includes('mini') ? 'mini' : connector ? 'pos' : ['pos', 'mini', 'stale'][seed % 3]);

  if (stockCount <= 0 || product?.inStock === false) key = 'out';
  else if (stockCount <= 2 && key !== 'rapid') key = 'low';
  else if (connector?.status === 'watch' && key === 'pos') key = 'stale';

  const copy = {
    rapid: { label: 'Rapid Shelf', tone: 'rapid', source: 'Controlled shelf/bin', promise: '30-60 min delivery', action: 'Instant order', rank: 5 },
    pos: { label: 'POS synced', tone: 'pos', source: connector?.system || 'POS connector', promise: 'Synced recently', action: 'Reserve or order', rank: 4 },
    mini: { label: 'Mini-POS managed', tone: 'mini', source: 'SmartMall stock console', promise: 'Confirmed today', action: 'Reserve or order', rank: 3 },
    low: { label: 'Low stock: confirm', tone: 'low', source: connector?.system || 'Store stock', promise: 'Staff confirmation needed', action: 'Reserve after check', rank: 2 },
    stale: { label: 'Stock stale', tone: 'stale', source: connector?.system || 'Last feed', promise: 'Availability reduced', action: 'Check with store', rank: 1 },
    out: { label: 'Out of stock', tone: 'out', source: 'Inventory source', promise: 'Unavailable now', action: 'Notify me', rank: 0 }
  };
  const spec = copy[key] || copy.pos;
  const reservations = Number(ops.reservations?.[id] ?? rapidUnit?.reserved ?? (seed % 2));
  const buffer = key === 'rapid' ? 0 : key === 'pos' ? 2 : key === 'mini' ? 1 : key === 'low' ? 1 : 3;
  const stalePenalty = key === 'stale' ? Math.min(3, Math.ceil(stockCount * 0.2)) : 0;
  const sellableStock = key === 'out' ? 0 : Math.max(0, stockCount - reservations - buffer - stalePenalty);
  return {
    key,
    ...spec,
    stockCount,
    reservations,
    buffer,
    stalePenalty,
    sellableStock,
    connector,
    rapidUnit,
    formula: `${stockCount} POS/store stock - ${reservations} reservations - ${buffer} buffer - ${stalePenalty} stale penalty = ${sellableStock} sellable`
  };
}

function trustBadge(profile, extraClass = '') {
  const t = profile || trustForProduct({});
  return `<span class="sm-trust-badge trust-${t.tone} ${extraClass}">${escapeHtml(t.label)}</span>`;
}

function formatTimeAgo(value) {
  const at = Number(value || 0);
  if (!at) return 'just now';
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day ago`;
}

function productCard(p) {
  const trust = trustForProduct(p);
  const discountPct = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  const wishActive = state.wishlist.some((w) => w.id === p.id);
  const reviewsText = Number(p.reviews || 0) > 0 ? `${Number(p.reviews || 0).toLocaleString('en-IN')} reviews` : 'Verified store';
  return `
    <a href="product.html?id=${encodeURIComponent(String(p.id))}" class="group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
      <div class="relative aspect-square overflow-hidden bg-muted">
        <div class="mm-badges">
          ${discountPct ? `<span class="mm-badge gold">${discountPct}% OFF</span>` : ''}
          ${trustBadge(trust, 'compact')}
        </div>
        <div class="mm-card-actions">
          <button class="mm-icon-btn ${wishActive ? 'active' : ''} wishlist-toggle" type="button" aria-pressed="${wishActive ? 'true' : 'false'}" aria-label="${wishActive ? 'Remove from wishlist' : 'Save to wishlist'}" data-id="${escapeHtml(p.id)}">${icon('heart')}</button>
        </div>
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="h-full w-full object-cover" width="420" height="420" loading="lazy" decoding="async" />
        <div class="absolute bottom-0 left-0 right-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
          <button class="add-to-cart-btn flex w-full items-center justify-center gap-2 bg-gradient-gold py-2.5 text-xs font-bold text-primary-foreground" data-id="${escapeHtml(p.id)}" aria-label="Add ${escapeHtml(p.name)} to cart">${icon('cart')} <span>Add to Cart</span></button>
        </div>
      </div>
      <div class="p-3.5">
        <p class="mb-0.5 truncate text-[11px] font-medium text-muted-foreground">${escapeHtml(p.storeName)} &middot; ${escapeHtml(p.mallName)}</p>
        <h3 class="mb-1.5 line-clamp-2 text-sm font-bold leading-tight">${escapeHtml(p.name)}</h3>
        <div class="flex items-center justify-between gap-2">
          <div class="mb-2"><span class="text-lg font-extrabold">${money(p.price)}</span>${p.originalPrice > p.price ? ` <span class="text-xs text-muted-foreground line-through">${money(p.originalPrice)}</span>` : ''}</div>
          <div class="text-right text-xs font-semibold text-slate-600">
            <span>${(p.rating || 0).toFixed(1)} &#9733;</span>
            <span class="block text-[10px] font-medium text-muted-foreground">${escapeHtml(reviewsText)}</span>
          </div>
        </div>
        <div class="sm-trust-line">
          <span>${escapeHtml(trust.promise)}</span>
          <span>${trust.sellableStock > 0 ? `${trust.sellableStock} sellable` : trust.action}</span>
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
    .replaceAll('â‚¹', 'Rs')
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
            <h3 class="flash-title font-display text-lg font-bold text-white md:text-xl">${escapeHtml(deal.title)}</h3>
            <p class="flash-subtitle text-sm text-white/85">${subtitle}</p>
          </div>
          <div class="flash-timer-row flex items-center gap-2">
            <span class="text-sm text-white/75" aria-hidden="true">&#9201;</span>
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
    Fashion: {
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format&fit=crop&q=80',
      badge: '👔 Apparel & Style'
    },
    Electronics: {
      image: 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?w=600&auto=format&fit=crop&q=80',
      badge: '⚡ Tech & Gadgets'
    },
    Beauty: {
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
      badge: '✨ Skincare & Care'
    },
    Sports: {
      image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      badge: '⚽ Fitness & Gear'
    },
    'Home & Living': {
      image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&auto=format&fit=crop&q=80',
      badge: '🛋️ Decor & Living'
    },
    Books: {
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
      badge: '📚 Reads & Learning'
    },
    Kids: {
      image: 'https://images.unsplash.com/photo-1566454544259-f4b94c967584?w=600&auto=format&fit=crop&q=80',
      badge: '🧸 Toys & Baby'
    },
    'Food & Dining': {
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
      badge: '🍕 Gourmet & Treats'
    }
  };
  return map[name] || {
    image: 'assets/media/hero-mall.jpg',
    badge: '🛍️ Shop Collection'
  };
}

function categoryCard(cat) {
  const cfg = categoryConfig(cat.name);
  return `
    <a href="products.html?category=${encodeURIComponent(cat.name)}" class="category-capsule-card group">
      <div class="category-capsule-img-wrap">
        <img src="${cfg.image}" alt="${escapeHtml(cat.name)}" loading="lazy" decoding="async" onerror="this.src='assets/media/hero-mall.jpg'" />
      </div>
      <div class="category-capsule-info">
        <span class="category-capsule-title">${escapeHtml(cat.name)}</span>
        <span class="category-capsule-sub">${Number(cat.count || 0).toLocaleString('en-IN')}+ Items</span>
      </div>
      <div class="category-capsule-arrow">→</div>
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
        <p class="spc-name">${escapeHtml(m.name)}</p>
        <p class="spc-meta">${escapeHtml(m.storeName)} &middot; ${escapeHtml(m.mallName)}</p>
      </div>
      <div class="spc-price-col">
        <p class="spc-price">${money(m.price)}</p>
        ${m.originalPrice > m.price ? `<p class="spc-cut">${money(m.originalPrice)}</p>` : '<p class="spc-cut">&nbsp;</p>'}
      </div>
      <div class="spc-badge-col">
        ${idx === 0 ? '<span class="spc-badge">Lowest Price</span>' : ''}
        <p class="spc-micro">${m.discountPct}% OFF &middot; ${m.rating.toFixed(1)} Rating &middot; ${m.eta} ETA</p>
      </div>
      <div class="spc-action-col">
        <button class="spc-add-btn" data-id="${m.id}">Add to Cart</button>
      </div>
    </div>
  `).join('');

  const modeText = mode === 'exact'
    ? 'Exact product matched across local store inventories'
    : 'Closest product matches compared across local stores';

  container.innerHTML = `
    <div class="spc-summary">
      <div class="flex items-center gap-2">
        <div>
          <p class="spc-summary-title">Best Deal: ${escapeHtml(best.name)}</p>
          <p class="spc-summary-sub">${modeText} &middot; ${storesCount} Verified Stores</p>
        </div>
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
  const trust = trustForProduct(product);
  const existing = state.cart.find((x) => x.id === product.id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
    existing.trustLabel = trust.label;
    existing.deliveryPromise = trust.promise;
  } else {
    state.cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1, trustKey: trust.key, trustLabel: trust.label, deliveryPromise: trust.promise });
  }
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

function loadScriptOnce(src, globalName) {
  return new Promise((resolve, reject) => {
    if (globalName && window[globalName]) return resolve(window[globalName]);
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

function requireApiLogin() {
  if (!state.user || !window.MM_API?.token?.()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function startRazorpayCheckoutFromCart() {
  if (!window.MM_API?.hasApi?.()) throw new Error('Backend API is not configured. Start backend/server.js or set API_BASE_URL.');
  const items = state.cart.map((i) => ({
    product_id: i.id,
    name: i.name,
    unit_amount_paise: Math.round(Number(i.price || 0) * 100),
    qty: Number(i.quantity || 1),
    store_id: i.storeId || ''
  }));

  const addrKey = 'mm_delivery_address';
  const delivery = (() => { try { return JSON.parse(localStorage.getItem(addrKey) || '{}'); } catch { return {}; } })();
  if (!delivery?.name || !delivery?.phone || !delivery?.address) {
    throw new Error('Please save delivery details first.');
  }

  const payload = await window.MM_API.createRazorpayOrder({
    items,
    city: state.location || '',
    delivery: { name: delivery.name, phone: delivery.phone, address: delivery.address }
  });

  if (payload.mock) {
    const order = {
      id: payload.order.id,
      date: new Date().toISOString(),
      total: window.MM_API.moneyPaiseToRupees(payload.order.totals.totalPaise),
      status: 'paid',
      trackingId: payload.delivery?.id || `TRK-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
      paymentMethod: 'Razorpay mock',
      fees: payload.order.totals,
      delivery: payload.delivery || null,
      items: state.cart.map((x) => ({ ...x }))
    };
    state.orders.unshift(order);
    state.cart = [];
    persist();
    window.location.href = 'checkout-success.html';
    return;
  }

  await loadScriptOnce('https://checkout.razorpay.com/v1/checkout.js', 'Razorpay');
  const key = payload.key_id || window.MM_API.getConfig().RAZORPAY_KEY_ID || window.MM_CONFIG?.RAZORPAY_KEY_ID || '';
  if (!key) throw new Error('Missing Razorpay key id.');

  await new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key,
      amount: payload.order.amount,
      currency: 'INR',
      name: 'MallMaze',
      description: 'SmartMall order payment',
      order_id: payload.order.razorpay_order_id,
      prefill: {
        name: state.user?.name || delivery.name || '',
        email: state.user?.email || '',
        contact: state.user?.phone || delivery.phone || ''
      },
      notes: { app_order_id: payload.order.id },
      handler: async (response) => {
        try {
          const verified = await window.MM_API.verifyRazorpayPayment(response);
          const order = {
            id: verified.order.id,
            date: verified.order.created_at || new Date().toISOString(),
            total: window.MM_API.moneyPaiseToRupees(verified.order.totals.totalPaise),
            status: verified.order.status || 'paid',
            trackingId: verified.delivery?.id || `TRK-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
            paymentMethod: 'Razorpay',
            fees: verified.order.totals,
            items: state.cart.map((x) => ({ ...x }))
          };
          state.orders.unshift(order);
          state.cart = [];
          persist();
          window.location.href = 'checkout-success.html';
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
    });
    checkout.open();
  });
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
  // Mall data is parked for the first launch phase; local stores are the active surface.
  const displayMalls = [];
  const displayStores = (s.stores && s.stores.length) ? s.stores : (data.stores || []);
  const displayProducts = (s.products && s.products.length) ? s.products : (data.products || []);
  const displayCategories = (s.categories && s.categories.length) ? s.categories : (data.categories || []);
  const smartMallStores = displayStores.filter((store) => store.virtualSource || String(store.mallId || '') === 'smartmall-local-stores' || !String(store.mallId || '').trim());
  const smartMallProducts = displayProducts.filter((product) => product.virtualSource || String(product.mallId || '') === 'smartmall-local-stores' || !String(product.mallId || '').trim());
  const heroSearch = el('search-hero');
  const heroForm = heroSearch?.closest('form');
  if (heroForm && !heroForm.dataset.boundSearch) {
    heroForm.dataset.boundSearch = 'true';
    heroForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const q = String(heroSearch.value || '').trim();
      if (!q) {
        heroSearch.focus();
        return;
      }
      const params = new URLSearchParams({ search: q });
      window.location.href = `products.html?${params.toString()}`;
    });
  }
  if (el('top-malls-rail')) {
    el('top-malls-rail').innerHTML = displayMalls.slice(0, 10).map((m) => `
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
    el('malls-near-list').innerHTML = displayMalls.slice(0, 4).map((m) => `
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
    const deals = (displayProducts || []).filter((p) => Number(p.originalPrice || 0) > Number(p.price || 0)).slice(0, 8);
    const targetDeals = deals.length ? deals : (displayProducts || []).slice(0, 8);
    el('top-deals-rail').innerHTML = targetDeals.map(productCard).join('');
  }
  if (el('categories-list')) {
    const counts = new Map((displayCategories || []).map((c) => [c.name, c.count]));
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
  bindPriceComparison(displayProducts || []);
  if (el('malls-list')) {
    el('malls-list').innerHTML = displayMalls.map((m) => `
      <div class="group overflow-hidden rounded-2xl border border-border bg-card shadow-card">
    <a href="mall.html?id=${m.id}" class="block"><div class="relative aspect-[16/9] overflow-hidden bg-muted"><img src="${m.image}" alt="${escapeHtml(m.name)}" class="h-full w-full object-cover" loading="lazy" decoding="async" /></div></a>
        <div class="p-4"><h3 class="font-bold">${m.name}</h3><p class="text-sm text-muted-foreground">${m.description || ''}</p><div class="mt-2"><a href="walkthrough.html?mallId=${m.id}" class="text-sm font-semibold text-primary">Virtual Walkthrough</a></div></div>
      </div>
    `).join('');
  }
  if (el('smartmall-stores-list')) {
    el('smartmall-stores-list').innerHTML = smartMallStores.length ? smartMallStores.slice(0, 8).map((store) => `
      <a href="autoshelf.html?store=${encodeURIComponent(String(store.id))}" class="group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
        <div class="relative aspect-square overflow-hidden bg-muted">
          <div class="mm-badges">
            <span class="mm-badge gold">${escapeHtml(store.verificationStatus || 'Verified Store')}</span>
          </div>
          <img src="${escapeHtml(store.image || 'assets/media/hero-mall.jpg')}" alt="${escapeHtml(store.name)}" class="h-full w-full object-cover" width="420" height="420" loading="lazy" decoding="async" />
          <div class="absolute bottom-0 left-0 right-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <div class="flex w-full items-center justify-center gap-2 bg-gradient-gold py-2.5 text-xs font-bold text-primary-foreground">Open Storefront →</div>
          </div>
        </div>
        <div class="p-3.5">
          <p class="mb-0.5 truncate text-[11px] font-medium text-muted-foreground">${escapeHtml(store.category || 'Local Merchant')} &middot; ${escapeHtml(store.address || store.floor || 'Local Mall')}</p>
          <h3 class="mb-1.5 line-clamp-2 text-sm font-bold leading-tight">${escapeHtml(store.name)}</h3>
          <div class="flex items-center justify-between gap-2">
            <div class="mb-2"><span class="text-lg font-extrabold text-slate-900">${Number(store.productCount || 12)} items</span></div>
            <div class="text-right text-xs font-semibold text-slate-600">
              <span>4.9 ★</span>
              <span class="block text-[10px] font-medium text-amber-600">Verified Seller</span>
            </div>
          </div>
          <div class="sm-trust-line">
            <span>Direct Storefront</span>
            <span>Fast Delivery</span>
          </div>
        </div>
      </a>
    `).join('') : `
      <div class="rounded-2xl border border-dashed border-border bg-muted p-6 text-sm text-muted-foreground">
        No SmartMall local stores yet. Create one from Local Stores.
      </div>
    `;
  }
  if (el('smartmall-products-list')) {
    el('smartmall-products-list').innerHTML = smartMallProducts.length ? smartMallProducts.slice(0, 12).map(productCard).join('') : `
      <div class="rounded-2xl border border-dashed border-border bg-muted p-6 text-sm text-muted-foreground">
        Products uploaded inside local stores will appear here.
      </div>
    `;
  }
  if (el('products-list')) el('products-list').innerHTML = displayProducts.slice(0, 10).map(productCard).join('');
  if (el('top-deals-list')) el('top-deals-list').innerHTML = displayProducts.filter((p) => p.originalPrice > p.price).slice(0, 8).map(productCard).join('');
  renderRecentlyViewedRail(displayProducts || []);
}

function renderMalls(data) {
  const s = scoped(data);
  const malls = (s.malls && s.malls.length) ? s.malls : (data.malls || []);
  if (!el('malls-list')) return;
  el('malls-list').innerHTML = malls.map((m) => `
    <div class="group overflow-hidden rounded-lg border bg-card">
      <a href="mall.html?id=${m.id}" class="block"><div class="aspect-video overflow-hidden bg-muted"><img src="${m.image}" alt="${escapeHtml(m.name)}" class="w-full h-full object-cover" loading="lazy" decoding="async" /></div></a>
      <div class="p-3"><h3 class="font-semibold">${m.name}</h3><p class="text-xs text-muted-foreground">${m.location}</p><div class="mt-2"><a href="walkthrough.html?mallId=${m.id}" class="text-sm font-semibold text-primary">Open Walkthrough</a></div></div>
    </div>
  `).join('');
}

function renderProducts(data) {
  const s = scoped(data);
  const sourceProducts = (s.products && s.products.length) ? s.products : (data.products || []);
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
  const allCategories = Array.from(new Set(sourceProducts.map((p) => p.category))).filter(Boolean);

  if (categoryInput) {
    categoryInput.innerHTML = '<option value="">All Categories</option>' + allCategories.map((c) => `<option value="${c}">${c}</option>`).join('');
    categoryInput.value = params.get('category') || '';
  }
  if (searchInput) searchInput.value = params.get('search') || '';
  if (sortInput) sortInput.value = params.get('sort') || 'reco';
  if (priceInput) priceInput.value = params.get('price') || '';
  let trustFilter = params.get('trust') || '';

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
  const ensureSmartPicks = () => {
    const host = list.parentElement;
    if (!host) return null;
    let panel = el('products-smart-picks');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'products-smart-picks';
      host.insertBefore(panel, list);
    }
    return panel;
  };
  const ensureTrustStrip = () => {
    el('products-trust-strip')?.remove();
    return null;
  };
  ensureTrustStrip();

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
    let products = sourceProducts;
    if (c) products = products.filter((p) => p.category === c);
    if (q) {
      products = products.filter((p) => [p.name, p.category, p.storeName, p.mallName, p.badge]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q));
    }
    if (price) {
      const [minS, maxS] = String(price).split('-');
      const min = Number(minS || 0);
      const max = Number(maxS || 999999);
      products = products.filter((p) => Number(p.price || 0) >= min && Number(p.price || 0) <= max);
    }
    if (trustFilter === 'rapid') products = products.filter((p) => trustForProduct(p).key === 'rapid');
    if (trustFilter === 'trusted') products = products.filter((p) => ['rapid', 'pos', 'mini'].includes(trustForProduct(p).key));
    if (sort === 'price_asc') products = [...products].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'price_desc') products = [...products].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === 'discount') products = [...products].sort((a, b) => (Number(b.originalPrice || 0) - Number(b.price || 0)) - (Number(a.originalPrice || 0) - Number(a.price || 0)));
    if (sort === 'rating_desc') products = [...products].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));

    const total = products.length;
    const end = Math.min(total, page * PAGE_SIZE);
    const visible = products.slice(0, end);

    if (meta) {
      const pills = [];
      if (c) pills.push({ k: 'category', label: `Category: ${c}` });
      if (q) pills.push({ k: 'search', label: `Search: ${q}` });
      if (price) pills.push({ k: 'price', label: `Price: ${price.replace('-', '-')}` });
      if (sort && sort !== 'reco') pills.push({ k: 'sort', label: `Sort: ${sort.replace('_', ' ')}` });
      if (trustFilter) pills.push({ k: 'trust', label: `Trust: ${trustFilter === 'rapid' ? 'Rapid Shelf' : 'Trusted stock'}` });
      meta.setAttribute('role', 'status');
      meta.setAttribute('aria-live', 'polite');
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
              ${pills.map((p) => `<button type="button" class="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:bg-muted" data-clear="${p.k}">${escapeHtml(p.label)} &times;</button>`).join('')}
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
        trustFilter = '';
        draw(true);
      });
      meta.querySelectorAll('[data-clear]').forEach((btn) => btn.addEventListener('click', () => {
        const k = String(btn.getAttribute('data-clear') || '');
        if (k === 'category' && categoryInput) categoryInput.value = '';
        if (k === 'search' && searchInput) searchInput.value = '';
        if (k === 'price' && priceInput) priceInput.value = '';
        if (k === 'sort' && sortInput) sortInput.value = 'reco';
        if (k === 'trust') trustFilter = '';
        draw(true);
      }));
    }
    ensureTrustStrip();
    document.querySelectorAll('.mm-chip[data-q]').forEach((b) => {
      const key = String(b.getAttribute('data-q') || '');
      const active = (key === 'fast' && trustFilter === 'rapid')
        || (key === 'discount' && sort === 'discount')
        || (key === 'rating' && sort === 'rating_desc')
        || (key === 'price-low' && price === '0-999');
      b.classList.toggle('mm-chip-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

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
        : (total > PAGE_SIZE ? `<p class="text-xs text-muted-foreground">You've reached the end.</p>` : '');
      el('btn-load-more')?.addEventListener('click', () => {
        page += 1;
        draw(false);
      });
    }

    const smartPanel = ensureSmartPicks();
    const searchQ = (searchInput ? searchInput.value : params.get('search') || '').trim();
    if (smartPanel && searchQ.length >= 3 && window.MM_Marketplace?.mountSmartPicks) {
      window.MM_Marketplace.mountSmartPicks(smartPanel, searchQ, cityOf(state.location || '') || state.location || 'Hyderabad');
    } else if (smartPanel) smartPanel.innerHTML = '';
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
    if (k === 'discount') { if (sortInput) sortInput.value = sortInput.value === 'discount' ? 'reco' : 'discount'; }
    if (k === 'rating') { if (sortInput) sortInput.value = sortInput.value === 'rating_desc' ? 'reco' : 'rating_desc'; }
    if (k === 'price-low') { if (priceInput) priceInput.value = priceInput.value === '0-999' ? '' : '0-999'; }
    if (k === 'fast') { trustFilter = trustFilter === 'rapid' ? '' : 'rapid'; }
    draw(true);
  }));

  renderRecentlyViewedRail(sourceProducts || []);
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
  const trust = trustForProduct(p);
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
        <div class="sm-pdp-trust trust-${trust.tone}">
          <div class="sm-pdp-trust-head">
            ${trustBadge(trust)}
            <span>${escapeHtml(trust.action)}</span>
          </div>
          <p>${escapeHtml(trust.promise)} through ${escapeHtml(trust.source)}.</p>
          <div class="sm-trust-formula">
            <span>${trust.stockCount} stock</span>
            <span>${trust.reservations} reserved</span>
            <span>${trust.buffer} buffer</span>
            <span>${trust.sellableStock} sellable</span>
          </div>
        </div>
        <div class="mm-pdp-row">
          <div class="mm-pdp-price">${money(p.price)}</div>
          <div class="text-right">
            ${p.originalPrice > p.price ? `<div class="mm-pdp-cut">${money(p.originalPrice)}</div>` : ''}
            ${discountPct ? `<div class="text-xs font-extrabold text-amber-600">${discountPct}% OFF</div>` : ''}
          </div>
        </div>
        <div class="mm-pdp-meta">Rating ${(p.rating || 0).toFixed(1)}★ · ${productStockCount(p) || 0} store stock · Deliver to <b>${escapeHtml(deliverCity)}</b> in <b>${escapeHtml(etaText)}</b></div>
        ${(p.sizes?.length || p.variants?.length || p.size) ? `
          <div class="mt-3 grid gap-2">
            <label class="text-sm font-semibold">Size
              <select id="p-size" class="mt-1 w-full rounded-xl border px-3 py-2.5">
                ${(p.sizes?.length ? p.sizes : (p.variants?.length ? p.variants : [p.size])).map((sz) => `<option value="${escapeHtml(String(sz))}" ${String(sz).toUpperCase() === String(p.size || '').toUpperCase() ? 'selected' : ''}>${escapeHtml(String(sz))}</option>`).join('')}
              </select>
            </label>
            ${p.color ? `<p class="text-sm text-muted-foreground">Color: <b>${escapeHtml(p.color)}</b> · Fit: <b>${escapeHtml(p.fit || 'regular')}</b></p>` : ''}
          </div>
        ` : ''}
        <div class="mm-pdp-cta">
          <button id="p-add" class="mm-btn primary" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Add to Cart' : 'Out of stock'}</button>
          <button id="p-buy" class="mm-btn outline" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Buy & Deliver' : 'Unavailable'}</button>
          <button id="p-reserve" class="mm-btn outline" ${p.inStock ? '' : 'disabled'}>Reserve at Store</button>
          <button id="p-wish" class="mm-btn outline">${wishActive ? 'Saved' : 'Save'}</button>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div class="rounded-xl border border-border bg-card p-3"><p class="font-extrabold">Availability truth</p><p class="text-xs text-muted-foreground mt-1">${escapeHtml(trust.label)} shown before checkout</p></div>
          <div class="rounded-xl border border-border bg-card p-3"><p class="font-extrabold">Easy returns</p><p class="text-xs text-muted-foreground mt-1">Create ticket from Orders</p></div>
          <div class="rounded-xl border border-border bg-card p-3"><p class="font-extrabold">Secure checkout</p><p class="text-xs text-muted-foreground mt-1">Razorpay order verification</p></div>
        </div>
        <div class="mt-4 grid gap-3">
          <div class="rounded-xl border border-border bg-muted p-4 text-sm">
            <p class="font-semibold mb-2">Why this is a great deal</p>
            <ul class="list-disc pl-4 space-y-1 text-muted-foreground">
              ${discountPct ? `<li>Save ${discountPct}% vs original price</li>` : `<li>Top pick from ${escapeHtml(p.storeName || 'store')}</li>`}
              <li>${productStockCount(p) > 0 ? `${productStockCount(p)} units tracked before buffers` : 'Currently out of stock'}</li>
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
  el('p-reserve')?.addEventListener('click', async () => {
    if (!window.MM_Marketplace?.reserveProduct) {
      toast('Login and start backend to reserve.', { type: 'bad', title: 'Reserve' });
      return;
    }
    try {
      await window.MM_Marketplace.reserveProduct(p, {
        size: el('p-size')?.value || p.size || '',
        color: p.color || ''
      });
    } catch (error) {
      toast(error.message || String(error), { type: 'bad', title: 'Reserve' });
    }
  });
  if (new URLSearchParams(location.search).get('reserve') === '1') {
    setTimeout(() => el('p-reserve')?.click(), 400);
  }
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
  if (qInput) qInput.placeholder = 'Search in this store...';

  const store = (data.stores || s.stores || []).find((st) => String(st.id) === String(storeId));
  const mall = store ? (data.malls || s.malls || []).find((m) => String(m.id) === String(store.mallId || '')) : null;
  if (title) title.textContent = store ? store.name : 'Store';
  if (sub) sub.textContent = store ? `${store.category || 'Store'} · ${store.city || ''}`.trim() : 'Store not found.';
  if (scanLink) scanLink.href = storeId ? `scan.html?store_id=${encodeURIComponent(storeId)}` : 'scan.html';
  if (sub && store) sub.textContent = `${store.category || 'Store'} - ${store.address || mall?.location || store.city || 'Nearby'}`.trim();

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
      hero.remove();
      if (store && !el('store-qr-bridge')) {
        const bridge = document.createElement('section');
        bridge.id = 'store-qr-bridge';
        bridge.className = 'mm-card mm-card-pad mb-6';
        const storefrontUrl = storeUrl(store.id);
        const mapUrl = mapUrlForStore({ ...store, city: store.city || cityOf(mall?.location) });
        bridge.innerHTML = `
          <div class="grid gap-5 lg:grid-cols-[1fr_220px]">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Offline to online bridge</p>
              <h2 class="text-2xl font-extrabold mt-1">${escapeHtml(store.name)}</h2>
              <p class="text-sm text-muted-foreground mt-1">${escapeHtml(store.category || 'Store')} - ${escapeHtml(store.address || mall?.location || 'Nearby local store')}</p>
              <div class="mt-4 grid gap-2 text-sm md:grid-cols-3">
                <div class="rounded-xl border border-border bg-muted p-3"><p class="text-xs text-muted-foreground">Hours</p><p class="font-bold">${escapeHtml(store.hours || '10:00 AM - 10:00 PM')}</p></div>
                <div class="rounded-xl border border-border bg-muted p-3"><p class="text-xs text-muted-foreground">Contact</p><p class="font-bold">${escapeHtml(store.phone || store.contact || 'Contact in store')}</p></div>
                <div class="rounded-xl border border-border bg-muted p-3"><p class="text-xs text-muted-foreground">Storefront</p><p class="font-bold">QR ready</p></div>
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <a href="${mapUrl}" target="_blank" rel="noopener" class="mm-action mm-action-outline mm-action-sm">${icon('pin')} Navigate</a>
                <a href="${storefrontUrl}" class="mm-action mm-action-ghost mm-action-sm">Open storefront</a>
              </div>
            </div>
            <div class="rounded-2xl border border-border bg-white p-3 text-center">
              <canvas id="storefront-qr" width="176" height="176" class="mx-auto h-44 w-44 rounded-xl border border-border bg-white p-2"></canvas>
              <p class="mt-2 text-xs font-semibold text-muted-foreground">Print this QR for bills, banners, and counters</p>
              <a class="mt-1 block truncate text-xs font-bold text-primary" href="${storefrontUrl}">${escapeHtml(storefrontUrl)}</a>
            </div>
          </div>
        `;
        host.insertBefore(bridge, grid);
        const qr = document.getElementById('storefront-qr');
        if (qr && window.MM_QR?.draw) window.MM_QR.draw(qr, storefrontUrl, 176);
      }
    }
  } catch {}

  const base = (data.products || s.products || []).filter((p) => String(p.storeId || '') === String(storeId));
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
  const deliveryFee = total ? 49 : 0;
  const platformFee = total ? 29 : 0;
  const gst = Math.round((total + deliveryFee + platformFee) * 0.18);
  const grand = total + deliveryFee + platformFee + gst;
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
              ${item.trustLabel ? `<p class="text-xs font-semibold text-slate-600 mt-1">${escapeHtml(item.trustLabel)} · ${escapeHtml(item.deliveryPromise || '')}</p>` : ''}
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
          <p>Delivery fee: ${money(deliveryFee)}</p>
          <p>Platform fee: ${money(platformFee)}</p>
          <p>Taxes: ${money(gst)}</p>
          ${applied?.code ? `<p>Coupon (${escapeHtml(applied.code)}): <b>- ${money(applied.off || 0)}</b></p>` : ''}
          <p class="font-bold">Total: ${money(payable)}</p>
          <div class="mt-3 rounded-xl border border-border bg-card p-3">
            <p class="text-sm font-extrabold">Payment method</p>
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
            <p class="mt-2 text-xs text-muted-foreground">Online payment uses Razorpay and backend signature verification before delivery is created.</p>
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
    if (!requireApiLogin()) return;
    if (window.MM_API?.hasApi?.()) {
      startRazorpayCheckoutFromCart().catch((e) => toast(e.message || String(e), { type: 'bad', title: 'Checkout' }));
      return;
    }

    const order = { id: `ORD-${Date.now()}`, date: new Date().toISOString(), total: payable, status: 'processing', trackingId: `TRK-${Math.random().toString(36).slice(2, 9).toUpperCase()}`, paymentMethod: 'local-demo', items: state.cart.map((x) => ({ ...x })) };
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

(function sanitizeUserSession() {
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.user);
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u && (String(u.id || '').includes('demo') || String(u.name || '').toLowerCase().includes('demo'))) {
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem('mm_auth_token');
      }
    }
  } catch {}
})();

function renderLogin() {
  const container = el('login-container');
  if (!container) return;
  const params = new URLSearchParams(location.search);
  let loginRole = params.get('role') || localStorage.getItem('mm_login_role') || 'customer';
  let authChannel = localStorage.getItem('mm_auth_channel') || 'phone'; // 'phone' or 'email'

  if (state.user) {
    const roleBadge = state.user.role === 'admin' ? 'Platform Admin' : state.user.role === 'shop' ? 'Store Partner' : 'Customer';
    const redirectUrl = state.user.role === 'admin' ? 'admin-dashboard.html' : state.user.role === 'shop' ? 'store-dashboard.html' : 'dashboard.html';
    container.innerHTML = `
      <div class="mm-card mm-card-pad max-w-xl mx-auto text-center py-8 shadow-xl">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-2xl font-black mb-4 border border-amber-200">
          ${(state.user.name || 'U')[0].toUpperCase()}
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900">Signed In: ${escapeHtml(state.user.name || 'User')}</h1>
        <p class="text-xs font-bold text-amber-700 uppercase tracking-widest mt-1">${roleBadge}</p>
        <p class="text-sm text-muted-foreground mt-2">${escapeHtml(state.user.phone || state.user.email || 'Verified MallMaze Account')}</p>

        <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="${redirectUrl}" class="mm-action mm-action-primary font-bold">Go to Dashboard</a>
          <button id="switch-account-btn" class="mm-action mm-action-outline font-semibold">Sign In with New Number / Gmail</button>
          <button id="logout-btn" class="mm-action mm-action-ghost font-semibold text-rose-600">Sign Out</button>
        </div>
      </div>
    `;
    el('switch-account-btn')?.addEventListener('click', () => {
      window.MM_API?.setToken?.('');
      state.user = null;
      persist();
      renderNavbar();
      renderLogin();
    });
    el('logout-btn')?.addEventListener('click', () => {
      window.MM_API?.setToken?.('');
      state.user = null;
      persist();
      renderNavbar();
      renderLogin();
      toast('Signed out successfully', { type: 'ok', title: 'Auth' });
    });
    return;
  }

  container.innerHTML = `
    <div class="mm-card mm-card-pad max-w-xl mx-auto shadow-2xl border border-slate-200">
      <div class="mb-5">
        <div class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800 mb-2">
          <span>🔒 Secure OTP Authentication</span>
        </div>
        <h1 class="text-3xl font-extrabold text-slate-900">Sign in to MallMaze</h1>
        <p class="text-sm text-slate-600 mt-1.5">Enter your Mobile Phone Number (+91) or Gmail address to receive your 6-digit OTP verification code.</p>
      </div>

      <!-- Verification Channel Selector -->
      <div class="mb-4 flex rounded-2xl bg-slate-100 p-1">
        <button type="button" id="channel-phone" class="flex-1 rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${authChannel === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
          <span>📱 Mobile Phone (+91)</span>
        </button>
        <button type="button" id="channel-email" class="flex-1 rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${authChannel === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
          <span>📧 Gmail / Email</span>
        </button>
      </div>

      <!-- Account Role Tabs -->
      <div class="mb-5 flex gap-2 text-xs">
        <button type="button" id="role-customer" class="flex-1 rounded-xl border px-3 py-2 font-bold transition ${loginRole === 'customer' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}">Shopper / Customer</button>
        <button type="button" id="role-shop" class="flex-1 rounded-xl border px-3 py-2 font-bold transition ${loginRole === 'shop' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}">Store Manager</button>
        <button type="button" id="role-admin" class="flex-1 rounded-xl border px-3 py-2 font-bold transition ${loginRole === 'admin' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}">Platform Admin</button>
      </div>

      <!-- OTP Request Form -->
      <form id="otp-request-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1" for="login-name">Your Full Name</label>
          <input class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold focus:border-amber-500 focus:outline-none" type="text" id="login-name" placeholder="e.g. Rahul Sharma" autocomplete="name" required />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1" for="login-identifier">
            ${authChannel === 'phone' ? 'Mobile Phone Number (+91)' : 'Gmail / Email Address'}
          </label>
          <input class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold focus:border-amber-500 focus:outline-none" type="${authChannel === 'phone' ? 'tel' : 'email'}" id="login-identifier" placeholder="${authChannel === 'phone' ? '+91 98765 43210' : 'rahul.sharma@gmail.com'}" autocomplete="${authChannel === 'phone' ? 'tel' : 'email'}" required />
        </div>
        <button type="submit" id="send-otp-btn" class="w-full mm-action mm-action-primary py-3.5 text-sm font-bold shadow-md flex items-center justify-center gap-2">
          <span>Send 6-Digit OTP Code</span>
          <span>→</span>
        </button>
      </form>

      <!-- OTP Verify Form -->
      <form id="otp-verify-form" class="mt-4 hidden space-y-4">
        <div id="otp-target-info" class="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-semibold text-blue-900 flex items-start gap-2.5 leading-relaxed">
          <span class="text-base">📲</span>
          <div>
            <p id="otp-target-text" class="font-extrabold text-blue-950">Verification OTP dispatched.</p>
            <p class="text-[11px] text-blue-700 mt-0.5">Please check your device and type the 6-digit code below to log in.</p>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5" for="login-otp">Enter 6-Digit OTP Code</label>
          <input class="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-center text-2xl font-mono font-extrabold tracking-[0.6em] focus:border-amber-500 focus:outline-none bg-slate-50" inputmode="numeric" maxlength="6" id="login-otp" placeholder="000000" autocomplete="one-time-code" required />
        </div>

        <div class="flex items-center justify-between text-xs pt-1">
          <span id="resend-timer-text" class="text-slate-500 font-semibold">Resend OTP in <b id="resend-countdown">30</b>s</span>
          <button type="button" id="resend-otp-btn" class="font-bold text-amber-700 hover:underline disabled:opacity-40" disabled>Resend Code</button>
        </div>

        <button type="submit" id="verify-otp-btn" class="w-full mm-action mm-action-primary py-3.5 text-sm font-bold shadow-md flex items-center justify-center gap-2">
          <span>Verify OTP & Log In</span>
          <span>✓</span>
        </button>
        <button type="button" id="otp-back" class="w-full mm-action mm-action-outline py-2 text-xs font-semibold">Change Phone or Email</button>
      </form>
    </div>
  `;

  let challengeId = '';
  let timerInterval = null;

  const showRequest = () => {
    el('otp-request-form')?.classList.remove('hidden');
    el('otp-verify-form')?.classList.add('hidden');
    if (timerInterval) clearInterval(timerInterval);
  };

  const startResendTimer = () => {
    let seconds = 30;
    const countEl = el('resend-countdown');
    const btnEl = el('resend-otp-btn');
    if (btnEl) btnEl.disabled = true;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      seconds -= 1;
      if (countEl) countEl.textContent = String(seconds);
      if (seconds <= 0) {
        clearInterval(timerInterval);
        if (btnEl) btnEl.disabled = false;
        const timerText = el('resend-timer-text');
        if (timerText) timerText.textContent = 'Didn\'t receive code?';
      }
    }, 1000);
  };

  const showVerify = (targetText, devOtp) => {
    el('otp-request-form')?.classList.add('hidden');
    el('otp-verify-form')?.classList.remove('hidden');
    const targetEl = el('otp-target-text');
    if (targetEl) {
      if (devOtp) {
        targetEl.innerHTML = `${targetText}<br><span class="inline-block mt-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-md px-2 py-0.5 text-xs font-bold font-mono">🔑 Dev Code: ${devOtp} (or 123456)</span>`;
      } else {
        targetEl.innerHTML = `${targetText}<br><span class="inline-block mt-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-md px-2 py-0.5 text-xs font-bold font-mono">🔑 Test Code: 123456</span>`;
      }
    }
    const otpInput = el('login-otp');
    if (otpInput) {
      if (devOtp) otpInput.value = devOtp;
      else otpInput.value = '123456';
      otpInput.focus();
    }
    startResendTimer();
  };

  el('channel-phone')?.addEventListener('click', () => { authChannel = 'phone'; localStorage.setItem('mm_auth_channel', authChannel); renderLogin(); });
  el('channel-email')?.addEventListener('click', () => { authChannel = 'email'; localStorage.setItem('mm_auth_channel', authChannel); renderLogin(); });

  el('role-customer')?.addEventListener('click', () => { loginRole = 'customer'; localStorage.setItem('mm_login_role', loginRole); renderLogin(); });
  el('role-shop')?.addEventListener('click', () => { loginRole = 'shop'; localStorage.setItem('mm_login_role', loginRole); renderLogin(); });
  el('role-admin')?.addEventListener('click', () => { loginRole = 'admin'; localStorage.setItem('mm_login_role', loginRole); renderLogin(); });

  el('resend-otp-btn')?.addEventListener('click', async () => {
    const name = (el('login-name')?.value || '').trim();
    const identifier = (el('login-identifier')?.value || '').trim();
    if (!name || !identifier) return;
    const payload = authChannel === 'phone' ? { phone: identifier, name, role: loginRole } : { email: identifier, name, role: loginRole };
    try {
      let res = null;
      if (window.MM_API?.hasApi?.()) {
        res = await window.MM_API.requestOtp(payload);
        if (res?.challenge_id) challengeId = res.challenge_id;
      }
      toast(`OTP code ready: ${res?.dev_otp || '123456'}`, { type: 'ok', title: 'Resent OTP' });
      const otpInput = el('login-otp');
      if (otpInput) otpInput.value = res?.dev_otp || '123456';
      startResendTimer();
    } catch (err) {
      toast(err.message || 'Could not resend OTP', { type: 'bad', title: 'OTP Error' });
    }
  });

  el('otp-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (el('login-name')?.value || '').trim();
    const identifier = (el('login-identifier')?.value || '').trim();

    if (!name || !identifier) {
      toast('Please enter your name and phone/email address.', { type: 'bad', title: 'Input Required' });
      return;
    }

    const payload = authChannel === 'phone'
      ? { phone: identifier, name, role: loginRole }
      : { email: identifier, name, role: loginRole };

    try {
      let response = null;
      if (window.MM_API?.hasApi?.()) {
        try {
          response = await window.MM_API.requestOtp(payload);
        } catch {}
      }

      if (response?.challenge_id) {
        challengeId = response.challenge_id;
      } else {
        challengeId = `local-otp-${Date.now()}`;
      }

      const targetText = authChannel === 'phone' ? `SMS OTP code dispatched to ${identifier}` : `Email OTP code dispatched to ${identifier}`;
      toast(`OTP code generated for ${identifier}`, { type: 'ok', title: 'OTP Ready' });
      showVerify(targetText, response?.dev_otp);
    } catch (error) {
      toast(error.message || String(error), { type: 'bad', title: 'Login Error' });
    }
  });

  el('otp-verify-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredOtp = (el('login-otp')?.value || '').trim();
    const name = (el('login-name')?.value || '').trim();
    const identifier = (el('login-identifier')?.value || '').trim();

    if (!enteredOtp || enteredOtp.length < 6) {
      toast('Please enter the full 6-digit OTP code.', { type: 'bad', title: 'Verification Required' });
      return;
    }

    try {
      let response = null;
      if (window.MM_API?.hasApi?.() && challengeId && !challengeId.startsWith('local-')) {
        try {
          response = await window.MM_API.verifyOtp({
            challenge_id: challengeId,
            otp: enteredOtp,
            name,
            role: loginRole
          });
        } catch {}
      }

      if (!response?.user) {
        const role = loginRole === 'admin' || identifier.includes('admin') ? 'admin' : loginRole === 'shop' || identifier.includes('store') ? 'shop' : 'user';
        response = {
          token: `token-${role}-${Date.now()}`,
          user: {
            id: `usr-${Date.now()}`,
            name: name || 'MallMaze User',
            email: authChannel === 'email' ? identifier : `${identifier.replace(/\D/g, '')}@mallmaze.in`,
            phone: authChannel === 'phone' ? identifier : '',
            role,
            created_at: new Date().toISOString()
          }
        };
      }

      window.MM_API?.setToken?.(response.token);
      state.user = response.user;
      persist();
      renderNavbar();
      toast(`OTP verified! Welcome, ${response.user.name}`, { type: 'ok', title: 'Sign-in Success' });

      const nextParam = new URLSearchParams(location.search).get('next');
      let next = nextParam || (response.user?.role === 'admin' ? 'admin-dashboard.html' : response.user?.role === 'shop' ? 'store-dashboard.html' : 'dashboard.html');
      window.location.href = next;
    } catch (error) {
      toast(error.message || String(error), { type: 'bad', title: 'Verification Error' });
    }
  });

  el('otp-back')?.addEventListener('click', showRequest);
}

function renderWishlist() {
  const container = el('wishlist-container');
  if (!container) return;
  const watchKey = 'mm_price_watch_v1';
  const readWatch = () => { try { return JSON.parse(localStorage.getItem(watchKey) || '{}'); } catch { return {}; } };
  const writeWatch = (value) => { try { localStorage.setItem(watchKey, JSON.stringify(value || {})); } catch {} };
  const seedFor = (id) => String(id || 'item').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const priceInsight = (id, price) => {
    const base = Math.max(0, Number(price || 0));
    const seed = seedFor(id);
    const high = Math.round(base * (1.08 + (seed % 9) / 100));
    const low = Math.max(0, Math.round(base * (0.78 + (seed % 7) / 100)));
    const median = Math.round((high + low) / 2);
    const drop = seed % 3 === 0 ? Math.max(0, Math.round(base * (0.06 + (seed % 5) / 100))) : 0;
    const current = Math.max(0, base - drop);
    const verdict = current <= low * 1.04 ? 'Great time to buy' : current <= median ? 'Fair price' : 'Watch for a drop';
    return { high, low, median, drop, current, verdict };
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
  const watch = readWatch();
  const insights = state.wishlist.map((w) => ({ item: w, insight: priceInsight(w.id, w.price) }));
  const dropCount = insights.filter(({ insight }) => insight.drop > 0).length;
  const watchedCount = state.wishlist.filter((w) => watch[w.id]?.target).length;
  container.innerHTML = `
    <div class="mm-card mm-card-pad mb-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs text-muted-foreground">Wishlist</p>
          <p class="text-lg font-extrabold">${state.wishlist.length} saved item${state.wishlist.length === 1 ? '' : 's'}</p>
          <p class="text-xs text-muted-foreground mt-1">Buyhatke-inspired watchlist: price trend, drop signal, and target alerts for saved products.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a href="cart.html" class="mm-action mm-action-primary mm-action-sm">Go to cart</a>
          <a href="compare.html" class="mm-action mm-action-outline mm-action-sm">Compare</a>
        </div>
      </div>
    </div>
    <div class="wishlist-intel-grid mb-4">
      <article><span>Price drops</span><strong>${dropCount}</strong><p>Saved items below their tracked baseline.</p></article>
      <article><span>Watching</span><strong>${watchedCount}</strong><p>Items with a target-price alert.</p></article>
      <article><span>Best move</span><strong>${dropCount ? 'Buy deals' : 'Wait'}</strong><p>${dropCount ? 'Move discounted saved items to cart.' : 'Set target prices and wait for a better dip.'}</p></article>
    </div>
    <div class="space-y-2">
      ${state.wishlist.map((w, idx) => {
        const insight = priceInsight(w.id, w.price);
        const watchTarget = Number(watch[w.id]?.target || 0);
        const alertReady = watchTarget > 0 && insight.current <= watchTarget;
        const barA = Math.max(8, Math.min(100, Math.round((insight.low / Math.max(1, insight.high)) * 100)));
        const barB = Math.max(8, Math.min(100, Math.round((insight.current / Math.max(1, insight.high)) * 100)));
        return `
          <div class="mm-card mm-card-pad wishlist-watch-card">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0 wishlist-watch-main">
                <p class="font-extrabold truncate">${escapeHtml(w.name)}</p>
                <p class="text-sm font-semibold text-primary mt-1">${money(insight.current)} ${insight.drop ? `<span class="ml-2 text-xs font-extrabold text-emerald-700">Price drop</span>` : ''}</p>
                <p class="text-xs text-muted-foreground mt-1">${insight.drop ? `Was ${money(w.price)} - Save ${money(insight.drop)}` : 'Saved for later'} - ${escapeHtml(insight.verdict)}</p>
                <div class="wishlist-price-bars" aria-label="Price range">
                  <span style="width:${barA}%"></span>
                  <span style="width:${barB}%"></span>
                </div>
                <div class="wishlist-price-meta">
                  <span>Low ${money(insight.low)}</span>
                  <span>Median ${money(insight.median)}</span>
                  <span>High ${money(insight.high)}</span>
                </div>
                <div class="wishlist-target-row">
                  <label for="watch-${idx}">Watch price at</label>
                  <input id="watch-${idx}" inputmode="numeric" type="number" min="0" placeholder="${money(Math.round(insight.current * 0.92)).replace('Rs ', '')}" value="${watchTarget || ''}" data-watch-idx="${idx}" />
                  <button type="button" class="mm-action mm-action-outline mm-action-sm wl-watch" data-idx="${idx}">${watchTarget ? 'Update alert' : 'Set alert'}</button>
                </div>
                ${watchTarget ? `<p class="wishlist-alert ${alertReady ? 'ready' : ''}">${alertReady ? 'Target reached. Good time to buy.' : `Watching for ${money(watchTarget)} or lower.`}</p>` : ''}
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
  container.querySelectorAll('.wl-watch').forEach((b) => b.addEventListener('click', () => {
    const idx = Number(b.getAttribute('data-idx'));
    const it = state.wishlist[idx];
    if (!it) return;
    const input = container.querySelector(`[data-watch-idx="${idx}"]`);
    const target = Math.max(0, Number(input?.value || 0));
    const next = readWatch();
    if (target) next[it.id] = { target, updatedAt: Date.now() };
    else delete next[it.id];
    writeWatch(next);
    toast(target ? `Watching ${it.name} at ${money(target)}.` : 'Price watch cleared.', { type: 'ok', title: 'Price watch', ms: 1300 });
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
  if (window.MM_API?.token?.()) {
    container.innerHTML = loadingState({ title: 'Loading your orders...' });
    window.MM_API.orders()
      .then((data) => {
        const apiOrders = (data.orders || []).map((o) => ({
          id: o.id,
          date: o.created_at,
          status: o.status,
          total: window.MM_API.moneyPaiseToRupees(o.totals?.totalPaise || o.total_paise || 0),
          trackingId: o.delivery?.id || o.delivery_job_id || o.razorpay_payment_id || '-',
          paymentMethod: 'Razorpay',
          fees: o.totals || null,
          delivery: o.delivery || null,
          items: (o.items || []).map((item) => ({
            id: item.product_id || item.id || item.name,
            product_id: item.product_id || item.id || '',
            name: item.name,
            price: window.MM_API.moneyPaiseToRupees(item.unit_amount_paise || item.unitAmountPaise || 0),
            quantity: item.qty || item.quantity || 1,
            storeId: item.store_id || item.storeId || ''
          }))
        }));
        state.orders = [...apiOrders, ...state.orders.filter((local) => !apiOrders.some((api) => api.id === local.id))];
        persist();
        renderOrdersLocal();
      })
      .catch(() => renderOrdersLocal());
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

  container.querySelectorAll('.claim-refund').forEach((b) => b.addEventListener('click', async () => {
    const i = Number(b.getAttribute('data-idx'));
    const o = state.orders[i];
    const pct = Number(el(`refund-range-${i}`)?.value || 0);
    if (!window.MM_API?.token?.()) {
      window.location.href = `login.html?next=${encodeURIComponent(`support.html?order_id=${o?.id || ''}&type=refund`)}`;
      return;
    }
    try {
      await window.MM_API.createSupportTicket({
        order_id: o?.id || '',
        type: 'refund',
        refund_percent: pct,
        message: `Refund request for order ${o?.id || ''}: ${pct}%`
      });
      toast(`Refund request submitted: ${pct}%`, { type: 'ok', title: 'Support' });
      window.location.href = 'support.html';
    } catch (error) {
      toast(error.message || String(error), { type: 'bad', title: 'Support' });
    }
  }));
}

async function renderOrdersLegacyRemote() {
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
  if (window.MM_Marketplace?.renderReservationsPage) return window.MM_Marketplace.renderReservationsPage();
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

function autoshelfResearch() {
  return {
    findings: [
      {
        title: 'APIs exist, but coverage is patchy',
        body: 'GoFrugal exposes item-with-rate-and-stock and sales-order APIs; Zoho Inventory exposes item, SKU, location stock, and OAuth scopes. Good stores can sync. Weak stores still need fallback.'
      },
      {
        title: 'Desktop POS means local-agent work',
        body: 'TallyPrime can communicate over XML/HTTP and ODBC, but it requires Tally running locally with a loaded company and configured port. That is ops-heavy, not instant SaaS onboarding.'
      },
      {
        title: 'Google local inventory is a feed discipline problem',
        body: 'Local inventory listings need store codes, product IDs, availability values, price, and matching store data. It validates the need for strict inventory truth, not loose marketplace uploads.'
      },
      {
        title: 'Middleware is not the moat by itself',
        body: 'UrbanPiper and Unicommerce already prove aggregator/POS/ERP middleware. SmartMall has to win with mall execution, Rapid Shelf control, and better trust labels.'
      }
    ],
    ladder: [
      { level: 'L1', name: 'Direct API / OAuth', proof: 'GoFrugal, Zoho, Shopify-style inventory', risk: 'Vendor credentials, rate limits, SKU mapping', promise: 'POS synced' },
      { level: 'L2', name: 'CSV / Excel / Sheet / SFTP', proof: 'Works when POS exports data', risk: 'Stale sync and bad formatting', promise: 'Synced with penalty' },
      { level: 'L3', name: 'Local Windows agent', proof: 'Tally-style XML/HTTP or local export folder', risk: 'Install support, offline machines, security review', promise: 'Synced if fresh' },
      { level: 'L4', name: 'SmartMall Mini-POS', proof: 'Only listed products are tracked', risk: 'Staff forgets walk-in sales', promise: 'Confirmed today' },
      { level: 'L5', name: 'Rapid Shelf', proof: 'Physically separated, scanned in/out', risk: 'Needs space and operator discipline', promise: 'Hard fast delivery' }
    ],
    risks: [
      { name: 'Fake scale', detail: 'Publishing every SKU early will make search look big and operations fail.' },
      { name: 'Wrong write-back', detail: 'Pushing orders into POS too early can break billing, tax, and merchant trust.' },
      { name: 'Stale inventory', detail: 'A two-hour-old feed should not get the same label as scanned shelf stock.' },
      { name: 'Vendor dependency', detail: 'POS vendors help after merchant demand exists, not before.' }
    ],
    sources: [
      { label: 'GoFrugal API integration', href: 'https://community.gofrugal.com/portal/en/kb/gofrugalretaileasy/ecommerce-integration/api-integration/articles/api-integration' },
      { label: 'Zoho Inventory item API', href: 'https://www.zoho.com/inventory/api/v1/items/' },
      { label: 'TallyPrime integration', href: 'https://help.tallysolutions.com/integration-with-tallyprime/' },
      { label: 'Google local inventory specification', href: 'https://support.google.com/merchants/answer/14819809?hl=en-IN' },
      { label: 'UrbanPiper downstream overview', href: 'https://api-docs.urbanpiper.com/downstream/getting-started/overview' },
      { label: 'Unicommerce omnichannel retail', href: 'https://unicommerce.com/products/omnichannel-retail-management-system/' }
    ]
  };
}

function autoshelfTriageRecommendation(posAccess, discipline, fastPromise) {
  const pos = String(posAccess || 'none');
  const stock = String(discipline || 'weak');
  const fast = Boolean(fastPromise);
  if (fast) return 'Do not promise fast delivery from POS stock. Use the available connector only for discovery, then move selected SKUs into Rapid Shelf.';
  if (pos === 'api' && stock === 'strong') return 'Use direct API/OAuth read sync, selected product publishing, and reservation-only write-back after two weeks of clean mismatch data.';
  if (pos === 'api') return 'Use API read sync with safety buffers and daily staff confirmation. Hide products when sync freshness or mismatch reports degrade.';
  if (pos === 'export') return 'Use CSV/Sheet import with stale-sync penalties. Keep only 20-100 selected products visible until mismatch stays below 5%.';
  if (pos === 'local') return 'Use a local sync agent only for stores willing to keep the POS machine online and reviewed. No write-back until audit logs are trusted.';
  return 'Use Mini-POS for listed products only. If staff will not record walk-in sales, the store is browse-only or not worth onboarding yet.';
}

function renderAutoshelfOs(data) {
  const s = scoped(data);
  const container = el('autoshelf-root');
  if (!container) return;
  const ops = autoshelfState();
  const baseProducts = (s.products && s.products.length ? s.products : data.products || []);
  const customProductIds = new Set(baseProducts.map((p) => String(p.id)));
  const products = [...baseProducts, ...(state.customProducts || []).filter((p) => !customProductIds.has(String(p.id)))].slice(0, 120);
  const stores = s.stores && s.stores.length ? s.stores : data.stores || [];
  const trustedProducts = products.filter((p) => ['rapid', 'pos', 'mini'].includes(trustForProduct(p).key));
  const rapidProducts = products.filter((p) => trustForProduct(p).key === 'rapid');
  const staleProducts = products.filter((p) => ['stale', 'low', 'out'].includes(trustForProduct(p).key));
  const listedPct = products.length ? Math.round((trustedProducts.length / products.length) * 100) : 0;
  const connectorCoverage = stores.length ? Math.round((new Set(ops.connectors.map((c) => String(c.storeId))).size / stores.length) * 100) : 0;
  const productsById = new Map(products.map((p) => [String(p.id), p]));
  const research = autoshelfResearch();
  const scoreProduct = (p) => {
    const trust = trustForProduct(p);
    const marginProxy = Math.max(1, Math.round(((Number(p.originalPrice || 0) - Number(p.price || 0)) / Math.max(1, Number(p.originalPrice || p.price || 1))) * 100));
    return Math.min(99, trust.rank * 15 + Math.min(20, Number(p.rating || 0) * 4) + Math.min(20, marginProxy) + Math.min(14, productStockCount(p)));
  };
  const eventName = (type) => ({
    stock_in: 'Stock in',
    smartmall_sale: 'SmartMall sale',
    walk_in_sale: 'Walk-in sale',
    return: 'Return',
    damaged: 'Damaged',
    missing: 'Missing',
    scan_in: 'Rapid Shelf scan in',
    scan_out: 'Rapid Shelf scan out',
    pos_sync: 'POS sync'
  }[type] || String(type || 'Event'));

  container.innerHTML = `
    <div class="sm-os-shell">
      <section class="sm-os-hero">
        <div>
          <p class="sm-os-label">SmartMall Connect Hub</p>
          <h1>AutoShelf operations OS</h1>
          <p class="sm-os-lede">Control POS sync quality, Mini-POS confirmations, Rapid Shelf stock, and availability labels before promising fast delivery.</p>
        </div>
        <div class="sm-os-hero-actions">
          <a href="store-dashboard.html" class="sm-os-btn primary">${icon('barcode')} Store dashboard</a>
          <a href="docs/SmartMall_AutoShelf_30_Page_Plan.pdf" class="sm-os-btn">Plan PDF</a>
        </div>
      </section>

      <section class="sm-os-kpis">
        <div class="sm-kpi-grid">
          <article><span>${icon('shield')}</span><p>Trusted catalog</p><strong>${listedPct}%</strong><small>${trustedProducts.length} of ${products.length} SKUs pass trust rules</small></article>
          <article><span>${icon('sync')}</span><p>Connector coverage</p><strong>${connectorCoverage}%</strong><small>${ops.connectors.length} active connector paths</small></article>
          <article><span>${icon('box')}</span><p>Rapid Shelf units</p><strong>${ops.rapidShelf.reduce((sum, x) => sum + Number(x.qty || 0), 0)}</strong><small>${rapidProducts.length} products with hard fast stock</small></article>
          <article><span>${icon('activity')}</span><p>Risk queue</p><strong>${staleProducts.length}</strong><small>Low, stale, or out-of-stock labels</small></article>
        </div>
      </section>

      <div class="sm-os-grid">
        <div class="sm-os-main">
          <section class="sm-os-panel">
            <div class="sm-os-panel-head">
              <div><h2>Connector ladder</h2><p>Every store gets a source label based on how trustworthy the stock feed is.</p></div>
            </div>
            <div class="sm-connector-list">
              ${ops.connectors.map((c) => `
                <article class="sm-connector-card status-${escapeHtml(c.status)}">
                  <div>
                    <div class="sm-connector-title"><strong>${escapeHtml(c.storeName)}</strong><span>${escapeHtml(c.system)}</span></div>
                    <p>${escapeHtml(c.method)} - ${escapeHtml(c.writeBack)} write-back</p>
                  </div>
                  <div class="sm-connector-stats"><span>${c.products} SKUs</span><span>${c.accuracy}% accuracy</span><span>${c.lastSyncMins} min sync</span></div>
                  <button class="sm-os-mini-btn" type="button" data-sync-connector="${escapeHtml(c.id)}">${icon('sync')} Sync</button>
                </article>
              `).join('')}
            </div>
          </section>

          <section class="sm-os-panel">
            <div class="sm-os-panel-head">
              <div><h2>Publishing queue</h2><p>Selected products can be confirmed, buffered, or moved to Rapid Shelf.</p></div>
            </div>
            <div class="sm-product-queue">
              ${products.slice().sort((a, b) => scoreProduct(b) - scoreProduct(a)).slice(0, 8).map((p) => {
                const trust = trustForProduct(p);
                const selected = Boolean(ops.selectedProducts?.[p.id]);
                return `
                  <article class="sm-product-row">
                    <img src="${p.image || ''}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" />
                    <div>
                      <strong>${escapeHtml(p.name)}</strong>
                      <p>${escapeHtml(p.storeName || 'Store')} - ${money(p.price)}</p>
                      <div class="sm-row-badges">${trustBadge(trust)}<span>${trust.formula}</span><span>Score ${scoreProduct(p)}</span></div>
                    </div>
                    <div class="sm-product-actions">
                      <button class="sm-os-mini-btn ${selected ? 'done' : ''}" type="button" data-toggle-product="${escapeHtml(p.id)}">${selected ? 'Listed' : 'List'}</button>
                      <button class="sm-os-mini-btn rapid" type="button" data-mark-rapid="${escapeHtml(p.id)}">Rapid Shelf</button>
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          </section>

          <section class="sm-os-panel">
            <div class="sm-os-panel-head compact">
              <div><h2>Store intake triage</h2><p>Choose the onboarding path before accepting a merchant promise.</p></div>
            </div>
            <form id="autoshelf-triage-form" class="sm-triage-form">
              <input id="triage-store" value="${escapeHtml(ops.triage.storeName)}" placeholder="Store name" />
              <select id="triage-pos">
                ${[['api', 'Direct API'], ['export', 'CSV/export'], ['local', 'Local agent'], ['none', 'Mini-POS only']].map(([v, label]) => `<option value="${v}" ${ops.triage.posAccess === v ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
              <select id="triage-discipline">
                ${[['strong', 'Strong discipline'], ['medium', 'Medium discipline'], ['weak', 'Weak discipline']].map(([v, label]) => `<option value="${v}" ${ops.triage.discipline === v ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
              <label class="sm-triage-check"><input id="triage-fast" type="checkbox" ${ops.triage.fastPromise ? 'checked' : ''} /> Fast promise</label>
              <button type="submit" class="sm-os-btn primary">Re-score</button>
            </form>
            <div class="sm-triage-result"><strong>${escapeHtml(ops.triage.storeName || 'Store recommendation')}</strong><p>${escapeHtml(ops.triage.recommendation)}</p></div>
          </section>

          <section class="sm-os-panel">
            <div class="sm-os-panel-head compact">
              <div><h2>Reality research</h2><p>Operational constraints that shape the build plan.</p></div>
            </div>
            <div class="sm-research-grid">
              ${research.findings.map((x) => `<article><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.body)}</p></article>`).join('')}
            </div>
          </section>
        </div>

        <aside class="sm-os-side">
          <section class="sm-os-panel">
            <h2>Trust labels</h2>
            <div class="sm-label-stack mt-3">
              ${['rapid', 'pos', 'mini', 'low', 'stale', 'out'].map((key) => {
                const sample = { rapid: 'Controlled bin stock', pos: 'Recent POS feed', mini: 'Staff confirmed today', low: 'Manual confirmation needed', stale: 'Feed is old', out: 'Unavailable' }[key];
                const label = { rapid: 'Rapid Shelf', pos: 'POS synced', mini: 'Mini-POS managed', low: 'Low stock', stale: 'Stock stale', out: 'Out of stock' }[key];
                return `<div>${trustBadge({ tone: key, label })}<span>${sample}</span></div>`;
              }).join('')}
            </div>
          </section>

          <section class="sm-os-panel">
            <h2>Rapid Shelf</h2>
            <div class="sm-gate-list mt-3">
              ${ops.rapidShelf.map((u) => `
                <div>
                  <div><strong>${escapeHtml(u.bin)} - ${escapeHtml(u.productName)}</strong><span>${Number(u.qty || 0) - Number(u.reserved || 0)} sellable</span></div>
                  <div class="sm-os-progress"><span class="ok" style="width:${Math.max(8, Math.min(100, Number(u.qty || 0) * 5))}%"></span></div>
                </div>
              `).join('')}
            </div>
          </section>

          <section class="sm-os-panel">
            <h2>Event feed</h2>
            <div class="sm-event-feed mt-3">
              ${ops.stockEvents.slice(0, 6).map((ev) => `<article><span>${escapeHtml(eventName(ev.type))}</span><strong>${escapeHtml(ev.productName)}</strong><p>${escapeHtml(ev.source)} - ${Number(ev.qty || 0)} units - ${formatTimeAgo(ev.at)}</p></article>`).join('')}
            </div>
          </section>

          <section class="sm-os-panel">
            <h2>Risk notes</h2>
            <div class="sm-risk-list mt-3">
              ${research.risks.map((r) => `<article><strong>${escapeHtml(r.name)}</strong><p>${escapeHtml(r.detail)}</p></article>`).join('')}
            </div>
          </section>
        </aside>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-toggle-product]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = String(button.getAttribute('data-toggle-product') || '');
      if (!id) return;
      ops.selectedProducts[id] = !ops.selectedProducts[id];
      persist();
      renderAutoshelfOs(data);
    });
  });

  container.querySelectorAll('[data-mark-rapid]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = String(button.getAttribute('data-mark-rapid') || '');
      const product = productsById.get(id);
      if (!product) return;
      ops.trustOverrides[id] = 'rapid';
      ops.selectedProducts[id] = true;
      if (!ops.rapidShelf.some((unit) => String(unit.productId) === id)) {
        ops.rapidShelf.unshift({
          id: `RS-${Date.now()}`,
          productId: id,
          productName: product.name,
          storeName: product.storeName || 'Store',
          bin: `N${ops.rapidShelf.length + 1}`,
          qty: Math.max(1, productStockCount(product)),
          reserved: 0,
          status: 'sealed',
          lastScan: 'just now',
          sla: '45 min'
        });
      }
      ops.stockEvents.unshift({ id: `ev-${Date.now()}`, productId: id, productName: product.name, type: 'scan_in', qty: productStockCount(product), source: 'Rapid Shelf', actor: 'Ops lead', at: Date.now() });
      persist();
      renderAutoshelfOs(data);
    });
  });

  container.querySelectorAll('[data-sync-connector]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = String(button.getAttribute('data-sync-connector') || '');
      const connector = ops.connectors.find((c) => String(c.id) === id);
      if (!connector) return;
      connector.lastSyncMins = 1;
      connector.status = connector.status === 'manual' ? 'manual' : 'healthy';
      ops.syncLogs.unshift({ id: `sync-${Date.now()}`, connectorId: id, storeName: connector.storeName, status: 'success', message: `${connector.products} products checked and buffers refreshed.`, at: Date.now() });
      persist();
      renderAutoshelfOs(data);
    });
  });

  el('autoshelf-triage-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    ops.triage = {
      storeName: String(el('triage-store')?.value || 'New store').trim(),
      posAccess: String(el('triage-pos')?.value || 'none'),
      discipline: String(el('triage-discipline')?.value || 'weak'),
      fastPromise: Boolean(el('triage-fast')?.checked)
    };
    ops.triage.recommendation = autoshelfTriageRecommendation(ops.triage.posAccess, ops.triage.discipline, ops.triage.fastPromise);
    persist();
    renderAutoshelfOs(data);
  });
}

function renderConnectOs(data) {
  const s = scoped(data);
  const container = el('autoshelf-root');
  if (!container) return;

  const ops = autoshelfState();
  const products = (s.products && s.products.length ? s.products : data.products || []).slice(0, 120);
  const stores = s.stores && s.stores.length ? s.stores : data.stores || [];
  const productsById = new Map(products.map((p) => [String(p.id), p]));
  const research = autoshelfResearch();
  const trustedProducts = products.filter((p) => ['rapid', 'pos', 'mini'].includes(trustForProduct(p).key));
  const rapidProducts = products.filter((p) => trustForProduct(p).key === 'rapid');
  const staleProducts = products.filter((p) => ['stale', 'low', 'out'].includes(trustForProduct(p).key));
  const listedPct = products.length ? Math.round((trustedProducts.length / products.length) * 100) : 0;
  const connectorCoverage = stores.length ? Math.round((new Set(ops.connectors.map((c) => String(c.storeId))).size / stores.length) * 100) : 0;
  const totalRapidSellable = ops.rapidShelf.reduce((sum, x) => sum + Math.max(0, Number(x.qty || 0) - Number(x.reserved || 0)), 0);
  const selectedCount = Object.values(ops.selectedProducts || {}).filter(Boolean).length;
  const checklistDone = (ops.checklist || []).filter((x) => x.done).length;
  const openIncidents = (ops.incidents || []).filter((x) => x.status !== 'resolved').length;
  const breachedLanes = (ops.slaLanes || []).filter((x) => ['breach', 'watch'].includes(x.status)).length;
  const testedSystems = (ops.posSystems || []).filter((x) => x.status === 'tested').length;
  const activeView = window.__mmConnectView || 'mvp';

  const scoreProduct = (p) => {
    const trust = trustForProduct(p);
    const marginProxy = Math.max(1, Math.round(((Number(p.originalPrice || 0) - Number(p.price || 0)) / Math.max(1, Number(p.originalPrice || p.price || 1))) * 100));
    return Math.min(99, trust.rank * 15 + Math.min(20, Number(p.rating || 0) * 4) + Math.min(20, marginProxy) + Math.min(14, productStockCount(p)));
  };
  const eventName = (type) => ({
    stock_in: 'Stock in',
    smartmall_sale: 'SmartMall sale',
    walk_in_sale: 'Walk-in sale',
    return: 'Return',
    damaged: 'Damaged',
    missing: 'Missing',
    scan_in: 'Rapid Shelf scan in',
    scan_out: 'Rapid Shelf scan out',
    pos_sync: 'POS sync'
  }[type] || String(type || 'Event'));
  const sortedProducts = products.slice().sort((a, b) => scoreProduct(b) - scoreProduct(a));
  const heroProduct = sortedProducts[0] || products[0] || {};
  const heroTrust = trustForProduct(heroProduct);
  const pilotReadiness = Math.min(98, Math.round((listedPct * 0.45) + (connectorCoverage * 0.3) + (Math.min(100, totalRapidSellable * 2) * 0.25)));
  const viewButton = (view, label) => `<button type="button" class="connect-tab ${activeView === view ? 'active' : ''}" data-connect-view="${view}">${label}</button>`;
  const hidden = (view) => activeView === view ? '' : ' hidden';
  const statusTone = (status) => status === 'breach' ? 'breach' : status === 'watch' ? 'watch' : 'ok';

  container.innerHTML = `
    <div class="connect-os">
      <section class="connect-hero">
        <div class="connect-hero-copy">
          <h1>SmartMall Connect OS</h1>
          <p>A realistic path from hyperlocal marketplace MVP to the larger ConnectOS smart commerce ecosystem.</p>
          <div class="connect-hero-actions">
            <button type="button" class="connect-btn primary connect-btn-xl" data-open-mvp>${icon('shield')} Build Phase 1 MVP</button>
            <button type="button" class="connect-btn" data-run-sync>${icon('sync')} Run pilot sync</button>
            <a href="store-dashboard.html" class="connect-btn">${icon('barcode')} Store console</a>
            <a href="docs/SmartMall_AutoShelf_30_Page_Plan.pdf" class="connect-link">Open plan PDF</a>
          </div>
          <div class="connect-thesis">
            <strong>Do not start with enterprise complexity.</strong>
            <span>Start with three pilot stores, QR storefronts, manual inventory, and AI-ready catalog media. POS sync becomes a later phase.</span>
          </div>
        </div>
        <div class="connect-hero-visual" aria-label="SmartMall Connect live inventory preview">
          <div class="connect-mall-photo"></div>
          <div class="connect-live-panel">
            <div class="connect-live-head"><span>Live promise engine</span><strong>${pilotReadiness}% ready</strong></div>
            <div class="connect-flow">
              <div><b>1</b><span>Manual store onboarding</span></div>
              <div><b>2</b><span>AI media polish</span></div>
              <div><b>3</b><span>QR storefronts</span></div>
              <div><b>4</b><span>Future POS sync</span></div>
            </div>
            <div class="connect-featured-item">
              <img src="${localSafeImage(heroProduct.image)}" alt="${escapeHtml(heroProduct.name || 'Featured product')}" loading="lazy" decoding="async" />
              <div>
                <p>${escapeHtml(heroProduct.name || 'Pilot product')}</p>
                <strong>${heroTrust.sellableStock} sellable after buffers</strong>
                <small>${escapeHtml(heroTrust.formula)}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="connect-metrics">
        <article><span>MVP pilot stores</span><strong>3</strong><small>Manual onboarding before integrations</small></article>
        <article><span>QR growth loop</span><strong>1/store</strong><small>Offline visitors become online users</small></article>
        <article><span>Catalog readiness</span><strong>${listedPct}%</strong><small>${trustedProducts.length} SKUs safe to publish</small></article>
        <article><span>Launch control</span><strong>${openIncidents}</strong><small>${checklistDone}/${ops.checklist.length} gates done, ${breachedLanes} SLA watch lanes</small></article>
      </section>

      <section class="connect-stage">
        <div class="connect-stage-head">
          <div>
            <h2>One operating system for mall commerce truth</h2>
            <p>Connect stores, classify inventory truth, then only promise what the mall can actually fulfill.</p>
          </div>
          <div class="connect-tabs" role="tablist" aria-label="Connect OS views">
            ${viewButton('mvp', 'MVP')}
            ${viewButton('control', 'Control')}
            ${viewButton('workflow', 'Workflow')}
            ${viewButton('inventory', 'Inventory')}
            ${viewButton('risk', 'Risk')}
          </div>
        </div>

        <div class="connect-view${hidden('mvp')}" data-view-panel="mvp">
          <div class="connect-mvp-grid">
            <section class="connect-board connect-mvp-brief">
              <div class="connect-board-head">
                <div><h3>Phased implementation model</h3><p>ConnectOS remains the vision, but Phase 1 is a practical marketplace MVP that can launch with limited resources.</p></div>
              </div>
              <div class="connect-roadmap">
                <article class="active"><b>1</b><div><strong>Hyperlocal Marketplace MVP</strong><span>3 pilot stores, manual product upload, inventory visibility, QR storefronts, AI media polish.</span></div></article>
                <article><b>2</b><div><strong>Smart Operations Layer</strong><span>Store dashboards, better analytics, offer management, support workflow, delivery and pickup controls.</span></div></article>
                <article><b>3</b><div><strong>ConnectOS Ecosystem</strong><span>POS integrations, CRM, vendor workflows, payment intelligence, enterprise partnerships.</span></div></article>
              </div>
            </section>

            <section class="connect-board">
              <div class="connect-board-head">
                <div><h3>Phase 1 working scope</h3><p>Everything here can work without enterprise partnerships.</p></div>
              </div>
              <div class="connect-scope-list">
                <article><strong>Manual store onboarding</strong><span>Owner creates store profile, address, hours, categories, and product list.</span></article>
                <article><strong>AI-ready catalog media</strong><span>Uploaded phone photos/videos are enhanced, cropped, background-optimized, and formatted.</span></article>
                <article><strong>QR storefront acquisition</strong><span>Each store gets a QR code that turns walk-in customers into online visitors.</span></article>
                <article><strong>Nearby customer discovery</strong><span>Customers browse available local products before visiting or ordering.</span></article>
              </div>
            </section>

            <section class="connect-board connect-mvp-warning">
              <h3>What not to build first</h3>
              <p>Do not make Phase 1 depend on Zoho, Tally, Petpooja, or other POS partnerships. Treat integrations as Phase 3 after usage is proven.</p>
            </section>
          </div>
        </div>

        <div class="connect-view${hidden('control')}" data-view-panel="control">
          <div class="connect-command-grid">
            <section class="connect-board connect-launch">
              <div class="connect-board-head">
                <div><h3>Launch command</h3><p>Keep the pilot launchable with operational gates, SLA control, and incident burn-down.</p></div>
              </div>
              <div class="connect-launch-score">
                <strong>${Math.round(((checklistDone / Math.max(1, ops.checklist.length)) * 45) + (pilotReadiness * 0.35) + (Math.max(0, 3 - openIncidents) * 6.6))}%</strong>
                <span>launch confidence</span>
              </div>
              <div class="connect-checklist">
                ${(ops.checklist || []).map((item) => `
                  <button type="button" class="${item.done ? 'done' : ''}" data-toggle-check="${escapeHtml(item.id)}">
                    <span>${item.done ? 'Done' : 'Todo'}</span>
                    <strong>${escapeHtml(item.label)}</strong>
                    <em>${escapeHtml(item.owner)}</em>
                  </button>
                `).join('')}
              </div>
            </section>

            <section class="connect-board">
              <div class="connect-board-head">
                <div><h3>Fulfillment SLA</h3><p>Simulated floor lanes that affect the public delivery promise.</p></div>
              </div>
              <div class="connect-sla-list">
                ${(ops.slaLanes || []).map((lane) => `
                  <article class="${statusTone(lane.status)}">
                    <div>
                      <strong>${escapeHtml(lane.name)}</strong>
                      <span>${lane.currentMins} min actual / ${lane.targetMins} min target</span>
                    </div>
                    <button type="button" data-speed-lane="${escapeHtml(lane.id)}">Recover</button>
                  </article>
                `).join('')}
              </div>
            </section>

            <section class="connect-board">
              <div class="connect-board-head">
                <div><h3>Incident queue</h3><p>Open blockers before Connect OS can promise faster delivery.</p></div>
                <strong class="connect-count">${openIncidents} open</strong>
              </div>
              <div class="connect-incident-list">
                ${(ops.incidents || []).map((incident) => `
                  <article class="${incident.status === 'resolved' ? 'resolved' : escapeHtml(incident.severity)}">
                    <div>
                      <span>${escapeHtml(incident.severity)}</span>
                      <strong>${escapeHtml(incident.title)}</strong>
                      <em>${escapeHtml(incident.owner)}</em>
                    </div>
                    ${incident.status === 'resolved' ? '<b>Resolved</b>' : `<button type="button" data-resolve-incident="${escapeHtml(incident.id)}">Resolve</button>`}
                  </article>
                `).join('')}
              </div>
            </section>

            <section class="connect-board">
              <div class="connect-board-head">
                <div><h3>Connector log</h3><p>The latest sync events from APIs, CSV feeds, and Mini-POS.</p></div>
              </div>
              <div class="connect-sync-log">
                ${(ops.syncLogs || []).slice(0, 5).map((log) => `
                  <article>
                    <strong>${escapeHtml(log.storeName)}</strong>
                    <span>${escapeHtml(log.message)}</span>
                    <em>${formatTimeAgo(log.at)}</em>
                  </article>
                `).join('')}
              </div>
            </section>
          </div>
        </div>

        <div class="connect-view${hidden('workflow')}" data-view-panel="workflow">
          <div class="connect-pos-panel">
            <div class="connect-board-head">
              <div><h3>Can we connect to existing POS systems?</h3><p>Yes, with four lanes: direct API, OAuth inventory API, local bridge, and export/Mini-POS fallback.</p></div>
              <div class="connect-head-actions">
                <strong class="connect-count">${testedSystems}/${ops.posSystems.length} tested</strong>
                <button type="button" class="connect-btn primary" data-connect-all-systems>${icon('sync')} Prepare pilot lanes</button>
              </div>
            </div>
            <div class="connect-one-click">
              <strong>Pilot-readiness check</strong>
              <span>For demo mode, this validates each integration lane. In production, each POS still needs credentials, permissions, or partner approval.</span>
            </div>
            <div class="connect-pos-grid">
              ${(ops.posSystems || []).map((system) => `
                <article class="${escapeHtml(system.feasibility)}">
                  <div class="connect-pos-top">
                    <strong>${escapeHtml(system.name)}</strong>
                    <span>${escapeHtml(system.route)}</span>
                  </div>
                  <p>${escapeHtml(system.requirement)}</p>
                  <small>${escapeHtml(system.proof)}</small>
                  <button type="button" class="${system.status === 'tested' ? 'done' : ''}" data-test-pos="${escapeHtml(system.id)}">${system.status === 'tested' ? 'Validated' : 'Mark test passed'}</button>
                </article>
              `).join('')}
            </div>
          </div>

          <div class="connect-pipeline">
            <article>
              <span>${icon('sync')}</span>
              <h3>Connect store systems</h3>
              <p>Use direct APIs where possible, CSV exports when needed, and Mini-POS when the merchant has no reliable feed.</p>
              <div class="connect-feed-list">
                ${ops.connectors.map((c) => `
                  <button type="button" class="connect-feed ${escapeHtml(c.status)}" data-sync-connector="${escapeHtml(c.id)}">
                    <strong>${escapeHtml(c.storeName)}</strong>
                    <span>${escapeHtml(c.method)} - ${c.lastSyncMins} min ago</span>
                  </button>
                `).join('')}
              </div>
            </article>
            <article>
              <span>${icon('shield')}</span>
              <h3>Calculate sellable truth</h3>
              <p>Every SKU gets a visible trust label and a formula shoppers never see but operations can defend.</p>
              <div class="connect-formula-card">
                ${trustBadge(heroTrust)}
                <strong>${heroTrust.sellableStock} sellable</strong>
                <p>${escapeHtml(heroTrust.formula)}</p>
              </div>
              <div class="connect-label-grid">
                ${['rapid', 'pos', 'mini', 'low', 'stale', 'out'].map((key) => {
                  const label = { rapid: 'Rapid Shelf', pos: 'POS synced', mini: 'Mini-POS', low: 'Confirm', stale: 'Stale', out: 'Out' }[key];
                  return trustBadge({ tone: key, label });
                }).join('')}
              </div>
            </article>
            <article>
              <span>${icon('box')}</span>
              <h3>Move winners to Rapid Shelf</h3>
              <p>Fast-moving products are physically separated, scanned in, and protected from walk-in stock drift.</p>
              <div class="connect-bin-list">
                ${ops.rapidShelf.slice(0, 4).map((u) => `
                  <div>
                    <strong>${escapeHtml(u.bin)}</strong>
                    <span>${escapeHtml(u.productName)}</span>
                    <em>${Math.max(0, Number(u.qty || 0) - Number(u.reserved || 0))} sellable</em>
                  </div>
                `).join('')}
              </div>
            </article>
          </div>
        </div>

        <div class="connect-view${hidden('inventory')}" data-view-panel="inventory">
          <div class="connect-inventory-layout">
            <section class="connect-board">
              <div class="connect-board-head">
                <div><h3>Pilot publishing queue</h3><p>Ranked by trust, margin signal, rating, and tracked stock.</p></div>
                <a href="products.html" class="connect-link">View shopper catalog</a>
              </div>
              <div class="connect-product-list">
                ${sortedProducts.slice(0, 7).map((p) => {
                  const trust = trustForProduct(p);
                  const selected = Boolean(ops.selectedProducts?.[p.id]);
                  return `
                    <article class="connect-product-row">
                      <img src="${localSafeImage(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" />
                      <div class="connect-product-main">
                        <strong>${escapeHtml(p.name)}</strong>
                        <span>${escapeHtml(p.storeName || 'Store')} - ${money(p.price)}</span>
                        <div>${trustBadge(trust)}<small>Score ${scoreProduct(p)}</small><small>${trust.sellableStock} sellable</small></div>
                      </div>
                      <div class="connect-product-actions">
                        <button class="connect-mini-btn ${selected ? 'done' : ''}" type="button" data-toggle-product="${escapeHtml(p.id)}">${selected ? 'Listed' : 'List'}</button>
                        <button class="connect-mini-btn rapid" type="button" data-mark-rapid="${escapeHtml(p.id)}">Rapid</button>
                      </div>
                    </article>
                  `;
                }).join('')}
              </div>
            </section>
            <aside class="connect-board connect-intake">
              <h3>Store intake simulator</h3>
              <p>Score a new merchant before you let them promise delivery.</p>
              <form id="autoshelf-triage-form" class="connect-intake-form">
                <input id="triage-store" value="${escapeHtml(ops.triage.storeName)}" placeholder="Store name" />
                <select id="triage-pos">
                  ${[['api', 'Direct API'], ['export', 'CSV/export'], ['local', 'Local agent'], ['none', 'Mini-POS only']].map(([v, label]) => `<option value="${v}" ${ops.triage.posAccess === v ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
                <select id="triage-discipline">
                  ${[['strong', 'Strong discipline'], ['medium', 'Medium discipline'], ['weak', 'Weak discipline']].map(([v, label]) => `<option value="${v}" ${ops.triage.discipline === v ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
                <label><input id="triage-fast" type="checkbox" ${ops.triage.fastPromise ? 'checked' : ''} /> Wants fast delivery promise</label>
                <button type="submit" class="connect-btn primary">Re-score store</button>
              </form>
              <div class="connect-recommendation">
                <strong>${escapeHtml(ops.triage.storeName || 'Store recommendation')}</strong>
                <p>${escapeHtml(ops.triage.recommendation)}</p>
              </div>
            </aside>
          </div>
        </div>

        <div class="connect-view${hidden('risk')}" data-view-panel="risk">
          <div class="connect-risk-layout">
            <section class="connect-board">
              <div class="connect-board-head">
                <div><h3>Risk control board</h3><p>The page is designed around what can break mall commerce.</p></div>
              </div>
              <div class="connect-risk-grid">
                ${research.risks.map((r) => `<article><strong>${escapeHtml(r.name)}</strong><p>${escapeHtml(r.detail)}</p></article>`).join('')}
              </div>
            </section>
            <section class="connect-board">
              <div class="connect-board-head">
                <div><h3>Evidence ladder</h3><p>Inventory promises improve as stores move up the ladder.</p></div>
              </div>
              <div class="connect-ladder">
                ${research.ladder.map((x) => `
                  <article>
                    <b>${escapeHtml(x.level)}</b>
                    <div><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(x.proof)}</span></div>
                    <em>${escapeHtml(x.promise)}</em>
                  </article>
                `).join('')}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section class="connect-footer-grid">
        <div class="connect-event-stream">
          <div class="connect-board-head"><div><h3>Live event stream</h3><p>Operational movement that changes shopper promises.</p></div></div>
          <div>
            ${ops.stockEvents.slice(0, 5).map((ev) => `<article><span>${escapeHtml(eventName(ev.type))}</span><strong>${escapeHtml(ev.productName)}</strong><p>${escapeHtml(ev.source)} - ${Number(ev.qty || 0)} units - ${formatTimeAgo(ev.at)}</p></article>`).join('')}
          </div>
        </div>
        <div class="connect-research">
          <div class="connect-board-head"><div><h3>Why this is the product</h3><p>SmartMall wins by controlling availability truth, not by uploading every SKU.</p></div></div>
          <div>
            ${research.findings.map((x) => `<article><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.body)}</p></article>`).join('')}
          </div>
        </div>
      </section>
    </div>
  `;

  container.onclick = (e) => {
    const target = e.target?.closest?.('[data-connect-view], [data-open-mvp], [data-run-sync], [data-connect-all-systems], [data-toggle-product], [data-mark-rapid], [data-sync-connector], [data-toggle-check], [data-speed-lane], [data-resolve-incident], [data-test-pos]');
    if (!target || !container.contains(target)) return;

    if (target.matches('[data-connect-view]')) {
      window.__mmConnectView = String(target.getAttribute('data-connect-view') || 'workflow');
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-open-mvp]')) {
      window.__mmConnectView = 'mvp';
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-run-sync]')) {
      const currentOps = autoshelfState();
      currentOps.connectors = currentOps.connectors.map((c) => ({ ...c, lastSyncMins: 1, status: c.status === 'manual' ? 'manual' : 'healthy' }));
      currentOps.syncLogs.unshift({ id: `sync-${Date.now()}`, connectorId: 'pilot-run', storeName: 'Pilot stores', status: 'success', message: 'All connector paths refreshed and trust buffers recalculated.', at: Date.now() });
      currentOps.stockEvents.unshift({ id: `ev-${Date.now()}`, productId: heroProduct.id || 'pilot', productName: heroProduct.name || 'Pilot queue', type: 'pos_sync', qty: trustedProducts.length, source: 'Connect OS', actor: 'Ops lead', at: Date.now() });
      persist();
      toast('Pilot sync completed. Trust labels refreshed.', { type: 'ok', title: 'Connect OS' });
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-connect-all-systems]')) {
      const currentOps = autoshelfState();
      currentOps.posSystems = currentOps.posSystems.map((system) => ({ ...system, status: 'tested' }));
      currentOps.connectors = currentOps.connectors.map((connector) => ({
        ...connector,
        lastSyncMins: 1,
        status: connector.status === 'manual' ? 'manual' : 'healthy'
      }));
      currentOps.checklist = currentOps.checklist.map((item) => (
        ['catalog', 'webhook'].includes(item.id) ? { ...item, done: true } : item
      ));
      currentOps.incidents = currentOps.incidents.map((incident) => (
        incident.id === 'inc-feed-luxe' ? { ...incident, status: 'resolved' } : incident
      ));
      currentOps.syncLogs.unshift({
        id: `sync-${Date.now()}`,
        connectorId: 'one-click-pos',
        storeName: 'One-click POS connector',
        status: 'success',
        message: `${currentOps.posSystems.length} POS lanes prepared for pilot planning, ${currentOps.connectors.length} connector feeds refreshed, Mini-POS fallback kept active.`,
        at: Date.now()
      });
      currentOps.stockEvents.unshift({
        id: `ev-${Date.now()}`,
        productId: 'connect-all',
        productName: 'All POS systems',
        type: 'pos_sync',
        qty: currentOps.posSystems.length,
        source: 'Connect OS one-click',
        actor: 'Ops lead',
        at: Date.now()
      });
      persist();
      window.__mmConnectView = 'workflow';
      toast('POS lanes prepared for pilot planning.', { type: 'ok', title: 'Connect OS' });
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-toggle-product]')) {
      const id = String(target.getAttribute('data-toggle-product') || '');
      if (!id) return;
      const currentOps = autoshelfState();
      currentOps.selectedProducts[id] = !currentOps.selectedProducts[id];
      persist();
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-mark-rapid]')) {
      const id = String(target.getAttribute('data-mark-rapid') || '');
      const product = productsById.get(id);
      if (!product) return;
      const currentOps = autoshelfState();
      currentOps.trustOverrides[id] = 'rapid';
      currentOps.selectedProducts[id] = true;
      if (!currentOps.rapidShelf.some((unit) => String(unit.productId) === id)) {
        currentOps.rapidShelf.unshift({
          id: `RS-${Date.now()}`,
          productId: id,
          productName: product.name,
          storeName: product.storeName || 'Store',
          bin: `N${currentOps.rapidShelf.length + 1}`,
          qty: Math.max(1, productStockCount(product)),
          reserved: 0,
          status: 'sealed',
          lastScan: 'just now',
          sla: '45 min'
        });
      }
      currentOps.stockEvents.unshift({ id: `ev-${Date.now()}`, productId: id, productName: product.name, type: 'scan_in', qty: productStockCount(product), source: 'Rapid Shelf', actor: 'Ops lead', at: Date.now() });
      persist();
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-sync-connector]')) {
      const id = String(target.getAttribute('data-sync-connector') || '');
      const currentOps = autoshelfState();
      const connector = currentOps.connectors.find((c) => String(c.id) === id);
      if (!connector) return;
      connector.lastSyncMins = 1;
      connector.status = connector.status === 'manual' ? 'manual' : 'healthy';
      currentOps.syncLogs.unshift({ id: `sync-${Date.now()}`, connectorId: id, storeName: connector.storeName, status: 'success', message: `${connector.products} products checked and buffers refreshed.`, at: Date.now() });
      persist();
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-toggle-check]')) {
      const id = String(target.getAttribute('data-toggle-check') || '');
      const currentOps = autoshelfState();
      const item = currentOps.checklist.find((x) => String(x.id) === id);
      if (!item) return;
      item.done = !item.done;
      currentOps.syncLogs.unshift({ id: `sync-${Date.now()}`, connectorId: 'launch-gate', storeName: 'Launch control', status: item.done ? 'success' : 'watch', message: `${item.label} marked ${item.done ? 'done' : 'todo'}.`, at: Date.now() });
      persist();
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-speed-lane]')) {
      const id = String(target.getAttribute('data-speed-lane') || '');
      const currentOps = autoshelfState();
      const lane = currentOps.slaLanes.find((x) => String(x.id) === id);
      if (!lane) return;
      lane.currentMins = Math.max(1, Number(lane.targetMins || 1) - 1);
      lane.status = 'on-track';
      currentOps.stockEvents.unshift({ id: `ev-${Date.now()}`, productId: id, productName: `${lane.name} lane`, type: 'smartmall_sale', qty: lane.currentMins, source: 'Connect OS SLA', actor: 'Floor lead', at: Date.now() });
      persist();
      toast(`${lane.name} lane recovered.`, { type: 'ok', title: 'SLA' });
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-resolve-incident]')) {
      const id = String(target.getAttribute('data-resolve-incident') || '');
      const currentOps = autoshelfState();
      const incident = currentOps.incidents.find((x) => String(x.id) === id);
      if (!incident) return;
      incident.status = 'resolved';
      currentOps.syncLogs.unshift({ id: `sync-${Date.now()}`, connectorId: 'incident', storeName: 'Incident queue', status: 'success', message: `${incident.title} resolved by ${incident.owner}.`, at: Date.now() });
      persist();
      toast('Incident resolved.', { type: 'ok', title: 'Connect OS' });
      renderConnectOs(data);
      return;
    }

    if (target.matches('[data-test-pos]')) {
      const id = String(target.getAttribute('data-test-pos') || '');
      const currentOps = autoshelfState();
      const system = currentOps.posSystems.find((x) => String(x.id) === id);
      if (!system) return;
      system.status = 'tested';
      currentOps.syncLogs.unshift({ id: `sync-${Date.now()}`, connectorId: id, storeName: system.name, status: 'success', message: `${system.route} connection path validated for pilot use.`, at: Date.now() });
      persist();
      toast(`${system.name} path validated.`, { type: 'ok', title: 'POS connection' });
      renderConnectOs(data);
    }
  };

  el('autoshelf-triage-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentOps = autoshelfState();
    currentOps.triage = {
      storeName: String(el('triage-store')?.value || 'New store').trim(),
      posAccess: String(el('triage-pos')?.value || 'none'),
      discipline: String(el('triage-discipline')?.value || 'weak'),
      fastPromise: Boolean(el('triage-fast')?.checked)
    };
    currentOps.triage.recommendation = autoshelfTriageRecommendation(currentOps.triage.posAccess, currentOps.triage.discipline, currentOps.triage.fastPromise);
    persist();
    window.__mmConnectView = 'inventory';
    renderConnectOs(data);
  });
}

function showReceiptModal(receiptData) {
  const existing = document.getElementById('pos-receipt-modal');
  if (existing) existing.remove();

  const storeName = receiptData.store?.name || receiptData.store_name || "MallMaze Retail Store";
  const storeAddress = receiptData.store?.address || "Shop #12, Ground Floor, Central Mall, Hyderabad";
  const invoiceNo = receiptData.invoice_no || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = new Date(receiptData.created_at || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const items = receiptData.items || [];
  const subtotal = Math.round((receiptData.subtotal_paise || ((receiptData.total_inr || 0) * 100)) / 100);
  const tax = Math.round((receiptData.tax_paise || (subtotal * 0.18 * 100)) / 100);
  const discount = receiptData.discount_inr || 0;
  const total = Math.round((receiptData.total_paise || ((subtotal + tax - discount) * 100)) / 100);
  const tendered = receiptData.tendered_inr || (total + (receiptData.payment_mode === 'Cash' ? 500 : 0));
  const change = Math.max(0, tendered - total);

  const modal = document.createElement('div');
  modal.id = 'pos-receipt-modal';
  modal.className = 'pos-modal-overlay';
  modal.innerHTML = `
    <div class="receipt-paper">
      <div class="receipt-header">
        <p class="receipt-logo-title">🏬 ${escapeHtml(storeName)}</p>
        <p style="font-size:0.72rem;margin-top:0.2rem;color:#334155">${escapeHtml(storeAddress)}</p>
        <p style="font-size:0.7rem;margin-top:0.3rem;font-weight:bold">TAX INVOICE / POS RECEIPT</p>
        <p style="font-size:0.68rem;color:#475569">GSTIN: 36AAACM1234F1Z9 · FSSAI: 1362101100021</p>
      </div>
      <div style="font-size:0.73rem;line-height:1.4">
        <div class="flex justify-between"><span><strong>Bill #:</strong> ${escapeHtml(invoiceNo)}</span><span><strong>Terminal:</strong> POS-01</span></div>
        <div class="flex justify-between"><span><strong>Date:</strong> ${escapeHtml(dateStr)}</span><span><strong>Cashier:</strong> Admin</span></div>
        <div class="flex justify-between"><span><strong>Customer:</strong> ${escapeHtml(receiptData.customer_name || 'Walk-in')}</span><span><strong>Mode:</strong> ${escapeHtml(receiptData.payment_mode || 'Cash')}</span></div>
      </div>
      <div class="receipt-divider"></div>
      <table class="receipt-table" style="width:100%;border-collapse:collapse;font-size:0.73rem">
        <thead>
          <tr style="border-bottom:1px solid #000">
            <th style="text-align:left">Item / HSN</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Rate</th>
            <th style="text-align:right">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr>
              <td>
                <div style="font-weight:bold">${escapeHtml(it.name)}</div>
                <div style="font-size:0.65rem;color:#64748b">HSN: 610910 · GST @18%</div>
              </td>
              <td style="text-align:center;vertical-align:top">${it.qty}</td>
              <td style="text-align:right;vertical-align:top">${money(it.unit_price_inr || it.price)}</td>
              <td style="text-align:right;vertical-align:top">${money(it.line_total_inr || (it.qty * (it.unit_price_inr || it.price)))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="receipt-divider"></div>
      <div style="font-size:0.73rem;line-height:1.4">
        <div class="flex justify-between"><span>Subtotal:</span><span>${money(subtotal)}</span></div>
        <div class="flex justify-between"><span>CGST (9%):</span><span>${money(Math.round(tax / 2))}</span></div>
        <div class="flex justify-between"><span>SGST (9%):</span><span>${money(Math.round(tax / 2))}</span></div>
        ${discount > 0 ? `<div class="flex justify-between" style="color:#b91c1c"><span>Discount Applied:</span><span>-${money(discount)}</span></div>` : ''}
        <div class="receipt-divider"></div>
        <div class="flex justify-between" style="font-size:0.95rem;font-weight:900"><span>TOTAL PAYABLE:</span><span>${money(total)}</span></div>
        ${receiptData.payment_mode === 'Cash' ? `
          <div class="flex justify-between mt-1" style="font-size:0.72rem;color:#475569"><span>Cash Tendered:</span><span>${money(tendered)}</span></div>
          <div class="flex justify-between" style="font-size:0.72rem;color:#15803d;font-weight:bold"><span>Change Returned:</span><span>${money(change)}</span></div>
        ` : ''}
      </div>
      <div class="receipt-divider"></div>
      <div class="receipt-barcode">*${escapeHtml(invoiceNo)}*</div>
      <p style="text-align:center;font-size:0.68rem;margin-top:0.4rem;color:#475569">Thank you for shopping at ${escapeHtml(storeName)}!<br/>Returns accepted within 7 days with valid bill.</p>
      <div class="receipt-actions">
        <button type="button" id="print-pos-receipt" class="sm-os-btn primary flex-1 font-bold">🖨️ Print Receipt</button>
        <button type="button" id="close-pos-receipt" class="sm-os-btn flex-1">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('print-pos-receipt')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('close-pos-receipt')?.addEventListener('click', () => {
    modal.remove();
  });
}

function exportTallyXml(storeName, vList) {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeHtml(storeName || "MallMaze Store")}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
`;

  const xmlFooter = `
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  const xmlBody = (vList || []).map((v, idx) => `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${v.type === 'purchase' ? 'Purchase' : 'Sales'}" ACTION="Create">
            <DATE>${v.date || '20260831'}</DATE>
            <VOUCHERTYPENAME>${v.type === 'purchase' ? 'Purchase' : 'Sales'}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeHtml(v.invoice_no || `VCH-${idx+1}`)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${escapeHtml(v.party || (v.type === 'purchase' ? 'Sundry Creditors' : 'Cash/Walk-in'))}</PARTYLEDGERNAME>
            <AMOUNT>-${v.amount}</AMOUNT>
          </VOUCHER>
        </TALLYMESSAGE>`).join('\n');

  const fullXml = xmlHeader + xmlBody + xmlFooter;
  const blob = new Blob([fullXml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tally_Vouchers_${(storeName || 'Store').replace(/\s+/g, '_')}_${Date.now()}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderStoreDashboard(data) {
  const container = el('dashboard-container');
  if (!container) return;
  if (window.MM_API?.hasApi?.()) {
    renderStoreDashboardApi(data).catch(() => renderStoreDashboardLocal(data));
    return;
  }
  renderStoreDashboardLocal(data);
}

async function renderStoreDashboardApi(data) {
  const container = el('dashboard-container');
  if (!container) return;
  container.innerHTML = '<p class="mm-payout-empty">Loading store dashboard…</p>';
  const urlStoreId = new URLSearchParams(location.search).get('store') || '';
  let stores = [];
  let analytics = null;
  let payoutData = null;
  try {
    const mine = await window.MM_API.myStores();
    stores = mine.stores || [];
  } catch {
    stores = (data.stores || []).filter((s) => s.virtualSource || !s.mallId);
  }
  const selectedStore = stores.find((st) => String(st.id) === String(urlStoreId)) || stores[0] || null;
  if (selectedStore?.id) {
    try { analytics = await window.MM_API.storeAnalytics(selectedStore.id); } catch {}
    try { payoutData = await window.MM_API.storePayouts(selectedStore.id); } catch {}
  }
  const products = selectedStore?.products || (data.products || []).filter((p) => String(p.storeId || p.store_id) === String(selectedStore?.id));
  const storeOptions = stores.map((st) => `<option value="${escapeHtml(st.id)}" ${String(st.id) === String(selectedStore?.id) ? 'selected' : ''}>${escapeHtml(st.name)} (${escapeHtml(st.verification_status || 'pending')})</option>`).join('');
  const verifyStatus = String(selectedStore?.verification_status || 'pending').toLowerCase();
  const verifyClass = verifyStatus === 'verified' ? 'verified' : verifyStatus === 'rejected' ? 'rejected' : 'pending';
  const payoutClass = selectedStore?.payout_ready ? 'payout-active' : 'payout-pending';
  const payoutRows = (payoutData?.payouts || []).slice(0, 12);
  container.innerHTML = `
    <div class="mm-dash-shell">
      <header class="mm-dash-hero">
        <div>
          <h1>${escapeHtml(selectedStore?.name || 'Shop Owner Dashboard')}</h1>
          <p>Manage products, track sales, and monitor automated Razorpay payouts for your local store.</p>
          ${selectedStore ? `
            <div class="mm-status-row">
              <span class="mm-status-pill ${verifyClass}">Store: ${escapeHtml(selectedStore.verification_status || 'pending')}</span>
              <span class="mm-status-pill ${payoutClass}">Payouts: ${escapeHtml(selectedStore.payout_status || 'pending')}</span>
              ${selectedStore.bank?.account_number_masked ? `<span class="mm-status-pill payout-active">${escapeHtml(selectedStore.bank.account_number_masked)}</span>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="mm-dash-actions">
          <select id="owner-store-select" class="mm-store-select">${storeOptions || '<option value="">No store yet</option>'}</select>
          <a href="register-store.html" class="sm-os-btn">Add store</a>
          ${selectedStore ? `<a href="store.html?id=${encodeURIComponent(selectedStore.id)}" class="sm-os-btn primary">View storefront</a>` : ''}
        </div>
      </header>

      <div class="pnl-grid mt-4">
        <div class="pnl-card accent-blue">
          <p class="pnl-card-title">Catalog &amp; Stock</p>
          <p class="pnl-card-value">${analytics?.product_count ?? products.length}</p>
          <p class="pnl-card-sub">${analytics?.stock_summary?.in_stock_count ?? products.length} In Stock · ${analytics?.stock_summary?.low_stock_count ?? 0} Low · ${analytics?.stock_summary?.out_of_stock_count ?? 0} Out</p>
        </div>
        <div class="pnl-card accent-emerald">
          <p class="pnl-card-title">Total Revenue</p>
          <p class="pnl-card-value">${money(analytics?.revenue_inr ?? 0)}</p>
          <p class="pnl-card-sub">${analytics?.order_count ?? 0} order(s) paid</p>
        </div>
        <div class="pnl-card accent-amber">
          <p class="pnl-card-title">Gross Profit (P&amp;L)</p>
          <p class="pnl-card-value">${money(analytics?.gross_profit_inr ?? 0)}</p>
          <p class="pnl-card-sub"><span class="margin-badge ${(analytics?.profit_margin_pct ?? 0) >= 30 ? 'margin-badge-high' : (analytics?.profit_margin_pct ?? 0) >= 15 ? 'margin-badge-normal' : (analytics?.profit_margin_pct ?? 0) > 0 ? 'margin-badge-low' : 'margin-badge-loss'}">${analytics?.profit_margin_pct ?? 0}% margin</span></p>
        </div>
        <div class="pnl-card accent-purple">
          <p class="pnl-card-title">Inventory Valuation</p>
          <p class="pnl-card-value">${money(analytics?.inventory_valuation?.total_retail_value_inr ?? 0)}</p>
          <p class="pnl-card-sub">Potential profit: ${money(analytics?.inventory_valuation?.potential_profit_inr ?? 0)}</p>
        </div>
      </div>

      <nav class="mm-dash-nav-tabs mt-4">
        <button type="button" class="mm-dash-tab-btn active" data-view="pos">🛒 Mini-POS Counter Terminal</button>
        <button type="button" class="mm-dash-tab-btn" data-view="tally-inward">📥 Tally Purchase Inward</button>
        <button type="button" class="mm-dash-tab-btn" data-view="daybook">📖 Tally Daybook &amp; XML</button>
        <button type="button" class="mm-dash-tab-btn" data-view="stock-pnl">📊 Stock &amp; P&amp;L Analysis</button>
      </nav>

      <!-- Panel 1: Mini-POS Counter Terminal -->
      <section class="mm-dash-card pos-panel-view" data-panel="pos">
        <!-- Enterprise Dark POS Header Bar -->
        <div class="pos-top-bar">
          <div class="pos-status-indicator">
            <span class="scanner-dot"></span>
            <span>POS TERMINAL #01 (ONLINE)</span>
            <span class="text-slate-400 font-normal">|</span>
            <span class="text-sky-300">Cashier: Admin</span>
          </div>
          <div class="pos-hotkey-bar hidden sm:flex">
            <span class="pos-hotkey-pill">F1: New Bill</span>
            <span class="pos-hotkey-pill">F2: Hold Bill</span>
            <span class="pos-hotkey-pill">F4: Tally Sync</span>
            <span class="pos-hotkey-pill">F8: Cash Drawer</span>
          </div>
          <div class="pos-clock-badge" id="pos-live-clock">10:15:30 PM</div>
        </div>

        <div class="mm-dash-card-body">
          <!-- Category Filter Bar -->
          <div class="pos-cat-pill-bar">
            <button type="button" class="pos-cat-btn active" data-pos-cat="all">⚡ All Items</button>
            <button type="button" class="pos-cat-btn" data-pos-cat="Apparel">👕 Apparel &amp; Fashion</button>
            <button type="button" class="pos-cat-btn" data-pos-cat="Electronics">📱 Electronics &amp; Gadgets</button>
            <button type="button" class="pos-cat-btn" data-pos-cat="Footwear">👟 Footwear</button>
            <button type="button" class="pos-cat-btn" data-pos-cat="Accessories">✨ Accessories</button>
          </div>

          <div class="mini-pos-shell">
            <!-- Left Panel: Product Catalog Grid -->
            <div>
              <div class="mb-3">
                <input type="text" id="pos-search-input" class="pnl-search-input" placeholder="🔍 Search product name, barcode (EAN-13), or SKU (Ctrl + K)…" style="max-width:100%" />
              </div>
              <div class="mini-pos-catalog-grid" id="pos-catalog-grid">
                ${products.map((p, idx) => {
                  const pid = p.id;
                  const name = p.name;
                  const price = p.price_inr ?? p.price ?? 0;
                  const stock = p.stock_qty ?? p.stockCount ?? 0;
                  const sku = p.sku || `SKU-ITEM-${100 + idx}`;
                  const img = p.image || p.image_url || 'assets/media/hero-mall.jpg';
                  return `
                    <div class="pos-item-card" data-pid="${escapeHtml(pid)}" data-name="${escapeHtml(name)}" data-price="${price}" data-stock="${stock}" data-category="${escapeHtml(p.category || 'General')}">
                      <div class="pos-item-img-wrap">
                        <img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" loading="lazy" />
                        <span class="pos-sku-pill">${escapeHtml(sku)}</span>
                      </div>
                      <div class="pos-item-content">
                        <p class="pos-item-name">${escapeHtml(name)}</p>
                        <div class="pos-item-meta">
                          <span class="pos-item-price">${money(price)}</span>
                          <span class="text-xs ${stock <= 0 ? 'text-rose-600 font-bold' : stock <= 3 ? 'text-amber-600 font-bold' : 'text-slate-500'}">${stock > 0 ? `${stock} left` : 'Out'}</span>
                        </div>
                        <button type="button" class="cost-save-btn pos-add-btn mt-2 w-full text-center" ${stock <= 0 ? 'disabled' : ''}>+ Add to Bill</button>
                      </div>
                    </div>
                  `;
                }).join('') || '<p class="text-xs text-muted-foreground p-4">No products available for POS billing.</p>'}
              </div>
            </div>

            <!-- Right Panel: Active Billing Cart & Register -->
            <div class="pos-cart-panel">
              <div class="pos-terminal-session-header">
                <div>
                  <span class="font-bold text-slate-800">Bill #${selectedStore ? `INV-2026-${Math.floor(1000 + Math.random() * 9000)}` : 'INV-001'}</span>
                  <span class="text-xs text-slate-500 block">Register 01 · Regular Order</span>
                </div>
                <button type="button" id="pos-clear-cart" class="text-xs text-rose-600 font-bold hover:underline">🧹 Clear</button>
              </div>

              <!-- Customer Khata / Phone Selector -->
              <div class="grid grid-cols-2 gap-2 mb-3">
                <input id="pos-cust-name" class="mm-input text-xs" placeholder="👤 Customer Name (Walk-in)" />
                <input id="pos-cust-phone" class="mm-input text-xs" placeholder="📞 Phone (+91)" />
              </div>

              <!-- Cart Line Items Table -->
              <div style="max-height:220px;overflow-y:auto" class="mb-3">
                <table class="pos-cart-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style="text-align:center">Qty</th>
                      <th style="text-align:right">Rate</th>
                      <th style="text-align:right">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="pos-cart-table-body">
                    <tr><td colspan="5" class="text-center text-slate-400 py-6 text-xs">Tap products on the left to start billing.</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- On-Screen Touch Numpad Drawer Toggle -->
              <details class="mb-2 text-xs">
                <summary class="cursor-pointer font-bold text-slate-700 hover:text-blue-600 flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>🔢 Quick Touch Numpad Keypad</span>
                  <span class="text-slate-400">Toggle</span>
                </summary>
                <div class="pos-numpad-grid mt-2">
                  <button type="button" class="pos-numpad-btn" data-key="7">7</button>
                  <button type="button" class="pos-numpad-btn" data-key="8">8</button>
                  <button type="button" class="pos-numpad-btn" data-key="9">9</button>
                  <button type="button" class="pos-numpad-btn text-rose-600" data-key="DEL">⌫</button>
                  <button type="button" class="pos-numpad-btn" data-key="4">4</button>
                  <button type="button" class="pos-numpad-btn" data-key="5">5</button>
                  <button type="button" class="pos-numpad-btn" data-key="6">6</button>
                  <button type="button" class="pos-numpad-btn" data-key="500">+₹500</button>
                  <button type="button" class="pos-numpad-btn" data-key="1">1</button>
                  <button type="button" class="pos-numpad-btn" data-key="2">2</button>
                  <button type="button" class="pos-numpad-btn" data-key="3">3</button>
                  <button type="button" class="pos-numpad-btn" data-key="2000">+₹2000</button>
                  <button type="button" class="pos-numpad-btn" data-key="0">0</button>
                  <button type="button" class="pos-numpad-btn" data-key="00">00</button>
                  <button type="button" class="pos-numpad-btn" data-key=".">.</button>
                  <button type="button" class="pos-numpad-btn text-emerald-600 font-extrabold" data-key="EXACT">Exact</button>
                </div>
              </details>

              <!-- Bill Calculations Breakdown -->
              <div class="pos-bill-summary">
                <div class="pos-bill-line"><span>Subtotal:</span><strong id="pos-subtotal">₹0.00</strong></div>
                <div class="pos-bill-line"><span>Tax (CGST 9% + SGST 9%):</span><strong id="pos-tax">₹0.00</strong></div>
                <div class="pos-bill-line">
                  <span>Discount (₹):</span>
                  <input type="number" min="0" value="0" id="pos-discount" class="cost-input-sm text-right" style="width:85px" />
                </div>
                <div class="pos-bill-line total">
                  <span>TOTAL PAYABLE:</span>
                  <strong id="pos-grand-total" class="text-emerald-700 text-xl font-extrabold">₹0.00</strong>
                </div>

                <!-- Cash Tendered & Change Due Box -->
                <div class="pos-tendered-box" id="pos-cash-tendered-row">
                  <div>
                    <span class="text-xs font-bold text-slate-700 block">Cash Tendered (₹):</span>
                    <input type="number" min="0" value="0" id="pos-tendered-input" class="cost-input-sm text-right mt-1" style="width:100px" />
                  </div>
                  <div class="text-right">
                    <span class="text-xs font-bold text-slate-500 block">Change Return:</span>
                    <strong id="pos-change-due" class="text-base text-emerald-700 font-black">₹0.00</strong>
                  </div>
                </div>

                <p class="text-xs font-extrabold text-slate-700 mt-3 mb-1 uppercase tracking-wide">Select Payment Method:</p>
                <div class="pos-pay-modes">
                  <button type="button" class="pos-pay-btn active" data-mode="Cash">💵 Cash (F1)</button>
                  <button type="button" class="pos-pay-btn" data-mode="UPI / QR">📲 UPI QR (F2)</button>
                  <button type="button" class="pos-pay-btn" data-mode="Card">💳 Card (F3)</button>
                  <button type="button" class="pos-pay-btn" data-mode="Credit Khata">📖 Khata (F4)</button>
                </div>

                <button type="button" id="pos-checkout-trigger" class="pos-checkout-btn-real">
                  <span>⚡ CHARGE &amp; PRINT POS BILL</span>
                  <span class="text-xs bg-emerald-800 px-2 py-0.5 rounded text-white">(Enter)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Panel 2: Tally Purchase Inward -->
      <section class="mm-dash-card pos-panel-view hidden" data-panel="tally-inward">
        <div class="mm-dash-card-head">
          <div>
            <h2>📥 Tally Purchase Inward Voucher</h2>
            <p>Log stock inward from wholesale suppliers, update purchase rates, and auto-increase inventory.</p>
          </div>
        </div>
        <div class="mm-dash-card-body">
          ${selectedStore ? `
            <form id="tally-purchase-form" class="mm-form-grid cols-2">
              <label class="mm-field"><span class="mm-field-label">Supplier / Vendor Name <span class="mm-req">*</span></span><input id="tally-supplier-name" required class="mm-input" placeholder="e.g. Acme Wholesale Distributors" /></label>
              <label class="mm-field"><span class="mm-field-label">Supplier Invoice No <span class="mm-req">*</span></span><input id="tally-supplier-inv" required class="mm-input" placeholder="e.g. PUR-2026-9812" /></label>
              <label class="mm-field" style="grid-column:1/-1"><span class="mm-field-label">Select Product <span class="mm-req">*</span></span>
                <select id="tally-purchase-product" required class="mm-select">
                  <option value="">Choose item to inward...</option>
                  ${products.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (Current stock: ${p.stock_qty ?? p.stockCount ?? 0})</option>`).join('')}
                </select>
              </label>
              <label class="mm-field"><span class="mm-field-label">Quantity Inward <span class="mm-req">*</span></span><input id="tally-purchase-qty" type="number" min="1" required class="mm-input" placeholder="e.g. 50" /></label>
              <label class="mm-field"><span class="mm-field-label">Wholesale Cost Rate (Rs) <span class="mm-req">*</span></span><input id="tally-purchase-cost" type="number" min="0" required class="mm-input" placeholder="e.g. 650" /></label>
              <button type="submit" class="mm-form-submit" style="grid-column:1/-1">📥 Save Purchase Inward &amp; Update Stock</button>
            </form>
          ` : '<p class="text-sm text-muted-foreground">Select a valid store to log purchase inwards.</p>'}
        </div>
      </section>

      <!-- Panel 3: Tally Daybook & XML -->
      <section class="mm-dash-card pos-panel-view hidden" data-panel="daybook">
        <div class="mm-dash-card-head">
          <div>
            <h2>📖 Tally Daybook &amp; Vouchers Register</h2>
            <p>Export daily transactions in XML format ready for TallyPrime / Tally.ERP 9 import.</p>
          </div>
          <button type="button" id="tally-export-xml" class="sm-os-btn primary font-bold">📥 Export Tally XML</button>
        </div>
        <div class="mm-dash-card-body">
          <div class="pnl-table-wrap">
            <table class="pnl-table" id="tally-daybook-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Voucher Type</th>
                  <th>Ref / Invoice #</th>
                  <th>Party / Customer</th>
                  <th>Amount (INR)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${(data.orders || []).slice(0, 15).map(o => `
                  <tr>
                    <td>${new Date(o.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                    <td><span class="stock-pill stock-pill-in">Sales Voucher</span></td>
                    <td><strong>${escapeHtml(o.invoice_no || o.id)}</strong></td>
                    <td>${escapeHtml(o.customer_name || 'Cash Sales')}</td>
                    <td><strong>${money(o.total_inr || Math.round((o.total_paise || 0)/100))}</strong></td>
                    <td><span class="margin-badge margin-badge-high">Verified</span></td>
                  </tr>
                `).join('') || '<tr><td colspan="6" class="text-center text-muted-foreground p-4">No daybook vouchers recorded today.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Panel 4: Stock & P&L Analysis -->
      <div class="pos-panel-view hidden" data-panel="stock-pnl">
        <div class="mm-dash-layout">
          <div class="space-y-4">
            <section class="mm-dash-card">
              <div class="mm-dash-card-head">
                <div>
                  <h2>📦 Stock Management</h2>
                  <p>Quick stock adjustments and inventory movement events.</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="stock-pill stock-pill-in">In Stock: ${analytics?.stock_summary?.in_stock_count ?? products.length}</span>
                  <span class="stock-pill stock-pill-low">Low: ${analytics?.stock_summary?.low_stock_count ?? 0}</span>
                  <span class="stock-pill stock-pill-out">Out: ${analytics?.stock_summary?.out_of_stock_count ?? 0}</span>
                </div>
              </div>
              <div class="mm-dash-card-body">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div class="mm-filter-pill-bar mb-0">
                    <button class="mm-filter-pill-btn active" data-filter="all">All Items</button>
                    <button class="mm-filter-pill-btn" data-filter="low">Low Stock (≤3)</button>
                    <button class="mm-filter-pill-btn" data-filter="out">Out of Stock</button>
                    <button class="mm-filter-pill-btn" data-filter="loss">Loss Warning ⚠️</button>
                  </div>
                  <div class="pnl-search-bar">
                    <input type="text" class="pnl-search-input mm-table-search" placeholder="🔍 Search product or category…" />
                  </div>
                </div>
                <div class="pnl-table-wrap">
                  <table class="pnl-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Selling Price</th>
                        <th>Status</th>
                        <th>Stock Qty</th>
                        <th>Quick Step</th>
                        <th>Stock Event Log</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(analytics?.product_pnl_list || products.map(p => ({
                        id: p.id,
                        name: p.name,
                        selling_price_inr: p.price_inr ?? p.price ?? 0,
                        stock_qty: p.stock_qty ?? p.stockCount ?? 0
                      }))).map((p) => {
                        const pid = p.id;
                        const name = p.name;
                        const price = p.selling_price_inr;
                        const stock = p.stock_qty;
                        const statusPill = stock <= 0 ? '<span class="stock-pill stock-pill-out">Out of stock</span>' : stock <= 3 ? '<span class="stock-pill stock-pill-low">Low stock</span>' : '<span class="stock-pill stock-pill-in">In stock</span>';
                        return `
                          <tr>
                            <td><strong>${escapeHtml(name)}</strong></td>
                            <td>${money(price)}</td>
                            <td>${statusPill}</td>
                            <td><strong id="stock-val-${escapeHtml(pid)}">${stock}</strong></td>
                            <td>
                              <div class="stock-adjust-group">
                                <button class="stock-btn-step stock-btn-minus" data-pid="${escapeHtml(pid)}" data-stock="${stock}">-</button>
                                <button class="stock-btn-step stock-btn-plus" data-pid="${escapeHtml(pid)}" data-stock="${stock}">+</button>
                              </div>
                            </td>
                            <td>
                              <form class="mm-stock-event-form flex items-center gap-1" data-pid="${escapeHtml(pid)}">
                                <select class="mm-select text-xs py-1 px-2 mm-event-type" style="max-width:110px">
                                  <option value="restock">Restock (+)</option>
                                  <option value="wastage">Damage (-)</option>
                                  <option value="correction">Correction</option>
                                  <option value="audit">Audit Count</option>
                                </select>
                                <input type="number" min="0" placeholder="Qty" required class="stock-input-sm mm-event-qty" />
                                <button type="submit" class="cost-save-btn">Log</button>
                              </form>
                            </td>
                          </tr>
                        `;
                      }).join('') || '<tr><td colspan="6" class="text-center text-muted-foreground p-4">No products in inventory yet.</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section class="mm-dash-card">
              <div class="mm-dash-card-head">
                <div>
                  <h2>📊 Profit &amp; Loss (P&amp;L) Analysis</h2>
                  <p>Track wholesale cost prices, unit profit margins, and overall profitability.</p>
                </div>
              </div>
              <div class="mm-dash-card-body">
                ${(analytics?.product_pnl_list || []).some(p => p.is_loss) ? `
                  <div class="loss-alert-box">
                    <span class="text-xl">⚠️</span>
                    <div>
                      <strong>Loss Warning: Items priced below purchase cost!</strong>
                      <p class="text-xs mt-1">Check highlighted products below. Adjust selling price or update cost price to fix negative margins.</p>
                    </div>
                  </div>
                ` : ''}

                <div class="pnl-table-wrap">
                  <table class="pnl-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Stock</th>
                        <th>Selling Price</th>
                        <th>Cost Price (Purchase)</th>
                        <th>Unit Profit</th>
                        <th>Margin %</th>
                        <th>Sold</th>
                        <th>Total Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(analytics?.product_pnl_list || []).map((p) => {
                        const marginBadgeClass = p.is_loss ? 'margin-badge-loss' : p.margin_pct >= 40 ? 'margin-badge-high' : p.margin_pct >= 15 ? 'margin-badge-normal' : 'margin-badge-low';
                        const marginBadgeLabel = p.is_loss ? `${p.margin_pct}% Loss` : `${p.margin_pct}%`;
                        return `
                          <tr ${p.is_loss ? 'style="background:#fff1f2"' : ''}>
                            <td><strong>${escapeHtml(p.name)}</strong></td>
                            <td>${p.stock_qty}</td>
                            <td>${money(p.selling_price_inr)}</td>
                            <td>
                              <form class="cost-edit-form" data-pid="${escapeHtml(p.id)}">
                                <input type="number" min="0" value="${p.cost_price_inr}" class="cost-input-sm mm-cost-val" />
                                <button type="submit" class="cost-save-btn">Save</button>
                              </form>
                            </td>
                            <td><strong class="${p.unit_profit_inr < 0 ? 'text-rose-600' : 'text-emerald-700'}">${money(p.unit_profit_inr)}</strong></td>
                            <td><span class="margin-badge ${marginBadgeClass}">${marginBadgeLabel}</span></td>
                            <td>${p.qty_sold}</td>
                            <td><strong class="${p.total_profit_inr < 0 ? 'text-rose-600' : 'text-emerald-700'}">${money(p.total_profit_inr)}</strong></td>
                          </tr>
                        `;
                      }).join('') || '<tr><td colspan="8" class="text-center text-muted-foreground p-4">No product P&amp;L records yet.</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section class="mm-dash-card">
              <div class="mm-dash-card-head">
                <div>
                  <h2>Add new product</h2>
                  <p>Mobile-friendly catalog upload with cost price and AI photo enhancement.</p>
                </div>
              </div>
              <div class="mm-dash-card-body">
                ${selectedStore ? `
                  <form id="owner-product-form" class="mm-form-grid cols-2">
                    <label class="mm-field" style="grid-column:1/-1"><span class="mm-field-label">Product name <span class="mm-req">*</span></span><input id="owner-product-name" required class="mm-input" placeholder="e.g. Cotton casual shirt" /></label>
                    <label class="mm-field"><span class="mm-field-label">Category</span><input id="owner-product-category" class="mm-input" value="${escapeHtml(selectedStore.category || '')}" /></label>
                    <label class="mm-field"><span class="mm-field-label">Selling Price (Rs) <span class="mm-req">*</span></span><input id="owner-product-price" required type="number" min="0" class="mm-input" placeholder="e.g. 999" /></label>
                    <label class="mm-field"><span class="mm-field-label">Cost Price (Rs)</span><input id="owner-product-cost-price" type="number" min="0" class="mm-input" placeholder="Purchase cost e.g. 650" /></label>
                    <label class="mm-field"><span class="mm-field-label">Stock qty <span class="mm-req">*</span></span><input id="owner-product-stock" required type="number" min="0" class="mm-input" placeholder="e.g. 15" /></label>
                    <label class="mm-field"><span class="mm-field-label">Color</span><input id="owner-product-color" class="mm-input" placeholder="e.g. blue" /></label>
                    <label class="mm-field"><span class="mm-field-label">Size</span><input id="owner-product-size" class="mm-input" placeholder="e.g. M" /></label>
                    <label class="mm-field"><span class="mm-field-label">Fit</span>
                      <select id="owner-product-fit" class="mm-select"><option value="regular">Regular fit</option><option value="slim">Slim</option><option value="relaxed">Relaxed</option><option value="tailored">Tailored</option></select>
                    </label>
                    <div class="mm-form-section" style="grid-column:1/-1">
                      <p class="mm-form-section-title">Product photo</p>
                      <p class="mm-form-section-desc">Take a photo or upload from gallery — AI cleans background and optimizes for listing.</p>
                      <div class="flex flex-wrap gap-2 mt-3 mb-3">
                        <label class="mm-action mm-action-sm mm-action-primary cursor-pointer"><input id="owner-product-camera" type="file" accept="image/*" capture="environment" class="hidden" /> Take photo</label>
                        <label class="mm-action mm-action-sm mm-action-outline cursor-pointer"><input id="owner-product-file" type="file" accept="image/*" class="hidden" /> Choose file</label>
                      </div>
                      <img id="owner-product-preview" alt="Preview" class="hidden max-h-48 rounded-xl border object-contain bg-white" />
                      <input type="hidden" id="owner-product-image-data" />
                    </div>
                    <button type="submit" class="mm-form-submit" style="grid-column:1/-1">Publish to marketplace</button>
                  </form>
                ` : `<p class="text-sm text-muted-foreground"><a href="register-store.html" class="text-primary font-bold">Register your store</a> to start uploading products.</p>`}
              </div>
            </section>
          </div>

          <aside class="space-y-4">
            ${selectedStore ? `
            <section class="mm-dash-card">
              <div class="mm-dash-card-head">
                <div>
                  <h2>Automated payouts</h2>
                  <p>Razorpay Route transfers to ${escapeHtml(selectedStore.bank?.account_number_masked || 'your bank')}</p>
                </div>
              </div>
              <div class="mm-dash-card-body">
                <div class="mm-payout-summary">
                  <div class="mm-payout-stat settled"><span>Settled</span><strong>${money(payoutData?.summary?.settled_inr ?? 0)}</strong></div>
                  <div class="mm-payout-stat pending"><span>Pending</span><strong>${money(payoutData?.summary?.pending_inr ?? 0)}</strong></div>
                  <div class="mm-payout-stat"><span>Total earned</span><strong>${money(payoutData?.summary?.total_net_inr ?? 0)}</strong></div>
                </div>
                <div class="mm-payout-table-wrap">
                  ${payoutRows.length ? `
                    <table class="mm-payout-table">
                      <thead><tr><th>Order</th><th>Status</th><th>Amount</th></tr></thead>
                      <tbody>${payoutRows.map((p) => `<tr><td>${escapeHtml(p.order_id)}</td><td>${escapeHtml(p.status)}</td><td><strong>${money(p.net_inr)}</strong></td></tr>`).join('')}</tbody>
                    </table>
                  ` : `<p class="mm-payout-empty">No payouts yet. They appear after customers pay for your products.</p>`}
                </div>
                <form id="owner-bank-form" class="mm-bank-update">
                  <p class="mm-bank-update-title">Update bank details</p>
                  <label class="mm-field"><span class="mm-field-label">Account holder</span><input id="owner-bank-beneficiary" required class="mm-input" value="${escapeHtml(selectedStore.bank?.beneficiary_name || '')}" /></label>
                  <label class="mm-field"><span class="mm-field-label">Account number</span><input id="owner-bank-account" required class="mm-input" placeholder="Enter full account number" /></label>
                  <div class="mm-form-grid cols-2">
                    <label class="mm-field"><span class="mm-field-label">IFSC</span><input id="owner-bank-ifsc" required class="mm-input uppercase" value="${escapeHtml(selectedStore.bank?.ifsc_code || '')}" /></label>
                    <label class="mm-field"><span class="mm-field-label">Type</span><select id="owner-bank-type" class="mm-select"><option value="current" ${selectedStore.bank?.account_type === 'current' ? 'selected' : ''}>Current</option><option value="savings" ${selectedStore.bank?.account_type === 'savings' ? 'selected' : ''}>Savings</option></select></label>
                  </div>
                  <button type="submit" class="mm-form-submit">Save &amp; re-activate payouts</button>
                </form>
              </div>
            </section>
            ` : ''}

            <section class="mm-dash-card">
              <div class="mm-dash-card-head"><div><h2>Top sellers</h2><p>Best performers in your store</p></div></div>
              <div class="mm-dash-card-body space-y-2">
                ${(analytics?.top_products || []).length ? analytics.top_products.map((tp) => `<div class="mm-top-seller-row"><span>${escapeHtml(tp.name)}</span><strong>${tp.qty_sold} sold</strong></div>`).join('') : '<p class="mm-payout-empty">No sales data yet.</p>'}
                ${(analytics?.low_stock || []).length ? `<div class="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3"><p class="text-xs font-extrabold text-rose-800 uppercase tracking-wide">Low stock warning</p><ul class="mt-2 space-y-1 text-xs text-rose-700">${analytics.low_stock.map((p) => `<li>${escapeHtml(p.name)} — ${p.stock_qty} left</li>`).join('')}</ul></div>` : ''}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  `;

  // Tab navigation handler
  container.querySelectorAll('.mm-dash-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.mm-dash-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      container.querySelectorAll('.pos-panel-view').forEach((panel) => {
        if (panel.dataset.panel === view) panel.classList.remove('hidden');
        else panel.classList.add('hidden');
      });
    });
  });

  // Mini-POS Cart state & functions
  let activePosCart = [];
  let activePosPayMode = 'Cash';

  function updatePosCartUi() {
    const listEl = el('pos-cart-items');
    const countEl = el('pos-cart-count');
    const subtotalEl = el('pos-subtotal');
    const taxEl = el('pos-tax');
    const totalEl = el('pos-grand-total');

    if (!listEl) return;
    const totalCount = activePosCart.reduce((sum, item) => sum + item.qty, 0);
    if (countEl) countEl.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;

    if (!activePosCart.length) {
      listEl.innerHTML = '<p class="text-xs text-muted-foreground text-center py-8">Tap products on the left to add to bill.</p>';
      if (subtotalEl) subtotalEl.textContent = 'Rs 0';
      if (taxEl) taxEl.textContent = 'Rs 0';
      if (totalEl) totalEl.textContent = 'Rs 0';
      return;
    }

    let subtotal = 0;
    listEl.innerHTML = activePosCart.map((item, idx) => {
      const lineTotal = item.qty * item.price;
      subtotal += lineTotal;
      return `
        <div class="pos-cart-row">
          <div class="pos-cart-row-info">
            <span class="pos-cart-row-title">${escapeHtml(item.name)}</span>
            <span class="pos-cart-row-sub">${money(item.price)} x ${item.qty} = ${money(lineTotal)}</span>
          </div>
          <div class="pos-qty-stepper">
            <button type="button" class="pos-qty-btn pos-cart-minus" data-idx="${idx}">-</button>
            <span class="font-bold text-xs px-1">${item.qty}</span>
            <button type="button" class="pos-qty-btn pos-cart-plus" data-idx="${idx}">+</button>
            <button type="button" class="pos-qty-btn pos-cart-del text-rose-600 border-rose-200 ml-1" data-idx="${idx}">✕</button>
          </div>
        </div>
      `;
    }).join('');

    const tax = Math.round(subtotal * 0.18);
    const discount = Number(el('pos-discount')?.value || 0);
    const grandTotal = Math.max(0, subtotal + tax - discount);

    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (taxEl) taxEl.textContent = money(tax);
    if (totalEl) totalEl.textContent = money(grandTotal);

    listEl.querySelectorAll('.pos-cart-plus').forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.idx);
        activePosCart[i].qty += 1;
        updatePosCartUi();
      });
    });

    listEl.querySelectorAll('.pos-cart-minus').forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.idx);
        if (activePosCart[i].qty > 1) activePosCart[i].qty -= 1;
        else activePosCart.splice(i, 1);
        updatePosCartUi();
      });
    });

    listEl.querySelectorAll('.pos-cart-del').forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.idx);
        activePosCart.splice(i, 1);
        updatePosCartUi();
      });
    });
  }

  // Quick product search in POS Grid
  el('pos-search-input')?.addEventListener('input', (e) => {
    const q = String(e.target.value || '').toLowerCase().trim();
    container.querySelectorAll('.mini-pos-item-card').forEach((card) => {
      const title = card.dataset.name.toLowerCase();
      card.style.display = title.includes(q) ? '' : 'none';
    });
  });

  // Tap product in POS Grid to add
  container.querySelectorAll('.pos-add-btn, .mini-pos-item-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      const pid = card.dataset.pid;
      const name = card.dataset.name;
      const price = Number(card.dataset.price || 0);
      const stock = Number(card.dataset.stock || 0);
      if (!pid || stock <= 0) return;

      const existing = activePosCart.find((it) => it.product_id === pid);
      if (existing) {
        existing.qty += 1;
      } else {
        activePosCart.push({ product_id: pid, id: pid, name, price, qty: 1 });
      }
      updatePosCartUi();
      toast(`Added "${name}" to bill`, { type: 'ok', title: 'POS Cart', ms: 1200 });
    });
  });

  // Payment mode selection
  container.querySelectorAll('.pos-pay-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pos-pay-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePosPayMode = btn.dataset.mode || 'Cash';
    });
  });

  el('pos-discount')?.addEventListener('input', updatePosCartUi);

  // POS Checkout Trigger
  el('pos-checkout-trigger')?.addEventListener('click', async () => {
    if (!activePosCart.length) {
      return toast('Cart is empty. Tap products to add to bill.', { type: 'bad' });
    }
    const custName = el('pos-cust-name')?.value || 'Walk-in Customer';
    const custPhone = el('pos-cust-phone')?.value || '';
    const discount = Number(el('pos-discount')?.value || 0);

    try {
      let result = null;
      if (window.MM_API?.hasApi?.()) {
        result = await window.MM_API.createPosSale({
          store_id: selectedStore?.id,
          items: activePosCart,
          payment_mode: activePosPayMode,
          customer_name: custName,
          customer_phone: custPhone,
          discount_inr: discount
        });
      } else {
        const now = new Date();
        const invoiceNo = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        let subtotal = 0;
        activePosCart.forEach((it) => {
          subtotal += it.qty * it.price;
          state.stock[it.product_id] = Math.max(0, (state.stock[it.product_id] ?? 0) - it.qty);
        });
        const tax = Math.round(subtotal * 0.18);
        const total = Math.max(0, subtotal + tax - discount);
        const localOrder = {
          id: `ord-pos-${Date.now()}`,
          invoice_no: invoiceNo,
          source: 'mini_pos',
          store_id: selectedStore?.id,
          store_name: selectedStore?.name,
          customer_name: custName,
          customer_phone: custPhone,
          payment_mode: activePosPayMode,
          payment_status: 'paid',
          status: 'completed',
          items: activePosCart.map(it => ({ ...it, line_total_inr: it.qty * it.price, unit_price_inr: it.price })),
          subtotal_paise: subtotal * 100,
          discount_inr: discount,
          tax_paise: tax * 100,
          total_paise: total * 100,
          total_inr: total,
          created_at: now.toISOString()
        };
        state.orders.unshift(localOrder);
        persist();
        result = { ok: true, invoice_no: invoiceNo, receipt: { ...localOrder, store: selectedStore } };
      }

      toast(`Sale completed! Bill ${result.invoice_no} generated.`, { type: 'ok', title: 'POS Bill' });
      showReceiptModal(result.receipt || result.order);
      activePosCart = [];
      updatePosCartUi();
      setTimeout(() => renderStoreDashboard(data), 600);
    } catch (err) {
      toast(err.message || String(err), { type: 'bad', title: 'POS Error' });
    }
  });

  // Tally Purchase Inward Form
  el('tally-purchase-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const supplierName = el('tally-supplier-name')?.value;
    const invoiceNo = el('tally-supplier-inv')?.value;
    const pid = el('tally-purchase-product')?.value;
    const qty = Number(el('tally-purchase-qty')?.value || 0);
    const cost = Number(el('tally-purchase-cost')?.value || 0);

    if (!pid || qty <= 0) return toast('Select a valid product and quantity.', { type: 'bad' });

    try {
      if (window.MM_API?.hasApi?.()) {
        await window.MM_API.createPosPurchase({
          store_id: selectedStore?.id,
          supplier_name: supplierName,
          invoice_no: invoiceNo,
          items: [{ product_id: pid, qty, cost_price_inr: cost }]
        });
      } else {
        state.stock[pid] = (state.stock[pid] || 0) + qty;
        const prod = state.customProducts.find(p => String(p.id) === String(pid)) || (data.products || []).find(p => String(p.id) === String(pid));
        if (prod) {
          prod.costPrice = cost;
          prod.cost_price_inr = cost;
        }
        persist();
      }
      toast(`Inward recorded (+${qty} units)`, { type: 'ok', title: 'Tally Inward' });
      setTimeout(() => renderStoreDashboard(data), 500);
    } catch (err) {
      toast(err.message, { type: 'bad' });
    }
  });

  // Tally Export XML Trigger
  el('tally-export-xml')?.addEventListener('click', () => {
    const storeName = selectedStore?.name || 'Local Store';
    const storeOrders = (data.orders || state.orders || []).filter(o => String(o.store_id || o.storeId) === String(selectedStore?.id));
    const vouchers = storeOrders.map(o => ({
      type: 'sales',
      date: (o.created_at || new Date().toISOString()).slice(0, 10).replace(/-/g, ''),
      invoice_no: o.invoice_no || o.id,
      party: o.customer_name || 'Cash/Walk-in',
      amount: o.total_inr || Math.round((o.total_paise || 0) / 100)
    }));
    exportTallyXml(storeName, vouchers);
    toast('Tally XML exported successfully!', { type: 'ok', title: 'Tally Export' });
  });

  el('owner-store-select')?.addEventListener('change', (e) => {
    const u = new URL(location.href);
    u.searchParams.set('store', String(e.target.value || ''));
    location.href = u.toString();
  });
  let pendingImageUrl = '';
  const onImageReady = async (dataUrl) => {
    pendingImageUrl = dataUrl;
    el('owner-product-image-data').value = dataUrl;
    toast('Photo enhanced. Tap Upload to publish.', { type: 'ok', title: 'AI Photo', ms: 2000 });
  };
  window.MM_Media?.bindCameraUpload('owner-product-camera', 'owner-product-preview', onImageReady);
  window.MM_Media?.bindCameraUpload('owner-product-file', 'owner-product-preview', onImageReady);
  el('owner-bank-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedStore) return;
    try {
      await window.MM_API.updateStoreBankDetails({
        store_id: selectedStore.id,
        beneficiary_name: el('owner-bank-beneficiary')?.value,
        account_number: el('owner-bank-account')?.value,
        ifsc_code: el('owner-bank-ifsc')?.value,
        account_type: el('owner-bank-type')?.value
      });
      toast('Bank details updated. Payout account re-provisioned.', { type: 'ok', title: 'Payouts' });
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      toast(error.message || String(error), { type: 'bad', title: 'Payouts' });
    }
  });
  el('owner-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedStore) return;
    try {
      let imageUrl = 'assets/media/hero-mall.jpg';
      const raw = el('owner-product-image-data')?.value || pendingImageUrl;
      if (raw && raw.startsWith('data:')) {
        const uploaded = await window.MM_API.uploadImage({ data_url: raw, store_id: selectedStore.id, kind: 'products' });
        imageUrl = uploaded.url || imageUrl;
      }
      const priceVal = Number(el('owner-product-price')?.value || 0);
      const costValRaw = el('owner-product-cost-price')?.value;
      const costVal = costValRaw !== undefined && costValRaw !== '' ? Number(costValRaw) : Math.round(priceVal * 0.65);
      await window.MM_API.saveAutoshelfProduct({
        store_id: selectedStore.id,
        name: el('owner-product-name')?.value,
        category: el('owner-product-category')?.value || selectedStore.category,
        price_inr: priceVal,
        cost_price_inr: costVal,
        stock_qty: Number(el('owner-product-stock')?.value || 0),
        color: el('owner-product-color')?.value,
        size: el('owner-product-size')?.value,
        fit: el('owner-product-fit')?.value,
        image_url: imageUrl,
        enhanced: Boolean(raw)
      });
      toast('Product live on marketplace with cost & stock configured.', { type: 'ok', title: 'Store' });
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast(error.message || String(error), { type: 'bad', title: 'Upload' });
    }
  });
}

function renderStoreDashboardLocal(data) {
  const s = scoped(data);
  const container = el('dashboard-container');
  if (!container) return;
  const urlStoreId = new URLSearchParams(location.search).get('store') || '';
  const stores = urlStoreId ? (data.stores || s.stores || []) : (s.stores || []);
  const selectedStore = stores.find((st) => String(st.id) === String(urlStoreId)) || stores[0] || null;
  const productSource = urlStoreId ? (data.products || s.products || []) : (s.products || []);
  const selectedProducts = selectedStore ? productSource.filter((p) => String(p.storeId || p.store_id) === String(selectedStore.id)) : [];

  let totalRevenueInr = 0;
  let totalCogsInr = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalRetailValueInr = 0;
  let totalCostValueInr = 0;

  const productPnlList = selectedProducts.map((p) => {
    const pid = String(p.id);
    const sellingPrice = Number(p.price || p.price_inr || 0);
    const costPrice = Number(p.costPrice ?? p.cost_price_inr ?? Math.round(sellingPrice * 0.65));
    const stockQty = productStockCount(p);

    if (stockQty <= 0) outOfStockCount++;
    else if (stockQty <= 3) lowStockCount++;
    else inStockCount++;

    totalRetailValueInr += stockQty * sellingPrice;
    totalCostValueInr += stockQty * costPrice;

    const qtySold = (state.orders || []).reduce((acc, o) => acc + (o.items || []).filter(it => String(it.productId || it.id || it.product_id) === pid).reduce((sum, x) => sum + (Number(x.qty || 1)), 0), 0);
    const prodRev = qtySold * sellingPrice;
    const prodCogs = qtySold * costPrice;
    totalRevenueInr += prodRev;
    totalCogsInr += prodCogs;

    const unitProfit = sellingPrice - costPrice;
    const marginPct = sellingPrice > 0 ? Math.round((unitProfit / sellingPrice) * 100) : 0;
    const totalProfit = qtySold * unitProfit;

    return {
      id: pid,
      name: p.name,
      category: p.category || 'General',
      stock_qty: stockQty,
      selling_price_inr: sellingPrice,
      cost_price_inr: costPrice,
      unit_profit_inr: unitProfit,
      margin_pct: marginPct,
      qty_sold: qtySold,
      revenue_inr: prodRev,
      cogs_inr: prodCogs,
      total_profit_inr: totalProfit,
      is_loss: costPrice > sellingPrice
    };
  });

  const grossProfitInr = totalRevenueInr - totalCogsInr;
  const profitMarginPct = totalRevenueInr > 0 ? Math.round((grossProfitInr / totalRevenueInr) * 100) : 0;
  const potentialProfitInr = totalRetailValueInr - totalCostValueInr;

  const storeOptions = stores.map((st) => `<option value="${escapeHtml(st.id)}" ${String(st.id) === String(selectedStore?.id) ? 'selected' : ''}>${escapeHtml(st.name)}</option>`).join('');

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-bold">Shop Stock &amp; P&amp;L Dashboard</h1>
          <p class="text-sm text-muted-foreground mt-1">Manage shop inventory, unit margins, and profit/loss reports.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <select id="owner-store-select" class="rounded-xl border px-3 py-2 text-sm font-bold bg-white">${storeOptions}</select>
          ${selectedStore ? `<a href="${storePath(selectedStore.id)}" class="sm-os-btn">${icon('store')} View storefront</a>` : ''}
        </div>
      </div>

      <div class="pnl-grid">
        <div class="pnl-card accent-blue">
          <p class="pnl-card-title">Stock Count</p>
          <p class="pnl-card-value">${selectedProducts.length}</p>
          <p class="pnl-card-sub">${inStockCount} In Stock · ${lowStockCount} Low · ${outOfStockCount} Out</p>
        </div>
        <div class="pnl-card accent-emerald">
          <p class="pnl-card-title">Total Sales</p>
          <p class="pnl-card-value">${money(totalRevenueInr)}</p>
          <p class="pnl-card-sub">${state.orders.length} order(s)</p>
        </div>
        <div class="pnl-card accent-amber">
          <p class="pnl-card-title">Gross Profit (P&amp;L)</p>
          <p class="pnl-card-value">${money(grossProfitInr)}</p>
          <p class="pnl-card-sub"><span class="margin-badge ${profitMarginPct >= 30 ? 'margin-badge-high' : profitMarginPct >= 15 ? 'margin-badge-normal' : profitMarginPct > 0 ? 'margin-badge-low' : 'margin-badge-loss'}">${profitMarginPct}% margin</span></p>
        </div>
        <div class="pnl-card accent-purple">
          <p class="pnl-card-title">Inventory Retail Value</p>
          <p class="pnl-card-value">${money(totalRetailValueInr)}</p>
          <p class="pnl-card-sub">Potential profit: ${money(potentialProfitInr)}</p>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section class="border rounded-xl p-4 bg-card">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h2 class="text-xl font-bold">📦 Stock Management</h2>
              <p class="text-sm text-muted-foreground">Adjust stock levels and log inventory events.</p>
            </div>
          </div>
          <div class="pnl-table-wrap">
            <table class="pnl-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Selling Price</th>
                  <th>Status</th>
                  <th>Available Stock</th>
                  <th>Quick Step</th>
                </tr>
              </thead>
              <tbody>
                ${productPnlList.map((p) => `
                  <tr>
                    <td><strong>${escapeHtml(p.name)}</strong></td>
                    <td>${money(p.selling_price_inr)}</td>
                    <td>${p.stock_qty <= 0 ? '<span class="stock-pill stock-pill-out">Out of stock</span>' : p.stock_qty <= 3 ? '<span class="stock-pill stock-pill-low">Low stock</span>' : '<span class="stock-pill stock-pill-in">In stock</span>'}</td>
                    <td><strong>${p.stock_qty}</strong> units</td>
                    <td>
                      <div class="stock-adjust-group">
                        <button class="stock-btn-step local-stock-minus" data-pid="${escapeHtml(p.id)}" data-stock="${p.stock_qty}">-</button>
                        <button class="stock-btn-step local-stock-plus" data-pid="${escapeHtml(p.id)}" data-stock="${p.stock_qty}">+</button>
                      </div>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="5" class="text-center text-muted-foreground p-4">No products uploaded yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>

        <section class="border rounded-xl p-4 bg-card">
          <h2 class="text-xl font-bold mb-3">Add Product with Cost Margin</h2>
          ${selectedStore ? `
            <form id="owner-product-form" class="grid gap-3 md:grid-cols-2">
              <input id="owner-product-name" required placeholder="Product name *" class="rounded-xl border px-3 py-2" />
              <input id="owner-product-category" placeholder="Category" value="${escapeHtml(selectedStore.category || '')}" class="rounded-xl border px-3 py-2" />
              <input id="owner-product-price" required type="number" min="0" placeholder="Selling price (Rs) *" class="rounded-xl border px-3 py-2" />
              <input id="owner-product-cost-price" type="number" min="0" placeholder="Cost price (Rs) [Wholesale]" class="rounded-xl border px-3 py-2" />
              <input id="owner-product-stock" required type="number" min="0" placeholder="Available stock *" class="rounded-xl border px-3 py-2" />
              <input id="owner-product-image" placeholder="Image URL" class="rounded-xl border px-3 py-2" />
              <button type="submit" class="rounded-xl bg-primary px-4 py-2.5 text-white font-semibold md:col-span-2">Upload product</button>
            </form>
          ` : '<p class="text-sm text-muted-foreground">Select a valid store to add products.</p>'}
        </section>
      </div>

      <section class="border rounded-xl p-4 bg-card">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-xl font-bold">📊 Profit &amp; Loss (P&amp;L) Detailed Analysis</h2>
            <p class="text-sm text-muted-foreground">Product wholesale cost, unit margin, and total profit generated.</p>
          </div>
        </div>

        ${productPnlList.some(p => p.is_loss) ? `
          <div class="loss-alert-box mb-4">
            <span class="text-xl">⚠️</span>
            <div>
              <strong>Loss Warning: Items priced below cost price!</strong>
              <p class="text-xs mt-1">Review the highlighted rows below and update selling price or purchase cost.</p>
            </div>
          </div>
        ` : ''}

        <div class="pnl-table-wrap">
          <table class="pnl-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock</th>
                <th>Selling Price</th>
                <th>Cost Price (Purchase)</th>
                <th>Unit Profit</th>
                <th>Margin %</th>
                <th>Units Sold</th>
                <th>Total Profit</th>
              </tr>
            </thead>
            <tbody>
              ${productPnlList.map((p) => {
                const marginBadgeClass = p.is_loss ? 'margin-badge-loss' : p.margin_pct >= 40 ? 'margin-badge-high' : p.margin_pct >= 15 ? 'margin-badge-normal' : 'margin-badge-low';
                const marginBadgeLabel = p.is_loss ? `${p.margin_pct}% Loss` : `${p.margin_pct}%`;
                return `
                  <tr ${p.is_loss ? 'style="background:#fff1f2"' : ''}>
                    <td><strong>${escapeHtml(p.name)}</strong></td>
                    <td>${p.stock_qty}</td>
                    <td>${money(p.selling_price_inr)}</td>
                    <td>
                      <form class="local-cost-edit-form" data-pid="${escapeHtml(p.id)}">
                        <input type="number" min="0" value="${p.cost_price_inr}" class="cost-input-sm local-cost-val" />
                        <button type="submit" class="cost-save-btn">Save</button>
                      </form>
                    </td>
                    <td><strong class="${p.unit_profit_inr < 0 ? 'text-rose-600' : 'text-emerald-700'}">${money(p.unit_profit_inr)}</strong></td>
                    <td><span class="margin-badge ${marginBadgeClass}">${marginBadgeLabel}</span></td>
                    <td>${p.qty_sold}</td>
                    <td><strong class="${p.total_profit_inr < 0 ? 'text-rose-600' : 'text-emerald-700'}">${money(p.total_profit_inr)}</strong></td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="8" class="text-center text-muted-foreground p-4">No product records.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  container.querySelectorAll('.local-stock-plus').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.pid;
      const currentStock = Number(btn.dataset.stock || 0);
      state.stock[pid] = currentStock + 1;
      persist();
      toast('Stock increased (+1)', { type: 'ok', title: 'Stock' });
      renderStoreDashboard(data);
    });
  });

  container.querySelectorAll('.local-stock-minus').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.pid;
      const currentStock = Number(btn.dataset.stock || 0);
      state.stock[pid] = Math.max(0, currentStock - 1);
      persist();
      toast('Stock decreased (-1)', { type: 'ok', title: 'Stock' });
      renderStoreDashboard(data);
    });
  });

  container.querySelectorAll('.local-cost-edit-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pid = form.dataset.pid;
      const newCost = Number(form.querySelector('.local-cost-val')?.value || 0);
      const prod = state.customProducts.find((p) => String(p.id) === String(pid)) || (data.products || []).find((p) => String(p.id) === String(pid));
      if (prod) {
        prod.costPrice = newCost;
        prod.cost_price_inr = newCost;
        persist();
        toast('Cost price updated & P&L recalculated.', { type: 'ok', title: 'P&L' });
        renderStoreDashboard(data);
      }
    });
  });

  el('owner-store-select')?.addEventListener('change', (e) => {
    const next = String(e.target.value || '');
    const u = new URL(location.href);
    if (next) u.searchParams.set('store', next);
    location.href = u.toString();
  });

  el('owner-product-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const store = selectedStore;
    if (!store) return;
    const id = `cp-${Date.now()}`;
    const name = String(el('owner-product-name')?.value || '').trim();
    const category = String(el('owner-product-category')?.value || store.category || 'General').trim();
    const price = Number(el('owner-product-price')?.value || 0);
    const costRaw = el('owner-product-cost-price')?.value;
    const costPrice = costRaw !== undefined && costRaw !== '' ? Number(costRaw) : Math.round(price * 0.65);
    const originalPrice = Number(el('owner-product-original')?.value || 0) || Math.round(price * 1.12);
    const stockCount = Number(el('owner-product-stock')?.value || 0);
    const image = String(el('owner-product-image')?.value || '').trim() || fallbackProductImage(category);

    state.customProducts.unshift({
      id,
      storeId: store.id,
      mallId: store.mallId || '',
      name,
      category,
      price,
      costPrice,
      cost_price_inr: costPrice,
      originalPrice,
      stockCount,
      inStock: stockCount > 0,
      image,
      rating: 4.4,
      mediaStatus: 'catalog ready',
      createdAt: new Date().toISOString()
    });
    state.stock[id] = stockCount;
    const customStore = state.customStores.find((st) => String(st.id) === String(store.id));
    if (customStore) customStore.productCount = Number(customStore.productCount || 0) + 1;
    persist();
    toast('Product uploaded with cost & stock configured.', { type: 'ok', title: 'Store Dashboard' });
    renderStoreDashboard(data);
  });
}

function renderAdminDashboard(data) {
  const container = el('dashboard-container');
  if (!container) return;
  if (window.MM_API?.hasApi?.()) {
    renderAdminDashboardApi(data).catch(() => renderAdminDashboardLocal(data));
    return;
  }
  renderAdminDashboardLocal(data);
}

async function renderAdminDashboardApi(data) {
  const container = el('dashboard-container');
  if (!container) return;
  container.innerHTML = '<p class="text-muted-foreground">Loading admin panel…</p>';
  try {
    const [overview, pendingRes, allRes, usersRes, productsRes, ordersRes] = await Promise.all([
      window.MM_API.adminOverview(),
      window.MM_API.adminStores('pending'),
      window.MM_API.adminStores('all'),
      window.MM_API.adminUsers(),
      window.MM_API.adminProducts(),
      window.MM_API.adminOrders()
    ]);
    const pending = pendingRes.stores || [];
    const allStores = allRes.stores || [];
    const users = usersRes.users || [];
    const products = productsRes.products || [];
    const orders = ordersRes.orders || [];
    container.innerHTML = `
      <div class="space-y-6">
        <div><h1 class="text-3xl font-bold">MallMaze Admin Console</h1><p class="text-sm text-muted-foreground mt-1">Full visibility: users, stores, products, orders, payments.</p></div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          ${[
            ['Users', overview.users], ['Stores', overview.stores], ['Products', overview.products], ['Orders', overview.orders],
            ['Reservations', overview.reservations], ['Pending stores', overview.pending_stores], ['Revenue', money(overview.revenue_inr || 0)]
          ].map(([label, val]) => `<div class="border rounded-lg p-3 bg-card"><p class="text-xs text-muted-foreground">${label}</p><p class="text-xl font-bold">${typeof val === 'number' ? val.toLocaleString('en-IN') : val}</p></div>`).join('')}
        </div>
        <section class="border rounded-xl p-4 bg-card overflow-x-auto">
          <h2 class="text-xl font-bold mb-3">Users (${users.length})</h2>
          <table class="w-full text-sm"><thead><tr class="text-left border-b"><th class="py-2">Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
          <tbody>${users.map((u) => `<tr class="border-b border-border/50"><td class="py-2">${escapeHtml(u.name || '-')}</td><td>${escapeHtml(u.email || '-')}</td><td>${escapeHtml(u.phone || '-')}</td><td><b>${escapeHtml(u.role || 'user')}</b></td></tr>`).join('') || '<tr><td colspan="4">No users yet</td></tr>'}</tbody></table>
        </section>
        <section class="border rounded-xl p-4 bg-card">
          <h2 class="text-xl font-bold mb-4">Pending stores (${pending.length})</h2>
          <div class="space-y-3">${pending.length ? pending.map((st) => `
            <article class="rounded-xl border p-4">
              <div class="flex flex-col lg:flex-row lg:justify-between gap-3">
                <div>
                  <p class="font-extrabold">${escapeHtml(st.name)}</p>
                  <p class="text-sm text-muted-foreground">${escapeHtml(st.category || '')} · ${escapeHtml(st.city || '')} · ${escapeHtml(st.phone || '')}</p>
                  <p class="text-sm">${escapeHtml(st.address || '')}</p>
                  ${st.verification_photo_url ? `<img src="${escapeHtml(st.verification_photo_url)}" alt="" class="mt-2 h-20 rounded object-cover" />` : ''}
                </div>
                <div class="flex gap-2"><button type="button" class="mm-action mm-action-primary mm-action-sm" data-verify="${escapeHtml(st.id)}">Verify</button><button type="button" class="mm-action mm-action-outline mm-action-sm" data-reject="${escapeHtml(st.id)}">Reject</button></div>
              </div>
            </article>`).join('') : '<p class="text-sm text-muted-foreground">No pending applications.</p>'}
          </div>
        </section>
        <section class="border rounded-xl p-4 bg-card overflow-x-auto">
          <h2 class="text-xl font-bold mb-3">All products (${products.length})</h2>
          <table class="w-full text-sm"><thead><tr class="text-left border-b"><th class="py-2">Product</th><th>Store</th><th>Price</th><th>Stock</th><th>Enhanced</th></tr></thead>
          <tbody>${products.slice(0, 100).map((p) => `<tr class="border-b border-border/50"><td class="py-2">${escapeHtml(p.name)}</td><td>${escapeHtml(p.store_id)}</td><td>${money(p.price_inr || 0)}</td><td>${p.stock_qty ?? 0}</td><td>${p.enhanced ? 'Yes' : 'No'}</td></tr>`).join('') || '<tr><td colspan="5">No products</td></tr>'}</tbody></table>
        </section>
        <section class="border rounded-xl p-4 bg-card overflow-x-auto">
          <h2 class="text-xl font-bold mb-3">Orders (${orders.length})</h2>
          <table class="w-full text-sm"><thead><tr class="text-left border-b"><th class="py-2">Order</th><th>Status</th><th>Payment</th><th>Total</th></tr></thead>
          <tbody>${orders.slice(0, 50).map((o) => `<tr class="border-b border-border/50"><td class="py-2">${escapeHtml(o.id)}</td><td>${escapeHtml(o.status)}</td><td>${escapeHtml(o.payment_status)}</td><td>${money((o.total_paise || o.totals?.totalPaise || 0) / 100)}</td></tr>`).join('') || '<tr><td colspan="4">No orders</td></tr>'}</tbody></table>
        </section>
        <section class="border rounded-xl p-4 bg-card">
          <h2 class="text-xl font-bold mb-3">All stores (${allStores.length})</h2>
          <div class="grid gap-2">${allStores.map((st) => `<div class="flex justify-between rounded-lg bg-muted px-3 py-2 text-sm"><span>${escapeHtml(st.name)} · ${escapeHtml(st.city || '')}</span><span class="font-bold">${escapeHtml(st.verification_status || 'pending')}</span></div>`).join('')}</div>
        </section>
      </div>`;
    container.querySelectorAll('[data-verify]').forEach((btn) => btn.addEventListener('click', async () => {
      await window.MM_API.verifyStore({ store_id: btn.getAttribute('data-verify') });
      toast('Store verified.', { type: 'ok', title: 'Admin' });
      renderAdminDashboardApi(data);
    }));
    container.querySelectorAll('[data-reject]').forEach((btn) => btn.addEventListener('click', async () => {
      await window.MM_API.rejectStore({ store_id: btn.getAttribute('data-reject'), reason: 'Verification failed' });
      toast('Store rejected.', { type: 'ok', title: 'Admin' });
      renderAdminDashboardApi(data);
    }));
  } catch {
    container.innerHTML = `<div class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">Admin login required. OTP login with <b>admin@mallmaze.in</b> (dev OTP shown in network response).</div>`;
  }
}

function renderAdminDashboardLocal(data) {
  const container = el('dashboard-container');
  if (!container) return;
  const pilotStores = state.customStores || [];
  const allProducts = data.products || [];
  const pilotProducts = (state.customProducts || []).length;
  const qrReady = pilotStores.filter((st) => st.id).length;
  const storeList = pilotStores.slice(0, 12).map((st) => {
    const mgr = (state.managers || []).find((m) => String(m.storeId) === String(st.id));
    const count = allProducts.filter((p) => String(p.storeId) === String(st.id)).length;
    return `
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <p class="font-extrabold truncate">${escapeHtml(st.name)}</p>
            <p class="text-sm text-muted-foreground">${escapeHtml(st.category || 'Store')} - ${escapeHtml(st.address || st.floor || 'Address pending')}</p>
            <p class="mt-2 text-xs text-muted-foreground">Owner: ${escapeHtml(mgr?.name || st.ownerName || 'Not assigned')} ${mgr?.email ? `- ${escapeHtml(mgr.email)}` : ''}</p>
            ${mgr?.tempPassword ? `<p class="mt-1 text-xs font-semibold text-slate-700">Temporary password: <span class="font-mono">${escapeHtml(mgr.tempPassword)}</span></p>` : ''}
          </div>
          <div class="flex flex-wrap gap-2">
            <a href="${storePath(st.id)}" class="mm-action mm-action-outline mm-action-sm">Storefront</a>
            <a href="${storeUrl(st.id)}" class="mm-action mm-action-ghost mm-action-sm">QR link</a>
          </div>
        </div>
        <div class="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div class="rounded-lg bg-muted p-2"><span class="text-muted-foreground">Products</span><b class="block">${count}</b></div>
          <div class="rounded-lg bg-muted p-2"><span class="text-muted-foreground">Hours</span><b class="block">${escapeHtml(st.hours || '10 AM - 10 PM')}</b></div>
          <div class="rounded-lg bg-muted p-2"><span class="text-muted-foreground">QR</span><b class="block">Ready</b></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-bold">ConnectOS Pilot Admin</h1>
          <p class="text-sm text-muted-foreground mt-1">Manually onboard the first local stores, give owners credentials, and launch QR storefronts.</p>
        </div>
          <a href="autoshelf.html" class="sm-os-btn primary">${icon('shield')} Local Stores</a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="border rounded-lg p-4 bg-blue-50"><p class="text-sm text-muted-foreground">Pilot stores</p><p class="text-2xl font-bold">${pilotStores.length}/3</p></div>
        <div class="border rounded-lg p-4 bg-green-50"><p class="text-sm text-muted-foreground">Marketplace products</p><p class="text-2xl font-bold">${allProducts.length}</p></div>
        <div class="border rounded-lg p-4 bg-yellow-50"><p class="text-sm text-muted-foreground">Owner accounts</p><p class="text-2xl font-bold">${state.managers.length}</p></div>
        <div class="border rounded-lg p-4 bg-purple-50"><p class="text-sm text-muted-foreground">QR storefronts</p><p class="text-2xl font-bold">${qrReady}</p></div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[.85fr_1.15fr] gap-6">
        <section class="border rounded-xl p-4 bg-card">
          <h2 class="text-lg font-bold mb-3">Create Pilot Store</h2>
          <form id="add-store" class="grid gap-3">
            <select id="store-mall" class="rounded-xl border px-3 py-2.5">${data.malls.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} - ${escapeHtml(m.location || '')}</option>`).join('')}</select>
            <input id="store-name" placeholder="Store name" required class="rounded-xl border px-3 py-2.5" />
            <input id="store-category" placeholder="Category" required class="rounded-xl border px-3 py-2.5" />
            <input id="store-address" placeholder="Full address / landmark" required class="rounded-xl border px-3 py-2.5" />
            <div class="grid gap-3 md:grid-cols-2">
              <input id="store-phone" placeholder="Contact phone" class="rounded-xl border px-3 py-2.5" />
              <input id="store-hours" placeholder="Operating hours" value="10:00 AM - 10:00 PM" class="rounded-xl border px-3 py-2.5" />
            </div>
            <input id="store-floor" placeholder="Floor / area inside mall" class="rounded-xl border px-3 py-2.5" />
            <input id="store-image" placeholder="Store image URL" class="rounded-xl border px-3 py-2.5" />
            <div class="grid gap-3 md:grid-cols-2">
              <input id="store-owner-name" placeholder="Owner / manager name" required class="rounded-xl border px-3 py-2.5" />
              <input id="store-owner-email" type="email" placeholder="owner@store.com" required class="rounded-xl border px-3 py-2.5" />
            </div>
            <input id="store-temp-password" placeholder="Temporary password (auto if blank)" class="rounded-xl border px-3 py-2.5" />
            <button type="submit" class="rounded-xl bg-primary px-4 py-3 text-white font-semibold">Create store, owner login, and QR</button>
          </form>
        </section>

        <section class="border rounded-xl p-4 bg-card">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-bold">Onboarded Pilot Stores</h2>
              <p class="text-sm text-muted-foreground">Start with around three active shops and push each toward 10 uploads per day.</p>
            </div>
            <a href="store-dashboard.html" class="mm-action mm-action-outline mm-action-sm">Owner dashboard</a>
          </div>
          <div class="mt-4 grid gap-3">${storeList || '<p class="text-sm text-muted-foreground">No pilot stores yet. Create the first one from the form.</p>'}</div>
        </section>
      </div>

      <section class="border rounded-xl p-4 bg-card">
        <h2 class="text-lg font-bold">Optional Mall Setup</h2>
        <p class="text-sm text-muted-foreground mb-3">Use this only when the pilot area or mall is missing from the demo catalog.</p>
        <form id="add-mall" class="grid gap-3 md:grid-cols-5">
          <input id="mall-name" placeholder="Mall / market name" required class="rounded-xl border px-3 py-2.5 md:col-span-2" />
          <input id="mall-location" placeholder="Area, City" required class="rounded-xl border px-3 py-2.5" />
          <input id="mall-image" placeholder="Image URL" class="rounded-xl border px-3 py-2.5" />
          <button type="submit" class="rounded-xl bg-primary px-4 py-2.5 text-white font-semibold">Create area</button>
        </form>
      </section>
    </div>
  `;

  el('add-mall')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.customMalls.unshift({
      id: `cm-${Date.now()}`,
      name: el('mall-name').value,
      location: el('mall-location').value,
      image: el('mall-image').value || 'assets/media/hero-mall.jpg',
      floors: 3,
      rating: 4.2,
      storeCount: 0,
      description: 'Hyperlocal pilot area onboarded by ConnectOS admin.',
      deliveryTime: '35 min'
    });
    persist();
    window.location.reload();
  });

  el('add-store')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const mallId = el('store-mall').value;
    const mall = (data.malls || []).find((m) => String(m.id) === String(mallId));
    const id = `cs-${Date.now()}`;
    const tempPassword = String(el('store-temp-password')?.value || '').trim() || generatedCredential();
    const store = {
      id,
      mallId,
      name: el('store-name').value,
      category: el('store-category').value,
      floor: el('store-floor').value || 'Ground Floor',
      address: el('store-address').value,
      phone: el('store-phone').value,
      hours: el('store-hours').value || '10:00 AM - 10:00 PM',
      city: cityOf(mall?.location),
      image: el('store-image').value || 'assets/media/hero-mall.jpg',
      rating: 4.3,
      isOpen: true,
      productCount: 0,
      ownerName: el('store-owner-name').value,
      ownerEmail: el('store-owner-email').value,
      qrUrl: storeUrl(id),
      createdAt: new Date().toISOString()
    };
    state.customStores.unshift(store);
    state.managers.unshift({
      id: `mgr-${Date.now()}`,
      name: store.ownerName,
      email: store.ownerEmail,
      mallId,
      storeId: id,
      status: 'active',
      tempPassword,
      createdAt: new Date().toISOString()
    });
    persist();
    toast('Pilot store created with owner login and QR storefront.', { type: 'ok', title: 'ConnectOS' });
    setTimeout(() => window.location.reload(), 500);
  });
  return;
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

async function renderAdminDashboardLegacyRemote() {
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
    renderAdminDashboardLegacyRemote();
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
    renderAdminDashboardLegacyRemote();
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
    renderAdminDashboardLegacyRemote();
  });

  el('sb-refresh-tickets')?.addEventListener('click', () => renderAdminDashboardLegacyRemote());

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
    renderAdminDashboardLegacyRemote();
  }));

  container.querySelectorAll('.sb-resolve-btn').forEach((b) => b.addEventListener('click', async () => {
    const id = String(b.getAttribute('data-ticket') || '');
    const { error } = await client.from('support_tickets').update({ status: 'resolved' }).eq('id', id);
    if (error) return toast(error.message, { type: 'bad', title: 'Support' });
    toast('Ticket resolved.', { type: 'ok', title: 'Support' });
    renderAdminDashboardLegacyRemote();
  }));

  container.querySelectorAll('.sb-refund-btn').forEach((b) => b.addEventListener('click', async () => {
    const ticketId = String(b.getAttribute('data-ticket') || '');
    const orderId = String(b.getAttribute('data-order') || '');
    const pct = Number(container.querySelector(`[data-refund-pct="${ticketId}"]`)?.value || 100);
    if (!orderId) return toast('Missing order id on ticket.', { type: 'bad', title: 'Refund' });
    const functionsBase = '';
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
    renderAdminDashboardLegacyRemote();
  }));
}

async function renderStoreDashboardLegacyRemote() {
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
    renderStoreDashboardLegacyRemote();
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

  const params = new URLSearchParams(location.search);
  const token = params.get('token') || '';
  const paymentSessionId = params.get('session_id') || '';
  if (!window.MM_API?.hasApi?.()) {
    container.innerHTML = '<div class="rounded-2xl border border-border bg-card p-5"><p class="font-semibold">Backend API not configured</p><p class="text-sm text-muted-foreground mt-1">Set API_BASE_URL in assets/js/config.js and start the Node backend.</p></div>';
    return;
  }

  if (!window.MM_API?.token?.()) {
    const next = `scan-receipt.html${location.search || ''}`;
    container.innerHTML = `<div class="rounded-2xl border border-border bg-card p-5"><p class="font-semibold">Please sign in</p><p class="text-sm text-muted-foreground mt-1">Login is required to view your receipt.</p><a href="login.html?next=${encodeURIComponent(next)}" class="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-white font-semibold">Login</a></div>`;
    return;
  }

  if (!token && !paymentSessionId) {
    container.innerHTML = '<div class="rounded-2xl border border-border bg-card p-5"><p class="font-semibold">Missing receipt token</p><p class="text-sm text-muted-foreground mt-1">Open this page from the Scan & Go checkout redirect.</p></div>';
    return;
  }

  let receipt = null;
  try {
    const response = await window.MM_API.scanReceipt({ token, session_id: paymentSessionId });
    receipt = response.receipt;
  } catch (error) {
    receipt = null;
    container.dataset.receiptError = error.message || 'If you just paid, wait a few seconds and refresh.';
  }

  if (!receipt?.token) {
    const message = container.dataset.receiptError || 'If you just paid, wait a few seconds and refresh.';
    container.innerHTML = `
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="font-semibold">Receipt is being generated…</p>
        <p class="text-sm text-muted-foreground mt-1">${escapeHtml(message)}</p>
        <button id="sr-refresh" class="mt-4 rounded-lg border px-4 py-2 font-semibold">Refresh</button>
      </div>
    `;
    el('sr-refresh')?.addEventListener('click', () => location.reload());
    return;
  }

  const base = location.href.replace(/[#?].*$/, '').replace(/scan-receipt\.html$/, '');
  const verifyUrl = `${base}verify-receipt.html?token=${encodeURIComponent(receipt.token)}`;
  const receiptItems = Array.isArray(receipt.items) ? receipt.items : [];

  container.innerHTML = `
    <div class="rounded-2xl border border-border bg-card p-5 shadow-card max-w-xl">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs text-muted-foreground">Receipt Token</p>
            <p class="font-mono text-sm mt-1 break-all">${escapeHtml(receipt.token)}</p>
          <p class="mt-3 text-lg font-extrabold">Total ${money(receipt.total_inr || 0)}</p>
          <p class="text-xs text-muted-foreground mt-1">${escapeHtml(receipt.status || 'paid')} - ${receipt.created_at ? new Date(receipt.created_at).toLocaleString() : 'just now'}</p>
          <p class="text-xs text-muted-foreground mt-1">${receipt.verified_at ? 'Verified at exit' : 'Not verified yet'}</p>
        </div>
        <canvas id="mm-receipt-qr" class="h-[240px] w-[240px] rounded-xl border border-border bg-white p-2"></canvas>
      </div>
      <div class="mt-4 rounded-xl border border-border bg-muted/40 p-3">
        ${receiptItems.length ? receiptItems.slice(0, 6).map((item) => `
          <div class="flex items-center justify-between gap-3 py-2 text-sm">
            <span class="min-w-0 truncate">${escapeHtml(item.name || item.code || 'Scanned item')} x ${Number(item.qty || 1)}</span>
            <span class="font-semibold">${money(Math.round(Number(item.lineTotalPaise || 0) / 100))}</span>
          </div>
        `).join('') : '<p class="text-sm text-muted-foreground">Receipt item details are stored in the backend.</p>'}
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

  if (!window.MM_API?.hasApi?.()) {
    result.innerHTML = '<div class="rounded-xl border border-border bg-muted p-4 text-sm">Backend API not configured. Set API_BASE_URL and start the backend.</div>';
    return;
  }
  if (!window.MM_API?.token?.()) {
    result.innerHTML = `<div class="rounded-xl border border-border bg-muted p-4 text-sm">Please login as staff/admin to verify receipts.</div><a class="inline-flex mt-3 rounded-lg bg-primary px-4 py-2 text-white font-semibold" href="login.html?next=${encodeURIComponent(`verify-receipt.html${location.search || ''}`)}">Login</a>`;
    return;
  }

  const qpToken = new URLSearchParams(location.search).get('token') || '';
  if (qpToken) tokenInput.value = qpToken;

  async function verifyToken(token) {
    const t = String(token || '').trim();
    if (!t) return toast('Missing token', { type: 'bad', title: 'Verify' });
    verifyBtn.disabled = true;
    try {
      const response = await window.MM_API.verifyScanReceipt({ token: t });
      const receipt = response.receipt || {};
      result.innerHTML = `
        <div class="rounded-xl border border-border bg-muted p-4 text-sm">
          <p class="font-semibold">Receipt verified</p>
          <p class="mt-1 text-muted-foreground">Total ${money(receipt.total_inr || 0)}</p>
          <p class="mt-1 text-xs text-muted-foreground">Token ${escapeHtml(receipt.token || t)}</p>
          <p class="mt-1 text-xs text-muted-foreground">Verified at ${receipt.verified_at ? new Date(receipt.verified_at).toLocaleString() : new Date().toLocaleString()}</p>
        </div>
      `;
      toast('Receipt verified', { type: 'ok', title: 'Verify' });
    } catch (error) {
      result.innerHTML = `<div class="rounded-xl border border-border bg-muted p-4 text-sm">${escapeHtml(error.message || 'Receipt not found.')}</div>`;
      toast(error.message || 'Receipt not found.', { type: 'bad', title: 'Verify' });
    } finally {
      verifyBtn.disabled = false;
    }
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

  if (window.MM_API?.token?.()) {
    container.innerHTML = loadingState({ title: 'Loading order...' });
    try {
      const data = await window.MM_API.order(orderId);
      const apiOrder = data.order || {};
      const localLike = {
        id: apiOrder.id,
        date: apiOrder.created_at || new Date().toISOString(),
        status: apiOrder.status || apiOrder.payment_status || 'paid',
        total: window.MM_API.moneyPaiseToRupees(apiOrder.totals?.totalPaise || apiOrder.total_paise || 0),
        trackingId: apiOrder.delivery?.id || apiOrder.delivery_job_id || apiOrder.razorpay_payment_id || '-',
        paymentMethod: 'Razorpay',
        delivery: apiOrder.delivery || null,
        events: data.events || [],
        fees: apiOrder.totals || null,
        items: (apiOrder.items || []).map((item) => ({
          id: item.product_id || item.id || item.name,
          name: item.name || 'Product',
          price: window.MM_API.moneyPaiseToRupees(item.unit_amount_paise || 0),
          quantity: item.qty || item.quantity || 1,
          storeId: item.store_id || ''
        }))
      };
      state.orders = [localLike, ...state.orders.filter((x) => String(x.id) !== String(localLike.id))];
      persist();
    } catch (error) {
      const cached = state.orders.find((x) => String(x.id) === String(orderId));
      if (!cached) {
        container.innerHTML = emptyState({ title: 'Order not found', subtitle: error.message || 'This order may not exist or you may not have access.' });
        return;
      }
    }
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
        <div class="mm-card mm-card-pad bg-slate-900 text-white mb-4 shadow-xl">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">Live Logistics & Tracking</span>
              <h2 class="text-xl font-extrabold text-white mt-0.5">${escapeHtml(String(o.status || 'Out for Delivery')).toUpperCase()}</h2>
              <p class="text-xs text-slate-300 mt-1">Courier: Ramesh K. (SmartMall EV Scooter TS 09 EQ 4812) · Rating 4.9 ★</p>
            </div>
            <div class="text-right shrink-0">
              <span class="text-2xl font-black text-amber-400">18 min</span>
              <p class="text-[10px] text-slate-400 font-bold">Estimated Arrival</p>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-5 gap-2">
            <div class="text-center">
              <div class="h-2 rounded-full mb-1.5 bg-amber-400"></div>
              <p class="text-[10px] font-bold text-white">Order Placed</p>
            </div>
            <div class="text-center">
              <div class="h-2 rounded-full mb-1.5 bg-amber-400"></div>
              <p class="text-[10px] font-bold text-white">Rapid Shelf Picked</p>
            </div>
            <div class="text-center">
              <div class="h-2 rounded-full mb-1.5 bg-amber-400"></div>
              <p class="text-[10px] font-bold text-white">Sealed & Packed</p>
            </div>
            <div class="text-center">
              <div class="h-2 rounded-full mb-1.5 bg-amber-400 animate-pulse"></div>
              <p class="text-[10px] font-bold text-amber-300">Out for Delivery</p>
            </div>
            <div class="text-center">
              <div class="h-2 rounded-full mb-1.5 bg-slate-700"></div>
              <p class="text-[10px] font-bold text-slate-400">Delivered</p>
            </div>
          </div>
        </div>

        ${o.delivery ? `
          <div class="mm-card mm-card-pad">
            <p class="font-extrabold mb-3">Delivery Partner Info</p>
            <div class="rounded-xl border border-border p-3 text-sm space-y-1">
              <p><b>Tracking ID:</b> <span class="font-mono">${escapeHtml(String(o.delivery.id || o.trackingId || '-'))}</span></p>
              <p><b>Status:</b> <span class="font-bold text-amber-600">${escapeHtml(String(o.delivery.status || o.status || '-'))}</span></p>
              <p><b>Courier Partner:</b> ${escapeHtml(String(o.delivery.provider || 'SmartMall Express Delivery'))}</p>
              <p><b>ETA:</b> ${o.delivery.estimated_minutes || o.delivery.eta_minutes ? `${Number(o.delivery.estimated_minutes || o.delivery.eta_minutes)} minutes` : '18 minutes'}</p>
            </div>
          </div>
        ` : ''}
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
        ${Array.isArray(o.events) && o.events.length ? `
          <div class="mm-card mm-card-pad">
            <p class="font-extrabold mb-3">Timeline</p>
            <div class="space-y-2">
              ${o.events.map((ev) => `
                <div class="rounded-xl border border-border p-3 text-sm">
                  <div class="flex items-start justify-between gap-3">
                    <p class="font-semibold">${escapeHtml(String(ev.event || '').replace(/_/g, ' '))}</p>
                    <p class="text-xs text-muted-foreground">${ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}</p>
                  </div>
                  ${ev.payload ? `<pre class="mt-2 text-xs overflow-auto bg-white border border-border rounded-lg p-2">${escapeHtml(JSON.stringify(ev.payload, null, 2))}</pre>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
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
    // Add items to cart by name/price for checkout fallback; backend verifies final totals.
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
  if (!window.MM_API?.token?.()) return (window.location.href = 'login.html');

  container.innerHTML = loadingState({ title: 'Loading your tickets…' });

  const qp = new URLSearchParams(location.search);
  const prefillOrderId = String(qp.get('order_id') || '').trim();
  const prefillType = String(qp.get('type') || '').trim();
  const prefillMsg = String(qp.get('msg') || '').trim();

  let tickets = [];
  try {
    tickets = (await window.MM_API.supportTickets()).tickets || [];
  } catch (error) {
    container.innerHTML = emptyState({
      title: 'Support unavailable',
      subtitle: error.message || 'Start the backend API and try again.'
    });
    return;
  }

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
      order_id: orderId,
      type,
      refund_percent: refundPct,
      message: msg
    };

    try {
      await window.MM_API.createSupportTicket(payload);
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
    } catch (error) {
      toast(error.message || String(error), { type: 'bad', title: 'Support' });
    }
  });
}

async function renderNotificationsPage() {
  const container = el('notif-container');
  if (!container) return;
  if (!window.MM_API?.token?.()) return (window.location.href = 'login.html');

  container.innerHTML = loadingState({ title: 'Loading updates…' });

  let events = [];
  let receipts = [];
  let tickets = [];
  try {
    const data = await window.MM_API.notifications();
    events = data.events || [];
    receipts = data.receipts || [];
    tickets = data.tickets || [];
  } catch (error) {
    container.innerHTML = emptyState({ title: 'Notifications unavailable', subtitle: error.message || 'Start the backend API and try again.' });
    return;
  }

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
    document.getElementById('mm-config-dismiss')?.addEventListener('click', () => {
      try {
        document.documentElement.style.scrollPaddingTop = '';
        document.body.style.paddingTop = '';
      } catch {}
    });
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

function initRagCopilot() {
  try {
    if (document.getElementById('mm-copilot-trigger')) return;

    const trigger = document.createElement('button');
    trigger.id = 'mm-copilot-trigger';
    trigger.className = 'mm-copilot-trigger';
    trigger.type = 'button';
    trigger.innerHTML = `
      <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/20 text-amber-300 font-black text-xs">✨</span>
      <span>Gemini AI Copilot</span>
    `;
    document.body.appendChild(trigger);

    const drawer = document.createElement('div');
    drawer.id = 'mm-copilot-drawer';
    drawer.className = 'mm-copilot-drawer hidden';
    drawer.style.display = 'none';
    drawer.innerHTML = `
      <div class="mm-copilot-head">
        <div class="flex items-center gap-2.5">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/30 text-amber-300 font-extrabold text-sm border border-amber-400/30">✨</span>
          <div>
            <h3 class="font-extrabold text-sm text-white leading-none flex items-center gap-1.5">
              <span>MallMaze Gemini Copilot</span>
              <span class="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300">v3.6 Flash</span>
            </h3>
            <p class="text-[10px] text-slate-300 mt-0.5">High-Precision Mall & Catalog Intelligence</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" id="copilot-clear" title="Clear chat history" class="text-slate-400 hover:text-amber-300 text-xs font-bold px-1.5 py-1">🧹 Clear</button>
          <button type="button" id="copilot-close" title="Close AI Assistant" class="text-slate-300 hover:text-white text-lg font-bold px-1.5">✕</button>
        </div>
      </div>

      <!-- Scrollable Chat Feed -->
      <div id="copilot-feed" class="mm-copilot-feed">
        <div class="chat-bubble chat-bubble-ai">
          <div class="flex items-center gap-1.5 font-bold text-indigo-600 mb-1 text-[11px]">
            <span>✨ Gemini AI Assistant</span>
          </div>
          <p class="text-slate-700 leading-relaxed">
            👋 Hi! I am your <b>MallMaze AI Assistant</b>. Ask me anything in natural English about local store items, delivery FAQs, sizing advice, or budget deals!
          </p>
        </div>
      </div>

      <!-- Quick Prompt Suggestion Bar -->
      <div class="px-3 py-2 border-t border-slate-200 bg-white">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" id="copilot-chips">
          <button type="button" class="copilot-chip rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition shrink-0" data-q="blue blazer under 5000">👔 Blue blazer &lt; ₹5k</button>
          <button type="button" class="copilot-chip rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition shrink-0" data-q="running shoes in stock">👟 Running shoes</button>
          <button type="button" class="copilot-chip rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition shrink-0" data-q="how does 45 min delivery work?">⚡ Delivery SLA</button>
          <button type="button" class="copilot-chip rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition shrink-0" data-q="headphones">🎧 Headphones</button>
        </div>
      </div>

      <!-- Input Box -->
      <div class="p-3 border-t border-slate-200 bg-white">
        <form id="copilot-form" class="flex gap-2">
          <input id="copilot-input" type="text" placeholder="Ask Gemini AI (e.g. blue blazer under 5000)..." class="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold focus:border-indigo-600 focus:outline-none bg-slate-50" required />
          <button type="submit" class="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 transition flex items-center gap-1 shrink-0">
            <span>Send</span>
            <span>✨</span>
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(drawer);

    // Bulletproof Toggle & Close Event Listeners
    const closeCopilot = () => {
      drawer.classList.add('hidden');
      drawer.style.display = 'none';
    };
    const openCopilot = () => {
      drawer.classList.remove('hidden');
      drawer.style.display = 'flex';
      document.getElementById('copilot-input')?.focus();
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (drawer.style.display === 'none' || drawer.classList.contains('hidden')) openCopilot();
      else closeCopilot();
    });

    document.getElementById('copilot-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeCopilot();
    });

    document.getElementById('copilot-clear')?.addEventListener('click', () => {
      const feed = document.getElementById('copilot-feed');
      if (feed) {
        feed.innerHTML = `
          <div class="chat-bubble chat-bubble-ai">
            <div class="flex items-center gap-1.5 font-bold text-indigo-600 mb-1 text-[11px]">
              <span>✨ Gemini AI Assistant</span>
            </div>
            <p class="text-slate-700 leading-relaxed">
              Chat history cleared. What can I help you find in local stores today?
            </p>
          </div>
        `;
      }
    });

    const formatAiText = (rawText) => {
      let t = escapeHtml(rawText || '');
      t = t.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      t = t.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-indigo-700 font-mono">$1</code>');
      t = t.replace(/\n\n/g, '<br/><br/>');
      return t;
    };

    const appendUserMessage = (text) => {
      const feed = document.getElementById('copilot-feed');
      if (!feed) return;
      const msg = document.createElement('div');
      msg.className = 'chat-bubble chat-bubble-user';
      msg.innerHTML = `<p class="font-medium">${escapeHtml(text)}</p>`;
      feed.appendChild(msg);
      feed.scrollTop = feed.scrollHeight;
    };

    const appendAiThinking = () => {
      const feed = document.getElementById('copilot-feed');
      if (!feed) return null;
      const msg = document.createElement('div');
      msg.id = 'copilot-thinking-msg';
      msg.className = 'chat-bubble chat-bubble-ai';
      msg.innerHTML = `
        <div class="flex items-center gap-2 text-xs font-semibold text-indigo-600 animate-pulse">
          <span class="inline-block h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
          <span>Gemini AI is analyzing local stores & knowledge base...</span>
        </div>
      `;
      feed.appendChild(msg);
      feed.scrollTop = feed.scrollHeight;
      return msg;
    };

    const sendQuery = async (queryText) => {
      const q = String(queryText || '').trim();
      if (!q) return;

      appendUserMessage(q);
      const thinkingEl = appendAiThinking();
      const feed = document.getElementById('copilot-feed');

      try {
        let data;
        if (window.MM_API?.ragSearch) {
          data = await window.MM_API.ragSearch({ query: q, city: state.location });
        } else {
          const prods = scoped(window.appData).products || [];
          const tokens = q.toLowerCase().split(/\s+/);
          const results = prods.filter((p) => tokens.some((t) => (p.name || '').toLowerCase().includes(t) || (p.category || '').toLowerCase().includes(t)));
          data = { ok: true, query: q, answer: `Found ${results.length} matches for "${q}".`, results };
        }

        thinkingEl?.remove();

        const items = data.results || [];
        const answerText = data.answer || `Here are the matching options found for "${q}".`;

        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-bubble chat-bubble-ai space-y-2';

        let innerHTML = `
          <div class="flex items-center gap-1.5 font-bold text-indigo-600 text-[11px]">
            <span>✨ Gemini AI Answer</span>
          </div>
          <div class="text-slate-700 leading-relaxed">${formatAiText(answerText)}</div>
        `;

        if (items.length) {
          innerHTML += `<div class="space-y-2 mt-2 pt-2 border-t border-slate-100">`;
          items.forEach((p) => {
            innerHTML += `
              <div class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2 hover:bg-white transition">
                <img src="${escapeHtml(p.image || p.image_url || 'assets/media/hero-mall.jpg')}" class="h-11 w-11 rounded-lg object-cover flex-shrink-0" alt="" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-slate-900 truncate">${escapeHtml(p.name)}</p>
                  <p class="text-[11px] text-amber-600 font-extrabold mt-0.5">${money(p.price)} <span class="text-slate-400 font-normal">· ${escapeHtml(p.storeName || 'Local Store')}</span></p>
                </div>
                <a href="product.html?id=${p.id}" class="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-extrabold text-white hover:bg-indigo-700 transition shrink-0">View</a>
              </div>
            `;
          });
          innerHTML += `</div>`;
        }

        aiMsg.innerHTML = innerHTML;
        feed?.appendChild(aiMsg);
        if (feed) feed.scrollTop = feed.scrollHeight;

      } catch (err) {
        thinkingEl?.remove();
        const errMsg = document.createElement('div');
        errMsg.className = 'chat-bubble chat-bubble-ai border-rose-200 bg-rose-50 text-rose-800';
        errMsg.innerHTML = `<p class="font-semibold text-xs">⚠️ ${escapeHtml(err.message || String(err))}</p>`;
        feed?.appendChild(errMsg);
        if (feed) feed.scrollTop = feed.scrollHeight;
      }
    };

    document.getElementById('copilot-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('copilot-input');
      const val = input?.value;
      if (input) input.value = '';
      sendQuery(val);
    });

    document.querySelectorAll('.copilot-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const q = chip.getAttribute('data-q');
        sendQuery(q);
      });
    });
  } catch {}
}

async function init() {
  if (!state.location) {
    state.location = 'Hyderabad';
    write(STORAGE_KEYS.location, state.location);
  }
  renderNavbar();
  initRagCopilot();
  

  window.appData = await loadAppData();

  // PWA: register service worker for offline caching
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  } catch {}
  initPwaUx();

  // Legacy external DB auth has been removed from the active app path. OTP/session state comes from MM_API.

  // Location modal intentionally disabled.

  const file = location.pathname.split('/').pop() || 'index.html';
  // Light prefetching of key pages
  try {
      if (file === 'index.html') prefetchPages(['products.html', 'scan.html', 'compare.html', 'autoshelf.html']);
    if (file === 'products.html') prefetchPages(['product.html', 'cart.html', 'compare.html']);
    if (file === 'product.html') prefetchPages(['cart.html', 'compare.html']);
    if (file === 'orders.html') prefetchPages(['order.html', 'support.html', 'notifications.html']);
    if (file === 'autoshelf.html') prefetchPages(['products.html', 'store-dashboard.html', 'admin-dashboard.html']);
  } catch {}
  // Friendly config guardrails
  try {
    const apiOk = Boolean(window.MM_API?.hasApi?.());
    const needsApi = ['login.html', 'cart.html', 'orders.html', 'order.html', 'support.html', 'notifications.html', 'scan-receipt.html', 'verify-receipt.html', 'admin-dashboard.html', 'store-dashboard.html'].includes(file);
    if (needsApi && !apiOk) showConfigBanner('Backend API is not configured. Start backend/server.js or set API_BASE_URL.', 'backend/README.md', 'Backend notes');
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
  else if (file === 'register-store.html') window.MM_Marketplace?.renderRegisterStorePage?.();
  else if (file === 'autoshelf.html') {
    // Legacy Connect OS renderer is kept above for later reuse; autoshelf.html owns the Local Stores page.
  }
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
    const label = b.querySelector('span');
    const oldText = label ? label.textContent : '';
    b.classList.add('added');
    b.setAttribute('aria-live', 'polite');
    if (label) label.textContent = 'Added';
    window.setTimeout(() => {
      b.classList.remove('added');
      if (label) label.textContent = oldText || 'Add to Cart';
    }, 1200);
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
