// Public (client-side) config.
// Sensitive secrets (service role key, database password, webhook secrets) belong only on backend.
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

  // Supabase Authentication & PostgreSQL Configuration
  SUPABASE_URL: window.SUPABASE_URL || "https://tyorlxcsbkgewmjjensa.supabase.co",
  SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3JseGNzYmtnZXdtamplbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTg0MDAsImV4cCI6MjA5MTgzNDQwMH0.b2yUGXzkpLlgaXm6wkJHCOGZpix0ooX9NYEOkb4fxwo",

  // Dev fallback keeps static previews usable while the backend is starting.
  ENABLE_LOCAL_FALLBACKS: true
};
