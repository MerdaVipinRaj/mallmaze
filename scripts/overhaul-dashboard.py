import re

with open("dashboard.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update CSS in dashboard.html for metrics-grid and detail-panel
old_grid_css = """.metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }"""

new_grid_css = """.metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 18px;
    }
    .detail-panel.closed {
      display: none !important;
    }"""

content = content.replace(old_grid_css, new_grid_css)

# 2. Replace the HTML of the main section in dashboard.html
old_main_regex = r'<main class="main-wrapper">.*?</main>'

new_main_html = '''<main class="main-wrapper">
      <section class="orders-section">
        
        <!-- TOP STORE PARTNER HEADER -->
        <header class="partner-header">
          <div class="store-identity-col">
            <div class="store-avatar-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              <div class="store-verify-tick">&#10003;</div>
            </div>
            <div class="store-names-block">
              <h1 class="store-h1">
                MallMaze Express Store
                <span class="store-rating-pill">&#9733; 4.9</span>
              </h1>
              <div class="store-meta-line">
                <span>Central Mall, Ground Floor</span>
                <span>&bull;</span>
                <span>GSTIN: 27AABCM9102K1Z9</span>
                <span>&bull;</span>
                <span style="color:var(--accent-green-dark); font-weight:700;">Verified Merchant</span>
              </div>
            </div>
          </div>

          <div class="partner-header-actions">
            <!-- Online Status Toggle Pill -->
            <button class="status-toggle-pill" id="storeStatusBtn" onclick="toggleStoreOnlineStatus()" title="Switch Online/Offline Mode">
              <div class="pulse-indicator"></div>
              <div>
                <div class="status-headline">ACCEPTING ORDERS</div>
                <div class="status-subtext" id="storeStatusSub">Online &bull; Live Terminal</div>
              </div>
            </button>

            <!-- Sound Alert Toggle -->
            <button class="sound-btn active" id="soundBtn" onclick="toggleSoundAlert()" title="Toggle incoming order sound">
              <span id="soundIcon">&#128266;</span> Sound ON
            </button>

            <!-- Real-Time Clock -->
            <div class="clock-badge" id="liveClockDisplay">
              &#9201; 12:00:00 IST
            </div>

            <!-- Primary Action: + New POS Bill -->
            <button class="btn-create-bill" onclick="openMultiItemBillModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>+ Create POS Bill</span>
            </button>
          </div>
        </header>

        <!-- 3 CLEAN, HIGH-IMPACT KPI SUMMARY CARDS -->
        <div class="metrics-grid">
          <!-- Card 1: Today's Revenue -->
          <div class="metric-card card-sales">
            <div class="metric-top">
              <span class="metric-label">Today's Revenue</span>
              <div class="metric-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              </div>
            </div>
            <div class="metric-val-row">
              <span class="metric-num" id="kpiSales">&#8377;1,88,500</span>
              <span class="metric-growth-badge">&uarr; +18.4%</span>
            </div>
            <span class="metric-sub">
              <span>&#10003; 38 orders settled today</span>
            </span>
          </div>

          <!-- Card 2: Active Orders Queue -->
          <div class="metric-card card-orders">
            <div class="metric-top">
              <span class="metric-label">Kitchen & Counter Queue</span>
              <div class="metric-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
            </div>
            <div class="metric-val-row">
              <span class="metric-num" id="kpiActiveOrders">4 Active</span>
              <span class="metric-growth-badge" style="background:#fef3c7; color:#b45309;">2 Urgent</span>
            </div>
            <span class="metric-sub">
              <span>2 In-Kitchen &bull; 2 Ready for Pickup</span>
            </span>
          </div>

          <!-- Card 3: Completed Orders -->
          <div class="metric-card card-delivery">
            <div class="metric-top">
              <span class="metric-label">Completed Orders</span>
              <div class="metric-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
            <div class="metric-val-row">
              <span class="metric-num">34 Settled</span>
              <span class="metric-growth-badge" style="background:#dcfce7; color:#15803d;">100% On-Time</span>
            </div>
            <span class="metric-sub">
              <span>&#10003; Verified GST counter settlement</span>
            </span>
          </div>
        </div>

        <!-- PIPELINE STATUS TABS & TOOLS -->
        <div class="pipeline-nav-bar">
          <div class="pipeline-tabs">
            <button class="pipe-tab active" id="filterAllBtn" onclick="toggleStatusFilter('ALL')">
              All Orders <span class="tab-badge" id="tabCountAll">6</span>
            </button>
            <button class="pipe-tab tab-urgent" onclick="toggleStatusFilter('New')">
              New Incoming <span class="tab-badge">1</span>
            </button>
            <button class="pipe-tab" onclick="toggleStatusFilter('Preparing')">
              Preparing <span class="tab-badge">2</span>
            </button>
            <button class="pipe-tab" onclick="toggleStatusFilter('Dispatched')">
              Dispatched <span class="tab-badge">1</span>
            </button>
            <button class="pipe-tab" onclick="toggleStatusFilter('Completed')">
              Completed <span class="tab-badge">2</span>
            </button>
          </div>

          <div class="pipeline-right-tools">
            <div class="search-input-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="orderSearchInput" placeholder="Search order #, customer..." oninput="handleSearchOrders(this.value)" />
            </div>

            <div class="channel-filter-pills">
              <button class="chan-pill active" onclick="setChannelFilter('ALL', this)">All</button>
              <button class="chan-pill" onclick="setChannelFilter('Offline', this)">Counter</button>
              <button class="chan-pill" onclick="setChannelFilter('Online', this)">App</button>
            </div>
          </div>
        </div>

        <!-- ORDERS TABLE -->
        <div class="table-container">
          <table class="orders-table">
            <thead>
              <tr>
                <th style="width:36px;">
                  <div class="custom-checkbox" id="selectAllCheckbox" onclick="toggleSelectAll()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </th>
                <th style="min-width:130px;">Order ID & Channel</th>
                <th style="min-width:170px;">Customer Details</th>
                <th style="min-width:200px;">Items Ordered</th>
                <th style="min-width:110px;">Live Status</th>
                <th style="min-width:100px;">Amount</th>
                <th style="min-width:90px;">Time</th>
                <th style="text-align:right; min-width:85px;">Quick Bill</th>
              </tr>
            </thead>
            <tbody id="ordersTableBody"></tbody>
          </table>
        </div>
      </section>

      <!-- STREAMLINED ORDER DETAILS PANEL (COLLAPSIBLE) -->
      <aside class="detail-panel" id="detailPanel">
        <div class="detail-header">
          <div>
            <h2 class="detail-order-title" id="panelOrderId">Order #IND-602992</h2>
            <div class="detail-sub-meta">
              <span class="status-badge badge-paid" id="panelBadge">
                <span class="dot"></span> Paid
              </span>
              <span class="detail-timestamp" id="panelTimestamp">26 Dec, 17:30 IST</span>
            </div>
          </div>
          <button class="close-btn" onclick="toggleDetailPanel(false)" title="Close order details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Customer Summary Card -->
        <div class="customer-profile-card">
          <div class="customer-card-top">
            <img id="panelCustomerAvatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" alt="Customer" class="avatar-large" />
            <div>
              <div class="customer-hero-name" id="panelCustomerName">Rajesh Verma</div>
              <div class="customer-verified-tag">&#10004; Verified In-Store Shopper</div>
            </div>
          </div>
          <div class="contact-actions-row">
            <button class="btn-contact" onclick="sendWhatsAppBill()" title="Send WhatsApp Bill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              WhatsApp
            </button>
            <button class="btn-contact" onclick="callCustomer()" title="Call Customer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Call
            </button>
          </div>
        </div>

        <!-- Order Progress Stepper -->
        <div class="order-stepper-box">
          <div class="stepper-header">
            <span>Order Status</span>
            <span style="color:#059669; font-weight:800;" id="stepperStepName">&#10003; Ready for Pickup</span>
          </div>
          <div class="stepper-track">
            <div class="step-item done" id="step1">
              <div class="step-circle">&#10003;</div>
              <span class="step-label">Placed</span>
            </div>
            <div class="step-item done" id="step2">
              <div class="step-circle">&#10003;</div>
              <span class="step-label">Accepted</span>
            </div>
            <div class="step-item active" id="step3">
              <div class="step-circle">&#9889;</div>
              <span class="step-label">Packing</span>
            </div>
            <div class="step-item" id="step4">
              <div class="step-circle">4</div>
              <span class="step-label">Dispatched</span>
            </div>
          </div>
        </div>

        <!-- Itemized Order List -->
        <div class="section-subtitle" style="display:flex; justify-content:space-between; align-items:center; margin:14px 0 8px 0;">
          <span style="font-weight:700; font-size:12px; color:#64748b; text-transform:uppercase;">Ordered Items</span>
          <span style="font-size:11px; font-weight:700; color:#0f172a;" id="itemsCountBadge">2 items</span>
        </div>
        <div class="order-items-list" id="panelItemsList"></div>

        <!-- Tax & Subtotal Breakdown -->
        <div class="bill-summary-box">
          <div class="bill-calc-row">
            <span>Taxable Subtotal:</span>
            <span id="pSubtotal">&#8377;1,13,983</span>
          </div>
          <div class="bill-calc-row">
            <span>CGST (9%):</span>
            <span id="pCgst">&#8377;10,258</span>
          </div>
          <div class="bill-calc-row">
            <span>SGST (9%):</span>
            <span id="pSgst">&#8377;10,258</span>
          </div>
          <div class="detail-total-row">
            <span class="total-label">Grand Total:</span>
            <span class="total-amount" id="panelTotalAmount">&#8377;1,34,500</span>
          </div>
        </div>

        <!-- Primary Actions -->
        <div class="detail-ctas" style="margin-top:14px; display:flex; flex-direction:column; gap:8px;">
          <button class="btn-create-bill" style="width:100%; justify-content:center; padding:11px; font-size:13px; font-weight:800;" onclick="printCurrentBill()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print Tax Bill & Receipt
          </button>
          <button class="sound-btn" style="width:100%; justify-content:center; padding:10px; font-size:12px;" onclick="sendWhatsAppBill()">
            Send Receipt on WhatsApp
          </button>
        </div>
      </aside>
    </main>'''

content = re.sub(old_main_regex, new_main_html, content, flags=re.DOTALL)

# 3. Add toggleDetailPanel function and fix renderDetailPanel strings
js_patch = '''
    function toggleDetailPanel(open) {
      const panel = document.getElementById("detailPanel");
      if (!panel) return;
      if (open === false) {
        panel.classList.add("closed");
        panel.classList.remove("mobile-open");
      } else if (open === true) {
        panel.classList.remove("closed");
        if (window.innerWidth <= 900) panel.classList.add("mobile-open");
      } else {
        panel.classList.toggle("closed");
      }
    }
'''

content = content.replace("function closeMobileDetailDrawer() {", js_patch + "\n    function closeMobileDetailDrawer() {")

# Ensure selectOrder opens panel
content = content.replace(
    'function selectOrder(orderId) {\n      selectedOrderId = orderId;\n      renderTable();\n      renderDetailPanel();\n    }',
    'function selectOrder(orderId) {\n      selectedOrderId = orderId;\n      toggleDetailPanel(true);\n      renderTable();\n      renderDetailPanel();\n    }'
)

# Clean up broken strings inside JS
content = content.replace('âš¡ Packing Order', 'Packing Order')
content = content.replace('âœ” Rider Dispatched', 'Dispatched')
content = content.replace('âœ… Order Completed', 'Order Completed')
content = content.replace('ðŸ“¦ Assign Shiprocket Rider', 'Assign Delivery Rider')
content = content.replace('â‚¹', '₹')

with open("dashboard.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Overhauled dashboard.html successfully!")
