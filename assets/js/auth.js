/**
 * MallMaze Authentication Service (Supabase Auth + PostgreSQL Profiles)
 * Pure Supabase Authentication with Zero Mock/Fake logic.
 */
(function () {
  function getClient() {
    if (window.sbClient) return window.sbClient;
    if (window.supabase && typeof window.supabase.createClient === "function") {
      const config = window.MM_CONFIG || {};
      const url = config.SUPABASE_URL || "https://noczhsyfkfctjpbgnlcp.supabase.co";
      const key = config.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY3poc3lma2ZjdGpwYmdubGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNzU5ODksImV4cCI6MjA4NjY1MTk4OX0.qmJovC4AOk6sRGI6nngsYZHCVAN3n_N6svyPFF9BflM";
      window.sbClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "mm_sb_session"
        }
      });
      window.sb = window.sbClient;
      return window.sbClient;
    }
    return null;
  }

  const MM_AUTH = {
    /**
     * Validate Username format (3-20 chars, alphanumeric + underscores, case-insensitive)
     */
    validateUsername: function (username) {
      const trimmed = String(username || '').trim();
      if (!trimmed) return { valid: false, message: 'Username is required.' };
      if (trimmed.length < 3) return { valid: false, message: 'Username must be at least 3 characters.' };
      if (trimmed.length > 20) return { valid: false, message: 'Username cannot exceed 20 characters.' };
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return { valid: false, message: 'Username can only contain letters, numbers, and underscores.' };
      }
      return { valid: true, username: trimmed.toLowerCase() };
    },

    /**
     * Pre-flight Check: is username available in PostgreSQL profiles table?
     */
    checkUsernameAvailable: async function (rawUsername) {
      const v = this.validateUsername(rawUsername);
      if (!v.valid) return { available: false, message: v.message };

      const client = getClient();
      if (!client) return { available: true, username: v.username };

      try {
        const { data, error } = await client
          .from('profiles')
          .select('id')
          .ilike('username', v.username)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.warn('[MM_AUTH] Username check warning:', error.message);
        }
        if (data) {
          return { available: false, message: 'Username is already taken. Please choose another.' };
        }
        return { available: true, username: v.username };
      } catch (err) {
        return { available: true, username: v.username };
      }
    },

    /**
     * User Registration Flow:
     * 1. Validates inputs & username uniqueness
     * 2. Calls Supabase Auth signUp with metadata & production redirect
     * 3. Handles email verification requirement
     */
    signUp: async function (opts) {
      const email = opts.email;
      const password = opts.password;
      const fullName = opts.fullName;
      const username = opts.username;

      const client = getClient();
      if (!client) throw new Error('Supabase client is not available.');

      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { error: { message: 'Please enter a valid email address.' } };
      }

      const uv = this.validateUsername(username);
      if (!uv.valid) return { error: { message: uv.message } };

      if (!password || password.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long.' } };
      }

      // Pre-flight username check
      const uCheck = await this.checkUsernameAvailable(uv.username);
      if (!uCheck.available) return { error: { message: uCheck.message } };

      const origin = window.location.origin;
      const redirectUrl = origin + '/login.html?verified=true';

      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: String(fullName || '').trim(),
            username: uv.username
          },
          emailRedirectTo: redirectUrl
        }
      });

      if (error) return { error: error };

      // Client-side profile insert fallback (in case database trigger has not been run yet in Supabase Dashboard)
      if (data && data.user) {
        try {
          await client.from('profiles').upsert({
            id: data.user.id,
            username: uv.username,
            full_name: String(fullName || '').trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        } catch (profileErr) {
          console.log('[MM_AUTH] Profile fallback upsert note:', profileErr.message);
        }
      }

      const requiresVerification = !data.session;
      return { data: data, requiresVerification: requiresVerification, email: cleanEmail };
    },

    /**
     * Sign In Flow with Email + Password
     */
    signIn: async function (opts) {
      const email = opts.email;
      const password = opts.password;

      const client = getClient();
      if (!client) throw new Error('Supabase client is not available.');

      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail) return { error: { message: 'Please enter your email address.' } };
      if (!password) return { error: { message: 'Please enter your password.' } };

      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('email not confirmed')) {
          return { error: { message: 'Please verify your email before signing in. Check your inbox for the confirmation link.', unconfirmed: true, email: cleanEmail } };
        }
        if (msg.includes('invalid login credentials')) {
          return { error: { message: 'Incorrect email or password. Please try again.' } };
        }
        return { error: error };
      }

      // Synchronize profile and local state
      await this.syncSessionUser(data.session && data.session.user);
      return { data: data };
    },

    /**
     * Sign Out
     */
    signOut: async function () {
      const client = getClient();
      try {
        if (client) await client.auth.signOut();
      } catch (e) {
        console.warn('[MM_AUTH] Signout warning:', e.message);
      }
      this.clearLocalUser();
      window.dispatchEvent(new CustomEvent('mm:auth-changed', { detail: { user: null } }));
      if (typeof window.renderNavbar === 'function') window.renderNavbar();
    },

    /**
     * Send Password Reset Email
     */
    resetPassword: async function (email) {
      const client = getClient();
      if (!client) throw new Error('Supabase client is not available.');
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail) return { error: { message: 'Please enter your email address.' } };

      const redirectUrl = window.location.origin + '/login.html?reset=true';
      const { data, error } = await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });
      return { data: data, error: error };
    },

    /**
     * Update Password (After clicking recovery link)
     */
    updatePassword: async function (newPassword) {
      const client = getClient();
      if (!client) throw new Error('Supabase client is not available.');
      if (!newPassword || newPassword.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long.' } };
      }
      const { data, error } = await client.auth.updateUser({ password: newPassword });
      return { data: data, error: error };
    },

    /**
     * Resend Email Verification Link
     */
    resendVerification: async function (email) {
      const client = getClient();
      if (!client) throw new Error('Supabase client is not available.');
      const cleanEmail = String(email || '').trim().toLowerCase();
      const redirectUrl = window.location.origin + '/login.html?verified=true';
      const { data, error } = await client.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: { emailRedirectTo: redirectUrl }
      });
      return { data: data, error: error };
    },

    /**
     * Fetch user profile from PostgreSQL profiles table
     */
    getProfile: async function (userId) {
      const client = getClient();
      if (!client || !userId) return null;
      try {
        const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
        return data;
      } catch (err) {
        return null;
      }
    },

    /**
     * Update profile in PostgreSQL
     */
    updateProfile: async function (userId, updates) {
      const client = getClient();
      if (!client || !userId) throw new Error('Not authenticated');
      return await client.from('profiles').update(updates).eq('id', userId);
    },

    /**
     * Synchronize Supabase User & PostgreSQL Profile to application state
     */
    syncSessionUser: async function (user) {
      if (!user) {
        this.clearLocalUser();
        return null;
      }

      let profile = await this.getProfile(user.id);
      const meta = user.user_metadata || {};
      const fullName = (profile && profile.full_name) || meta.full_name || (user.email ? user.email.split('@')[0] : 'Customer');
      const username = (profile && profile.username) || meta.username || (user.email ? user.email.split('@')[0] : 'user');

      const appUser = {
        id: user.id,
        email: user.email,
        name: fullName,
        username: username,
        role: (profile && profile.role) || 'customer',
        emailVerified: Boolean(user.email_confirmed_at),
        avatarUrl: (profile && profile.avatar_url) || '',
        createdAt: user.created_at
      };

      if (window.state) {
        window.state.user = appUser;
        if (typeof window.write === 'function' && window.STORAGE_KEYS) {
          window.write(window.STORAGE_KEYS.user, appUser);
        }
      }

      if (window.MM_API && typeof window.MM_API.setToken === 'function') {
        const sessRes = await getClient().auth.getSession();
        const session = sessRes && sessRes.data && sessRes.data.session;
        if (session && session.access_token) {
          window.MM_API.setToken(session.access_token);
        }
      }

      window.dispatchEvent(new CustomEvent('mm:auth-changed', { detail: { user: appUser } }));
      if (typeof window.renderNavbar === 'function') window.renderNavbar();
      return appUser;
    },

    clearLocalUser: function () {
      if (window.state) {
        window.state.user = null;
        if (typeof window.write === 'function' && window.STORAGE_KEYS) {
          window.write(window.STORAGE_KEYS.user, null);
        }
      }
      if (window.MM_API && typeof window.MM_API.setToken === 'function') {
        window.MM_API.setToken('');
      }
    },

    /**
     * Initialize Auth Listeners across application lifecycle
     */
    init: function () {
      const self = this;
      const client = getClient();
      if (!client) {
        setTimeout(function () { self.init(); }, 100);
        return;
      }

      // Check current session
      client.auth.getSession().then(function (res) {
        const session = res && res.data && res.data.session;
        if (session && session.user) {
          self.syncSessionUser(session.user);
        } else if (window.state && window.state.user) {
          // If local user has no valid Supabase session, clear it
          self.clearLocalUser();
          if (typeof window.renderNavbar === 'function') window.renderNavbar();
        }
      });

      // Subscribe to auth state events
      client.auth.onAuthStateChange(async function (event, session) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session && session.user) await self.syncSessionUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          self.clearLocalUser();
          window.dispatchEvent(new CustomEvent('mm:auth-changed', { detail: { user: null } }));
          if (typeof window.renderNavbar === 'function') window.renderNavbar();
        }
      });
    }
  };

  window.MM_AUTH = MM_AUTH;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { MM_AUTH.init(); });
  } else {
    MM_AUTH.init();
  }
})();
