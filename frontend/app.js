// MallMaze front‑end – fetch stores & products from the running backend
// Backend API base – defaults to live site if no env var
const API_BASE = window.API_BASE_URL || 'https://mallmaze-live.onrender.com';

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${resp.statusText}`);
  return resp.json();
}

function renderStores(stores) {
  const ul = document.getElementById('store-list');
  ul.innerHTML = '';
  stores.forEach(s => {
    const li = document.createElement('li');
    li.textContent = `${s.id} – ${s.name} (${s.category})`;
    ul.appendChild(li);
  });
}

function renderProducts(products) {
  const ul = document.getElementById('product-list');
  ul.innerHTML = '';
  products.forEach(p => {
    const li = document.createElement('li');
    li.className = 'product-card';
    li.innerHTML = `
      <span>${p.name} (store: ${p.store_id})</span>
      <span class="price">₹${(p.price_paise/100).toFixed(2)}</span>
    `;
    ul.appendChild(li);
  });
}

async function loadData() {
  try {
    const [stores, products] = await Promise.all([
      fetchJson(`${API_BASE}/stores`),
      fetchJson(`${API_BASE}/products`)
    ]);
    renderStores(stores);
    renderProducts(products);
  } catch (e) {
    console.error('Failed to load data:', e);
    const main = document.querySelector('main');
    main.innerHTML = `<p style="color:red;">Error loading data – check that the backend is running.</p>`;
  }
}

// Run on page load
window.addEventListener('DOMContentLoaded', loadData);
