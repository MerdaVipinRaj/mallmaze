const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(process.env.USERPROFILE, "OneDrive", "Desktop", "mallsnaps");
const BASE = "http://localhost:8080";

const pages = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith(".html"))
  .sort();

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const manifest = [];

  for (const file of pages) {
    const url = `${BASE}/${file}`;
    const outName = file.replace(/\.html$/i, ".png");
    const outPath = path.join(OUT_DIR, outName);
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: outPath, fullPage: true });
      manifest.push({ file, url, screenshot: outName, status: "ok" });
      console.log(`OK  ${file} -> ${outName}`);
    } catch (err) {
      manifest.push({ file, url, screenshot: outName, status: "error", error: String(err.message || err) });
      console.error(`ERR ${file}: ${err.message || err}`);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log(`\nSaved ${manifest.filter((m) => m.status === "ok").length}/${pages.length} screenshots to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
