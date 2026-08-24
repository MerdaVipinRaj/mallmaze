const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { smartSearchClassify, storeAnalytics } = require("./marketplace");
const { markOrderPaid } = require("./payments");
const {
  attachBankToStore,
  validateBankDetails,
  extractBankFromBody,
  publicStore,
  provisionStorePayout,
  computeStoreSplits,
  assertStoresPayoutReady,
  buildOrderTransfers,
  createRazorpayOrderWithTransfers,
  applyTransferWebhook
} = require("./razorpay-route");
const { saveUpload, uploadStaticTarget } = require("./uploads");

const PORT = Number(process.env.PORT || 4000);
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = process.env.MM_DB_FILE || path.join(DATA_DIR, "app-db.json");
const MOCK_DATA_FILE = path.join(ROOT, "data", "mock-data.json");
const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".webp": "image/webp"
};
let pgPool = null;

const env = {
  appOrigin: process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || "http://localhost:8080",
  jwtSecret: process.env.JWT_SECRET || "dev-change-me",
  otpDevMode: String(process.env.OTP_DEV_MODE || "true").toLowerCase() !== "false",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  platformFeePaise: Number(process.env.PLATFORM_FEE_PAISE || 2900),
  deliveryFeePaise: Number(process.env.DELIVERY_FEE_PAISE || 4900),
  taxBps: Number(process.env.TAX_BPS || 1800),
  storeCommissionBps: Number(process.env.STORE_COMMISSION_BPS || 1000),
  payoutHoldHours: Number(process.env.PAYOUT_HOLD_HOURS || 24)
};

function razorpayCreds() {
  return { keyId: env.razorpayKeyId, keySecret: env.razorpayKeySecret };
}

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users: [],
      otp_challenges: [],
      orders: [],
      payments: [],
      delivery_jobs: [],
      support_tickets: [],
      feedback: [],
      scan_receipts: [],
      stock_events: [],
      stores: [],
      products: [],
      reservations: [],
      store_payouts: []
    }, null, 2));
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function usePostgres() {
  return Boolean(String(process.env.DATABASE_URL || "").trim());
}

