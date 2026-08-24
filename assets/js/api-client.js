(function () {
  const TOKEN_KEY = "mm_auth_token";

  function cfg() {
    return window.MM_CONFIG || {};
  }

  function apiBase() {
    return String(cfg().API_BASE_URL || "").replace(/\/+$/, "");
  }

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  }

  function setToken(value) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }

  async function request(path, options) {
    const base = apiBase();
    if (!base) throw new Error("API_BASE_URL is missing");
    const headers = { "content-type": "application/json", ...(options?.headers || {}) };
    const auth = token();
    if (auth) headers.authorization = `Bearer ${auth}`;
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers,
      body: options?.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options?.body
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `API request failed (${response.status})`);
    return data;
  }

  function moneyPaiseToRupees(value) {
    return Math.round(Number(value || 0) / 100);
  }

  window.MM_API = {
    token,
    setToken,
    hasApi: () => Boolean(apiBase()),
    getConfig: () => ({
      API_BASE_URL: apiBase(),
      RAZORPAY_KEY_ID: String(cfg().RAZORPAY_KEY_ID || "")
    }),
    health: () => request("/health"),
    catalog: (params) => {
      const q = new URLSearchParams();
      if (params?.city) q.set("city", params.city);
      if (params?.all) q.set("all", "1");
      const qs = q.toString();
      return request(`/catalog${qs ? `?${qs}` : ""}`);
    },
    detectLocation: (payload) => request("/location/detect", { method: "POST", body: payload }),
    locationCities: () => request("/location/cities"),
    uploadImage: (payload) => request("/uploads", { method: "POST", body: payload }),
    adminOverview: () => request("/admin/overview"),
    adminUsers: () => request("/admin/users"),
    adminProducts: (storeId) => request(`/admin/products${storeId ? `?store_id=${encodeURIComponent(storeId)}` : ""}`),
    adminOrders: () => request("/admin/orders"),
    me: () => request("/auth/me"),
    recommendations: (params) => {
      const q = new URLSearchParams();
      if (params?.category) q.set("category", params.category);
      if (params?.search) q.set("search", params.search);
      if (params?.limit) q.set("limit", params.limit);
      return request(`/recommendations${q.toString() ? `?${q.toString()}` : ""}`);
    },
    requestOtp: (payload) => request("/auth/otp/request", { method: "POST", body: payload }),
    verifyOtp: (payload) => request("/auth/otp/verify", { method: "POST", body: payload }),
    registerStore: (payload) => request("/stores/register", { method: "POST", body: payload }),
    updateStoreBankDetails: (payload) => request("/stores/bank-details", { method: "POST", body: payload }),
    storePayouts: (storeId) => request(`/store/payouts?store_id=${encodeURIComponent(String(storeId || ""))}`),
    adminPayouts: () => request("/admin/payouts"),
    createRazorpayOrder: (payload) => request("/payments/razorpay/order", { method: "POST", body: payload }),
    createRazorpayQr: (payload) => request("/payments/razorpay/qr", { method: "POST", body: payload }),
    verifyRazorpayPayment: (payload) => request("/payments/razorpay/verify", { method: "POST", body: payload }),
    orders: () => request("/orders"),
    order: (id) => request(`/orders/detail?id=${encodeURIComponent(String(id || ""))}`),
    notifications: () => request("/notifications"),
    createScanReceipt: (payload) => request("/scan/receipts", { method: "POST", body: payload }),
    scanReceipt: (params) => {
      const q = new URLSearchParams();
      if (params?.token) q.set("token", params.token);
      if (params?.session_id) q.set("session_id", params.session_id);
      return request(`/scan/receipts?${q.toString()}`);
    },
    verifyScanReceipt: (payload) => request("/scan/receipts/verify", { method: "POST", body: payload }),
    autoshelfStores: () => request("/autoshelf/stores"),
    saveAutoshelfStore: (payload) => request("/autoshelf/stores", { method: "POST", body: payload }),
    deleteAutoshelfStore: (id) => request(`/autoshelf/stores?id=${encodeURIComponent(String(id || ""))}`, { method: "DELETE" }),
    saveAutoshelfProduct: (payload) => request("/autoshelf/products", { method: "POST", body: payload }),
    deleteAutoshelfProduct: (id) => request(`/autoshelf/products?id=${encodeURIComponent(String(id || ""))}`, { method: "DELETE" }),
    recordAutoshelfStockEvent: (payload) => request("/autoshelf/stock-events", { method: "POST", body: payload }),
    supportTickets: () => request("/support/tickets"),
    createSupportTicket: (payload) => request("/support/tickets", { method: "POST", body: payload }),
    createFeedback: (payload) => request("/feedback", { method: "POST", body: payload }),
    smartSearch: (params) => {
      const q = new URLSearchParams();
      if (params?.q) q.set("q", params.q);
      if (params?.search) q.set("search", params.search);
      if (params?.city) q.set("city", params.city);
      if (params?.limit) q.set("limit", params.limit);
      return request(`/search/smart?${q.toString()}`);
    },
    createReservation: (payload) => request("/reservations", { method: "POST", body: payload }),
    reservations: (params) => {
      const q = new URLSearchParams();
      if (params?.store_id) q.set("store_id", params.store_id);
      return request(`/reservations${q.toString() ? `?${q.toString()}` : ""}`);
    },
    cancelReservation: (payload) => request("/reservations/cancel", { method: "POST", body: payload }),
    storeAnalytics: (storeId) => request(`/store/analytics?store_id=${encodeURIComponent(String(storeId || ""))}`),
    myStores: () => request("/stores/mine"),
    adminStores: (status) => request(`/admin/stores${status ? `?status=${encodeURIComponent(status)}` : ""}`),
    verifyStore: (payload) => request("/admin/stores/verify", { method: "POST", body: payload }),
    rejectStore: (payload) => request("/admin/stores/reject", { method: "POST", body: payload }),
    moneyPaiseToRupees
  };
})();
