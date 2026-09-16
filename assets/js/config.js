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
  SUPABASE_URL: window.SUPABASE_URL || "https://noczhsyfkfctjpbgnlcp.supabase.co",
  SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY3poc3lma2ZjdGpwYmdubGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNzU5ODksImV4cCI6MjA4NjY1MTk4OX0.qmJovC4AOk6sRGI6nngsYZHCVAN3n_N6svyPFF9BflM",

  // Dev fallback keeps static previews usable while the backend is starting.
  ENABLE_LOCAL_FALLBACKS: true
};