async function getPgPool() {
  if (pgPool) return pgPool;
  let Pool;
  try {
    ({ Pool } = require("pg"));
  } catch {
    throw new Error("PostgreSQL mode requires the pg package. Run npm install before deployment.");
  }
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: String(process.env.PGSSLMODE || "").toLowerCase() === "disable" ? false : { rejectUnauthorized: false }
  });
  await pgPool.query(`
    create table if not exists app_state (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
  await pgPool.query(`
    create table if not exists mm_users (
      id text primary key,
      name text,
      email text,
      phone text,
      role text,
      created_at timestamptz,
      raw_data jsonb not null
    );
    create table if not exists mm_stores (
      id text primary key,
      name text not null,
      category text,
      owner_name text,
      phone text,
      address text,
      verification_status text,
      created_at timestamptz,
      updated_at timestamptz,
      raw_data jsonb not null
    );
    create table if not exists mm_products (
      id text primary key,
      store_id text,
      name text not null,
      category text,
      price_paise integer not null default 0,
      stock_qty integer not null default 0,
      is_active boolean not null default true,
      created_at timestamptz,
      updated_at timestamptz,
      raw_data jsonb not null
    );
    create table if not exists mm_orders (
      id text primary key,
      customer_id text,
      status text,
      payment_status text,
      razorpay_order_id text,
      razorpay_payment_id text,
      subtotal_paise integer not null default 0,
      platform_fee_paise integer not null default 0,
      delivery_fee_paise integer not null default 0,
      tax_paise integer not null default 0,
      total_paise integer not null default 0,
      created_at timestamptz,
      paid_at timestamptz,
      raw_data jsonb not null
    );
    create table if not exists mm_scan_receipts (
      id text primary key,
      user_id text,
      store_id text,
      token text unique not null,
      payment_session_id text,
      payment_status text,
      status text,
      total_paise integer not null default 0,
      created_at timestamptz,
      verified_at timestamptz,
      verified_by text,
      raw_data jsonb not null
    );
    create table if not exists mm_stock_events (
      id text primary key,
      store_id text,
      product_id text,
      event_type text,
      qty_delta integer not null default 0,
      stock_after integer not null default 0,
      reason text,
      created_at timestamptz,
      raw_data jsonb not null
    );
    create table if not exists mm_delivery_jobs (
      id text primary key,
      order_id text,
      provider text,
      lane text,
      status text,
      estimated_minutes integer,
      provider_tracking_id text,
      created_at timestamptz,
      updated_at timestamptz,
      raw_data jsonb not null
    );
    create table if not exists mm_support_tickets (
      id text primary key,
      user_id text,
      order_id text,
      type text,
      refund_percent integer,
      message text,
      status text,
      created_at timestamptz,
      updated_at timestamptz,
      raw_data jsonb not null
    );
    create table if not exists mm_feedback (
      id text primary key,
      user_id text,
      email text,
      topic text,
      message text,
      status text,
      created_at timestamptz,
      raw_data jsonb not null
    );
    create table if not exists mm_otp_challenges (
      id text primary key,
      channel text,
      value text,
      attempts integer not null default 0,
      consumed boolean not null default false,
      expires_at timestamptz,
      created_at timestamptz,
      raw_data jsonb not null
    );
    create index if not exists idx_mm_products_store_id on mm_products(store_id);
    create index if not exists idx_mm_stock_events_product_id on mm_stock_events(product_id);
    create index if not exists idx_mm_orders_customer_id on mm_orders(customer_id);
    create index if not exists idx_mm_scan_receipts_token on mm_scan_receipts(token);
    create index if not exists idx_mm_support_tickets_user_id on mm_support_tickets(user_id);
    create index if not exists idx_mm_feedback_topic on mm_feedback(topic);
  `);
  return pgPool;
}

function normalizeDb(db) {
  const safe = db && typeof db === "object" ? db : {};
  for (const key of ["users", "otp_challenges", "orders", "payments", "delivery_jobs", "support_tickets", "feedback", "scan_receipts", "stock_events", "stores", "products", "reservations"]) {
    if (!Array.isArray(safe[key])) safe[key] = [];
  }
  return safe;
}

function toPgTime(value) {
  if (!value) return null;
  const raw = Number(value);
  const date = Number.isFinite(raw) && String(value).trim() !== "" ? new Date(raw) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function productPricePaise(product) {
  if (product.price_paise != null) return Math.max(0, Math.round(Number(product.price_paise || 0)));
  return Math.max(0, Math.round(Number(product.price_inr || product.price || 0) * 100));
}

function orderTotals(order) {
  const totals = order.totals || {};
  return {
    subtotalPaise: Math.round(Number(totals.subtotalPaise || order.subtotal_paise || 0)),
    platformFeePaise: Math.round(Number(totals.platformFeePaise || order.platform_fee_paise || 0)),
    deliveryFeePaise: Math.round(Number(totals.deliveryFeePaise || order.delivery_fee_paise || 0)),
    taxPaise: Math.round(Number(totals.taxPaise || order.tax_paise || 0)),
    totalPaise: Math.round(Number(totals.totalPaise || order.total_paise || 0))
  };
}

async function syncPgProjection(pool, db) {
  const data = normalizeDb(db);
  const client = await pool.connect();
  const raw = (value) => JSON.stringify(value || {});
  try {
    await client.query("begin");
    await client.query("truncate mm_otp_challenges, mm_feedback, mm_support_tickets, mm_delivery_jobs, mm_stock_events, mm_scan_receipts, mm_orders, mm_products, mm_stores, mm_users");

    for (const user of data.users) {
      await client.query(
        `insert into mm_users (id, name, email, phone, role, created_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [user.id, user.name || "", user.email || "", user.phone || "", user.role || "user", toPgTime(user.created_at), raw(user)]
      );
    }

    for (const store of data.stores) {
      await client.query(
        `insert into mm_stores (id, name, category, owner_name, phone, address, verification_status, created_at, updated_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          store.id,
          store.name || "Store",
          store.category || "",
          store.owner_name || store.owner || "",
          store.phone || "",
          store.address || "",
          store.verification_status || store.status || "pending",
          toPgTime(store.created_at),
          toPgTime(store.updated_at),
          raw(store)
        ]
      );
    }

    for (const product of data.products) {
      await client.query(
        `insert into mm_products (id, store_id, name, category, price_paise, stock_qty, is_active, created_at, updated_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          product.id,
          product.store_id || product.storeId || "",
          product.name || "Product",
          product.category || "",
          productPricePaise(product),
          Math.max(0, Math.round(Number(product.stock_qty || product.stock || 0))),
          product.is_active !== false,
          toPgTime(product.created_at),
          toPgTime(product.updated_at),
          raw(product)
        ]
      );
    }

    for (const order of data.orders) {
      const totals = orderTotals(order);
      await client.query(
        `insert into mm_orders (id, customer_id, status, payment_status, razorpay_order_id, razorpay_payment_id, subtotal_paise, platform_fee_paise, delivery_fee_paise, tax_paise, total_paise, created_at, paid_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)`,
        [
          order.id,
          order.customer_id || "",
          order.status || "",
          order.payment_status || "",
          order.razorpay_order_id || "",
          order.razorpay_payment_id || "",
          totals.subtotalPaise,
          totals.platformFeePaise,
          totals.deliveryFeePaise,
          totals.taxPaise,
          totals.totalPaise,
          toPgTime(order.created_at),
          toPgTime(order.paid_at),
          raw(order)
        ]
      );
    }

    for (const receipt of data.scan_receipts) {
      await client.query(
        `insert into mm_scan_receipts (id, user_id, store_id, token, payment_session_id, payment_status, status, total_paise, created_at, verified_at, verified_by, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
        [
          receipt.id,
          receipt.user_id || "",
          receipt.store_id || "",
          receipt.token,
          receipt.payment_session_id || "",
          receipt.payment_status || "",
          receipt.status || "",
          Math.round(Number(receipt.total_paise || receipt.totalPaise || 0)),
          toPgTime(receipt.created_at),
          toPgTime(receipt.verified_at),
          receipt.verified_by || "",
          raw(receipt)
        ]
      );
    }

    for (const event of data.stock_events) {
      await client.query(
        `insert into mm_stock_events (id, store_id, product_id, event_type, qty_delta, stock_after, reason, created_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          event.id,
          event.store_id || "",
          event.product_id || "",
          event.event_type || event.type || "",
          Math.round(Number(event.qty_delta || 0)),
          Math.round(Number(event.stock_after || 0)),
          event.reason || "",
          toPgTime(event.created_at || event.at),
          raw(event)
        ]
      );
    }

    for (const job of data.delivery_jobs) {
      await client.query(
        `insert into mm_delivery_jobs (id, order_id, provider, lane, status, estimated_minutes, provider_tracking_id, created_at, updated_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          job.id,
          job.order_id || "",
          job.provider || "",
          job.lane || "",
          job.status || "",
          job.estimated_minutes == null ? null : Math.round(Number(job.estimated_minutes || 0)),
          job.provider_tracking_id || "",
          toPgTime(job.created_at),
          toPgTime(job.updated_at),
          raw(job)
        ]
      );
    }

    for (const ticket of data.support_tickets) {
      await client.query(
        `insert into mm_support_tickets (id, user_id, order_id, type, refund_percent, message, status, created_at, updated_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          ticket.id,
          ticket.user_id || "",
          ticket.order_id || "",
          ticket.type || "other",
          ticket.refund_percent == null ? null : Math.round(Number(ticket.refund_percent || 0)),
          ticket.message || "",
          ticket.status || "",
          toPgTime(ticket.created_at),
          toPgTime(ticket.updated_at),
          raw(ticket)
        ]
      );
    }

    for (const item of data.feedback) {
      await client.query(
        `insert into mm_feedback (id, user_id, email, topic, message, status, created_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          item.id,
          item.user_id || "",
          item.email || "",
          item.topic || "general",
          item.message || "",
          item.status || "new",
          toPgTime(item.created_at),
          raw(item)
        ]
      );
    }

    for (const challenge of data.otp_challenges) {
      await client.query(
        `insert into mm_otp_challenges (id, channel, value, attempts, consumed, expires_at, created_at, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          challenge.id,
          challenge.channel || "",
          challenge.value || challenge.destination || "",
          Math.round(Number(challenge.attempts || 0)),
          Boolean(challenge.consumed),
          toPgTime(challenge.expires_at),
          toPgTime(challenge.created_at),
          raw(challenge)
        ]
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function readDb() {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query("select data from app_state where id = $1", ["default"]);
    if (!result.rows[0]) {
      const empty = normalizeDb({});
      await writeDb(empty);
      return empty;
    }
    return normalizeDb(result.rows[0].data || {});
  }
  ensureDb();
  return normalizeDb(readJson(DB_FILE, {}));
}

async function writeDb(db) {
  if (usePostgres()) {
    const pool = await getPgPool();
    const normalized = normalizeDb(db);
    await pool.query(
      `insert into app_state (id, data, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      ["default", JSON.stringify(normalized)]
    );
    await syncPgProjection(pool, normalized);
    return;
  }
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(normalizeDb(db), null, 2));
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": env.appOrigin === "*" ? "*" : env.appOrigin,
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-razorpay-signature",
    ...headers
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text, headers = {}) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    ...headers
  });
  res.end(text);
}

function staticTarget(urlPath) {
  let clean;
  try {
    clean = decodeURIComponent(String(urlPath || "/").split("?")[0]);
  } catch {
    return null;
  }
  if (clean === "/") clean = "/index.html";
  const relative = clean.replace(/^\/+/, "");
  const first = relative.split(/[\\/]/)[0];
  const allowedRootFiles = new Set([
    "index.html",
    "admin-dashboard.html",
    "autoshelf.html",
    "cart.html",
    "checkout-success.html",
    "compare.html",
    "dashboard.html",
    "deals.html",
    "feedback.html",
    "login.html",
    "mall.html",
    "malls.html",
    "notifications.html",
    "offline.html",
    "order.html",
    "orders.html",
    "product.html",
    "products.html",
    "queue.html",
    "register-store.html",
    "reservations.html",
    "scan.html",
    "scan-receipt.html",
    "store-dashboard.html",
    "register-store.html",
    "store.html",
    "support.html",
    "sw-reset.html",
    "verify-receipt.html",
    "walkthrough.html",
    "wishlist.html",
    "service-worker.js",
    "manifest.webmanifest",
    "robots.txt",
    "sitemap.xml"
  ]);
  const allowedDirs = new Set(["assets", "data", "uploads"]);
  if (!allowedRootFiles.has(relative) && !allowedDirs.has(first)) {
    const uploadFile = uploadStaticTarget(ROOT, clean);
    if (uploadFile) return uploadFile;
    return null;
  }
  const target = path.resolve(ROOT, relative);
  if (!target.startsWith(ROOT)) return null;
  return target;
}

function serveStatic(req, res, parsed) {
  if (!["GET", "HEAD"].includes(req.method)) return false;
  const target = staticTarget(parsed.pathname);
  if (!target) return false;
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) return false;
  const type = STATIC_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "content-type": type,
    "cache-control": target.endsWith(".html") ? "no-cache" : "public, max-age=3600"
  });
  if (req.method === "HEAD") return res.end(), true;
  fs.createReadStream(target).pipe(res);
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function tokenFor(user) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "user",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
  })).toString("base64url");
  const sig = crypto.createHmac("sha256", env.jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

function verifyToken(authHeader) {
  const raw = String(authHeader || "").replace(/^Bearer\s+/i, "");
  const [header, payload, sig] = raw.split(".");
  if (!header || !payload || !sig) return null;
  const expected = crypto.createHmac("sha256", env.jwtSecret).update(`${header}.${payload}`).digest("base64url");
  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (Number(data.exp || 0) < Math.floor(Date.now() / 1000)) return null;
  return data;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "user"
  };
}

function normalizeIdentity({ email, phone }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = String(phone || "").replace(/[^\d+]/g, "");
  if (cleanEmail) return { channel: "email", value: cleanEmail };
  if (cleanPhone) return { channel: "phone", value: cleanPhone };
  return null;
}

function computeTotals(items, options = {}) {
  const orderType = String(options.order_type || options.orderType || "delivery").toLowerCase();
  const lineItems = (items || []).map((item) => {
    const qty = Math.max(1, Number(item.qty || item.quantity || 1));
    const unitPaise = Math.max(0, Number(item.unit_amount_paise || Math.round(Number(item.price || 0) * 100)));
    return {
      product_id: String(item.product_id || item.id || ""),
      name: String(item.name || "Product").slice(0, 120),
      qty,
      unit_amount_paise: unitPaise,
      line_total_paise: unitPaise * qty,
      store_id: String(item.store_id || item.storeId || "")
    };
  });
  const subtotalPaise = lineItems.reduce((sum, item) => sum + item.line_total_paise, 0);
  const platformFeePaise = subtotalPaise ? env.platformFeePaise : 0;
  const deliveryFeePaise = subtotalPaise && orderType !== "reserve" ? env.deliveryFeePaise : 0;
  const taxablePaise = subtotalPaise + platformFeePaise + deliveryFeePaise;
  const taxPaise = Math.round((taxablePaise * env.taxBps) / 10000);
  const totalPaise = taxablePaise + taxPaise;
  return { lineItems, subtotalPaise, platformFeePaise, deliveryFeePaise, taxPaise, totalPaise };
}

function computeScanTotals(items) {
  const lineItems = (items || []).map((item) => {
    const qty = Math.max(1, Number(item.qty || item.quantity || 1));
    const unitPaise = Math.max(0, Number(item.unit_amount_paise || Math.round(Number(item.price || item.price_inr || 0) * 100)));
    return {
      product_id: String(item.product_id || item.id || ""),
      code: String(item.code || item.product_id || item.id || ""),
      name: String(item.name || "Scanned item").slice(0, 120),
      qty,
      unit_amount_paise: unitPaise,
      line_total_paise: unitPaise * qty
    };
  });
  const subtotalPaise = lineItems.reduce((sum, item) => sum + item.line_total_paise, 0);
  return { lineItems, subtotalPaise, totalPaise: subtotalPaise };
}

function publicScanReceipt(receipt) {
  return {
    ...receipt,
    total_inr: Math.round(Number(receipt.total_paise || 0) / 100)
  };
}

async function createRazorpayOrder({ amount, receipt, notes, transfers }) {
  return createRazorpayOrderWithTransfers({ amount, receipt, notes, transfers }, razorpayCreds());
}

async function createRazorpayQrCode({ amount, name, description, notes }) {
  const paymentAmount = Math.max(100, Math.round(Number(amount || 0)));
  const qrName = String(name || "MallMaze Store Payment").slice(0, 64);
  const qrDescription = String(description || "MallMaze payment QR").slice(0, 256);
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    return {
      id: `qr_mock_${Date.now()}`,
      entity: "qr_code",
      name: qrName,
      usage: "single_use",
      type: "upi_qr",
      image_url: "",
      payment_amount: paymentAmount,
      status: "active",
      description: qrDescription,
      fixed_amount: true,
      mock: true,
      notes
    };
  }
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  const closeBy = Math.floor(Date.now() / 1000) + (60 * 60 * 2);
  const response = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      type: "upi_qr",
      name: qrName,
      usage: "single_use",
      fixed_amount: true,
      payment_amount: paymentAmount,
      description: qrDescription,
      close_by: closeBy,
      notes
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error?.description || json.error?.reason || "Razorpay QR creation failed");
  }
  return json;
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!env.razorpayKeySecret) return String(orderId || "").startsWith("order_mock_");
  const expected = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const actual = Buffer.from(String(signature || ""));
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return crypto.timingSafeEqual(actual, wanted);
}

function deliveryPlanForOrder(order) {
  const lane = order.totals.totalPaise >= 200000 ? "assisted-handoff" : "standard-local";
  return {
    id: `DEL-${Date.now()}`,
    order_id: order.id,
    provider: process.env.DELIVERY_PROVIDER || "manual_ops",
    lane,
    status: "ready_for_assignment",
    pickup_type: "store_handoff",
    customer_otp_required: true,
    estimated_minutes: lane === "assisted-handoff" ? 75 : 45,
    created_at: new Date().toISOString()
  };
}

function deliveryForOrder(db, orderId) {
  return (db.delivery_jobs || []).find((job) => String(job.order_id) === String(orderId)) || null;
}

function publicOrder(db, order) {
  const delivery = deliveryForOrder(db, order.id);
  return {
    ...order,
    delivery,
    delivery_job_id: delivery?.id || "",
    total_paise: order.totals?.totalPaise || 0
  };
}

function orderEvents(db, order) {
  const events = [];
  const delivery = deliveryForOrder(db, order.id);
  events.push({
    id: `${order.id}-created`,
    order_id: order.id,
    event: "order_created",
    payload: { status: order.status, payment_status: order.payment_status },
    created_at: order.created_at
  });
  if (order.payment_status) {
    events.push({
      id: `${order.id}-payment-${order.payment_status}`,
      order_id: order.id,
      event: `payment_${order.payment_status}`,
      payload: { razorpay_order_id: order.razorpay_order_id, razorpay_payment_id: order.razorpay_payment_id || "" },
      created_at: order.paid_at || order.created_at
    });
  }
  if (delivery) {
    events.push({
      id: `${delivery.id}-delivery`,
      order_id: order.id,
      event: "delivery_ready_for_assignment",
      payload: { provider: delivery.provider, lane: delivery.lane, eta_minutes: delivery.estimated_minutes },
      created_at: delivery.created_at
    });
  }
  return events.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function requireShopAccess(req, db, storeId) {
  const gate = requireAuth(req, db);
  if (gate.error) return gate;
  const uid = gate.user.sub || gate.user.id;
  const role = String(gate.user.role || "");
  if (role === "admin" || storeOwnedBy(db, storeId, uid)) return gate;
  return { error: "Store owner access required", status: 403 };
}

function storeIsVerified(store) {
  if (store.mallId) return true;
  const status = String(store.verification_status || store.verificationStatus || store.status || "verified").toLowerCase();
  return status === "verified";
}

function filterPublicCatalog(stores, products, options = {}) {
  const city = String(options.city || "").trim().toLowerCase();
  const verifiedOnly = options.verifiedOnly !== false;
  let filteredStores = stores.filter((s) => {
    if (verifiedOnly && !storeIsVerified(s)) return false;
    if (city) {
      const loc = `${s.city || ""} ${s.address || ""}`.toLowerCase();
      const mallLoc = String(s.location || "").toLowerCase();
      if (!loc.includes(city) && !mallLoc.includes(city) && !s.mallId) return false;
    }
    return true;
  });
  const storeIds = new Set(filteredStores.map((s) => String(s.id)));
  let filteredProducts = products.filter((p) => {
    const sid = String(p.store_id || p.storeId || "");
    if (sid && storeIds.size && !storeIds.has(sid) && !p.mallId) return false;
    if (city && String(p.city || "").toLowerCase() && !String(p.city || "").toLowerCase().includes(city)) return false;
    return p.is_active !== false;
  });
  return { stores: filteredStores, products: filteredProducts };
}

async function catalogResponse(options = {}) {
  const mock = readJson(MOCK_DATA_FILE, { malls: [], stores: [], products: [], categories: [], flashDeals: [] });
  const db = await readDb();
  const stores = [...(mock.stores || []), ...(db.stores || [])];
  const rawProducts = [...(mock.products || []), ...(db.products || [])];
  const products = rawProducts.map((p) => publicCatalogProduct(p, stores));
  const filtered = filterPublicCatalog(stores, products, {
    city: options.city || "",
    verifiedOnly: options.verifiedOnly !== false
  });
  const cities = Array.from(new Set(stores.map((s) => String(s.city || cityOfAddress(s.address)).trim()).filter(Boolean))).sort();
  return {
    ...mock,
    stores: filtered.stores,
    products: filtered.products,
    cities
  };
}

function cityOfAddress(address) {
  const parts = String(address || "").split(",").map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function authUser(req, db) {
  const auth = verifyToken(req.headers.authorization);
  if (!auth) return null;
  const user = (db.users || []).find((item) => item.id === auth.sub);
  return user ? { ...auth, ...user } : auth;
}

function requireAuth(req, db) {
  const user = authUser(req, db);
  if (!user) return { error: "Login required", status: 401 };
  return { user };
}

function requireAdmin(req, db) {
  const gate = requireAuth(req, db);
  if (gate.error) return gate;
  if (String(gate.user.role || "") !== "admin") return { error: "Admin access required", status: 403 };
  return gate;
}

function storeOwnedBy(db, storeId, userId) {
  const store = (db.stores || []).find((s) => String(s.id) === String(storeId));
  if (!store) return false;
  return String(store.owner_user_id || "") === String(userId);
}

function normalizeStorePayload(input) {
  const now = new Date().toISOString();
  const id = String(input.id || `store-${Date.now()}`);
  const bank = input.bank || {};
  const hasBank = bank.account_number || bank.ifsc_code || bank.beneficiary_name
    || input.account_number || input.ifsc_code || input.beneficiary_name;
  return {
    id,
    name: String(input.name || "Local Store").trim(),
    category: String(input.category || "Local Store").trim(),
    owner_name: String(input.owner_name || input.owner || "").trim(),
    owner_user_id: String(input.owner_user_id || input.ownerUserId || "").trim(),
    phone: String(input.phone || "").trim(),
    address: String(input.address || "").trim(),
    city: String(input.city || "Hyderabad").trim(),
    state: String(input.state || input.city || "Telangana").trim(),
    hours: String(input.hours || "10:00 AM - 9:00 PM").trim(),
    banner_url: String(input.banner_url || input.banner || "assets/media/hero-mall.jpg").trim(),
    verification_status: String(input.verification_status || input.status || "pending").trim(),
    verification_doc: String(input.verification_doc || input.verificationDoc || "").trim(),
    verification_photo_url: String(input.verification_photo_url || input.verificationPhoto || "").trim(),
    verified_at: input.verified_at || input.verifiedAt || null,
    rejected_at: input.rejected_at || input.rejectedAt || null,
    bank: hasBank ? {
      beneficiary_name: String(bank.beneficiary_name || input.beneficiary_name || input.owner_name || input.owner || "").trim(),
      account_number: String(bank.account_number || input.account_number || "").replace(/\s/g, ""),
      account_number_masked: bank.account_number_masked || "",
      ifsc_code: String(bank.ifsc_code || input.ifsc_code || input.ifsc || "").trim().toUpperCase(),
      account_type: String(bank.account_type || input.account_type || "current").trim().toLowerCase(),
      pan: String(bank.pan || input.pan || "").trim().toUpperCase()
    } : (input.bank || null),
    payout_account_ref: String(input.payout_account_ref || "").trim(),
    payout_status: String(input.payout_status || "pending").trim(),
    payout_error: String(input.payout_error || "").trim(),
    payout_updated_at: input.payout_updated_at || null,
    created_at: input.created_at || now,
    updated_at: now
  };
}

async function provisionStoreBankAccount(store, body, authUser) {
  const bank = attachBankToStore(store, body, store);
  const bankErrors = validateBankDetails(bank);
  if (bankErrors.length) {
    const err = new Error(bankErrors.join(". "));
    err.code = "BANK_VALIDATION";
    throw err;
  }
  store.bank = bank;
  const contact = {
    email: String(body.owner_email || body.email || authUser?.email || `${store.id}@mallmaze.local`).trim().toLowerCase(),
    phone: String(body.owner_phone || body.phone || store.phone || authUser?.phone || "").trim()
  };
  try {
    const payout = await provisionStorePayout(store, bank, contact, razorpayCreds());
    Object.assign(store, payout);
  } catch (error) {
    store.payout_status = "failed";
    store.payout_error = String(error.message || "Payout account setup failed");
    store.payout_updated_at = new Date().toISOString();
    throw error;
  }
  return store;
}

function normalizeProductPayload(input) {
  const now = new Date().toISOString();
  const price = Math.max(0, Math.round(Number(input.price_inr || input.price || 0)));
  const original = Math.max(price, Math.round(Number(input.original_price_inr || input.originalPrice || price)));
  return {
    id: String(input.id || `prod-${Date.now()}`),
    store_id: String(input.store_id || input.storeId || ""),
    name: String(input.name || "Product").trim(),
    category: String(input.category || "").trim(),
    price_inr: price,
    original_price_inr: original,
    stock_qty: Math.max(0, Math.round(Number(input.stock_qty || input.stock || 0))),
    image_url: String(input.image_url || input.image || "assets/media/hero-mall.jpg").trim(),
    color: String(input.color || input.attributes?.color || "").trim().toLowerCase(),
    size: String(input.size || input.attributes?.size || "").trim().toUpperCase(),
    fit: String(input.fit || input.attributes?.fit || "regular").trim().toLowerCase(),
    brand: String(input.brand || "").trim(),
    quality_score: Math.min(100, Math.max(0, Math.round(Number(input.quality_score ?? input.qualityScore ?? 80)))),
    sizes: Array.isArray(input.sizes) ? input.sizes.map(String) : (Array.isArray(input.variants) ? input.variants.map(String) : []),
    variants: Array.isArray(input.variants) ? input.variants.map(String) : [],
    rating: Number(input.rating || 4.4),
    enhanced: Boolean(input.enhanced),
    is_active: input.is_active !== false,
    created_at: input.created_at || now,
    updated_at: now
  };
}

function storesWithProducts(db) {
  const products = db.products || [];
  return (db.stores || []).map((store) => publicStore({
    ...store,
    products: products.filter((product) => product.store_id === store.id && product.is_active !== false)
  }));
}

function publicCatalogProduct(product, stores = []) {
  const storeId = String(product.store_id || product.storeId || "");
  const store = stores.find((item) => String(item.id) === storeId) || {};
  const price = Math.max(0, Math.round(Number(product.price_inr || product.price || 0)));
  const original = Math.max(price, Math.round(Number(product.original_price_inr || product.originalPrice || price)));
  const stock = Math.max(0, Math.round(Number(product.stock_qty || product.stock || product.stockCount || 0)));
  return {
    id: String(product.id || ""),
    storeId,
    store_id: storeId,
    mallId: product.mallId || store.mallId || "",
    name: String(product.name || "Product"),
    category: String(product.category || ""),
    price,
    price_inr: price,
    originalPrice: original,
    original_price_inr: original,
    stockCount: stock,
    stock_qty: stock,
    inStock: stock > 0,
    image: String(product.image_url || product.image || "assets/media/hero-mall.jpg"),
    image_url: String(product.image_url || product.image || "assets/media/hero-mall.jpg"),
    store_name: String(product.store_name || product.storeName || store.name || "Local Store"),
    storeName: String(product.store_name || product.storeName || store.name || "Local Store"),
    mallName: product.mallName || store.mallName || "Local Store",
    city: String(product.city || store.city || ""),
    color: String(product.color || "").toLowerCase(),
    size: String(product.size || "").toUpperCase(),
    fit: String(product.fit || "regular").toLowerCase(),
    brand: String(product.brand || ""),
    quality_score: Number(product.quality_score ?? 80),
    sizes: product.sizes || product.variants || [],
    variants: product.variants || product.sizes || [],
    rating: Number(product.rating || 4.4),
    verificationStatus: store.verification_status || "verified",
    virtualSource: Boolean(product.virtualSource || store.virtualSource || !store.mallId),
    is_active: product.is_active !== false
  };
}

function recommendationBuckets(catalog, query = {}) {
  const stores = Array.isArray(catalog.stores) ? catalog.stores : [];
  const products = (Array.isArray(catalog.products) ? catalog.products : [])
    .map((product) => publicCatalogProduct(product, stores))
    .filter((product) => product.is_active);
  const category = String(query.category || "").trim().toLowerCase();
  const search = String(query.search || "").trim().toLowerCase();
  const limit = Math.max(4, Math.min(24, Number(query.limit || 12)));
  const base = products.filter((product) => {
    if (category && String(product.category || "").toLowerCase() !== category) return false;
    if (search) {
      const hay = `${product.name} ${product.category} ${product.store_name}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
  const score = (product) => {
    const discount = Math.max(0, product.original_price_inr - product.price_inr);
    return (Number(product.rating || 0) * 20) + Math.min(40, discount / 50) + Math.min(30, product.stock_qty || 0);
  };
  const sorted = [...base].sort((a, b) => score(b) - score(a));
  const deals = [...base]
    .filter((product) => Number(product.original_price_inr || 0) > Number(product.price_inr || 0))
    .sort((a, b) => (b.original_price_inr - b.price_inr) - (a.original_price_inr - a.price_inr));
  const replenished = [...base].filter((product) => product.stock_qty > 0).sort((a, b) => b.stock_qty - a.stock_qty);
  return {
    recommended: sorted.slice(0, limit),
    deals: deals.slice(0, limit),
    in_stock: replenished.slice(0, limit),
    categories: Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort()
  };
}

function upsertById(list, row) {
  const arr = Array.isArray(list) ? list : [];
  const idx = arr.findIndex((item) => String(item.id) === String(row.id));
  if (idx >= 0) arr[idx] = { ...arr[idx], ...row };
  else arr.unshift(row);
  return arr;
}

function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpayWebhookSecret) return false;
  const expected = crypto.createHmac("sha256", env.razorpayWebhookSecret).update(rawBody).digest("hex");
  const actual = Buffer.from(String(signature || ""));
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return crypto.timingSafeEqual(actual, wanted);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const routes = {
  "GET /api/health": async (_req, res) => send(res, 200, { ok: true, service: "mallmaze-api", time: new Date().toISOString() }),
  "GET /api/catalog": async (_req, res, parsed) => {
    send(res, 200, await catalogResponse({
      city: parsed.searchParams.get("city") || "",
      verifiedOnly: parsed.searchParams.get("all") !== "1"
    }));
  },
  "GET /api/location/cities": async (_req, res) => {
    const catalog = await catalogResponse({ verifiedOnly: false });
    send(res, 200, { cities: catalog.cities || [] });
  },
  "POST /api/location/detect": async (req, res) => {
    const body = await readBody(req);
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return send(res, 400, { error: "lat and lng required" });
    const catalog = await catalogResponse({ verifiedOnly: false });
    const cities = catalog.cities || ["Hyderabad", "Mumbai", "Bangalore", "Chennai", "New Delhi", "Pune", "Kolkata"];
    const cityHints = [
      { city: "Hyderabad", lat: 17.385, lng: 78.4867, radius: 1.2 },
      { city: "Mumbai", lat: 19.076, lng: 72.8777, radius: 1.2 },
      { city: "Bangalore", lat: 12.9716, lng: 77.5946, radius: 1.2 },
      { city: "Chennai", lat: 13.0827, lng: 80.2707, radius: 1.2 },
      { city: "New Delhi", lat: 28.6139, lng: 77.209, radius: 1.2 },
      { city: "Pune", lat: 18.5204, lng: 73.8567, radius: 1.0 },
      { city: "Kolkata", lat: 22.5726, lng: 88.3639, radius: 1.2 }
    ];
    let best = cities[0] || "Hyderabad";
    let bestDist = Infinity;
    for (const hint of cityHints) {
      const d = Math.sqrt((lat - hint.lat) ** 2 + (lng - hint.lng) ** 2);
      if (d < bestDist && d <= hint.radius) {
        bestDist = d;
        best = hint.city;
      }
    }
    send(res, 200, { ok: true, city: best, supported_cities: cities });
  },
  "GET /api/auth/me": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const db = await readDb();
    const user = (db.users || []).find((item) => item.id === auth.sub) || auth;
    send(res, 200, { user: publicUser({ id: auth.sub, ...user }) });
  },
  "GET /api/recommendations": async (_req, res, parsed) => {
    const catalog = await catalogResponse();
    send(res, 200, recommendationBuckets(catalog, {
      category: parsed.searchParams.get("category") || "",
      search: parsed.searchParams.get("search") || "",
      limit: parsed.searchParams.get("limit") || ""
    }));
  },
  "GET /api/autoshelf/stores": async (_req, res) => {
    const db = await readDb();
    send(res, 200, { stores: storesWithProducts(db) });
  },
  "POST /api/stores/register": async (req, res) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const auth = gate.user;
    const body = await readBody(req);
    const store = normalizeStorePayload({
      ...body,
      verification_status: "pending",
      status: "pending"
    });
    store.registration_source = "home_register_store";
    store.owner_user_id = auth?.sub || auth?.id || "";
    store.owner_email = String(body.owner_email || body.email || auth?.email || "").trim().toLowerCase();
    store.owner_phone = String(body.owner_phone || body.phone || auth?.phone || "").trim();
    if (!store.name || store.name === "Local Store") return send(res, 400, { error: "Store name is required" });
    try {
      await provisionStoreBankAccount(store, body, auth);
    } catch (error) {
      return send(res, 400, { error: error.message || "Bank details are required for automated payouts" });
    }
    const uid = auth?.sub || auth?.id || "";
    const owner = (db.users || []).find((u) => u.id === uid);
    if (owner && owner.role !== "admin") owner.role = "shop_owner";
    db.stores = upsertById(db.stores, store);
    await writeDb(db);
    send(res, 200, { ok: true, store: publicStore({ ...store, products: (db.products || []).filter((p) => p.store_id === store.id) }) });
  },
  "POST /api/autoshelf/stores": async (req, res) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const body = await readBody(req);
    const existing = (db.stores || []).find((s) => String(s.id) === String(body.id || ""));
    const store = normalizeStorePayload(body);
    const uid = gate.user.sub || gate.user.id;
    if (!store.owner_user_id) store.owner_user_id = String(uid);
    if (store.id) {
      const access = requireShopAccess(req, db, store.id);
      if (access.error) return send(res, access.status, { error: access.error });
    }
    const hasBankInput = Boolean(body.account_number || body.ifsc_code || body.beneficiary_name || body.bank);
    const bankChanged = hasBankInput || !existing?.payout_account_ref;
    if (bankChanged) {
      try {
        await provisionStoreBankAccount(store, body, gate.user);
      } catch (error) {
        return send(res, 400, { error: error.message || "Bank details are required for automated payouts" });
      }
    } else if (existing) {
      store.bank = existing.bank;
      store.payout_account_ref = existing.payout_account_ref;
      store.payout_status = existing.payout_status;
      store.payout_error = existing.payout_error;
      store.payout_updated_at = existing.payout_updated_at;
    }
    db.stores = upsertById(db.stores, store);
    await writeDb(db);
    send(res, 200, { ok: true, store: publicStore({ ...store, products: (db.products || []).filter((p) => p.store_id === store.id) }) });
  },
  "POST /api/stores/bank-details": async (req, res) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const body = await readBody(req);
    const storeId = String(body.store_id || body.id || "");
    if (!storeId) return send(res, 400, { error: "store_id is required" });
    const access = requireShopAccess(req, db, storeId);
    if (access.error) return send(res, access.status, { error: access.error });
    const store = (db.stores || []).find((s) => String(s.id) === storeId);
    if (!store) return send(res, 404, { error: "Store not found" });
    try {
      await provisionStoreBankAccount(store, body, gate.user);
    } catch (error) {
      return send(res, 400, { error: error.message || "Could not update bank details" });
    }
    store.updated_at = new Date().toISOString();
    db.stores = upsertById(db.stores, store);
    await writeDb(db);
    send(res, 200, { ok: true, store: publicStore(store) });
  },
  "DELETE /api/autoshelf/stores": async (req, res, parsed) => {
    const id = String(parsed.searchParams.get("id") || "");
    if (!id) return send(res, 400, { error: "Store id is required" });
    const db = await readDb();
    const gate = requireShopAccess(req, db, id);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    db.stores = (db.stores || []).filter((store) => String(store.id) !== id);
    db.products = (db.products || []).filter((product) => String(product.store_id) !== id);
    await writeDb(db);
    send(res, 200, { ok: true });
  },
  "POST /api/autoshelf/products": async (req, res) => {
    const db = await readDb();
    const product = normalizeProductPayload(await readBody(req));
    if (!product.store_id) return send(res, 400, { error: "store_id is required" });
    const gate = requireShopAccess(req, db, product.store_id);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    product.enhanced = product.enhanced !== false;
    db.products = upsertById(db.products, product);
    await writeDb(db);
    send(res, 200, { ok: true, product });
  },
  "DELETE /api/autoshelf/products": async (req, res, parsed) => {
    const id = String(parsed.searchParams.get("id") || "");
    if (!id) return send(res, 400, { error: "Product id is required" });
    const db = await readDb();
    const product = (db.products || []).find((p) => String(p.id) === id);
    if (product?.store_id) {
      const gate = requireShopAccess(req, db, product.store_id);
      if (gate.error) return send(res, gate.status, { error: gate.error });
    }
    db.products = (db.products || []).filter((product) => String(product.id) !== id);
    await writeDb(db);
    send(res, 200, { ok: true });
  },
  "POST /api/autoshelf/stock-events": async (req, res) => {
    const db = await readDb();
    const body = await readBody(req);
    const event = {
      id: `stock-${Date.now()}`,
      store_id: String(body.store_id || ""),
      product_id: String(body.product_id || ""),
      event_type: String(body.event_type || "adjustment"),
      qty_delta: Number(body.qty_delta || 0),
      stock_after: Number(body.stock_after || 0),
      reason: String(body.reason || ""),
      created_at: new Date().toISOString()
    };
    db.stock_events = [event, ...(db.stock_events || [])];
    await writeDb(db);
    send(res, 200, { ok: true, event });
  },
  "POST /api/auth/otp/request": async (req, res) => {
    const body = await readBody(req);
    const identity = normalizeIdentity(body);
    if (!identity) return send(res, 400, { error: "Email or phone is required" });
    const db = await readDb();
    const otp = String(crypto.randomInt(100000, 999999));
    const challenge = {
      id: `otp-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      channel: identity.channel,
      value: identity.value,
      otp_hash: crypto.createHash("sha256").update(otp).digest("hex"),
      expires_at: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      consumed: false,
      created_at: new Date().toISOString()
    };
    db.otp_challenges = [...(db.otp_challenges || []).filter((x) => Date.now() < Number(x.expires_at || 0)), challenge];
    await writeDb(db);
    // Wire SMS/email providers here: MSG91, Twilio, SES, SendGrid, etc.
    send(res, 200, {
      ok: true,
      challenge_id: challenge.id,
      channel: identity.channel,
      expires_in_seconds: 300,
      dev_otp: env.otpDevMode ? otp : undefined
    });
  },
  "POST /api/auth/otp/verify": async (req, res) => {
    const body = await readBody(req);
    const db = await readDb();
    const challenge = (db.otp_challenges || []).find((x) => x.id === body.challenge_id);
    if (!challenge || challenge.consumed || Date.now() > Number(challenge.expires_at || 0)) {
      return send(res, 400, { error: "OTP expired. Request a new code." });
    }
    challenge.attempts = Number(challenge.attempts || 0) + 1;
    const hash = crypto.createHash("sha256").update(String(body.otp || "")).digest("hex");
    if (challenge.otp_hash !== hash || challenge.attempts > 5) {
      await writeDb(db);
      return send(res, 400, { error: "Invalid OTP" });
    }
    challenge.consumed = true;
    const existing = (db.users || []).find((u) => u.email === challenge.value || u.phone === challenge.value);
    const user = existing || {
      id: `usr-${Date.now()}`,
      name: String(body.name || "").trim(),
      email: challenge.channel === "email" ? challenge.value : "",
      phone: challenge.channel === "phone" ? challenge.value : "",
      role: "user",
      created_at: new Date().toISOString()
    };
    if (String(challenge.value || "").toLowerCase() === "admin@mallmaze.in") user.role = "admin";
    if (!existing) db.users = [user, ...(db.users || [])];
    else {
      if (user.role === "admin") existing.role = "admin";
      Object.assign(user, existing);
    }
    await writeDb(db);
    send(res, 200, { ok: true, token: tokenFor(user), user: publicUser(user) });
  },
  "POST /api/payments/razorpay/order": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const body = await readBody(req);
    const orderType = String(body.order_type || body.orderType || "delivery").toLowerCase();
    const totals = computeTotals(body.items || [], { order_type: orderType });
    if (!totals.totalPaise) return send(res, 400, { error: "Cart is empty" });
    const db = await readDb();
    const splits = computeStoreSplits(totals.lineItems, env.storeCommissionBps);
    if (!splits.length) return send(res, 400, { error: "Each cart item must belong to a store for automated payouts" });
    const payoutReady = assertStoresPayoutReady(db, splits.map((s) => s.store_id));
    if (!payoutReady.ok) return send(res, 400, { error: payoutReady.error });
    const storeById = new Map((db.stores || []).map((s) => [String(s.id), s]));
    const holdUntil = Math.floor(Date.now() / 1000) + Math.max(1, env.payoutHoldHours) * 3600;
    const transfers = buildOrderTransfers(splits, storeById, holdUntil).map((t) => ({
      ...t,
      notes: { ...t.notes, order_id: "", app_customer_id: auth.sub }
    }));
    const appOrderId = `ORD-${Date.now()}`;
    const receipt = appOrderId.slice(0, 40);
    transfers.forEach((t) => { t.notes.order_id = appOrderId; });
    const razorpayOrder = await createRazorpayOrder({
      amount: totals.totalPaise,
      receipt,
      notes: { app_order_id: appOrderId, customer_id: auth.sub, order_type: orderType },
      transfers
    });
    const order = {
      id: appOrderId,
      customer_id: auth.sub,
      order_type: orderType,
      status: orderType === "reserve" ? "reserved" : "payment_pending",
      payment_status: "created",
      razorpay_order_id: razorpayOrder.id,
      totals,
      payout_splits: splits,
      payout_transfers: transfers,
      delivery: orderType === "reserve" ? null : (body.delivery || null),
      pickup: body.pickup || null,
      items: totals.lineItems,
      created_at: new Date().toISOString()
    };
    let deliveryJob = null;
    if (razorpayOrder.mock) {
      order.razorpay_payment_id = `pay_mock_${Date.now()}`;
      markOrderPaid(order, db, order.razorpay_payment_id);
      deliveryJob = (db.delivery_jobs || []).find((j) => j.order_id === order.id) || null;
    }
    db.orders = [order, ...(db.orders || [])];
    await writeDb(db);
    send(res, 200, {
      ok: true,
      key_id: env.razorpayKeyId,
      mock: Boolean(razorpayOrder.mock),
      order: {
        id: order.id,
        razorpay_order_id: order.razorpay_order_id,
        amount: totals.totalPaise,
        currency: "INR",
        totals,
        payout_splits: splits
      },
      delivery: deliveryJob
    });
  },
  "POST /api/payments/razorpay/qr": async (req, res) => {
    const body = await readBody(req);
    const amountRupees = Math.max(1, Number(body.amount_inr || body.amount || 0));
    const amountPaise = Math.round(amountRupees * 100);
    const qr = await createRazorpayQrCode({
      amount: amountPaise,
      name: body.name || "MallMaze Store Payment",
      description: body.description || "MallMaze AutoShelf payment",
      notes: {
        source: "autoshelf",
        store_id: String(body.store_id || ""),
        product_id: String(body.product_id || ""),
        local_reference: String(body.local_reference || `AS-${Date.now()}`)
      }
    });
    send(res, 200, { ok: true, qr });
  },
  "POST /api/payments/razorpay/verify": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const body = await readBody(req);
    const ok = verifyRazorpaySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature);
    if (!ok) return send(res, 400, { error: "Payment signature verification failed" });
    const db = await readDb();
    const order = (db.orders || []).find((o) => o.razorpay_order_id === body.razorpay_order_id && o.customer_id === auth.sub);
    if (!order) return send(res, 404, { error: "Order not found" });
    const result = markOrderPaid(order, db, body.razorpay_payment_id);
    await writeDb(db);
    send(res, 200, { ok: true, order: result.order, delivery: result.delivery });
  },
  "POST /api/payments/razorpay/webhook": async (req, res) => {
    const raw = await readRawBody(req);
    const signature = req.headers["x-razorpay-signature"];
    if (env.razorpayKeySecret && env.razorpayWebhookSecret && !verifyWebhookSignature(raw, signature)) {
      return send(res, 400, { error: "Invalid webhook signature" });
    }
    if (env.razorpayKeySecret && !env.razorpayWebhookSecret) {
      return send(res, 503, { error: "Webhook secret not configured" });
    }
    const event = JSON.parse(raw || "{}");
    const payment = event.payload?.payment?.entity || {};
    const orderId = payment.order_id || event.payload?.order?.entity?.id || "";
    const db = await readDb();
    const order = (db.orders || []).find((item) => item.razorpay_order_id === orderId);
    if (order && ["payment.captured", "order.paid"].includes(String(event.event || ""))) {
      markOrderPaid(order, db, payment.id || order.razorpay_payment_id || "");
      await writeDb(db);
    }
    if (String(event.event || "").startsWith("transfer.")) {
      applyTransferWebhook(db, event);
      await writeDb(db);
    }
    send(res, 200, { ok: true });
  },
  "GET /api/orders": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const db = await readDb();
    const orders = (db.orders || [])
      .filter((o) => o.customer_id === auth.sub)
      .map((order) => publicOrder(db, order));
    send(res, 200, { orders });
  },
  "GET /api/orders/detail": async (req, res, parsed) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const id = String(parsed.searchParams.get("id") || "");
    if (!id) return send(res, 400, { error: "Order id is required" });
    const db = await readDb();
    const order = (db.orders || []).find((o) => String(o.id) === id && (o.customer_id === auth.sub || auth.role === "admin"));
    if (!order) return send(res, 404, { error: "Order not found" });
    send(res, 200, { order: publicOrder(db, order), events: orderEvents(db, order) });
  },
  "GET /api/notifications": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const db = await readDb();
    const userOrders = (db.orders || []).filter((order) => order.customer_id === auth.sub || auth.role === "admin");
    const events = userOrders.flatMap((order) => orderEvents(db, order)).slice(0, 60);
    const receipts = (db.scan_receipts || [])
      .filter((receipt) => receipt.user_id === auth.sub || auth.role === "admin")
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 30)
      .map(publicScanReceipt);
    const tickets = (db.support_tickets || [])
      .filter((ticket) => ticket.user_id === auth.sub || auth.role === "admin")
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 30);
    send(res, 200, { events, receipts, tickets });
  },
  "POST /api/scan/receipts": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const body = await readBody(req);
    const totals = computeScanTotals(body.items || []);
    if (!totals.totalPaise) return send(res, 400, { error: "Scan cart is empty or contains only zero-price items" });
    const now = new Date().toISOString();
    const receipt = {
      id: `SCAN-${Date.now()}`,
      user_id: auth.sub,
      store_id: String(body.store_id || ""),
      token: `MM-${crypto.randomBytes(12).toString("hex").toUpperCase()}`,
      payment_session_id: String(body.session_id || `scan_${Date.now()}`),
      payment_status: "mock_paid",
      status: "paid",
      total_paise: totals.totalPaise,
      total_inr: Math.round(totals.totalPaise / 100),
      items: totals.lineItems,
      created_at: now,
      verified_at: null,
      verified_by: ""
    };
    const db = await readDb();
    db.scan_receipts = [receipt, ...(db.scan_receipts || [])];
    await writeDb(db);
    send(res, 200, { ok: true, receipt: publicScanReceipt(receipt) });
  },
  "GET /api/scan/receipts": async (req, res, parsed) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const token = String(parsed.searchParams.get("token") || "");
    const sessionId = String(parsed.searchParams.get("session_id") || "");
    if (!token && !sessionId) return send(res, 400, { error: "token or session_id is required" });
    const db = await readDb();
    const receipt = (db.scan_receipts || []).find((row) => (
      (token && row.token === token) || (sessionId && row.payment_session_id === sessionId)
    ) && (row.user_id === auth.sub || auth.role === "admin"));
    if (!receipt) return send(res, 404, { error: "Receipt not found" });
    send(res, 200, { receipt: publicScanReceipt(receipt) });
  },
  "POST /api/scan/receipts/verify": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const body = await readBody(req);
    const token = String(body.token || "").trim();
    if (!token) return send(res, 400, { error: "Receipt token is required" });
    const db = await readDb();
    const receipt = (db.scan_receipts || []).find((row) => row.token === token);
    if (!receipt) return send(res, 404, { error: "Receipt not found" });
    if (!receipt.verified_at) {
      receipt.verified_at = new Date().toISOString();
      receipt.verified_by = auth.sub;
      receipt.status = "verified";
      await writeDb(db);
    }
    send(res, 200, { ok: true, receipt: publicScanReceipt(receipt) });
  },
  "GET /api/support/tickets": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const db = await readDb();
    const tickets = (db.support_tickets || [])
      .filter((ticket) => ticket.user_id === auth.sub || auth.role === "admin")
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    send(res, 200, { tickets });
  },
  "POST /api/support/tickets": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    if (!auth) return send(res, 401, { error: "Login required" });
    const body = await readBody(req);
    const ticket = {
      id: `TKT-${Date.now()}`,
      user_id: auth.sub,
      order_id: String(body.order_id || ""),
      type: String(body.type || "other"),
      refund_percent: body.refund_percent == null ? null : Math.max(0, Math.min(100, Number(body.refund_percent || 0))),
      message: String(body.message || "").trim(),
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!ticket.message) return send(res, 400, { error: "Message is required" });
    const db = await readDb();
    db.support_tickets = [ticket, ...(db.support_tickets || [])];
    await writeDb(db);
    send(res, 200, { ok: true, ticket });
  },
  "POST /api/feedback": async (req, res) => {
    const auth = verifyToken(req.headers.authorization);
    const body = await readBody(req);
    const message = String(body.message || "").trim();
    if (!message) return send(res, 400, { error: "Message is required" });
    const feedback = {
      id: `FDB-${Date.now()}`,
      user_id: auth?.sub || "",
      email: String(body.email || auth?.email || "").trim().toLowerCase(),
      topic: String(body.topic || "general").trim(),
      message,
      status: "new",
      created_at: new Date().toISOString()
    };
    const db = await readDb();
    db.feedback = [feedback, ...(db.feedback || [])];
    await writeDb(db);
    send(res, 200, { ok: true, feedback });
  },
  "GET /api/search/smart": async (_req, res, parsed) => {
    const q = String(parsed.searchParams.get("q") || parsed.searchParams.get("search") || "").trim();
    if (!q) return send(res, 400, { error: "Search query is required" });
    const catalog = await catalogResponse();
    const result = smartSearchClassify(catalog, q, {
      city: parsed.searchParams.get("city") || "",
      limit: parsed.searchParams.get("limit") || 6
    });
    send(res, 200, result);
  },
  "POST /api/reservations": async (req, res) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const body = await readBody(req);
    const productId = String(body.product_id || body.productId || "");
    const storeId = String(body.store_id || body.storeId || "");
    const product = (db.products || []).find((p) => String(p.id) === productId);
    const store = (db.stores || []).find((s) => String(s.id) === storeId);
    if (!productId || !storeId) return send(res, 400, { error: "product_id and store_id are required" });
    if (Number(product?.stock_qty || 0) <= 0) return send(res, 400, { error: "Product is out of stock" });
    const reservation = {
      id: `RSV-${Date.now()}`,
      customer_id: gate.user.sub || gate.user.id,
      product_id: productId,
      store_id: storeId,
      product_name: String(body.product_name || product?.name || "Product"),
      store_name: String(body.store_name || store?.name || "Store"),
      size: String(body.size || product?.size || "").toUpperCase(),
      color: String(body.color || product?.color || "").toLowerCase(),
      qty: Math.max(1, Number(body.qty || 1)),
      pickup_date: String(body.pickup_date || body.pickupDate || "").trim(),
      pickup_slot: String(body.pickup_slot || body.pickupSlot || "11:00 AM - 1:00 PM").trim(),
      status: "confirmed",
      otp_code: String(crypto.randomInt(1000, 9999)),
      notes: String(body.notes || "").trim(),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    };
    if (product) {
      product.stock_qty = Math.max(0, Number(product.stock_qty || 0) - reservation.qty);
      product.updated_at = new Date().toISOString();
    }
    db.reservations = [reservation, ...(db.reservations || [])];
    await writeDb(db);
    send(res, 200, { ok: true, reservation });
  },
  "GET /api/reservations": async (req, res, parsed) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const uid = gate.user.sub || gate.user.id;
    const role = String(gate.user.role || "");
    const storeId = String(parsed.searchParams.get("store_id") || "");
    let rows = db.reservations || [];
    if (role === "admin") {
      // all
    } else if (storeId && storeOwnedBy(db, storeId, uid)) {
      rows = rows.filter((r) => String(r.store_id) === storeId);
    } else {
      rows = rows.filter((r) => String(r.customer_id) === String(uid));
    }
    send(res, 200, { reservations: rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))) });
  },
  "POST /api/reservations/cancel": async (req, res) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const body = await readBody(req);
    const id = String(body.id || "");
    const row = (db.reservations || []).find((r) => String(r.id) === id);
    if (!row) return send(res, 404, { error: "Reservation not found" });
    const uid = gate.user.sub || gate.user.id;
    if (String(row.customer_id) !== String(uid) && String(gate.user.role) !== "admin") {
      return send(res, 403, { error: "Not allowed" });
    }
    row.status = "cancelled";
    row.cancelled_at = new Date().toISOString();
    const product = (db.products || []).find((p) => String(p.id) === String(row.product_id));
    if (product) product.stock_qty = Number(product.stock_qty || 0) + Number(row.qty || 1);
    await writeDb(db);
    send(res, 200, { ok: true, reservation: row });
  },
  "GET /api/store/analytics": async (req, res, parsed) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const storeId = String(parsed.searchParams.get("store_id") || "");
    if (!storeId) return send(res, 400, { error: "store_id is required" });
    const uid = gate.user.sub || gate.user.id;
    if (String(gate.user.role) !== "admin" && !storeOwnedBy(db, storeId, uid)) {
      return send(res, 403, { error: "Store access required" });
    }
    send(res, 200, storeAnalytics(db, storeId));
  },
  "GET /api/admin/stores": async (req, res, parsed) => {
    const db = await readDb();
    const gate = requireAdmin(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const status = String(parsed.searchParams.get("status") || "all");
    let stores = db.stores || [];
    if (status !== "all") stores = stores.filter((s) => String(s.verification_status) === status);
    send(res, 200, { stores: storesWithProducts({ ...db, stores }) });
  },
  "POST /api/admin/stores/verify": async (req, res) => {
    const db = await readDb();
    const gate = requireAdmin(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const body = await readBody(req);
    const id = String(body.store_id || body.id || "");
    const store = (db.stores || []).find((s) => String(s.id) === id);
    if (!store) return send(res, 404, { error: "Store not found" });
    if (store.bank && store.payout_status !== "active") {
      try {
        await provisionStoreBankAccount(store, { bank: store.bank, email: store.owner_email, phone: store.phone }, gate.user);
      } catch (error) {
        store.payout_error = String(error.message || "Payout activation failed");
      }
    }
    store.verification_status = "verified";
    store.verified_at = new Date().toISOString();
    store.updated_at = new Date().toISOString();
    if (body.owner_user_id) store.owner_user_id = String(body.owner_user_id);
    db.stores = upsertById(db.stores, store);
    await writeDb(db);
    send(res, 200, { ok: true, store: publicStore(store) });
  },
  "POST /api/admin/stores/reject": async (req, res) => {
    const db = await readDb();
    const gate = requireAdmin(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const body = await readBody(req);
    const id = String(body.store_id || body.id || "");
    const store = (db.stores || []).find((s) => String(s.id) === id);
    if (!store) return send(res, 404, { error: "Store not found" });
    store.verification_status = "rejected";
    store.rejected_at = new Date().toISOString();
    store.rejection_reason = String(body.reason || "Did not pass verification").trim();
    store.updated_at = new Date().toISOString();
    db.stores = upsertById(db.stores, store);
    await writeDb(db);
    send(res, 200, { ok: true, store });
  },
  "GET /api/stores/mine": async (req, res) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const uid = gate.user.sub || gate.user.id;
    const stores = (db.stores || []).filter((s) => String(s.owner_user_id) === String(uid) || String(gate.user.role) === "admin");
    send(res, 200, {
      stores: stores.map((s) => publicStore({
        ...s,
        products: (db.products || []).filter((p) => p.store_id === s.id)
      }))
    });
  },
  "GET /api/store/payouts": async (req, res, parsed) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const storeId = String(parsed.searchParams.get("store_id") || "");
    if (!storeId) return send(res, 400, { error: "store_id is required" });
    const access = requireShopAccess(req, db, storeId);
    if (access.error) return send(res, access.status, { error: access.error });
    const payouts = (db.store_payouts || [])
      .filter((p) => String(p.store_id) === storeId)
      .map((p) => ({
        ...p,
        gross_inr: Math.round(Number(p.gross_paise || 0) / 100),
        net_inr: Math.round(Number(p.net_payable_paise || 0) / 100),
        commission_inr: Math.round(Number(p.commission_paise || 0) / 100)
      }));
    const summary = payouts.reduce((acc, p) => {
      acc.total_net_paise += Number(p.net_payable_paise || 0);
      if (p.status === "settled") acc.settled_paise += Number(p.net_payable_paise || 0);
      if (p.status === "on_hold" || p.status === "processing") acc.pending_paise += Number(p.net_payable_paise || 0);
      return acc;
    }, { total_net_paise: 0, settled_paise: 0, pending_paise: 0 });
    send(res, 200, {
      payouts,
      summary: {
        total_net_inr: Math.round(summary.total_net_paise / 100),
        settled_inr: Math.round(summary.settled_paise / 100),
        pending_inr: Math.round(summary.pending_paise / 100)
      }
    });
  },
  "GET /api/admin/payouts": async (req, res) => {
    const db = await readDb();
    const gate = requireAdmin(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const payouts = (db.store_payouts || []).map((p) => {
      const store = (db.stores || []).find((s) => String(s.id) === String(p.store_id));
      return {
        ...p,
        store_name: store?.name || p.store_id,
        gross_inr: Math.round(Number(p.gross_paise || 0) / 100),
        net_inr: Math.round(Number(p.net_payable_paise || 0) / 100)
      };
    });
    send(res, 200, { payouts });
  },
  "POST /api/uploads": async (req, res) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const body = await readBody(req);
    const storeId = String(body.store_id || body.storeId || "general");
    const role = String(gate.user.role || "");
    if (role !== "admin" && !storeOwnedBy(db, storeId, gate.user.sub || gate.user.id) && storeId !== "general") {
      return send(res, 403, { error: "Cannot upload for this store" });
    }
    try {
      const saved = saveUpload(ROOT, {
        dataUrl: body.data_url || body.dataUrl,
        storeId,
        kind: body.kind || "products",
        filename: body.filename || ""
      });
      send(res, 200, { ok: true, ...saved });
    } catch (error) {
      send(res, 400, { error: error.message || "Upload failed" });
    }
  },
  "GET /api/admin/overview": async (req, res) => {
    const db = await readDb();
    const gate = requireAdmin(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    send(res, 200, {
      users: (db.users || []).length,
      stores: (db.stores || []).length,
      products: (db.products || []).length,
      orders: (db.orders || []).length,
      reservations: (db.reservations || []).length,
      pending_stores: (db.stores || []).filter((s) => String(s.verification_status) === "pending").length,
      revenue_inr: Math.round((db.orders || []).filter((o) => o.payment_status === "paid" || o.payment_status === "mock_paid").reduce((s, o) => s + Number(o.totals?.totalPaise || 0), 0) / 100)
    });
  },
  "GET /api/admin/users": async (req, res) => {
    const db = await readDb();
    const gate = requireAdmin(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    send(res, 200, {
      users: (db.users || []).map((u) => publicUser(u)).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    });
  },
  "GET /api/admin/products": async (req, res, parsed) => {
    const db = await readDb();
    const gate = requireAdmin(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const storeId = parsed.searchParams.get("store_id") || "";
    let products = db.products || [];
    if (storeId) products = products.filter((p) => String(p.store_id) === storeId);
    send(res, 200, { products });
  },
  "GET /api/admin/orders": async (req, res) => {
    const db = await readDb();
    const gate = requireAdmin(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });
    const orders = (db.orders || []).map((order) => publicOrder(db, order));
    send(res, 200, { orders });
  }
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    const parsed = new URL(req.url, `http://${req.headers.host}`);
    if (!parsed.pathname.startsWith("/api/")) {
      if (serveStatic(req, res, parsed)) return;
      return sendText(res, 404, "Not found");
    }
    const key = `${req.method} ${parsed.pathname}`;
    const route = routes[key];
    if (!route) return send(res, 404, { error: "Not found" });
    await route(req, res, parsed);
  } catch (error) {
    send(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`MallMaze app listening on http://localhost:${PORT}`);
});
