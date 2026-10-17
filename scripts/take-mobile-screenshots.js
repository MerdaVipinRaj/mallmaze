const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  // 1. Dashboard.html
  const page1 = await context.newPage();
  await page1.goto('http://localhost:8080/dashboard.html', { waitUntil: 'networkidle' });
  await page1.waitForTimeout(600);
  await page1.screenshot({ path: path.join(__dirname, 'dashboard-mobile-top.png'), fullPage: false });
  console.log('Saved dashboard-mobile-top.png');

  // Scroll down to view pipeline tools and table
  await page1.evaluate(() => {
    const main = document.querySelector('.main-wrapper');
    if (main) main.scrollTop = 420;
  });
  await page1.waitForTimeout(300);
  await page1.screenshot({ path: path.join(__dirname, 'dashboard-mobile-scrolled.png'), fullPage: false });
  console.log('Saved dashboard-mobile-scrolled.png');

  // 2. Store-dashboard.html
  const page2 = await context.newPage();
  await page2.goto('http://localhost:8080/store-dashboard.html', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(600);
  await page2.screenshot({ path: path.join(__dirname, 'store-dashboard-mobile-top.png'), fullPage: false });
  console.log('Saved store-dashboard-mobile-top.png');

  await page2.evaluate(() => {
    const main = document.querySelector('.main-wrapper');
    if (main) main.scrollTop = 420;
  });
  await page2.waitForTimeout(300);
  await page2.screenshot({ path: path.join(__dirname, 'store-dashboard-mobile-scrolled.png'), fullPage: false });
  console.log('Saved store-dashboard-mobile-scrolled.png');

  await browser.close();
})();
