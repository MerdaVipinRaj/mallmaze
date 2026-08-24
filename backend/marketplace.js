"use strict";

const COLORS = ["blue", "black", "white", "red", "green", "navy", "grey", "gray", "brown", "beige", "pink", "yellow", "orange", "purple", "maroon", "cream", "tan"];
const SIZES = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "xxxl", "28", "30", "32", "34", "36", "38", "40", "42", "7", "8", "9", "10", "11", "12"];
const FITS = ["slim", "regular", "relaxed", "oversized", "tailored", "athletic"];

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function parseSearchIntent(query) {
  const tokens = tokenize(query);
  const intent = { raw: String(query || "").trim(), tokens, color: "", size: "", fit: "", category: "" };
  for (const t of tokens) {
    if (!intent.color && COLORS.includes(t)) intent.color = t;
    if (!intent.size && SIZES.includes(t)) intent.size = t.toUpperCase();
    if (!intent.fit && FITS.includes(t)) intent.fit = t;
  }
  const joined = tokens.join(" ");
  if (joined.includes("blazer") || joined.includes("jacket")) intent.category = "blazer";
  else if (joined.includes("shirt")) intent.category = "shirt";
  else if (joined.includes("shoe") || joined.includes("sneaker")) intent.category = "footwear";
  else if (joined.includes("gym") || joined.includes("dumbbell") || joined.includes("equipment")) intent.category = "gym";
  return intent;
}

function productAttrs(product) {
  const name = String(product.name || "").toLowerCase();
  const color = String(product.color || product.attributes?.color || "").toLowerCase()
    || COLORS.find((c) => name.includes(c)) || "";
  const size = String(product.size || product.attributes?.size || "").toUpperCase()
    || (Array.isArray(product.variants) ? String(product.variants[0] || "") : "")
    || (Array.isArray(product.sizes) ? String(product.sizes[0] || "") : "");
  const fit = String(product.fit || product.attributes?.fit || "").toLowerCase()
    || FITS.find((f) => name.includes(f)) || "regular";
  const quality = Math.min(100, Math.max(0, Number(product.quality_score ?? product.qualityScore ?? (Number(product.rating || 0) * 20))));
  return { color, size, fit, quality };
}

function matchScore(product, intent) {
  const hay = `${product.name} ${product.category} ${product.store_name || product.storeName || ""}`.toLowerCase();
  const attrs = productAttrs(product);
  let score = 0;
  const reasons = [];

  for (const t of intent.tokens) {
    if (hay.includes(t)) score += 12;
  }

  if (intent.color) {
    if (attrs.color === intent.color || hay.includes(intent.color)) {
      score += 28;
      reasons.push(`Color match: ${intent.color}`);
    } else score -= 18;
  }

  if (intent.size) {
    const sizes = [attrs.size, ...(Array.isArray(product.variants) ? product.variants : []), ...(Array.isArray(product.sizes) ? product.sizes : [])]
      .map((s) => String(s).toUpperCase());
    if (sizes.includes(intent.size)) {
      score += 22;
      reasons.push(`Size ${intent.size} available`);
    } else if (sizes.length) score -= 8;
  }

  if (intent.fit && (attrs.fit === intent.fit || hay.includes(intent.fit))) {
    score += 14;
    reasons.push(`Fit: ${intent.fit}`);
  }

  const price = Number(product.price_inr ?? product.price ?? 0);
  const rating = Number(product.rating || 0);
  const stock = Math.max(0, Number(product.stock_qty ?? product.stockCount ?? product.stock ?? 0));
  const discount = Math.max(0, Number(product.original_price_inr ?? product.originalPrice ?? price) - price);

  score += Math.min(18, rating * 3.5);
  score += Math.min(12, discount / 400);
  score += Math.min(10, stock / 3);
  score += Math.min(15, attrs.quality / 7);

  if (stock <= 0) score -= 40;

  return {
    score,
    reasons,
    attrs,
    breakdown: {
      price_score: Math.max(0, 100 - Math.min(100, Math.round(price / 500))),
      quality_score: attrs.quality,
      fit_score: intent.fit && attrs.fit === intent.fit ? 92 : attrs.fit === "regular" ? 78 : 70,
      size_score: intent.size && [attrs.size, ...(product.variants || [])].map(String).map((s) => s.toUpperCase()).includes(intent.size) ? 95 : 72,
      rating,
      stock
    }
  };
}

