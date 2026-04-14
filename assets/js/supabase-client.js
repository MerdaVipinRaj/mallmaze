(function () {
  const cfg = (window.MM_CONFIG || {});
  const url = String(cfg.SUPABASE_URL || '').trim();
  const key = String(cfg.SUPABASE_ANON_KEY || '').trim();

  function isConfigured() {
    return Boolean(url && key && window.supabase && typeof window.supabase.createClient === 'function');
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (!window.__mmSupabase) {
      window.__mmSupabase = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return window.__mmSupabase;
  }

  function functionsBaseUrl() {
    const f = String(cfg.SUPABASE_FUNCTIONS_URL || '').trim();
    if (f) return f.replace(/\/+$/, '');
    if (!url) return '';
    // https://<ref>.supabase.co -> https://<ref>.functions.supabase.co
    return url.replace(/\.supabase\.co\/?$/, '.functions.supabase.co').replace(/\/+$/, '');
  }

  window.MM_SUPABASE = {
    isConfigured,
    getClient,
    functionsBaseUrl
  };
})();

