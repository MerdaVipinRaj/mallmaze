(function () {
  // Ensure modern mobile viewport
  var viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.setAttribute("name", "viewport");
    document.head.insertBefore(viewport, document.head.firstChild);
  }
  viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover");

  function currentPage() {
    var path = (location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
    if (!path || path === "") return "dashboard.html";
    return path;
  }

  function icon(pathD) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + pathD + "</svg>";
  }

  // Ensure Backdrop and Bottom Sheet Drawer helpers
  function setupDrawerBackdrop() {
    var backdrop = document.getElementById("detailBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "detailBackdrop";
      backdrop.className = "detail-backdrop";
      document.body.appendChild(backdrop);
    }

    backdrop.addEventListener("click", function () {
      window.closeMobileDetailPanel();
    });

    // Ensure drag handle in detail panels
    var panels = document.querySelectorAll(".detail-panel, #detailPanel, #paymentDetailPanel");
    panels.forEach(function (panel) {
      if (!panel.querySelector(".sheet-drag-handle")) {
        var handle = document.createElement("div");
        handle.className = "sheet-drag-handle";
        panel.insertBefore(handle, panel.firstChild);
      }
    });

    // Escape key closes open drawers
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        window.closeMobileDetailPanel();
      }
    });
  }

  window.openMobileDetailPanel = function (panelId) {
    var panel = (panelId && document.getElementById(panelId)) || document.querySelector(".detail-panel");
    if (panel) {
      panel.classList.add("mobile-open");
      var backdrop = document.getElementById("detailBackdrop");
      if (backdrop) backdrop.classList.add("show");
    }
  };

  window.closeMobileDetailPanel = function () {
    var panels = document.querySelectorAll(".detail-panel, #detailPanel, #paymentDetailPanel");
    panels.forEach(function (p) {
      p.classList.remove("mobile-open");
    });
    var backdrop = document.getElementById("detailBackdrop");
    if (backdrop) backdrop.classList.remove("show");
  };

  function ensureBottomNav() {
    // If a mobile-bottom-nav is already present, ensure it has payments link
    var existingNav = document.querySelector(".mobile-bottom-nav");
    if (existingNav) {
      existingNav.remove(); // replace with standardized responsive nav
    }

    var host = document.querySelector(".app-container") || document.body;
    var page = currentPage();
    var items = [
      { 
        href: "dashboard.html", 
        label: "Home", 
        match: ["dashboard.html", "store-dashboard.html", "admin-dashboard.html"], 
        svg: icon('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>') 
      },
      { 
        href: "orders.html", 
        label: "Orders", 
        match: ["orders.html", "pos-orders.html", "pos.html", "order.html"], 
        svg: icon('<rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>') 
      },
      { 
        href: "inventory.html", 
        label: "Stock", 
        match: ["inventory.html"], 
        svg: icon('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>') 
      },
      { 
        href: "payments.html", 
        label: "Payments", 
        match: ["payments.html"], 
        svg: icon('<rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>') 
      },
      { 
        href: "profit-loss.html", 
        label: "P&L", 
        match: ["profit-loss.html", "statistics.html", "statistic.html", "reports.html", "expenses.html"], 
        svg: icon('<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>') 
      }
    ];

    var nav = document.createElement("nav");
    nav.className = "mobile-bottom-nav";
    nav.setAttribute("aria-label", "POS mobile navigation");
    nav.innerHTML = items.map(function (item) {
      var active = item.match.indexOf(page) !== -1 ? " active" : "";
      return '<a href="' + item.href + '" class="mob-nav-btn' + active + '">' + item.svg + "<span>" + item.label + "</span></a>";
    }).join("");
    host.appendChild(nav);
  }

  function init() {
    setupDrawerBackdrop();
    ensureBottomNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
