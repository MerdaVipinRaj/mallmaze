const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "index.html",
  "products.html",
  "login.html",
  "cart.html",
  "assets/js/config.js",
  "assets/js/api-client.js",
  "assets/js/runtime-guard.js",
  "assets/js/main.js",
  "backend/server.js",
  "scripts/static-server.js"
];

function fail(message) {
  console.error(`Build check failed: ${message}`);
  process.exitCode = 1;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing ${file}`);
}

for (const file of ["assets/js/config.js", "assets/js/api-client.js", "assets/js/runtime-guard.js", "assets/js/main.js", "backend/server.js", "scripts/static-server.js", "scripts/dev.js"]) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try {
    new Function(read(file));
  } catch (error) {
    fail(`${file} has a JavaScript parse error: ${error.message}`);
  }
}

const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith(".html"));
for (const file of htmlFiles) {
  const html = read(file);
  if (!html.includes('assets/js/api-client.js') && !["offline.html", "sw-reset.html"].includes(file)) {
    fail(`${file} is missing assets/js/api-client.js`);
  }
  const bannedBrowserScripts = ["supa" + "base-js", "supa" + "base-client.js"];
  if (bannedBrowserScripts.some((pattern) => html.includes(pattern))) {
    fail(`${file} still loads legacy external DB browser scripts`);
  }
  const inlineScripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match) => ({ attrs: match[1] || "", body: match[2] || "" }))
    .filter((script) => script.body.trim())
    .filter((script) => !/type=["']application\/ld\+json["']/i.test(script.attrs));
  for (const script of inlineScripts) {
    try {
      new Function(script.body);
    } catch (error) {
      fail(`${file} has an inline script parse error: ${error.message}`);
    }
  }
}

if (!process.exitCode) {
  console.log(`Build check passed: ${htmlFiles.length} HTML files and ${requiredFiles.length} required assets verified.`);
}
