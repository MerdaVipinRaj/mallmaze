// Public (client-side) config.
// Do not put private API secrets here. Razorpay secret, OTP provider secrets,
// delivery partner secrets, and database credentials belong only on backend.
window.MM_CONFIG = {
  API_BASE_URL: (() => {
    const host = window.location.hostname;
    const port = window.location.port;
    if (!host || ((host === "localhost" || host === "127.0.0.1" || host === "::1") && (port === "8080" || port === "5500" || !port))) {
      return "http://localhost:4000/api";
    }
    return `${window.location.origin}/api`;
  })(),
  RAZORPAY_KEY_ID: "",

  // Dev fallback keeps static previews usable while the backend is starting.
  ENABLE_LOCAL_FALLBACKS: true
};
