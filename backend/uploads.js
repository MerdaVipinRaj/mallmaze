"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { validateImageBuffer, stripGpsExif } = require("./image-service");

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
  if (buffer.length > 10 * 1024 * 1024) throw new Error("Image too large (max 10MB)");

  // Validate file signature & reject dangerous files
  const validated = validateImageBuffer(buffer);
  return { mime: validated.mime, buffer, ext: validated.ext };
}

function safeSegment(value) {
  return String(value || "misc").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
}

function saveUpload(root, { dataUrl, originalDataUrl, storeId, productId, kind, filename }) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("Invalid image data");

  // Strip EXIF GPS metadata for privacy
  const cleanBuffer = stripGpsExif(parsed.buffer);

  const base = ensureUploadsDir(root);
  const safeStore = safeSegment(storeId || "general");
  const safeKind = safeSegment(kind || "products");
  const safeProd = productId ? safeSegment(productId) : null;

  // Dedicated structured folders for products (Section 27)
  let folder;
  let relativeBase;
  if (safeProd) {
    folder = path.join(base, "stores", safeStore, safeKind, safeProd, "processed");
    relativeBase = `/uploads/stores/${safeStore}/${safeKind}/${safeProd}/processed`;
  } else {
    folder = path.join(base, "stores", safeStore, safeKind);
    relativeBase = `/uploads/stores/${safeStore}/${safeKind}`;
  }
  fs.mkdirSync(folder, { recursive: true });

  const uniqueId = crypto.randomBytes(6).toString("hex");
  const name = filename || `media-${Date.now()}-${uniqueId}${parsed.ext}`;
  const target = path.join(folder, name);
  fs.writeFileSync(target, cleanBuffer);
  const relative = `${relativeBase}/${name}`;

  let originalRelative = null;
  // If original raw image data is provided separately, store it in original/ subfolder
  if (originalDataUrl && originalDataUrl !== dataUrl) {
    try {
      const parsedOrig = parseDataUrl(originalDataUrl);
      if (parsedOrig) {
        const origFolder = safeProd 
          ? path.join(base, "stores", safeStore, safeKind, safeProd, "original")
          : path.join(base, "stores", safeStore, safeKind, "original");
        fs.mkdirSync(origFolder, { recursive: true });
        const origTarget = path.join(origFolder, name);
        fs.writeFileSync(origTarget, parsedOrig.buffer);
        originalRelative = safeProd
          ? `/uploads/stores/${safeStore}/${safeKind}/${safeProd}/original/${name}`
          : `/uploads/stores/${safeStore}/${safeKind}/original/${name}`;
      }
    } catch (e) {
      // Fallback if original fails parsing
    }
  }

  return {
    url: relative,
    originalUrl: originalRelative || relative,
    bytes: cleanBuffer.length,
    mime: parsed.mime
  };
}

function uploadStaticTarget(root, urlPath) {
  if (!urlPath.startsWith("/uploads/")) return null;
  const relative = urlPath.replace(/^\/+/, "");
  const target = path.resolve(root, relative);
  if (!target.startsWith(uploadsRoot(root))) return null;
  return fs.existsSync(target) && !fs.statSync(target).isDirectory() ? target : null;
}

module.exports = { saveUpload, uploadStaticTarget, ensureUploadsDir, parseDataUrl };
