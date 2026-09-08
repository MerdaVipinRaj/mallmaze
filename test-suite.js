const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("=========================================");
console.log("   MALLMAZE MERCHANT SUITE CODE AUDIT    ");
console.log("=========================================\n");

const pages = [
  'index.html',
  'register-store.html',
  'dashboard.html',
  'orders.html',
  'pos-orders.html',
  'inventory.html',
  'profit-loss.html',
  'payments.html',
  'customers.html',
  'reports.html',
  'statistics.html'
];

let allPassed = true;

// 1. Validate file presence and non-emptiness
pages.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ [FILE MISSING] ${file}`);
    allPassed = false;
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.length < 500) {
    console.error(`❌ [FILE TOO SHORT / TRUNCATED] ${file} (${content.length} bytes)`);
    allPassed = false;
    return;
  }
  console.log(`✔ [FILE OK] ${file.padEnd(20)} (${(content.length / 1024).toFixed(1)} KB)`);
});

console.log("\n--- Checking Critical Feature Hooks & Elements ---");

// Check register-store.html
const regContent = fs.readFileSync(path.join(__dirname, 'register-store.html'), 'utf8');
const regChecks = [
  { name: 'Phase 1 Create Store View', key: 'phase-create-store' },
  { name: 'Phase 2 Verification Portal View', key: 'phase-verification-portal' },
  { name: 'GSTIN Validation Input', key: 'verGstin' },
  { name: 'OTP Input', key: 'verOtp' },
  { name: 'POS Auto Redirect Function', key: 'redirectToPOS' }
];
regChecks.forEach(c => {
  if (regContent.includes(c.key)) console.log(`  ✔ register-store.html: ${c.name}`);
  else { console.error(`  ❌ register-store.html: MISSING ${c.name}`); allPassed = false; }
});

// Check dashboard.html
const dashContent = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
const dashChecks = [
  { name: 'Mobile Bottom Navigation Dock', key: 'mobile-bottom-nav' },
  { name: 'Multi-Item Billing Modal', key: 'multiBillModal' },
  { name: 'Print / WhatsApp Tax Bill', key: 'receiptModal' },
  { name: 'Shiprocket Delivery Dispatch Button', key: 'assignShiprocketDelivery' },
  { name: 'Storefront Home Link', key: 'btn-side-home' },
  { name: 'Live Website Storage Listener', key: 'mallmaze_orders_data' }
];
dashChecks.forEach(c => {
  if (dashContent.includes(c.key)) console.log(`  ✔ dashboard.html: ${c.name}`);
  else { console.error(`  ❌ dashboard.html: MISSING ${c.name}`); allPassed = false; }
});

// Check inventory.html
const invContent = fs.readFileSync(path.join(__dirname, 'inventory.html'), 'utf8');
const invChecks = [
  { name: 'Camera vs Upload Switcher', key: 'switchCaptureMode' },
  { name: 'Camera Viewfinder', key: 'camera-live-box' },
  { name: 'AI Studio Background Palette', key: 'studio-color-palette' },
  { name: 'Light/Dark Contrast Modes', key: 'setStudioTheme' },
  { name: 'Custom Product Creator', key: 'handleSaveNewProduct' },
  { name: 'Mobile Bottom Navigation Dock', key: 'mobile-bottom-nav' }
];
invChecks.forEach(c => {
  if (invContent.includes(c.key)) console.log(`  ✔ inventory.html: ${c.name}`);
  else { console.error(`  ❌ inventory.html: MISSING ${c.name}`); allPassed = false; }
});

// Check profit-loss.html
const plContent = fs.readFileSync(path.join(__dirname, 'profit-loss.html'), 'utf8');
const plChecks = [
  { name: 'P&L Executive Cards', key: 'kpi-grid' },
  { name: 'Multi-Product Offline Sale Modal', key: 'offlineModal' },
  { name: 'Multi-Product Offline Sale Handler', key: 'handleMultiOfflineSale' },
  { name: 'Mobile Bottom Navigation Dock', key: 'mobile-bottom-nav' }
];
plChecks.forEach(c => {
  if (plContent.includes(c.key)) console.log(`  ✔ profit-loss.html: ${c.name}`);
  else { console.error(`  ❌ profit-loss.html: MISSING ${c.name}`); allPassed = false; }
});

// HTTP Live Server Ping test
console.log("\n--- Testing HTTP 8080 Live Server Endpoints ---");
const testUrls = ['/register-store.html', '/dashboard.html', '/inventory.html', '/profit-loss.html', '/index.html'];

let completedRequests = 0;
testUrls.forEach(endpoint => {
  http.get(`http://localhost:8080${endpoint}`, (res) => {
    if (res.statusCode === 200) {
      console.log(`  ✔ HTTP 200 OK: http://localhost:8080${endpoint}`);
    } else {
      console.error(`  ❌ HTTP ${res.statusCode}: http://localhost:8080${endpoint}`);
      allPassed = false;
    }
    completedRequests++;
    if (completedRequests === testUrls.length) {
      console.log("\n=========================================");
      if (allPassed) console.log("   🎉 ALL SUITE FEATURES VALIDATED 100%  ");
      else console.log("   ⚠️ SOME TESTS FAILED");
      console.log("=========================================");
    }
  }).on('error', (err) => {
    console.error(`  ❌ Server connection error on ${endpoint}: ${err.message}`);
  });
});
