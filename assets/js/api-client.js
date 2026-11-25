// Simple API client used by dashboard.html and data-viewer.html
// Exposes functions on window for non‑module usage.

const API_BASE = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';

async function apiGet(endpoint) {
  const url = API_BASE + endpoint;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} – ${response.statusText}`);
  }
  return response.json();
}

// Functions
async function fetchStores() {
  return apiGet('/stores');
}
window.fetchStores = fetchStores;

async function fetchProducts() {
  return apiGet('/products');
}
window.fetchProducts = fetchProducts;

async function fetchOrders() {
  return apiGet('/orders');
}
window.fetchOrders = fetchOrders;

async function fetchStockEvents() {
  return apiGet('/stock_events');
}
window.fetchStockEvents = fetchStockEvents;

// Example usage (commented):
// <script>
//   fetchStores().then(...);
// </script>
