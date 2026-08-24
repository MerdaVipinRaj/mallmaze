const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.FRONTEND_PORT || 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".mp4": "video/mp4"
};

function safePath(urlPath) {
  const clean = decodeURIComponent(String(urlPath || "/").split("?")[0]);
  const resolved = path.resolve(ROOT, clean === "/" ? "index.html" : clean.slice(1));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

http.createServer((req, res) => {
  const target = safePath(req.url);
  if (!target || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const type = TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  fs.createReadStream(target).pipe(res);
}).listen(PORT, () => {
  console.log(`MallMaze frontend listening on http://localhost:${PORT}`);
});
