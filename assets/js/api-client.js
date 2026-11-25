// Simple API client used by dashboard.html and data-viewer.html
// It expects a global variable `API_BASE_URL` (set in the HTML via a <script> tag)
// If not present, it defaults to the same origin.

const API_BASE = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';

/**
 * Helper to perform a GET request and return parsed JSON.
 * @param {string} endpoint e.g. '/stores' or '/products'
 * @returns {Promise<any>}
 */
async function apiGet(endpoint) {
  const url = API_BASE + endpoint;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} – ${response.statusText}`);
  }
  return response.json();
}

// Exported convenience functions (used in the HTML pages)
export async function fetchStores() {
  return apiGet('/stores');
}

export async function fetchProducts() {
  return apiGet('/products');
}

export async function fetchOrders() {
  return apiGet('/orders');
}

export async function fetchStockEvents() {
  return apiGet('/stock_events');
}

// Example usage in a page script (you can import this module)
// <script type="module">
//   import { fetchStores } from '/assets/js/api-client.js';
//   fetchStores().then(data => console.log(data)).catch(err => console.error(err));
// </script>
