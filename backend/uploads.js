"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function uploadsRoot(root) {
  return path.join(root, "uploads");
}

function ensureUploadsDir(root) {
  const dir = uploadsRoot(root);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || "");
  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) throw new Error("Image too large (max 8MB)");
  const ext = mime.includes("png") ? ".png" : mime.includes("webp") ? ".webp" : ".jpg";
  return { mime, buffer, ext };
}

function safeSegment(value) {
  return String(value || "misc").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
}

function saveUpload(root, { dataUrl, storeId, kind, filename }) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("Invalid image data");
  const base = ensureUploadsDir(root);
  const folder = path.join(base, "stores", safeSegment(storeId), safeSegment(kind || "products"));
  fs.mkdirSync(folder, { recursive: true });
  const name = filename || `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${parsed.ext}`;
  const target = path.join(folder, name);
  fs.writeFileSync(target, parsed.buffer);
  const relative = `/uploads/stores/${safeSegment(storeId)}/${safeSegment(kind || "products")}/${name}`;
  return { url: relative, bytes: parsed.buffer.length, mime: parsed.mime };
}

function uploadStaticTarget(root, urlPath) {
  if (!urlPath.startsWith("/uploads/")) return null;
  const relative = urlPath.replace(/^\/+/, "");
  const target = path.resolve(root, relative);
  if (!target.startsWith(uploadsRoot(root))) return null;
  return fs.existsSync(target) && !fs.statSync(target).isDirectory() ? target : null;
}

module.exports = { saveUpload, uploadStaticTarget, ensureUploadsDir, parseDataUrl };
