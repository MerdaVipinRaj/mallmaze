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

  // --- SETUP FLOATING EDGE TABS (HOVER / CLICK AT LEFT & RIGHT) ---
  function setupEdgeTabs() {
    if (window.innerWidth > 900) return;

    // 1. Left Edge Tab ("⚡ FEATURES & MENU")
    if (!document.getElementById("posEdgePillLeft")) {
      var leftTab = document.createElement("button");
      leftTab.id = "posEdgePillLeft";
      leftTab.className = "pos-edge-pill-left";
      leftTab.setAttribute("aria-label", "Open Features & Tools Menu");
      leftTab.title = "Click to open left navigation buttons";
      leftTab.innerHTML = '<span class="pos-pulse-dot"></span><span>⚡</span><span>MENU & TOOLS</span>';
      leftTab.addEventListener("click", function (e) {
        e.stopPropagation();
        window.toggleMobileSidebar();
      });
      document.body.appendChild(leftTab);
    }

    // 2. Right Edge Tab ("📋 ORDER DETAILS")
    if (!document.getElementById("posEdgePillRight")) {
      var rightTab = document.createElement("button");
      rightTab.id = "posEdgePillRight";
      rightTab.className = "pos-edge-pill-right";
      rightTab.setAttribute("aria-label", "Open Order Details Panel");
      rightTab.title = "Click to open right order details";
      rightTab.innerHTML = '<span>📋</span><span>ORDER DETAILS</span>';
      rightTab.addEventListener("click", function (e) {
        e.stopPropagation();
        window.toggleMobileDetailPanel();
      });
      document.body.appendChild(rightTab);
    }
  }

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

  // --- SETUP MOBILE TOP QUICK ACTION BAR ---
  function setupMobileTopbar() {
    if (window.innerWidth > 900) return;
    var topHeader = document.querySelector(".top-header, .page-header");
    if (topHeader && !topHeader.querySelector(".pos-mobile-topbar")) {
      var topbar = document.createElement("div");
      topbar.className = "pos-mobile-topbar";
      topbar.innerHTML = [
        '<button type="button" class="pos-btn-top-menu" onclick="window.toggleMobileSidebar()">',
        '  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
        '  <span>Features Menu</span>',
        '</button>',
        '<div class="pos-top-brand-text">',
        '  <span>MallMaze POS</span>',
        '</div>',
        '<button type="button" class="pos-btn-top-details" onclick="window.toggleMobileDetailPanel()">',
        '  <span>Details</span>',
        '  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>',
        '</button>'
      ].join("");
      topHeader.insertBefore(topbar, topHeader.firstChild);
    }
  }

  // --- AUTOMATIC ORDER ROW CLICK LISTENER ---
  function setupOrderRowInteractions() {
    document.addEventListener("click", function (e) {
      if (window.innerWidth > 900) return;
      var row = e.target.closest(".order-row, tr[onclick], tr[data-order-id], .orders-table tbody tr");
      if (row && !e.target.closest("button, a, input, select")) {
        setTimeout(function () {
          window.openMobileDetailPanel();
        }, 120);
      }
    });
  }

  function init() {
    setupBackdrop();
    setupCloseButtons();
    setupEdgeTabs();
    setupMobileTopbar();
    setupOrderRowInteractions();
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) {
      window.closeMobileSidebar();
      window.closeMobileDetailPanel();
    } else {
      setupEdgeTabs();
      setupMobileTopbar();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
