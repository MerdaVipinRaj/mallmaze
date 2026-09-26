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
const { saveUpload, uploadStaticTarget, parseDataUrl } = require("./uploads");
const { defaultImageService } = require("./image-service");

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
  otpEmailFrom: process.env.OTP_EMAIL_FROM || "MallMaze <no-reply@mallmaze.in>",
  resendApiKey: process.env.RESEND_API_KEY || "",
  sendgridApiKey: process.env.SENDGRID_API_KEY || "",
  emailOtpWebhookUrl: process.env.EMAIL_OTP_WEBHOOK_URL || "",
  emailOtpWebhookToken: process.env.EMAIL_OTP_WEBHOOK_TOKEN || "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || "",
  smsOtpWebhookUrl: process.env.SMS_OTP_WEBHOOK_URL || "",
  smsOtpWebhookToken: process.env.SMS_OTP_WEBHOOK_TOKEN || "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  platformFeePaise: Number(process.env.PLATFORM_FEE_PAISE || 2900),
  deliveryFeePaise: Number(process.env.DELIVERY_FEE_PAISE || 4900),
  deliveryPartnerAccountRef: process.env.DELIVERY_PARTNER_ACCOUNT_REF || "acc_route_delivery_fleet",
  taxBps: Number(process.env.TAX_BPS || 1800),
  storeCommissionBps: Number(process.env.STORE_COMMISSION_BPS || 1000),
  payoutHoldHours: Number(process.env.PAYOUT_HOLD_HOURS || 0)
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
  if (clean === "/fast-shopping" || clean.startsWith("/store/")) clean = "/store.html";
  if (clean.startsWith("/scan/store/")) clean = "/scan.html";
  const relative = clean.replace(/^\/+/, "");
  const first = relative.split(/[\\/]/)[0];
  const allowedRootFiles = new Set([
    "index.html",
    "payments.html",
    "inventory.html",
    "statistic.html",
    "customers.html",
    "reports.html",
    "profit-loss.html",
    "statistics.html",
    "pos-orders.html",
    "pos.html",
    "expenses.html",
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

function parseEmailSender(value) {
  const rawValue = String(value || "").trim();
  const match = rawValue.match(/^(.*?)\s*<([^>]+)>$/);
  if (!match) return { name: "MallMaze", email: rawValue || "no-reply@mallmaze.in" };
  return { name: match[1].trim() || "MallMaze", email: match[2].trim() };
}

function otpText(otp) {
  return `Your MallMaze OTP is ${otp}. It expires in 5 minutes. Do not share this code.`;
}

function otpHtml(otp) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2 style="margin:0 0 12px">Your MallMaze OTP</h2>
      <p style="margin:0 0 16px">Use this 6-digit code to sign in:</p>
      <div style="display:inline-block;font-size:28px;font-weight:800;letter-spacing:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px">${otp}</div>
      <p style="margin:16px 0 0;color:#64748b;font-size:13px">This code expires in 5 minutes. Do not share it with anyone.</p>
    </div>
  `;
}

async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload)
  });
  const body = await response.text().catch(() => "");
  if (!response.ok) throw new Error(`Provider request failed (${response.status}): ${body.slice(0, 180)}`);
  return body;
}

async function sendEmailOtp(to, otp) {
  const payload = { channel: "email", to, otp, text: otpText(otp), subject: "Your MallMaze OTP", expires_in_seconds: 300 };

  if (env.emailOtpWebhookUrl) {
    const headers = env.emailOtpWebhookToken ? { authorization: `Bearer ${env.emailOtpWebhookToken}` } : {};
    await postJson(env.emailOtpWebhookUrl, payload, headers);
    return { delivered: true, provider: "email_webhook" };
  }

  if (env.resendApiKey) {
    await postJson("https://api.resend.com/emails", {
      from: env.otpEmailFrom,
      to: [to],
      subject: payload.subject,
      text: payload.text,
      html: otpHtml(otp)
    }, { authorization: `Bearer ${env.resendApiKey}` });
    return { delivered: true, provider: "resend" };
  }

  if (env.sendgridApiKey) {
    const from = parseEmailSender(env.otpEmailFrom);
    await postJson("https://api.sendgrid.com/v3/mail/send", {
      personalizations: [{ to: [{ email: to }] }],
      from,
      subject: payload.subject,
      content: [
        { type: "text/plain", value: payload.text },
        { type: "text/html", value: otpHtml(otp) }
      ]
    }, { authorization: `Bearer ${env.sendgridApiKey}` });
    return { delivered: true, provider: "sendgrid" };
  }

  return { delivered: false, provider: "not_configured" };
}

async function sendSmsOtp(to, otp) {
  const payload = { channel: "phone", to, otp, text: otpText(otp), expires_in_seconds: 300 };

  if (env.smsOtpWebhookUrl) {
    const headers = env.smsOtpWebhookToken ? { authorization: `Bearer ${env.smsOtpWebhookToken}` } : {};
    await postJson(env.smsOtpWebhookUrl, payload, headers);
    return { delivered: true, provider: "sms_webhook" };
  }

  if (env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber) {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.twilioAccountSid)}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ To: to, From: env.twilioFromNumber, Body: payload.text })
    });
    const body = await response.text().catch(() => "");
    if (!response.ok) throw new Error(`Twilio request failed (${response.status}): ${body.slice(0, 180)}`);
    return { delivered: true, provider: "twilio" };
  }

  return { delivered: false, provider: "not_configured" };
}

async function dispatchOtp(identity, otp) {
  let delivery;
  try {
    delivery = identity.channel === "email"
      ? await sendEmailOtp(identity.value, otp)
      : await sendSmsOtp(identity.value, otp);
  } catch (error) {
    if (!env.otpDevMode) throw error;
    delivery = { delivered: false, provider: "dev_fallback", error: error.message };
  }

  if (!delivery.delivered && !env.otpDevMode) {
    throw new Error(`${identity.channel === "email" ? "Email" : "SMS"} OTP delivery is not configured.`);
  }

  console.log(`[OTP ${delivery.delivered ? "SENT" : "DEV"}] Channel: ${identity.channel.toUpperCase()} | Recipient: ${identity.value} | Provider: ${delivery.provider}${env.otpDevMode ? ` | Code: ${otp}` : ""}`);
  return delivery;
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

function slugifyName(name, id) {
  const base = String(name || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base ? `${base}-${id}` : id;
}

function normalizeStorePayload(input) {
  const now = new Date().toISOString();
  const id = String(input.id || `store-${Date.now()}`);
  const bank = input.bank || {};
  const hasBank = bank.account_number || bank.ifsc_code || bank.beneficiary_name
    || input.account_number || input.ifsc_code || input.beneficiary_name;
  return {
    id,
    slug: String(input.slug || slugifyName(input.name, id)).trim(),
    description: String(input.description || "").trim(),
    address_line: String(input.address_line || input.address || "").trim(),
    area: String(input.area || "").trim(),
    country: String(input.country || "India").trim(),
    postal_code: String(input.postal_code || "").trim(),
    latitude: input.latitude != null && !isNaN(Number(input.latitude)) ? Number(input.latitude) : null,
    longitude: input.longitude != null && !isNaN(Number(input.longitude)) ? Number(input.longitude) : null,
    opening_time: String(input.opening_time || "10:00 AM").trim(),
    closing_time: String(input.closing_time || "10:00 PM").trim(),
    qr_public_token: String(input.qr_public_token || crypto.randomBytes(16).toString("hex")).trim(),
    qr_version: Number(input.qr_version || 1),
    qr_enabled: input.qr_enabled !== false,
    qr_created_at: input.qr_created_at || now,
    qr_updated_at: input.qr_updated_at || now,
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
  const cost = Math.max(0, Math.round(Number(input.cost_price_inr ?? input.cost_price ?? input.costPrice ?? Math.round(price * 0.65))));
  return {
    id: String(input.id || `prod-${Date.now()}`),
    store_id: String(input.store_id || input.storeId || ""),
    name: String(input.name || "Product").trim(),
    category: String(input.category || "").trim(),
    price_inr: price,
    original_price_inr: original,
    cost_price_inr: cost,
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


function calcHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1), nLon1 = Number(lon1), nLat2 = Number(lat2), nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;
  const R = 6371; // km
  const dLat = (nLat2 - nLat1) * (Math.PI / 180);
  const dLon = (nLon2 - nLon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(nLat1 * (Math.PI / 180)) * Math.cos(nLat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistLabel(distKm) {
  if (distKm == null || isNaN(distKm)) return "Distance unavailable";
  if (distKm < 0.1) return "Within 100m";
  if (distKm < 1) return `${Math.round(distKm * 1000)}m away`;
  if (distKm <= 10) return `${distKm.toFixed(1)} km away`;
  return `${Math.round(distKm)} km away`;
}

const routes = {
  "GET /api/stores/nearby": async (_req, res, parsed) => {
    const db = await readDb();
    const q = parsed.searchParams;
    const lat = q.get("lat") ? Number(q.get("lat")) : null;
    const lng = q.get("lng") ? Number(q.get("lng")) : null;
    const radiusKm = Number(q.get("radius_km") || 35);
    const cityFilter = (q.get("city") || "").trim().toLowerCase();
    const areaFilter = (q.get("area") || "").trim().toLowerCase();
    const categoryFilter = (q.get("category") || "").trim().toLowerCase();
    const openNow = q.get("open_now") === "true";

    // Only active and verified stores appear in public discovery
    let list = (db.stores || []).filter((s) => {
      const isVerified = (s.verification_status || "").toLowerCase() === "verified";
      const isActive = (s.status || "active").toLowerCase() === "active";
      return isVerified && isActive;
    });

    if (cityFilter) {
      list = list.filter((s) => (s.city || "").toLowerCase().includes(cityFilter));
    }
    if (areaFilter) {
      list = list.filter((s) => (s.area || "").toLowerCase().includes(areaFilter));
    }
    if (categoryFilter) {
      list = list.filter((s) => (s.category || "").toLowerCase().includes(categoryFilter));
    }

    const storesWithDist = list.map((st) => {
      let distKm = null;
      if (lat != null && lng != null && st.latitude != null && st.longitude != null) {
        distKm = calcHaversineDistance(lat, lng, st.latitude, st.longitude);
      }
      return {
        ...publicStore(st),
        distance_km: distKm != null ? Number(distKm.toFixed(2)) : null,
        distance_label: formatDistLabel(distKm),
        is_open: true // Can be checked against store hours
      };
    });

    let filtered = storesWithDist;
    if (lat != null && lng != null && radiusKm > 0) {
      // Filter within radius if distance is available, or include nearby city matches
      filtered = storesWithDist.filter((s) => s.distance_km == null || s.distance_km <= radiusKm);
      filtered.sort((a, b) => {
        if (a.distance_km == null && b.distance_km == null) return 0;
        if (a.distance_km == null) return 1;
        if (b.distance_km == null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    send(res, 200, {
      ok: true,
      count: filtered.length,
      user_location: lat != null && lng != null ? { lat, lng } : null,
      stores: filtered
    });
  },

  "GET /api/stores/qr": async (_req, res, parsed) => {
    const db = await readDb();
    const token = (parsed.searchParams.get("token") || "").trim();
    const storeId = (parsed.searchParams.get("id") || "").trim();
    const slug = (parsed.searchParams.get("slug") || "").trim();

    if (!token && !storeId && !slug) {
      return send(res, 400, { error: "Store QR token, id, or slug is required" });
    }

    const store = (db.stores || []).find((s) => {
      if (token && String(s.qr_public_token || "") === token) return true;
      if (storeId && String(s.id) === storeId) return true;
      if (slug && String(s.slug || "") === slug) return true;
      return false;
    });

    if (!store) {
      return send(res, 404, { error: "Store not found" });
    }

    if ((store.status || "active").toLowerCase() !== "active") {
      return send(res, 400, { error: "This store is currently unavailable on MallMaze." });
    }

    if (store.qr_enabled === false) {
      return send(res, 400, { error: "This store QR code is no longer active or has been revoked." });
    }

    const products = (db.products || []).filter((p) => String(p.store_id || p.storeId) === String(store.id));
    send(res, 200, {
      ok: true,
      store: {
        ...publicStore(store),
        products_count: products.length
      }
    });
  },

  "POST /api/stores/qr/regenerate": async (req, res) => {
    const db = await readDb();
    const gate = requireAuth(req, db);
    if (gate.error) return send(res, gate.status, { error: gate.error });

    const body = await readBody(req);
    const storeId = String(body.store_id || body.id || "").trim();
    if (!storeId) return send(res, 400, { error: "store_id is required" });

    const store = (db.stores || []).find((s) => String(s.id) === storeId);
    if (!store) return send(res, 404, { error: "Store not found" });

    const uid = gate.user.sub || gate.user.id;
    const isOwner = String(store.owner_user_id || "") === String(uid);
    const isAdmin = gate.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return send(res, 403, { error: "Unauthorized. Only the store owner or admin can regenerate this QR code." });
    }

    const newToken = crypto.randomBytes(16).toString("hex");
    store.qr_public_token = newToken;
    store.qr_version = (Number(store.qr_version) || 1) + 1;
    store.qr_enabled = true;
    store.qr_updated_at = new Date().toISOString();
    store.updated_at = new Date().toISOString();

    db.stores = upsertById(db.stores, store);
    await writeDb(db);

    send(res, 200, {
      ok: true,
      message: "Store QR code rotated and regenerated successfully.",
      store_id: store.id,
      qr_public_token: newToken,
      qr_version: store.qr_version,
      qr_updated_at: store.qr_updated_at
    });
  },

  "POST /api/shopping-sessions": async (req, res) => {
    const db = await readDb();
    const auth = verifyToken(req.headers.authorization);
    const body = await readBody(req);
    const storeId = String(body.store_id || "").trim();
    if (!storeId) return send(res, 400, { error: "store_id is required" });

    const store = (db.stores || []).find((s) => String(s.id) === storeId);
    if (!store) return send(res, 404, { error: "Store not found" });
    if ((store.status || "active").toLowerCase() !== "active") {
      return send(res, 400, { error: "Cannot start a session for an inactive store." });
    }

    if (!db.store_shopping_sessions) db.store_shopping_sessions = [];

    const now = new Date().toISOString();
    const userId = auth?.sub || auth?.id || null;
    const sessionToken = String(body.session_token || crypto.randomBytes(16).toString("hex"));

    // End any prior active session for this user
    if (userId) {
      db.store_shopping_sessions.forEach((sess) => {
        if (sess.user_id === userId && sess.status === "active") {
          sess.status = "ended";
          sess.ended_at = now;
        }
      });
    }

    const newSession = {
      id: `sess-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      user_id: userId,
      store_id: storeId,
      store_name: store.name,
      session_token: sessionToken,
      status: "active",
      started_at: now,
      last_activity_at: now,
      ended_at: null
    };

    db.store_shopping_sessions.push(newSession);
    await writeDb(db);

    send(res, 200, {
      ok: true,
      session: newSession,
      store: publicStore(store)
    });
  },

  "POST /api/shopping-sessions/end": async (req, res) => {
    const db = await readDb();
    const body = await readBody(req);
    const sessionId = String(body.session_id || "").trim();
    const sessionToken = String(body.session_token || "").trim();

    if (!db.store_shopping_sessions) db.store_shopping_sessions = [];

    const session = db.store_shopping_sessions.find((s) =>
      (sessionId && s.id === sessionId) || (sessionToken && s.session_token === sessionToken)
    );

    if (session) {
      session.status = "ended";
      session.ended_at = new Date().toISOString();
      await writeDb(db);
    }

    send(res, 200, { ok: true, message: "Shopping session ended successfully." });
  },

  "GET /api/shopping-sessions/active": async (req, res, parsed) => {
    const db = await readDb();
    const auth = verifyToken(req.headers.authorization);
    const token = (parsed.searchParams.get("token") || "").trim();

    if (!db.store_shopping_sessions) db.store_shopping_sessions = [];

    const userId = auth?.sub || auth?.id;
    let active = null;
    if (userId) {
      active = db.store_shopping_sessions.find((s) => s.user_id === userId && s.status === "active");
    }
    if (!active && token) {
      active = db.store_shopping_sessions.find((s) => s.session_token === token && s.status === "active");
    }

    if (!active) {
      return send(res, 200, { ok: true, active: false, session: null });
    }

    const store = (db.stores || []).find((s) => String(s.id) === String(active.store_id));
    send(res, 200, {
      ok: true,
      active: true,
      session: active,
      store: store ? publicStore(store) : null
    });
  },

  "GET /api/health": async (_req, res) => send(res, 200, { ok: true, service: "mallmaze-api", time: new Date().toISOString() }),
  "GET /api/version": async (_req, res) => send(res, 200, { ok: true, service: "mallmaze-api", version: "2.1.0", branch: "master", time: new Date().toISOString() }),
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
    const productId = String(body.product_id || "");
    const prod = (db.products || []).find((p) => String(p.id) === productId);
    const currentStock = Math.max(0, Number(prod?.stock_qty || 0));
    const qtyDelta = Number(body.qty_delta || 0);
    const stockAfter = Number.isFinite(body.stock_after) ? Math.max(0, Number(body.stock_after)) : Math.max(0, currentStock + qtyDelta);

    const event = {
      id: `stock-${Date.now()}`,
      store_id: String(body.store_id || prod?.store_id || ""),
      product_id: productId,
      event_type: String(body.event_type || "adjustment"),
      qty_delta: qtyDelta,
      stock_after: stockAfter,
      reason: String(body.reason || ""),
      created_at: new Date().toISOString()
    };
    db.stock_events = [event, ...(db.stock_events || [])];
    if (prod) {
      prod.stock_qty = stockAfter;
      prod.updated_at = new Date().toISOString();
    }
    await writeDb(db);
    send(res, 200, { ok: true, event, product: prod || null });
  },
  "POST /api/pos/sale": async (req, res) => {
    const db = await readDb();
    const body = await readBody(req);
    const storeId = String(body.store_id || "");
    const items = Array.isArray(body.items) ? body.items : [];
    if (!storeId || !items.length) return send(res, 400, { error: "store_id and items are required" });

    const now = new Date();
    const invoiceNo = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${crypto.randomInt(1000, 9999)}`;
    let subtotalPaise = 0;
    const processedItems = [];

    for (const it of items) {
      const pid = String(it.product_id || it.id || "");
      const qty = Math.max(1, Number(it.qty || 1));
      const prod = (db.products || []).find((p) => String(p.id) === pid);

      const unitPriceInr = Math.max(0, Number(it.price_inr ?? prod?.price_inr ?? prod?.price ?? 0));
      const unitCostInr = Math.max(0, Number(it.cost_price_inr ?? prod?.cost_price_inr ?? Math.round(unitPriceInr * 0.65)));
      const lineTotalInr = unitPriceInr * qty;
      subtotalPaise += lineTotalInr * 100;

      if (prod) {
        prod.stock_qty = Math.max(0, Number(prod.stock_qty || 0) - qty);
        prod.updated_at = now.toISOString();

        db.stock_events = [
          {
            id: `stock-pos-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
            store_id: storeId,
            product_id: pid,
            event_type: "pos_sale",
            qty_delta: -qty,
            stock_after: prod.stock_qty,
            reason: `POS Counter Sale ${invoiceNo}`,
            created_at: now.toISOString()
          },
          ...(db.stock_events || [])
        ];
      }

      processedItems.push({
        product_id: pid,
        name: prod?.name || it.name || "Item",
        qty,
        unit_price_inr: unitPriceInr,
        cost_price_inr: unitCostInr,
        line_total_inr: lineTotalInr,
        line_total_paise: lineTotalInr * 100,
        store_id: storeId
      });
    }

    const discountInr = Math.max(0, Number(body.discount_inr || 0));
    const taxPaise = Math.round(subtotalPaise * 0.18);
    const grandTotalPaise = Math.max(0, subtotalPaise + taxPaise - (discountInr * 100));
    const store = (db.stores || []).find((s) => String(s.id) === storeId);

    const posOrder = {
      id: `ord-pos-${Date.now()}`,
      invoice_no: invoiceNo,
      source: "mini_pos",
      store_id: storeId,
      store_name: store?.name || "Store",
      customer_name: String(body.customer_name || "Walk-in Customer").trim(),
      customer_phone: String(body.customer_phone || "").trim(),
      payment_mode: String(body.payment_mode || "Cash"),
      payment_status: "paid",
      status: "completed",
      items: processedItems,
      subtotal_paise: subtotalPaise,
      discount_inr: discountInr,
      tax_paise: taxPaise,
      total_paise: grandTotalPaise,
      total_inr: Math.round(grandTotalPaise / 100),
      created_at: now.toISOString()
    };

    db.orders = [posOrder, ...(db.orders || [])];
    await writeDb(db);
    send(res, 200, { ok: true, invoice_no: invoiceNo, order: posOrder, receipt: { ...posOrder, store } });
  },
  "POST /api/pos/purchase": async (req, res) => {
    const db = await readDb();
    const body = await readBody(req);
    const storeId = String(body.store_id || "");
    const items = Array.isArray(body.items) ? body.items : [];
    if (!storeId || !items.length) return send(res, 400, { error: "store_id and items are required" });

    const now = new Date().toISOString();
    const supplier = String(body.supplier_name || "General Wholesale Supplier").trim();
    const invNo = String(body.invoice_no || `PUR-${Date.now()}`).trim();

    for (const it of items) {
      const pid = String(it.product_id || "");
      const qty = Math.max(1, Number(it.qty || 1));
      const costInr = Math.max(0, Number(it.cost_price_inr || 0));
      const prod = (db.products || []).find((p) => String(p.id) === pid);

      if (prod) {
        prod.stock_qty = Math.max(0, Number(prod.stock_qty || 0) + qty);
        if (costInr > 0) prod.cost_price_inr = costInr;
        prod.updated_at = now;

        db.stock_events = [
          {
            id: `stock-pur-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
            store_id: storeId,
            product_id: pid,
            event_type: "purchase_inward",
            qty_delta: qty,
            stock_after: prod.stock_qty,
            reason: `Tally Purchase Inward: ${supplier} (${invNo})`,
            created_at: now
          },
          ...(db.stock_events || [])
        ];
      }
    }

    await writeDb(db);
    send(res, 200, { ok: true, message: "Purchase inward recorded and stock updated." });
  },
  "POST /api/auth/otp/request": async (req, res) => {
    const body = await readBody(req);
    const identity = normalizeIdentity(body);
    if (!identity) return send(res, 400, { error: "Valid email or mobile phone (+91) is required" });
    const db = await readDb();
    const now = Date.now();
    const liveChallenges = (db.otp_challenges || []).filter((x) => now < Number(x.expires_at || 0));
    const recent = liveChallenges.find((x) =>
      !x.consumed &&
      x.channel === identity.channel &&
      x.value === identity.value &&
      now - new Date(x.created_at || 0).getTime() < 30 * 1000
    );
    if (recent) {
      return send(res, 200, {
        ok: true,
        challenge_id: recent.id,
        channel: identity.channel,
        value: identity.value,
        expires_in_seconds: Math.max(1, Math.round((Number(recent.expires_at || now) - now) / 1000)),
        dev_otp: env.otpDevMode ? recent.raw_otp_dev : undefined,
        delivery: { reused: true, provider: "recent_request" },
        message: `OTP already sent to ${identity.value}. Please wait before requesting another code.`
      });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    let delivery;
    try {
      delivery = await dispatchOtp(identity, otp);
    } catch (error) {
      return send(res, 503, { error: error.message || "Could not send OTP. Please try again." });
    }

    const challenge = {
      id: `otp-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      channel: identity.channel,
      value: identity.value,
      otp_hash: crypto.createHash("sha256").update(otp).digest("hex"),
      raw_otp_dev: env.otpDevMode ? otp : undefined,
      expires_at: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      consumed: false,
      created_at: new Date().toISOString()
    };
    db.otp_challenges = [
      ...liveChallenges.filter((x) => x.channel !== identity.channel || x.value !== identity.value || x.consumed),
      challenge
    ];
    await writeDb(db);

    send(res, 200, {
      ok: true,
      challenge_id: challenge.id,
      channel: identity.channel,
      value: identity.value,
      expires_in_seconds: 300,
      dev_otp: env.otpDevMode ? otp : undefined,
      delivery,
      message: `Verification OTP dispatched to ${identity.value}`
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
    const isDevMatch = env.otpDevMode && (String(body.otp) === "123456" || String(body.otp) === String(challenge.raw_otp_dev));
    if ((challenge.otp_hash !== hash && !isDevMatch) || challenge.attempts > 10) {
      await writeDb(db);
      return send(res, 400, { error: "Invalid OTP" });
    }
    challenge.consumed = true;
    const existing = (db.users || []).find((u) => u.email === challenge.value || u.phone === challenge.value);
    const requestedRole = String(body.role || "").toLowerCase();
    const userRole = requestedRole === "admin" || requestedRole === "shop" ? requestedRole : "user";
    const user = existing || {
      id: `usr-${Date.now()}`,
      name: String(body.name || "").trim() || (challenge.channel === "email" ? challenge.value.split("@")[0] : challenge.value),
      email: challenge.channel === "email" ? challenge.value : "",
      phone: challenge.channel === "phone" ? challenge.value : "",
      role: userRole,
      created_at: new Date().toISOString()
    };
    if (String(challenge.value || "").toLowerCase() === "admin@mallmaze.in") user.role = "admin";
    if (!existing) db.users = [user, ...(db.users || [])];
    else {
      if (userRole && userRole !== "user") existing.role = userRole;
      if (String(challenge.value || "").toLowerCase() === "admin@mallmaze.in") existing.role = "admin";
      if (body.name) existing.name = String(body.name).trim();
      Object.assign(user, existing);
    }
    await writeDb(db);
    send(res, 200, { ok: true, token: tokenFor(user), user: publicUser(user) });
  },
  "POST /api/auth/demo-login": async (req, res) => {
    const body = await readBody(req);
    const role = String(body.role || "customer").toLowerCase();
    const db = await readDb();
    let demoUser = null;
    if (role === "admin") {
      demoUser = { id: "usr-demo-admin", name: "Platform Admin", email: "admin@mallmaze.in", phone: "+91 99999 00000", role: "admin", created_at: new Date().toISOString() };
    } else if (role === "shop" || role === "store" || role === "merchant") {
      demoUser = { id: "usr-demo-shop", name: "Luxe Store Partner", email: "store.luxe@mallmaze.in", phone: "+91 98888 11111", role: "shop", created_at: new Date().toISOString() };
    } else {
      demoUser = { id: "usr-demo-customer", name: "Demo Shopper", email: "shopper@mallmaze.in", phone: "+91 97777 22222", role: "user", created_at: new Date().toISOString() };
    }
    const existing = (db.users || []).find((u) => u.id === demoUser.id || u.email === demoUser.email);
    if (!existing) {
      db.users = [demoUser, ...(db.users || [])];
    } else {
      demoUser = { ...existing, role: demoUser.role };
    }
    await writeDb(db);
    send(res, 200, { ok: true, token: tokenFor(demoUser), user: publicUser(demoUser) });
  },
  "POST /api/rag/search": async (req, res) => {
    const body = await readBody(req);
    const query = String(body.query || "").trim();
    const city = String(body.city || "").trim();
    const category = String(body.category || "").trim();
    const maxPrice = Number(body.max_price || body.maxPrice || 0);

    const db = await readDb();
    let allProducts = Array.isArray(db.products) ? [...db.products] : [];

    try {
      const mockRaw = readJson(MOCK_DATA_FILE, { products: [] });
      if (Array.isArray(mockRaw.products)) {
        for (const p of mockRaw.products) {
          if (!allProducts.some((x) => String(x.id) === String(p.id))) {
            allProducts.push(p);
          }
        }
      }
    } catch {}

    const lowerQ = query.toLowerCase();
    const tokens = lowerQ.split(/\s+/).filter((t) => t.length > 1);
    const budgetMatch = query.match(/(?:under|below|less than|within|\bmax\b|rs\.?|₹)?\s*(\d{3,6})/i);
    const parsedMaxPrice = maxPrice || (budgetMatch ? Number(budgetMatch[1]) : 0);

    // Conversational & Knowledge Engine Fallback
    let knowledgeText = "";
    if (lowerQ.includes("hi") || lowerQ.includes("hello") || lowerQ.includes("hey") || lowerQ.includes("who are you")) {
      knowledgeText = "Hello! I am **MallMaze Copilot**, powered by Gemini 3.6 Flash RAG intelligence. I can help you search local products, compare prices across nearby malls, track orders, or answer store policies!";
    } else if (lowerQ.includes("deliver") || lowerQ.includes("shipping") || lowerQ.includes("sla") || lowerQ.includes("fast")) {
      knowledgeText = "MallMaze offers **Rapid Shelf 45-minute delivery** for verified in-stock items from local mall stores. Orders are picked from sealed bins, verified via QR code, and dispatched with live GPS tracking!";
    } else if (lowerQ.includes("return") || lowerQ.includes("refund") || lowerQ.includes("policy")) {
      knowledgeText = "Items can be returned or exchanged directly at the local store or requested via your **Orders / Support** tab. Refunds are processed within 24 hours of item verification.";
    } else if (lowerQ.includes("scan") || lowerQ.includes("receipt") || lowerQ.includes("scan&go")) {
      knowledgeText = "With **Scan&Go**, you can scan item barcodes inside participating stores using your phone, pay digitally via UPI/Razorpay, and walk out with verified digital receipts!";
    } else if (lowerQ.includes("register") || lowerQ.includes("seller") || lowerQ.includes("merchant") || lowerQ.includes("partner")) {
      knowledgeText = "Local shop owners can register their store on MallMaze via the **Register Store** page (`register-store.html`). Once verified, you get automated catalog sync and Rapid Shelf logistics.";
    }

    const scored = allProducts.map((p) => {
      let score = 0;
      const text = `${p.name || ""} ${p.category || ""} ${p.category_name || ""} ${p.storeName || ""} ${p.description || ""} ${p.color || ""} ${p.size || ""} ${p.tags ? p.tags.join(" ") : ""}`.toLowerCase();

      for (const token of tokens) {
        if (text.includes(token)) score += 10;
        if ((p.name || "").toLowerCase().includes(token)) score += 15;
      }

      const pPrice = Math.round(Number(p.price || p.price_inr || (p.price_paise ? p.price_paise / 100 : 0)));
      if (parsedMaxPrice > 0) {
        if (pPrice <= parsedMaxPrice) score += 20;
        else score -= 30;
      }

      if (category && (p.category || "").toLowerCase().includes(category.toLowerCase())) {
        score += 25;
      }

      if (city && (p.city || "").toLowerCase().includes(city.toLowerCase())) {
        score += 15;
      }

      if (p.inStock !== false && (p.stockCount == null || p.stockCount > 0)) {
        score += 5;
      }

      return { product: p, score, priceInr: pPrice };
    });

    const filtered = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 15);
    const results = filtered.map((f) => ({
      ...f.product,
      match_score: f.score,
      badge: f.score >= 35 ? "Best RAG Match" : f.product.badge || ""
    }));

    let answer = knowledgeText;
    if (results.length > 0) {
      const summary = `Found **${results.length} verified products** matching "${query}"${parsedMaxPrice ? ` under **Rs ${parsedMaxPrice.toLocaleString('en-IN')}**` : ''} in nearby local stores.`;
      answer = knowledgeText ? `${knowledgeText}\n\n${summary}` : summary;
    } else if (!knowledgeText) {
      answer = `I checked local stores near ${city || 'your area'}, but couldn't find exact matches for "${query}". Try searching for categories like **Fashion**, **Electronics**, or **Shoes**.`;
    }

    send(res, 200, {
      ok: true,
      query,
      answer,
      intent: {
        tokens,
        max_price: parsedMaxPrice || null,
        category: category || null,
        results_count: results.length
      },
      suggestions: [
        "👔 Blue blazer under 5000",
        "👟 Running shoes in stock",
        "🎧 Noise canceling headphones",
        "⚡ Rapid 45-min delivery items"
      ],
      results
    });
  },
  "GET /api/rag/search": async (req, res, parsed) => {
    const query = String(parsed.searchParams.get("query") || parsed.searchParams.get("q") || "").trim();
    const maxPrice = Number(parsed.searchParams.get("max_price") || 0);
    const category = String(parsed.searchParams.get("category") || "").trim();
    const city = String(parsed.searchParams.get("city") || "").trim();

    const db = await readDb();
    let allProducts = Array.isArray(db.products) ? [...db.products] : [];
    try {
      const mockRaw = readJson(MOCK_DATA_FILE, { products: [] });
      if (Array.isArray(mockRaw.products)) {
        for (const p of mockRaw.products) {
          if (!allProducts.some((x) => String(x.id) === String(p.id))) allProducts.push(p);
        }
      }
    } catch {}

    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const budgetMatch = query.match(/(?:under|below|less than|within|\bmax\b|rs\.?|₹)?\s*(\d{3,6})/i);
    const parsedMaxPrice = maxPrice || (budgetMatch ? Number(budgetMatch[1]) : 0);

    const scored = allProducts.map((p) => {
      let score = 0;
      const text = `${p.name || ""} ${p.category || ""} ${p.storeName || ""} ${p.description || ""} ${p.color || ""}`.toLowerCase();
      for (const token of tokens) {
        if (text.includes(token)) score += 10;
        if ((p.name || "").toLowerCase().includes(token)) score += 15;
      }
      const pPrice = Math.round(Number(p.price || p.price_inr || (p.price_paise ? p.price_paise / 100 : 0)));
      if (parsedMaxPrice > 0) {
        if (pPrice <= parsedMaxPrice) score += 20;
        else score -= 30;
      }
      return { product: p, score, priceInr: pPrice };
    });

    const filtered = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 15);
    const results = filtered.map((f) => ({ ...f.product, match_score: f.score }));
    send(res, 200, { ok: true, query, results, answer: `Found ${results.length} products.` });
  },
  "GET /api/delivery/track": async (req, res, parsed) => {
    const orderId = String(parsed.searchParams.get("order_id") || parsed.searchParams.get("id") || "");
    const db = await readDb();
    const order = (db.orders || []).find((o) => String(o.id) === orderId);
    const job = (db.delivery_jobs || []).find((j) => String(j.order_id) === orderId);

    const tracking = {
      order_id: orderId || "ORD-LIVE-1024",
      status: job?.status || order?.status || "out_for_delivery",
      step_index: job?.status === "delivered" ? 4 : 3,
      timeline: [
        { title: "Order Placed", description: "Order confirmed by customer", time: "10:15 AM", done: true },
        { title: "Store Picked & Packed", description: "Items verified & sealed in Rapid Shelf", time: "10:25 AM", done: true },
        { title: "Courier Handoff", description: "Package handed to delivery partner", time: "10:35 AM", done: true },
        { title: "Out for Delivery", description: "Driver en route to customer location", time: "10:45 AM", done: job?.status === "delivered", current: job?.status !== "delivered" },
        { title: "Delivered", description: "Package handed over with OTP verification", time: "Est. 11:15 AM", done: job?.status === "delivered", current: job?.status === "delivered" }
      ],
      courier: {
        name: job?.provider || "MallMaze Express Delivery",
        driver_name: "Ramesh K.",
        driver_phone: "+91 98765 43210",
        vehicle: "EV Scooter (TS 09 EQ 4812)",
        estimated_minutes: job?.estimated_minutes || 18,
        rating: 4.9
      }
    };
    send(res, 200, { ok: true, tracking });
  },
  "GET /api/db/export": async (req, res) => {
    const db = await readDb();
    const mode = usePostgres() ? "postgresql" : "local_json_db";
    send(res, 200, {
      ok: true,
      database_mode: mode,
      db_file: DATA_FILE,
      stats: {
        users: (db.users || []).length,
        stores: (db.stores || []).length,
        products: (db.products || []).length,
        malls: (db.malls || []).length,
        cities: (db.cities || []).length,
        orders: (db.orders || []).length,
        otp_challenges: (db.otp_challenges || []).length
      },
      data: db
    });
  },
  "GET /api/catalog/all": async (req, res, parsed) => {
    const db = await readDb();
    const city = String(parsed.searchParams.get("city") || "").toLowerCase();
    const category = String(parsed.searchParams.get("category") || "").toLowerCase();

    let products = Array.isArray(db.products) ? [...db.products] : [];
    if (city) products = products.filter((p) => String(p.city || "").toLowerCase().includes(city));
    if (category) products = products.filter((p) => String(p.category || "").toLowerCase().includes(category));

    send(res, 200, {
      ok: true,
      count: products.length,
      products,
      stores: db.stores || [],
      malls: db.malls || [],
      cities: db.cities || []
    });
  },
  "GET /api/stores/all": async (req, res) => {
    const db = await readDb();
    send(res, 200, {
      ok: true,
      count: (db.stores || []).length,
      stores: (db.stores || []).map(publicStore)
    });
  },
  "GET /api/locations/all": async (req, res) => {
    const db = await readDb();
    send(res, 200, {
      ok: true,
      cities: db.cities || ["Bangalore", "Mumbai", "Delhi NCR", "Hyderabad", "Chennai"],
      malls: db.malls || []
    });
  },
  "POST /api/products/manage": async (req, res) => {
    const db = await readDb();
    const body = await readBody(req);
    if (!body.name || !body.store_id) {
      return send(res, 400, { error: "Product name and store_id are required" });
    }
    const priceInr = Math.round(Number(body.price_inr || body.price || 0));
    const pricePaise = body.price_paise ? Number(body.price_paise) : priceInr * 100;
    const product = {
      id: body.id || `p-${Date.now()}`,
      name: String(body.name).trim(),
      category: String(body.category || "General").trim(),
      price_inr: priceInr,
      price_paise: pricePaise,
      mrp_paise: Number(body.mrp_paise || pricePaise * 1.3),
      stock_qty: Math.max(0, Number(body.stock_qty || body.stock || 10)),
      barcode: String(body.barcode || `890${Date.now().toString().slice(-9)}`),
      store_id: String(body.store_id),
      store_name: String(body.store_name || "Local Store"),
      mall_name: String(body.mall_name || "Local Mall"),
      city: String(body.city || "Bangalore"),
      trust_tier: String(body.trust_tier || "rapid"),
      image_url: String((Array.isArray(body.images) && body.images[0]) || body.image_url || "assets/media/hero-mall.jpg"),
      images: Array.isArray(body.images) ? body.images : (body.image_url ? [body.image_url] : []),
      description: String(body.description || ""),
      rating: Number(body.rating || 4.8),
      is_active: body.is_active !== false,
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.products = upsertById(db.products, product);
    await writeDb(db);
    send(res, 200, { ok: true, product });
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
    const holdHours = Number(env.payoutHoldHours || 0);
    const holdUntil = holdHours > 0 ? Math.floor(Date.now() / 1000) + holdHours * 3600 : 0;
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
    const auth = authUser(req, db);
    if (!env.otpDevMode && auth && auth.role !== "admin") {
      return send(res, 403, { error: "Admin access required" });
    }
    const payouts = (db.store_payouts || []).map((p) => {
      const store = (db.stores || []).find((s) => String(s.id) === String(p.store_id));
      return {
        ...p,
        store_name: store?.name || p.store_name || p.store_id,
        gross_inr: p.gross_inr ?? Math.round(Number(p.gross_paise || 0) / 100),
        commission_inr: p.commission_inr ?? Math.round(Number(p.commission_paise || 0) / 100),
        net_inr: p.net_inr ?? Math.round(Number(p.net_payable_paise || 0) / 100),
        account_number_masked: p.account_number_masked || store?.bank?.account_number_masked || "XXXX-XXXX-4921",
        bank_name: p.bank_name || store?.bank?.bank_name || "HDFC Bank Ltd",
        ifsc_code: p.ifsc_code || store?.bank?.ifsc_code || "HDFC0000128",
        beneficiary_name: p.beneficiary_name || store?.bank?.beneficiary_name || store?.owner_name || "Store Partner"
      };
    });
    const summary = payouts.reduce((acc, p) => {
      acc.total_gross_paise += Number(p.gross_paise || 0);
      acc.total_commission_paise += Number(p.commission_paise || 0);
      acc.total_net_paise += Number(p.net_payable_paise || 0);
      if (p.status === "settled") acc.settled_net_paise += Number(p.net_payable_paise || 0);
      return acc;
    }, { total_gross_paise: 0, total_commission_paise: 0, total_net_paise: 0, settled_net_paise: 0 });

    send(res, 200, {
      ok: true,
      payouts,
      summary: {
        total_gross_inr: Math.round(summary.total_gross_paise / 100),
        platform_fee_inr: Math.round(summary.total_commission_paise / 100),
        store_payouts_inr: Math.round(summary.total_net_paise / 100),
        settled_inr: Math.round(summary.settled_net_paise / 100),
        active_stores_count: (db.stores || []).length,
        instant_route_active: true,
        commission_rate_percent: Number(env.storeCommissionBps || 1000) / 100,
        settlement_mode: env.payoutHoldHours > 0 ? `T+${env.payoutHoldHours}h` : "T+0 Instant (< 1s)"
      }
    });
  },
  "POST /api/payments/simulate-instant-split": async (req, res) => {
    const body = await readBody(req);
    const amountInr = Math.max(1, Number(body.amount_inr || body.amount || 2999));
    const includeDelivery = body.include_delivery !== false;
    const deliveryFeeInr = includeDelivery ? Math.round(Number(env.deliveryFeePaise || 4900) / 100) : 0;
    const deliveryFeePaise = deliveryFeeInr * 100;
    const grossPaise = Math.round(amountInr * 100);
    const totalOrderPaise = grossPaise + deliveryFeePaise;
    const totalOrderInr = amountInr + deliveryFeeInr;
    const db = await readDb();
    const storeId = String(body.store_id || (db.stores && db.stores[0] ? db.stores[0].id : "s1"));
    const store = (db.stores || []).find((s) => String(s.id) === storeId) || db.stores?.[0] || {
      id: storeId,
      name: "Store Partner",
      payout_account_ref: `acc_route_${storeId}`
    };

    const commissionBps = Number(env.storeCommissionBps || 1000); // 10%
    const commissionPaise = Math.round((grossPaise * commissionBps) / 10000);
    const netPayablePaise = grossPaise - commissionPaise;
    const now = new Date().toISOString();
    const orderId = `ORD-INSTANT-${Date.now()}`;
    const storeTransferId = `trf_rzp_${Date.now()}`;
    const delTransferId = `trf_rzp_del_${Date.now()}`;

    const storePayout = {
      id: `payout-${Date.now()}-${store.id}`,
      recipient_type: "store",
      store_id: store.id,
      store_name: store.name,
      order_id: orderId,
      customer_id: "usr-shopper-live",
      customer_name: body.customer_name || "Rahul Verma",
      payment_mode: body.payment_mode || "UPI (Instant Auto-Route)",
      vpa: body.vpa || "rahulverma@okhdfcbank",
      rrn: String(Math.floor(100000000000 + Math.random() * 900000000000)),
      gross_paise: grossPaise,
      commission_paise: commissionPaise,
      net_payable_paise: netPayablePaise,
      gross_inr: Math.round(grossPaise / 100),
      commission_inr: Math.round(commissionPaise / 100),
      net_inr: Math.round(netPayablePaise / 100),
      status: "settled",
      is_instant: true,
      settlement_speed: "< 1 second (Auto-Route)",
      razorpay_transfer_id: storeTransferId,
      razorpay_account_id: store.payout_account_ref || `acc_route_${store.id}`,
      bank_name: store.bank?.bank_name || "Linked Commercial Bank",
      account_number_masked: store.bank?.account_number_masked || "XXXX-XXXX-4921",
      ifsc_code: store.bank?.ifsc_code || "HDFC0000128",
      beneficiary_name: store.bank?.beneficiary_name || store.owner_name || store.name,
      settled_at: now,
      created_at: now,
      updated_at: now
    };

    const newPayouts = [storePayout];

    // Also record Delivery Partner instant payout if delivery included
    if (deliveryFeePaise > 0) {
      const delPartner = (db.delivery_partners && db.delivery_partners[0]) || {
        name: "Rapid Express Fleet",
        payout_account_ref: "acc_route_delivery_fleet",
        bank: { bank_name: "Kotak Mahindra Bank", account_number_masked: "XXXX-XXXX-8831", ifsc_code: "KKBK0000214", beneficiary_name: "Rapid Express Logistics Pvt Ltd" }
      };
      newPayouts.push({
        id: `del-payout-${Date.now()}`,
        recipient_type: "delivery_partner",
        store_id: "delivery_partner",
        store_name: delPartner.name || "Rapid Express Fleet (Delivery Partner)",
        order_id: orderId,
        customer_id: "usr-shopper-live",
        customer_name: body.customer_name || "Rahul Verma",
        payment_mode: body.payment_mode || "UPI (Instant Auto-Route)",
        vpa: body.vpa || "rahulverma@okhdfcbank",
        rrn: String(Math.floor(100000000000 + Math.random() * 900000000000)),
        gross_paise: deliveryFeePaise,
        commission_paise: 0,
        net_payable_paise: deliveryFeePaise,
        gross_inr: deliveryFeeInr,
        commission_inr: 0,
        net_inr: deliveryFeeInr,
        status: "settled",
        is_instant: true,
        settlement_speed: "< 1 second (Auto-Route)",
        razorpay_transfer_id: delTransferId,
        razorpay_account_id: delPartner.payout_account_ref || "acc_route_delivery_fleet",
        bank_name: delPartner.bank?.bank_name || "Kotak Mahindra Bank",
        account_number_masked: delPartner.bank?.account_number_masked || "XXXX-XXXX-8831",
        ifsc_code: delPartner.bank?.ifsc_code || "KKBK0000214",
        beneficiary_name: delPartner.bank?.beneficiary_name || "Rapid Express Logistics Pvt Ltd",
        settled_at: now,
        created_at: now,
        updated_at: now
      });
    }

    db.store_payouts = [...newPayouts, ...(db.store_payouts || [])];

    const simOrder = {
      id: orderId,
      customer_id: "usr-shopper-live",
      customer_name: body.customer_name || "Rahul Verma",
      order_type: "delivery",
      status: "paid",
      payment_status: "paid",
      payment_method: body.payment_mode || "Razorpay UPI",
      razorpay_order_id: `order_sim_${Date.now()}`,
      razorpay_payment_id: `pay_sim_${Date.now()}`,
      totals: {
        subtotalPaise: grossPaise,
        platformFeePaise: commissionPaise,
        deliveryFeePaise: deliveryFeePaise,
        taxPaise: 0,
        totalPaise: totalOrderPaise
      },
      payout_splits: [{
        store_id: store.id,
        gross_paise: grossPaise,
        commission_paise: commissionPaise,
        net_payable_paise: netPayablePaise
      }],
      delivery_payout: deliveryFeePaise > 0 ? {
        account: "acc_route_delivery_fleet",
        amount_inr: deliveryFeeInr
      } : null,
      items: [{
        store_id: store.id,
        store_name: store.name,
        name: body.item_name || "Store Item Purchase",
        qty: 1,
        line_total_paise: grossPaise
      }],
      created_at: now,
      paid_at: now
    };
    db.orders = [simOrder, ...(db.orders || [])];

    await writeDb(db);
    send(res, 200, {
      ok: true,
      message: "Customer payment captured: Platform fee retained, store net payout transferred, and delivery fee routed to delivery partner in < 1 second",
      order_id: orderId,
      split: {
        total_customer_paid_inr: totalOrderInr,
        item_subtotal_inr: Math.round(grossPaise / 100),
        platform_fee_inr: Math.round(commissionPaise / 100),
        platform_fee_percent: commissionBps / 100,
        store_payout_inr: Math.round(netPayablePaise / 100),
        store_name: store.name,
        delivery_fee_inr: deliveryFeeInr,
        delivery_partner: "Rapid Express Hyperlocal Fleet",
        route_status: "3-Way Instant Auto-Split Settled (< 1s)"
      },
      store_payout: storePayout,
      delivery_payout: newPayouts[1] || null
    });
    return;
  },
  "POST /api/images/process": async (req, res) => {
    const body = await readBody(req);
    const dataUrl = body.data_url || body.dataUrl;
    if (!dataUrl) return send(res, 400, { error: "data_url is required" });
    try {
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return send(res, 400, { error: "Invalid image data" });
      const processed = await defaultImageService.processProductImage(parsed.buffer, {
        removeBg: Boolean(body.remove_bg || body.removeBg),
        enhance: Boolean(body.enhance),
        backdrop: body.backdrop || "white"
      });
      const processedDataUrl = `data:${processed.mime};base64,${processed.buffer.toString("base64")}`;
      send(res, 200, {
        ok: true,
        data_url: processedDataUrl,
        mime: processed.mime,
        provider: processed.provider,
        status: processed.status
      });
    } catch (error) {
      send(res, 400, { error: error.message || "Processing failed" });
    }
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
        originalDataUrl: body.original_data_url || body.originalDataUrl || null,
        storeId,
        productId: body.product_id || body.productId || "",
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
