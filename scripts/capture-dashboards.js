const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\dell\\.gemini\\antigravity-ide\\brain\\50c6770f-50bc-4bec-91f2-8fd73aa21aae';

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop Dashboard
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto('http://localhost:8080/dashboard.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_desktop.png') });
  console.log('Saved dashboard_desktop.png');

  // 2. Mobile Dashboard
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobilePage.goto('http://localhost:8080/dashboard.html', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_mobile.png') });
  console.log('Saved dashboard_mobile.png');

  // 3. Desktop store-dashboard
  await page.goto('http://localhost:8080/store-dashboard.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'store_dashboard_desktop.png') });
  console.log('Saved store_dashboard_desktop.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
