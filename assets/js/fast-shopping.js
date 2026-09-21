/**
 * MallMaze Fast Shopping Session Controller
 * Manages store-specific in-person shopping sessions initiated via Store QR scan or storefront CTA.
 * 
 * Rules:
 * 1. Scoped to a single verified store at a time.
 * 2. Does NOT automatically trigger payment or create an unconfirmed order.
 * 3. Shows a compact, non-intrusive sticky session banner.
 * 4. Protects cart integrity across multiple stores.
 * 5. Handles session lifecycle and clean termination.
 */
(function () {
  if (window.MM_FAST_SHOPPING) return;

  const SESSION_KEY = "mm_active_store_session";

  const MM_FAST_SHOPPING = {
    /**
     * Get current active session from client storage
     */
    getActiveSession: function () {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        // Expiration check: 2 hours of inactivity
        if (session.lastActivity) {
          const elapsed = Date.now() - new Date(session.lastActivity).getTime();
          if (elapsed > 2 * 60 * 60 * 1000) {
            this.endSession(false);
            return null;
          }
        }
        return session;
      } catch (e) {
        return null;
      }
    },

    /**
     * Save active session
     */
    saveSession: function (session) {
      try {
        session.lastActivity = new Date().toISOString();
        const str = JSON.stringify(session);
        sessionStorage.setItem(SESSION_KEY, str);
        localStorage.setItem(SESSION_KEY, str);
        this.renderSessionBanner();
        window.dispatchEvent(new CustomEvent("mm:fast-session-changed", { detail: session }));
      } catch (e) {}
    },

    /**
     * Start a Fast Shopping session for a store
     */
    startSession: async function (store) {
      if (!store || !store.id) return null;

      const current = this.getActiveSession();
      if (current && String(current.storeId) === String(store.id)) {
        this.saveSession(current);
        return current;
      }

      // If switching stores, prompt user
      if (current && String(current.storeId) !== String(store.id)) {
        const proceed = confirm(
          `You are currently shopping at "${current.storeName || 'another store'}".\n\nWould you like to switch your shopping session to "${store.name}"?`
        );
        if (!proceed) return null;
      }

      const session = {
        sessionId: "sess-" + Date.now(),
        storeId: String(store.id),
        storeName: String(store.name || "Store"),
        storeSlug: String(store.slug || store.id),
        category: String(store.category || "Local Store"),
        city: String(store.city || ""),
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      this.saveSession(session);

      // Sync with backend if available
      if (window.MM_API?.hasApi?.()) {
        window.MM_API.startShoppingSession?.({ store_id: store.id }).catch(() => {});
      }

      if (window.toast) {
        window.toast(`Fast Shopping started at ${session.storeName}`);
      }

      return session;
    },

    /**
     * End current shopping session
     */
    endSession: function (showToastMsg = true) {
      const active = this.getActiveSession();
      try {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
      } catch (e) {}

      const banner = document.getElementById("mm-fast-shopping-banner");
      if (banner) banner.remove();

      if (active && window.MM_API?.hasApi?.()) {
        window.MM_API.endShoppingSession?.({ session_id: active.sessionId }).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent("mm:fast-session-changed", { detail: null }));

      if (showToastMsg && window.toast && active) {
        window.toast(`Ended shopping session at ${active.storeName}`);
      }
    },

    /**
     * Render compact sticky banner showing current shopping store
     */
    renderSessionBanner: function () {
      const session = this.getActiveSession();
      let banner = document.getElementById("mm-fast-shopping-banner");

      if (!session) {
        if (banner) banner.remove();
        return;
      }

      if (!banner) {
        banner = document.createElement("div");
        banner.id = "mm-fast-shopping-banner";
        banner.className = "fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white shadow-2xl border-t border-slate-700 transition-transform duration-300";
        document.body.appendChild(banner);
      }

      banner.innerHTML = `
        <div class="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="flex h-2.5 w-2.5 relative flex-shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div class="min-w-0">
              <p class="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Fast Shopping Active</p>
              <p class="text-xs sm:text-sm font-extrabold text-white truncate">${session.storeName}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <a href="store.html?id=${encodeURIComponent(session.storeId)}" class="rounded-lg bg-amber-400 hover:bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition">
              Store Catalog
            </a>
            <button id="mm-end-session-btn" class="rounded-lg border border-slate-600 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition">
              End Session
            </button>
          </div>
        </div>
      `;

      banner.querySelector("#mm-end-session-btn")?.addEventListener("click", () => {
        if (confirm(`End Fast Shopping session at ${session.storeName}?`)) {
          this.endSession(true);
        }
      });
    },

    /**
     * Check if product can be added to cart without multi-store conflict
     */
    validateAddToCart: function (product, currentCart) {
      if (!product || !product.storeId && !product.store_id) return true;
      const targetStoreId = String(product.storeId || product.store_id || "");
      if (!targetStoreId) return true;

      const cart = Array.isArray(currentCart) ? currentCart : [];
      if (!cart.length) return true;

      // Check if cart has items from another store
      const otherStoreItem = cart.find(item => {
        const itemStoreId = String(item.storeId || item.store_id || "");
        return itemStoreId && itemStoreId !== targetStoreId;
      });

      if (otherStoreItem) {
        const otherStoreName = otherStoreItem.storeName || otherStoreItem.store_name || "another store";
        const proceed = confirm(
          `Your cart contains items from "${otherStoreName}".\n\nWould you like to start a new cart for this store instead?`
        );
        return proceed ? "CLEAR_AND_ADD" : false;
      }

      return true;
    }
  };

  window.MM_FAST_SHOPPING = MM_FAST_SHOPPING;

  // Render sticky banner on DOM ready if a session is active
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => MM_FAST_SHOPPING.renderSessionBanner());
  } else {
    MM_FAST_SHOPPING.renderSessionBanner();
  }
})();
