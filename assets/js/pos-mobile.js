/**
 * MallMaze Store POS - Ultra Modern Responsive & Mobile Framework
 * Full Feature Parity: Left Navigation Drawer + Middle Content + Right Details Drawer
 */
(function () {
  // Ensure modern mobile viewport
  var viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.setAttribute("name", "viewport");
    document.head.insertBefore(viewport, document.head.firstChild);
  }
  viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover");

  function isMobile() {
    return window.innerWidth <= 900;
  }

  // --- DRAWER TOGGLE HELPERS (ACCESSIBLE GLOBALLY) ---
  window.openMobileSidebar = function () {
    var sidebar = document.querySelector(".sidebar, aside.sidebar");
    if (sidebar) {
      sidebar.classList.add("mobile-open");
      var backdrop = document.getElementById("posBackdrop");
      if (backdrop) backdrop.classList.add("show");
    }
  };

  window.closeMobileSidebar = function () {
    var sidebar = document.querySelector(".sidebar, aside.sidebar");
    if (sidebar) sidebar.classList.remove("mobile-open");
    checkBackdropState();
  };

  window.toggleMobileSidebar = function () {
    var sidebar = document.querySelector(".sidebar, aside.sidebar");
    if (sidebar && sidebar.classList.contains("mobile-open")) {
      window.closeMobileSidebar();
    } else {
      window.closeMobileDetailPanel();
      window.openMobileSidebar();
    }
  };

  window.openMobileDetailPanel = function (panelId) {
    var panel = (panelId && document.getElementById(panelId)) || document.querySelector(".detail-panel, aside.detail-panel, #detailPanel");
    if (panel) {
      panel.classList.add("mobile-open");
      var backdrop = document.getElementById("posBackdrop");
      if (backdrop) backdrop.classList.add("show");
    }
  };

  window.closeMobileDetailPanel = function () {
    var panels = document.querySelectorAll(".detail-panel, aside.detail-panel, #detailPanel, #paymentDetailPanel");
    panels.forEach(function (p) {
      p.classList.remove("mobile-open");
    });
    checkBackdropState();
  };

  window.toggleMobileDetailPanel = function () {
    var panel = document.querySelector(".detail-panel, aside.detail-panel, #detailPanel");
    if (panel && panel.classList.contains("mobile-open")) {
      window.closeMobileDetailPanel();
    } else {
      window.closeMobileSidebar();
      window.openMobileDetailPanel();
    }
  };

  function checkBackdropState() {
    var sidebar = document.querySelector(".sidebar.mobile-open");
    var detail = document.querySelector(".detail-panel.mobile-open, #detailPanel.mobile-open");
    var backdrop = document.getElementById("posBackdrop");
    if (backdrop && !sidebar && !detail) {
      backdrop.classList.remove("show");
    }
  }

  // --- SETUP BACKDROP ---
  function setupBackdrop() {
    var backdrop = document.getElementById("posBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "posBackdrop";
      backdrop.className = "pos-backdrop";
      document.body.appendChild(backdrop);
    }
    backdrop.addEventListener("click", function () {
      window.closeMobileSidebar();
      window.closeMobileDetailPanel();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        window.closeMobileSidebar();
        window.closeMobileDetailPanel();
      }
    });
  }

  // --- REMOVE ANY FLOATING EDGE TABS (PREVIOUSLY AT SIDES / MIDDLE OF SCREEN) ---
  function removeEdgeTabs() {
    var selectors = [
      "#posEdgePillLeft",
      "#posEdgePillRight",
      ".pos-edge-pill-left",
      ".pos-edge-pill-right",
      "[id*='posEdgePill']",
      "[class*='pos-edge-pill']",
      "button[title*='navigation buttons']",
      "button[title*='order details']"
    ];
    try {
      selectors.forEach(function (sel) {
        var elements = document.querySelectorAll(sel);
        for (var i = 0; i < elements.length; i++) {
          var el = elements[i];
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }
      });
    } catch (e) {}
  }

  // Run immediately and periodically
  removeEdgeTabs();
  var edgeTabsPurgeInterval = setInterval(removeEdgeTabs, 250);
  setTimeout(function () { clearInterval(edgeTabsPurgeInterval); }, 5000);

  // --- SETUP CLOSE BUTTONS IN SIDEBAR & DETAIL PANELS ---
  function setupCloseButtons() {
    var sidebar = document.querySelector(".sidebar, aside.sidebar");
    if (sidebar && !sidebar.querySelector(".sidebar-drawer-close")) {
      var closeBtn = document.createElement("button");
      closeBtn.className = "sidebar-drawer-close";
      closeBtn.setAttribute("aria-label", "Close Menu");
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        window.closeMobileSidebar();
      });
      sidebar.insertBefore(closeBtn, sidebar.firstChild);
    }

    var detailPanels = document.querySelectorAll(".detail-panel, aside.detail-panel, #detailPanel");
    detailPanels.forEach(function (panel) {
      if (!panel.querySelector(".detail-drawer-close") && !panel.querySelector(".sheet-close-btn")) {
        var dClose = document.createElement("button");
        dClose.className = "sheet-close-btn detail-drawer-close";
        dClose.setAttribute("aria-label", "Close Details");
        dClose.style.cssText = "position:absolute; top:16px; right:16px; font-size:20px; font-weight:800; background:rgba(0,0,0,0.06); border:none; border-radius:50%; width:32px; height:32px; cursor:pointer;";
        dClose.innerHTML = "&times;";
        dClose.addEventListener("click", function (e) {
          e.stopPropagation();
          window.closeMobileDetailPanel();
        });
        panel.insertBefore(dClose, panel.firstChild);
      }
    });
  }

  // --- REMOVE ANY ARTIFICIAL INJECTED TOPBAR ---
  function removeArtificialTopbar() {
    var topbars = document.querySelectorAll(".pos-mobile-topbar");
    topbars.forEach(function (tb) {
      if (tb && tb.parentNode) tb.parentNode.removeChild(tb);
    });
  }

  // --- ENSURE MODERN BOTTOM NAVIGATION DOCK IS ALWAYS VISIBLE ---
  function ensureMobileBottomNav() {
    if (window.innerWidth > 900) {
      var dock = document.querySelector(".mobile-bottom-nav");
      if (dock) dock.style.display = "none";
      return;
    }

    var existingDock = document.getElementById("mobileBottomNav") || document.querySelector(".mobile-bottom-nav");
    if (!existingDock) {
      existingDock = document.createElement("nav");
      existingDock.id = "mobileBottomNav";
      existingDock.className = "mobile-bottom-nav";
      document.body.appendChild(existingDock);
    }

    existingDock.style.display = "flex";

    var currentPath = (window.location.pathname || "").split("/").pop() || "store-dashboard.html";
    if (currentPath === "" || currentPath === "/") currentPath = "store-dashboard.html";

    var navItems = [
      {
        id: "mbn-dash",
        href: "store-dashboard.html",
        label: "Dashboard",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
        matches: ["store-dashboard.html", "dashboard.html"]
      },
      {
        id: "mbn-orders",
        href: "orders.html",
        label: "Orders",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
        matches: ["orders.html", "pos-orders.html", "order.html"]
      },
      {
        id: "mbn-stock",
        href: "inventory.html",
        label: "Stock",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>',
        matches: ["inventory.html"]
      },
      {
        id: "mbn-pay",
        href: "payments.html",
        label: "Payments",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>',
        matches: ["payments.html"]
      },
      {
        id: "mbn-menu",
        href: "javascript:void(0)",
        label: "More",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
        action: true,
        matches: ["profit-loss.html", "reports.html", "statistics.html", "customers.html", "expenses.html"]
      }
    ];

    existingDock.innerHTML = navItems.map(function (item) {
      var isActive = item.matches.indexOf(currentPath) !== -1;
      var activeClass = isActive ? " active" : "";
      var onclickAttr = item.action ? 'onclick="window.toggleMobileSidebar(); return false;"' : '';
      return '<a href="' + item.href + '" class="mob-nav-btn' + activeClass + '" id="' + item.id + '" ' + onclickAttr + '>' +
        item.icon +
        '<span>' + item.label + '</span>' +
      '</a>';
    }).join("");
  }

  function init() {
    setupBackdrop();
    setupCloseButtons();
    removeEdgeTabs();
    removeArtificialTopbar();
    ensureMobileBottomNav();
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) {
      window.closeMobileSidebar();
      window.closeMobileDetailPanel();
      var dock = document.querySelector(".mobile-bottom-nav");
      if (dock) dock.style.display = "none";
    } else {
      removeEdgeTabs();
      removeArtificialTopbar();
      ensureMobileBottomNav();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
