(function () {
  const money = (n) => `Rs ${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  async function ensureLogin() {
    if (window.MM_API?.token?.()) return true;
    toast?.("Please login first.", { type: "bad", title: "Login" });
    setTimeout(() => { window.location.href = "login.html"; }, 600);
    return false;
  }

  async function mountSmartPicks(container, query, city) {
    if (!container || !query || !window.MM_API?.smartSearch) return;
    container.innerHTML = `<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">Finding best matches for "${escapeHtml(query)}"…</div>`;
    try {
      const data = await window.MM_API.smartSearch({ q: query, city, limit: 6 });
      if (!data.picks?.length) {
        container.innerHTML = `<div class="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">No smart matches yet. Try a broader search or browse local stores.</div>`;
        return;
      }
      container.innerHTML = `
        <section class="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-card">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <p class="text-xs font-extrabold uppercase tracking-wide text-amber-700">Smart Match</p>
              <h2 class="text-xl font-extrabold">Top picks for "${escapeHtml(data.query)}"</h2>
              <p class="text-sm text-muted-foreground mt-1">Ranked by size, fit, color, price, quality across local stores${city ? ` in ${escapeHtml(city)}` : ""}.</p>
            </div>
            <span class="inline-flex w-fit rounded-full bg-white border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">${data.total_found} found · showing ${data.picks.length}</span>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            ${data.picks.map((pick) => `
              <article class="rounded-xl border border-border bg-white p-4">
                <div class="flex gap-3">
                  <img src="${escapeHtml(pick.image_url || "assets/media/hero-mall.jpg")}" alt="" class="h-20 w-20 rounded-lg object-cover bg-muted" loading="lazy" />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-amber-700">${escapeHtml(pick.badge)} · #${pick.rank}</p>
                        <h3 class="font-extrabold truncate">${escapeHtml(pick.name)}</h3>
                        <p class="text-xs text-muted-foreground truncate">${escapeHtml(pick.store_name)}</p>
                      </div>
                      <p class="font-extrabold whitespace-nowrap">${money(pick.price_inr)}</p>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-1 text-[11px]">
                      ${pick.attrs?.size ? `<span class="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">Size ${escapeHtml(pick.attrs.size)}</span>` : ""}
                      ${pick.attrs?.color ? `<span class="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 font-semibold">${escapeHtml(pick.attrs.color)}</span>` : ""}
                      ${pick.attrs?.fit ? `<span class="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-semibold">${escapeHtml(pick.attrs.fit)} fit</span>` : ""}
                      <span class="rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 font-semibold">Quality ${Math.round(pick.breakdown?.quality_score || 0)}</span>
                    </div>
                    <ul class="mt-2 text-[11px] text-muted-foreground list-disc pl-4">${(pick.reasons || []).slice(0, 2).map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <a href="product.html?id=${encodeURIComponent(pick.product_id)}" class="mm-action mm-action-sm mm-action-primary">View</a>
                      <button type="button" class="mm-action mm-action-sm mm-action-outline" data-reserve-id="${escapeHtml(pick.product_id)}">Reserve</button>
                    </div>
                  </div>
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      `;
      container.querySelectorAll("[data-reserve-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          window.location.href = `product.html?id=${encodeURIComponent(btn.getAttribute("data-reserve-id") || "")}&reserve=1`;
        });
      });
    } catch (error) {
      container.innerHTML = `<div class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">${escapeHtml(error.message || String(error))}</div>`;
    }
  }

  async function renderReservationsPage() {
    const container = document.getElementById("reservations-container");
    if (!container) return;
    if (!(await ensureLogin())) {
      container.innerHTML = `<p class="text-muted-foreground">Login to view reservations.</p>`;
      return;
    }
    container.innerHTML = `<p class="text-muted-foreground">Loading reservations…</p>`;
    try {
      const data = await window.MM_API.reservations();
      const rows = data.reservations || [];
      container.innerHTML = `
        <div class="space-y-6">
          <p class="text-muted-foreground max-w-2xl">Reserve products at local stores, visit to try size/fit, pay in-store or order delivery later. Pickup OTP is shown after confirmation.</p>
          ${rows.length ? rows.map((r) => `
            <article class="rounded-2xl border border-border bg-card p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">${escapeHtml(r.status || "confirmed")}</p>
                  <h2 class="text-xl font-extrabold">${escapeHtml(r.product_name || "Product")}</h2>
                  <p class="text-sm text-muted-foreground">${escapeHtml(r.store_name || "")}</p>
                  <p class="text-sm mt-2">Pickup: <b>${escapeHtml(r.pickup_date || "Within 48 hours")}</b> · ${escapeHtml(r.pickup_slot || "")}</p>
                  ${r.size ? `<p class="text-sm">Size: <b>${escapeHtml(r.size)}</b>${r.color ? ` · Color: <b>${escapeHtml(r.color)}</b>` : ""}</p>` : ""}
                  ${r.status === "confirmed" ? `<p class="mt-3 inline-flex rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-800">Store pickup OTP: ${escapeHtml(r.otp_code || "----")}</p>` : ""}
                </div>
                <div class="flex flex-wrap gap-2">
                  <a href="store.html?id=${encodeURIComponent(r.store_id || "")}" class="mm-action mm-action-outline mm-action-sm">Store</a>
                  ${r.status === "confirmed" ? `<button type="button" class="mm-action mm-action-sm mm-action-ghost" data-cancel-rsv="${escapeHtml(r.id)}">Cancel</button>` : ""}
                </div>
              </div>
            </article>
          `).join("") : `<div class="rounded-2xl border border-dashed border-border bg-muted p-8 text-center"><p class="font-bold">No reservations yet</p><p class="text-sm text-muted-foreground mt-2">Search products and tap Reserve to hold an item at a local store.</p><a href="products.html" class="mm-action mm-action-primary mm-action-sm mt-4 inline-flex">Browse products</a></div>`}
        </div>
      `;
      container.querySelectorAll("[data-cancel-rsv]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await window.MM_API.cancelReservation({ id: btn.getAttribute("data-cancel-rsv") });
            toast?.("Reservation cancelled.", { type: "ok", title: "Reservation" });
            renderReservationsPage();
          } catch (error) {
            toast?.(error.message || String(error), { type: "bad", title: "Reservation" });
          }
        });
      });
    } catch (error) {
      container.innerHTML = `<p class="text-rose-600">${escapeHtml(error.message || String(error))}</p>`;
    }
  }

  async function reserveProduct(product, options) {
    if (!(await ensureLogin())) return;
    const payload = {
      product_id: product.id,
      store_id: product.storeId || product.store_id,
      product_name: product.name,
      store_name: product.storeName || product.store_name,
      size: options?.size || product.size || "",
      color: options?.color || product.color || "",
      pickup_date: options?.pickup_date || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      pickup_slot: options?.pickup_slot || "11:00 AM - 1:00 PM",
      qty: 1
    };
    const result = await window.MM_API.createReservation(payload);
    toast?.(`Reserved! Pickup OTP: ${result.reservation?.otp_code || "sent"}`, { type: "ok", title: "Reservation", ms: 5000 });
    setTimeout(() => { window.location.href = "reservations.html"; }, 800);
  }

  async function renderRegisterStorePage() {
    const root = document.getElementById("register-store-root");
    if (!root) return;
    root.innerHTML = `
      <div class="mm-register-shell">
        <aside class="mm-register-aside">
          <span class="mm-register-kicker">Sell on MallMaze</span>
          <h1 class="mm-register-title">Register your local store</h1>
          <p class="mm-register-lead">Get a verified storefront, accept orders, and receive automated bank payouts when customers pay.</p>
          <div class="mm-register-steps" aria-label="Registration steps">
            <article class="mm-register-step"><span>1</span><div><strong>Store profile</strong><p>Name, category, address, and owner contact.</p></div></article>
            <article class="mm-register-step"><span>2</span><div><strong>Verification</strong><p>Admin reviews your shop within 24–48 hours.</p></div></article>
            <article class="mm-register-step"><span>3</span><div><strong>Bank setup</strong><p>Razorpay linked account for automatic payouts.</p></div></article>
            <article class="mm-register-step"><span>4</span><div><strong>Go live</strong><p>Upload products and start selling locally.</p></div></article>
          </div>
          <div class="mm-register-benefits">
            <p class="text-sm font-extrabold text-slate-800">Why join MallMaze?</p>
            <ul>
              <li>Free QR storefront for walk-in customers</li>
              <li>Automated Razorpay payouts to your bank</li>
              <li>Reservations, delivery orders, and analytics</li>
              <li>No POS replacement — upload products manually</li>
            </ul>
          </div>
        </aside>

        <form id="register-store-form" class="mm-store-form">
          <div class="mm-store-form-head">
            <h2 class="text-lg font-extrabold text-slate-900">Store application</h2>
            <p class="text-sm text-muted-foreground mt-1">Fields marked <span class="text-rose-600">*</span> are required.</p>
          </div>
          <div class="mm-store-form-body">
            <section class="mm-form-section">
              <div class="mm-form-section-head">
                <div>
                  <p class="mm-form-section-title">Store details</p>
                  <p class="mm-form-section-desc">Basic information shown on your public storefront.</p>
                </div>
                <span class="mm-form-section-badge">Step 1</span>
              </div>
              <div class="mm-form-grid cols-2">
                <label class="mm-field" style="grid-column:1/-1"><span class="mm-field-label">Store name <span class="mm-req">*</span></span><input required id="rs-name" class="mm-input" placeholder="e.g. FitZone Sports Hyderabad" /></label>
                <label class="mm-field"><span class="mm-field-label">Category <span class="mm-req">*</span></span>
                  <select id="rs-category" class="mm-select">
                    <option>Fashion</option><option>Sports</option><option>Electronics</option><option>Beauty</option><option>Home & Living</option><option>Gym Equipment</option><option>General</option>
                  </select>
                </label>
                <label class="mm-field"><span class="mm-field-label">City <span class="mm-req">*</span></span><input required id="rs-city" value="Hyderabad" class="mm-input" /></label>
                <label class="mm-field" style="grid-column:1/-1"><span class="mm-field-label">Full address <span class="mm-req">*</span></span><input required id="rs-address" class="mm-input" placeholder="Area, landmark, pincode" /></label>
              </div>
            </section>

            <section class="mm-form-section">
              <div class="mm-form-section-head">
                <div>
                  <p class="mm-form-section-title">Owner contact</p>
                  <p class="mm-form-section-desc">Used for verification and customer support routing.</p>
                </div>
                <span class="mm-form-section-badge">Step 2</span>
              </div>
              <div class="mm-form-grid cols-2">
                <label class="mm-field"><span class="mm-field-label">Owner name <span class="mm-req">*</span></span><input required id="rs-owner" class="mm-input" /></label>
                <label class="mm-field"><span class="mm-field-label">Phone <span class="mm-req">*</span></span><input required id="rs-phone" class="mm-input" inputmode="tel" placeholder="+91 90000 12345" /></label>
                <label class="mm-field" style="grid-column:1/-1"><span class="mm-field-label">GST / Shop ID</span><span class="mm-field-hint">Optional — speeds up verification</span><input id="rs-doc" class="mm-input" placeholder="GSTIN or license reference" /></label>
              </div>
            </section>

            <section class="mm-bank-panel">
              <div class="mm-bank-panel-head">
                <span class="mm-bank-panel-icon" aria-hidden="true">₹</span>
                <div>
                  <p class="mm-bank-panel-title">Bank account for automated payouts</p>
                  <p class="mm-bank-panel-desc">When customers pay through MallMaze, your product share is transferred automatically via Razorpay Route.</p>
                </div>
              </div>
              <div class="mm-form-grid cols-2">
                <label class="mm-field" style="grid-column:1/-1"><span class="mm-field-label">Account holder name <span class="mm-req">*</span></span><input required id="rs-beneficiary" class="mm-input" placeholder="Exactly as per bank records" /></label>
                <label class="mm-field" style="grid-column:1/-1"><span class="mm-field-label">Account number <span class="mm-req">*</span></span><input required id="rs-account" class="mm-input" inputmode="numeric" autocomplete="off" placeholder="Bank account number" /></label>
                <label class="mm-field"><span class="mm-field-label">IFSC code <span class="mm-req">*</span></span><input required id="rs-ifsc" class="mm-input uppercase" placeholder="HDFC0001234" /></label>
                <label class="mm-field"><span class="mm-field-label">Account type <span class="mm-req">*</span></span>
                  <select id="rs-account-type" class="mm-select" required>
                    <option value="current">Current</option>
                    <option value="savings">Savings</option>
                  </select>
                </label>
                <label class="mm-field"><span class="mm-field-label">State <span class="mm-req">*</span></span>
                  <select id="rs-state" class="mm-select" required>
                    <option value="Telangana">Telangana</option><option value="Andhra Pradesh">Andhra Pradesh</option><option value="Karnataka">Karnataka</option>
                    <option value="Maharashtra">Maharashtra</option><option value="Tamil Nadu">Tamil Nadu</option><option value="Delhi">Delhi</option>
                    <option value="Gujarat">Gujarat</option><option value="Kerala">Kerala</option><option value="West Bengal">West Bengal</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option><option value="Rajasthan">Rajasthan</option><option value="Punjab">Punjab</option>
                  </select>
                </label>
                <label class="mm-field"><span class="mm-field-label">PAN</span><span class="mm-field-hint">Optional — speeds KYC</span><input id="rs-pan" class="mm-input uppercase" placeholder="ABCDE1234F" maxlength="10" /></label>
              </div>
            </section>

            <button type="submit" class="mm-form-submit">Submit for verification</button>
          </div>
        </form>
      </div>
    `;
    document.getElementById("register-store-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!(await ensureLogin())) return;
      try {
        const payload = {
          name: document.getElementById("rs-name")?.value,
          category: document.getElementById("rs-category")?.value,
          city: document.getElementById("rs-city")?.value,
          state: document.getElementById("rs-state")?.value,
          address: document.getElementById("rs-address")?.value,
          owner_name: document.getElementById("rs-owner")?.value,
          phone: document.getElementById("rs-phone")?.value,
          verification_doc: document.getElementById("rs-doc")?.value,
          beneficiary_name: document.getElementById("rs-beneficiary")?.value,
          account_number: document.getElementById("rs-account")?.value,
          ifsc_code: document.getElementById("rs-ifsc")?.value,
          account_type: document.getElementById("rs-account-type")?.value,
          pan: document.getElementById("rs-pan")?.value
        };
        const result = await window.MM_API.registerStore(payload);
        toast?.("Store submitted! Admin will verify within 24–48 hours.", { type: "ok", title: "Registration", ms: 4000 });
        setTimeout(() => { window.location.href = `store-dashboard.html?store=${encodeURIComponent(result.store?.id || "")}`; }, 1000);
      } catch (error) {
        toast?.(error.message || String(error), { type: "bad", title: "Registration" });
      }
    });
  }

  window.MM_Marketplace = {
    mountSmartPicks,
    renderReservationsPage,
    reserveProduct,
    renderRegisterStorePage
  };
})();
