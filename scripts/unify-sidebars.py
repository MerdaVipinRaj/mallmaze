import re

# 1. Define standard clean sidebar generator
def get_unified_sidebar(active_name):
    pages = {
        'dashboard': 'dashboard.html',
        'orders': 'orders.html',
        'inventory': 'inventory.html',
        'payments': 'payments.html',
        'customers': 'customers.html',
        'store-dashboard': 'store-dashboard.html',
        'statistics': 'statistics.html',
        'profit-loss': 'profit-loss.html',
        'reports': 'reports.html'
    }

    def is_act(key):
        return ' active' if active_name == key else ''

    sidebar_html = f'''    <!-- UNIFIED MERCHANT SIDEBAR -->
    <aside class="sidebar">
      <a href="dashboard.html" class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <div class="brand-text-block">
          <span class="brand-title">MallMaze</span>
          <span class="brand-tag">Store Partner</span>
        </div>
      </a>

      <!-- Quick Store Status Pill -->
      <div class="sidebar-store-status">
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="dot-live"></div>
          <div>
            <span>ONLINE</span><br>
            <small>Accepting Orders</small>
          </div>
        </div>
        <button type="button" onclick="if(typeof toggleStoreOnlineStatus==='function'){{toggleStoreOnlineStatus();}}else if(typeof showToast==='function'){{showToast('Store status: Online');}}" title="Toggle Online / Offline">Toggle</button>
      </div>

      <!-- Customer Storefront Link -->
      <a href="index.html" class="sidebar-storefront-link" style="display:flex; align-items:center; justify-content:space-between; background:rgba(234,179,8,0.12); border:1px solid rgba(234,179,8,0.3); color:#facc15; padding:9px 12px; border-radius:12px; font-size:12px; font-weight:700; text-decoration:none; margin-bottom:14px;" title="Go to Customer Storefront">
        <span style="display:flex; align-items:center; gap:8px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Customer Store
        </span>
        <span style="background:rgba(234,179,8,0.25); color:#fef08a; padding:1px 6px; border-radius:6px; font-size:10px;">Live &rarr;</span>
      </a>

      <div class="nav-label">Store Operations</div>
      <div class="nav-group">
        <a class="nav-item{is_act('dashboard')}" href="dashboard.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>Dashboard</span>
        </a>
        <a class="nav-item{is_act('orders')}" href="orders.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>Orders</span>
        </a>
        <a class="nav-item{is_act('inventory')}" href="inventory.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          <span>Stock & Inventory</span>
        </a>
        <a class="nav-item{is_act('payments')}" href="payments.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          <span>Payments & Billing</span>
        </a>
        <a class="nav-item{is_act('customers')}" href="customers.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span>Customers</span>
        </a>
        <a class="nav-item{is_act('store-dashboard')}" href="store-dashboard.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect></svg>
          <span>Store QR Code</span>
        </a>
      </div>

      <div class="nav-divider"></div>

      <div class="nav-label">Analytics & Reports</div>
      <div class="nav-group">
        <a class="nav-item{is_act('statistics')}" href="statistics.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          <span>Sales Analytics</span>
        </a>
        <a class="nav-item{is_act('profit-loss')}" href="profit-loss.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          <span>Profit & Loss</span>
        </a>
        <a class="nav-item{is_act('reports')}" href="reports.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>Reports</span>
        </a>
      </div>

      <div class="nav-spacer"></div>

      <div class="sidebar-footer">
        <a class="nav-item" href="index.html" onclick="if(typeof showToast==='function')showToast('Logged out of POS terminal')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span>Exit POS</span>
        </a>
      </div>
    </aside>'''
    return sidebar_html

# Update sidebar in all files
target_files = {
    'dashboard.html': 'dashboard',
    'store-dashboard.html': 'store-dashboard',
    'orders.html': 'orders',
    'pos-orders.html': 'orders',
    'inventory.html': 'inventory',
    'payments.html': 'payments',
    'customers.html': 'customers',
    'statistics.html': 'statistics',
    'profit-loss.html': 'profit-loss',
    'reports.html': 'reports'
}

for filename, active_key in target_files.items():
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()

        new_sb = get_unified_sidebar(active_key)
        updated, count = re.subn(
            r'<aside[^>]*class=["\'][^"\']*sidebar[^"\']*["\'][^>]*>.*?</aside>',
            new_sb,
            content,
            flags=re.DOTALL
        )
        if count > 0:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(updated)
            print(f"Updated sidebar in: {filename} (active: {active_key})")
        else:
            print(f"Sidebar regex did not match in: {filename}")
    except Exception as e:
        print(f"Error updating sidebar in {filename}: {e}")

print("All sidebars synchronized successfully!")
