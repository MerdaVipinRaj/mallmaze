/**
 * MallMaze Supabase Client Initialization
 * Connects securely to Supabase Auth and Supabase PostgreSQL.
 */
(function () {
  function initClient() {
    const config = window.MM_CONFIG || {};
    const supabaseUrl = config.SUPABASE_URL || "https://noczhsyfkfctjpbgnlcp.supabase.co";
    const supabaseAnonKey = config.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY3poc3lma2ZjdGpwYmdubGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNzU5ODksImV4cCI6MjA4NjY1MTk4OX0.qmJovC4AOk6sRGI6nngsYZHCVAN3n_N6svyPFF9BflM";

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