function smartSearchClassify(catalog, query, options = {}) {
  const limit = Math.max(4, Math.min(8, Number(options.limit || 6)));
  const city = String(options.city || "").trim().toLowerCase();
  const intent = parseSearchIntent(query);
  const stores = Array.isArray(catalog.stores) ? catalog.stores : [];
  const storeById = new Map(stores.map((s) => [String(s.id), s]));

  let products = (Array.isArray(catalog.products) ? catalog.products : [])
    .filter((p) => p.is_active !== false);

  if (city) {
    products = products.filter((p) => {
      const store = storeById.get(String(p.store_id || p.storeId || ""));
      const loc = `${store?.city || ""} ${store?.address || ""} ${p.city || ""}`.toLowerCase();
      return loc.includes(city);
    });
  }

  let scored = products.map((product) => {
    const store = storeById.get(String(product.store_id || product.storeId || ""));
    const enriched = {
      ...product,
      store_name: product.store_name || product.storeName || store?.name || "Local Store",
      city: store?.city || product.city || ""
    };
    const result = matchScore(enriched, intent);
    return { product: enriched, ...result };
  }).filter((row) => row.score > 0);

  if (intent.category === "blazer") {
    scored = scored.filter((row) => String(row.product.name || "").toLowerCase().includes("blazer"));
  } else if (intent.category === "footwear") {
    scored = scored.filter((row) => /shoe|sneaker|footwear|boot/i.test(String(row.product.name || "")));
  } else if (intent.category === "gym") {
    scored = scored.filter((row) => /gym|dumbbell|treadmill|equipment|yoga/i.test(String(row.product.name || "")));
  }

  scored.sort((a, b) => b.score - a.score);

  const pool = scored.slice(0, Math.max(limit + 2, 8));
  const filtered = [];
  const seenStore = new Set();

  for (const row of pool) {
    const sid = String(row.product.store_id || row.product.storeId || "");
    if (seenStore.has(sid) && filtered.length >= 2) continue;
    filtered.push(row);
    seenStore.add(sid);
    if (filtered.length >= limit) break;
  }

  const final = filtered.length >= 4 ? filtered.slice(0, Math.min(limit, filtered.length)) : pool.slice(0, limit);

  return {
    query: intent.raw,
    intent,
    total_found: scored.length,
    picks: final.map((row, idx) => ({
      rank: idx + 1,
      product_id: row.product.id,
      name: row.product.name,
      store_name: row.product.store_name,
      price_inr: Number(row.product.price_inr ?? row.product.price ?? 0),
      image_url: row.product.image_url || row.product.image || "",
      score: Math.round(row.score),
      reasons: row.reasons.slice(0, 4),
      breakdown: row.breakdown,
      attrs: row.attrs,
      badge: idx === 0 ? "Best overall" : idx === 1 ? "Best value" : idx === 2 ? "Best fit" : "Good option"
    }))
  };
}

function storeAnalytics(db, storeId) {
  const orders = (db.orders || []).filter((o) => (o.items || []).some((it) => String(it.store_id) === String(storeId)));
  const reservations = (db.reservations || []).filter((r) => String(r.store_id) === String(storeId));
  const products = (db.products || []).filter((p) => String(p.store_id) === String(storeId));
  const revenue = orders.reduce((sum, o) => {
    const lines = (o.items || []).filter((it) => String(it.store_id) === String(storeId));
    return sum + lines.reduce((s, it) => s + Number(it.line_total_paise || 0), 0);
  }, 0);
  const productSales = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      if (String(it.store_id) !== String(storeId)) continue;
      const key = String(it.product_id || it.name);
      productSales.set(key, (productSales.get(key) || 0) + Number(it.qty || 1));
    }
  }
  const topProducts = [...productSales.entries()]
    .map(([id, qty]) => {
      const p = products.find((x) => String(x.id) === id);
      return { product_id: id, name: p?.name || id, qty_sold: qty, price_inr: Number(p?.price_inr || 0) };
    })
    .sort((a, b) => b.qty_sold - a.qty_sold)
    .slice(0, 8);

  return {
    store_id: storeId,
    product_count: products.length,
    active_products: products.filter((p) => p.is_active !== false).length,
    order_count: orders.length,
    reservation_count: reservations.length,
    revenue_inr: Math.round(revenue / 100),
    top_products: topProducts,
    low_stock: products.filter((p) => Number(p.stock_qty || 0) > 0 && Number(p.stock_qty || 0) <= 3).slice(0, 10)
  };
}

module.exports = {
  parseSearchIntent,
  smartSearchClassify,
  storeAnalytics,
  productAttrs,
  COLORS,
  SIZES
};
