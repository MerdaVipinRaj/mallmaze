(function () {
  function getCfg() {
    return window.MM_API?.getConfig?.() || window.MM_CONFIG || {};
  }

  async function apiHealth() {
    const hasBase = String(getCfg().API_BASE_URL || '').trim();
    if (!hasBase || !window.MM_API?.health) return { ok: false, reason: 'missing_api_config' };
    try {
      return await window.MM_API.health();
    } catch (e) {
      return { ok: false, reason: String(e?.message || e || 'unknown_error') };
    }
  }

  window.MM_RUNTIME_GUARD = {
    getCfg,
    apiHealth
  };
})();
// Lightweight crash guard so UI doesn't silently fail.
// Shows a banner when a JS error occurs.
(function () {
  if (window.__mmRuntimeGuard) return;
  window.__mmRuntimeGuard = true;

  function ensureBanner() {
    let el = document.getElementById('mm-runtime-error');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'mm-runtime-error';
    el.style.cssText = [
      'position:fixed',
      'left:12px',
      'right:12px',
      'bottom:12px',
      'z-index:99999',
      'background:#0f172a',
      'color:#fff',
      'border:1px solid rgba(255,255,255,.16)',
      'border-radius:14px',
      'padding:12px 12px',
      'box-shadow:0 18px 40px rgba(0,0,0,.28)',
      'font:12px/1.35 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial'
    ].join(';');
    el.innerHTML = `
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div style="width:10px;height:10px;border-radius:9999px;background:#ef4444;margin-top:4px;flex:0 0 auto"></div>
        <div style="min-width:0">
          <div style="font-weight:800;font-size:13px;margin:0 0 2px">MallMaze hit a page error</div>
          <div id="mm-runtime-error-msg" style="opacity:.9;word-break:break-word"></div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            <button id="mm-runtime-reload" type="button" style="background:#f59e0b;border:0;border-radius:10px;padding:6px 10px;font-weight:800;color:#111827;cursor:pointer">Reload</button>
            <button id="mm-runtime-dismiss" type="button" style="background:transparent;border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:6px 10px;font-weight:800;color:#fff;cursor:pointer">Dismiss</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    document.getElementById('mm-runtime-reload')?.addEventListener('click', function () { location.reload(); });
    document.getElementById('mm-runtime-dismiss')?.addEventListener('click', function () { el.remove(); });
    return el;
  }

  function show(msg) {
    try {
      const b = ensureBanner();
      const m = b.querySelector('#mm-runtime-error-msg');
      if (m) m.textContent = String(msg || 'Unknown error');
    } catch {}
  }

  window.addEventListener('error', function (e) {
    const msg = e?.error?.message || e?.message || 'Script error';
    show(msg);
  });
  window.addEventListener('unhandledrejection', function (e) {
    const msg = e?.reason?.message || String(e?.reason || 'Unhandled promise rejection');
    show(msg);
  });
})();

// Mobile layout restored
