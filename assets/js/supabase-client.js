/**
 * MallMaze Supabase Client Initialization
 * Connects securely to Supabase Auth and Supabase PostgreSQL.
 */
(function () {
  function initClient() {
    const config = window.MM_CONFIG || {};
    const supabaseUrl = config.SUPABASE_URL || "https://tyorlxcsbkgewmjjensa.supabase.co";
    const supabaseAnonKey = config.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3JseGNzYmtnZXdtamplbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTg0MDAsImV4cCI6MjA5MTgzNDQwMH0.b2yUGXzkpLlgaXm6wkJHCOGZpix0ooX9NYEOkb4fxwo";

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      return false;
    }

    if (!window.sbClient) {
      window.sbClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "mm_sb_session"
        }
      });
      window.sb = window.sbClient;
    }
    return true;
  }

  if (!initClient()) {
    // If supabase CDN is still loading, wait and retry
    let retries = 0;
    const interval = setInterval(function () {
      retries++;
      if (initClient() || retries > 50) {
        clearInterval(interval);
      }
    }, 100);
  }
})();
