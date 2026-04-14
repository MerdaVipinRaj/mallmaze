// Public (client-side) config.
// - Supabase ANON key is safe to expose in frontend code.
// - NEVER put Stripe secret keys or Supabase service role keys here.
window.MM_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  STRIPE_PUBLISHABLE_KEY: "",

  // Supabase Edge Function base URL (optional; derived from SUPABASE_URL if blank)
  // Example: https://<project-ref>.functions.supabase.co
  SUPABASE_FUNCTIONS_URL: ""
};

