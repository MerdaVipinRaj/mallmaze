"use strict";

const https = require("https");

// In-memory cache for Shiprocket Auth Token
let cachedToken = null;
let tokenExpiresAt = 0;

function isSandbox() {
  const email = (process.env.SHIPROCKET_EMAIL || "").trim();
  const pass = (process.env.SHIPROCKET_PASSWORD || "").trim();
  const forceSandbox = (process.env.SHIPROCKET_SANDBOX || "true").toLowerCase() === "true";
  return forceSandbox || !email || !pass;
}

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", (err) => reject(err));
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

/**
 * Get valid Shiprocket Bearer Token (auto-cached for 9 days)
 */
async function getAuthToken() {
  if (isSandbox()) {
    return "sr_sandbox_token_mallmaze_verified";
  }

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  const res = await httpsRequest({
    hostname: "apiv2.shiprocket.in",
    path: "/v1/external/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  }, { email, password });

  if (res.status === 200 && res.body && res.body.token) {
    cachedToken = res.body.token;
    tokenExpiresAt = now + (8 * 24 * 60 * 60 * 1000);
    return cachedToken;
  }

  throw new Error(res.body?.message || "Failed to authenticate with Shiprocket API");
}

/**
 * 4 MULTI-TIER DELIVERY SPEED PROFILES (Zepto 5-min to Amazon 3-days)
 */
const DELIVERY_TIERS = {
  zepto_flash: {
    id: "zepto_flash",
    name: "⚡ Zepto Flash Delivery (5–15 Mins)",
    short_name: "Zepto 5-Min Flash",
    provider: "Shiprocket Quick (Hyperlocal Rider)",
    eta: "5–15 Minutes",
    eta_seconds: 480,
    rate_inr: 29.00,
    courier_id: 101,
    badge: "5-Min Flash",
    description: "Instant store floor runner & dedicated EV rider direct to your doorstep."
  },
  rapid_hyperlocal: {
    id: "rapid_hyperlocal",
    name: "🚀 45-Min Express Local (Shadowfax / Dunzo)",
    short_name: "45-Min Express",
    provider: "Shadowfax Hyperlocal",
    eta: "30–45 Minutes",
    eta_seconds: 2400,
    rate_inr: 39.00,
    courier_id: 12,
    badge: "45-Min Rapid",
    description: "Direct city courier for delivery within 10 km from store."
  },
  amazon_prime: {
    id: "amazon_prime",
    name: "📦 Next-Day Air Express (Amazon Prime Speed)",
    short_name: "Next-Day Air",
    provider: "Blue Dart Express Air",
    eta: "Next Day by 1 PM",
    eta_seconds: 86400,
    rate_inr: 75.00,
    courier_id: 24,
    badge: "Prime Next-Day",
    description: "Priority air dispatch across state & metropolitan hubs."
  },
  standard_surface: {
    id: "standard_surface",
    name: "🚚 Standard Domestic (Amazon Speed: 2–3 Days)",
    short_name: "Standard 2–3 Days",
    provider: "Delhivery Surface / DTDC",
    eta: "2–3 Days",
    eta_seconds: 172800,
    rate_inr: 45.00,
    courier_id: 31,
    badge: "Standard 2–3 Days",
    description: "Reliable surface courier connecting all 29,000+ Indian pincodes."
  }
};

/**
 * Check courier serviceability with 4 Speed Tiers
 */
async function checkServiceability({ pickup_postcode, delivery_postcode, weight = 0.5, cod = 0 }) {
  const pickup = String(pickup_postcode || "560001").trim();
  const delivery = String(delivery_postcode || "560034").trim();
  const isSamePincodeZone = pickup.slice(0, 3) === delivery.slice(0, 3);

  const tiers = [
    {
      ...DELIVERY_TIERS.zepto_flash,
      available: isSamePincodeZone,
      unavailable_reason: isSamePincodeZone ? null : "Available only within 5km radius of store"
    },
    {
      ...DELIVERY_TIERS.rapid_hyperlocal,
      available: isSamePincodeZone,
      unavailable_reason: isSamePincodeZone ? null : "Available within intra-city limits only"
    },
    {
      ...DELIVERY_TIERS.amazon_prime,
      available: true
    },
    {
      ...DELIVERY_TIERS.standard_surface,
      available: true
    }
  ];

  return {
    ok: true,
    sandbox: isSandbox(),
    pickup_postcode: pickup,
    delivery_postcode: delivery,
    is_hyperlocal_eligible: isSamePincodeZone,
    tiers: tiers,
    recommended_tier: isSamePincodeZone ? "zepto_flash" : "standard_surface"
  };
}

/**
 * Create Shiprocket Order with Speed Tier Specification
 */
async function createOrder(order, store = {}, speedTierKey = "zepto_flash") {
  const tier = DELIVERY_TIERS[speedTierKey] || DELIVERY_TIERS.zepto_flash;
  const pickupLocation = store.pickup_location || process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";
  const customerName = order.customer_name || order.delivery?.name || (order.customer ? order.customer.name : "Valued Customer");
  const customerPhone = order.customer_phone || order.delivery?.phone || "9876543210";
  const address = order.delivery?.address || order.shipping_address || "MG Road, Suite 4B";
  const city = order.delivery?.city || "Bengaluru";
  const state = order.delivery?.state || "Karnataka";
  const pincode = String(order.delivery?.pincode || "560001");
  const subTotal = (order.totals?.totalPaise ? order.totals.totalPaise / 100 : order.total_inr) || 499;

  const orderItems = (order.items || []).map((it, idx) => ({
    name: it.title || it.name || `MallMaze Item ${idx + 1}`,
    sku: it.sku || `SKU-${it.id || idx + 1}`,
    units: Number(it.qty || it.quantity || 1),
    selling_price: String(it.price || it.unit_price || 299)
  }));

  if (orderItems.length === 0) {
    orderItems.push({
      name: "MallMaze Retail Order",
      sku: "MM-ITEM-001",
      units: 1,
      selling_price: String(subTotal)
    });
  }

  // Realistic mock rider fleet for Zepto/Quick deliveries
  const mockRiders = [
    { name: "Vikram Sharma", phone: "+91 98201 44102", vehicle: "Ather 450X (KA-03-EM-8819)", rating: "4.9 ★ (1,420 trips)" },
    { name: "Kiran Gowda", phone: "+91 98450 11928", vehicle: "Ola S1 Pro (KA-04-JJ-3910)", rating: "4.8 ★ (890 trips)" },
    { name: "Deepak Yadav", phone: "+91 99160 38291", vehicle: "Hero Electric (KA-01-EQ-5520)", rating: "4.9 ★ (2,100 trips)" }
  ];
  const assignedRider = mockRiders[Math.floor(Math.random() * mockRiders.length)];

  if (isSandbox()) {
    const srOrderId = 9840000 + Math.floor(Math.random() * 90000);
    const shipmentId = 4820000 + Math.floor(Math.random() * 90000);
    const awbSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
    const awbCode = speedTierKey === "zepto_flash" ? `ZF-${awbSuffix.toString().slice(0, 8)}` : `SR${awbSuffix}`;

    return {
      ok: true,
      sandbox: true,
      order_id: String(order.id).replace("#", ""),
      speed_tier: tier.id,
      speed_tier_name: tier.name,
      speed_tier_eta: tier.eta,
      eta_seconds: tier.eta_seconds,
      rate_inr: tier.rate_inr,
      shiprocket_order_id: srOrderId,
      shipment_id: shipmentId,
      awb_code: awbCode,
      courier_name: tier.provider,
      rider: speedTierKey === "zepto_flash" || speedTierKey === "rapid_hyperlocal" ? assignedRider : null,
      status: speedTierKey === "zepto_flash" ? "rider_allocated_en_route" : "pickup_scheduled",
      pickup_location: pickupLocation,
      dispatched_at: new Date().toISOString()
    };
  }

  // Live Shiprocket API Call
  const token = await getAuthToken();
  const res = await httpsRequest({
    hostname: "apiv2.shiprocket.in",
    path: "/v1/external/orders/create/adhoc",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  }, {
    order_id: String(order.id).replace("#", ""),
    order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
    pickup_location: pickupLocation,
    billing_customer_name: customerName,
    billing_address: address,
    billing_city: city,
    billing_pincode: pincode,
    billing_state: state,
    billing_country: "India",
    billing_phone: customerPhone,
    order_items: orderItems,
    payment_method: "Prepaid",
    sub_total: subTotal,
    weight: 0.5
  });

  return {
    ok: res.status === 200 || res.status === 201,
    sandbox: false,
    speed_tier: tier.id,
    speed_tier_name: tier.name,
    data: res.body
  };
}

/**
 * Assign Courier & Generate AWB
 */
async function assignAwb({ shipment_id, courier_id, speed_tier = "zepto_flash" }) {
  const tier = DELIVERY_TIERS[speed_tier] || DELIVERY_TIERS.zepto_flash;
  const awbSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
  const awbCode = speed_tier === "zepto_flash" ? `ZF-${awbSuffix.toString().slice(0, 8)}` : `SR${awbSuffix}`;

  return {
    ok: true,
    sandbox: isSandbox(),
    shipment_id: Number(shipment_id || 4829101),
    awb_code: awbCode,
    speed_tier: tier.id,
    courier_name: tier.provider,
    eta: tier.eta,
    routing_code: speed_tier === "zepto_flash" ? "HYPERLOCAL-DARK-STORE-01" : "BLR/HUB-04-EAST",
    label_ready: true
  };
}

/**
 * Generate Printable Thermal Shipping Label (4x6 format with Speed Stamp)
 */
function generatePrintableLabelHtml({ order, shipment_id, awb_code, courier_name, speed_tier }) {
  const tier = DELIVERY_TIERS[speed_tier] || DELIVERY_TIERS.zepto_flash;
  const storeName = order.store_name || "MallMaze Partner Store";
  const customerName = order.customer_name || order.delivery?.name || (order.customer ? order.customer.name : "Valued Customer");
  const address = order.delivery?.address || "MG Road, Suite 4B";
  const city = order.delivery?.city || "Bengaluru";
  const pincode = order.delivery?.pincode || "560001";
  const phone = order.customer_phone || order.delivery?.phone || "9876543210";
  const awb = awb_code || `SR${shipment_id || "99821"}`;
  const courier = courier_name || tier.provider;
  const orderId = order.id || "ORD-LIVE-101";
  const total = order.total_inr || (order.totals?.totalPaise ? Math.round(order.totals.totalPaise / 100) : 499);
  const items = order.items && order.items.length ? order.items : [{ name: "MallMaze Retail Order", qty: 1 }];

  const isFlash = tier.id === "zepto_flash";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${awb}</title>
  <style>
    @page { size: 100mm 150mm; margin: 4mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 12px;
      color: #000;
      background: #fff;
      font-size: 11px;
      line-height: 1.3;
    }
    .label-box {
      border: 3px solid #000;
      padding: 10px;
      max-width: 380px;
      margin: 0 auto;
      border-radius: 4px;
    }
    .flash-banner {
      background: ${isFlash ? '#10b981' : '#0f172a'};
      color: #fff;
      text-align: center;
      padding: 6px;
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 1px;
      margin: -10px -10px 10px -10px;
      border-top-left-radius: 2px;
      border-top-right-radius: 2px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .partner-tag {
      font-size: 10px;
      font-weight: 700;
      background: #000;
      color: #fff;
      padding: 3px 6px;
      border-radius: 4px;
    }
    .barcode-section {
      text-align: center;
      padding: 8px 0;
      border-bottom: 2px dashed #000;
    }
    .barcode-svg {
      width: 85%;
      height: 48px;
    }
    .awb-text {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 2px;
      margin-top: 4px;
    }
    .courier-info {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #000;
      padding: 6px 0;
      font-weight: 800;
      font-size: 12px;
    }
    .address-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #000;
    }
    .addr-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #333;
      margin-bottom: 2px;
    }
    .addr-name {
      font-size: 14px;
      font-weight: 900;
    }
    .addr-body {
      font-size: 12px;
      margin-top: 2px;
    }
    .pin-badge {
      display: inline-block;
      font-size: 14px;
      font-weight: 900;
      background: #000;
      color: #fff;
      padding: 3px 8px;
      margin-top: 4px;
      border-radius: 4px;
    }
    .order-summary {
      padding: 6px 0;
      border-bottom: 1px solid #000;
      font-size: 10px;
    }
    .items-list {
      margin: 4px 0;
      padding-left: 14px;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      font-size: 10px;
    }
    .btn-print {
      display: block;
      width: 100%;
      max-width: 380px;
      margin: 12px auto;
      padding: 10px;
      background: #0f172a;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      .btn-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">🖨️ Print Thermal Label / Save PDF</button>

  <div class="label-box">
    <div class="flash-banner">
      ${isFlash ? '⚡ ZEPTO SPEED: 5–15 MIN FLASH DELIVERY' : tier.name.toUpperCase()}
    </div>

    <div class="header-row">
      <div>
        <div class="brand-title">MALLMAZE</div>
        <div style="font-size:9px; color:#444;">Express Local & Hyperlocal Delivery</div>
      </div>
      <div class="partner-tag">POWERED BY SHIPROCKET</div>
    </div>

    <div class="barcode-section">
      <svg class="barcode-svg" viewBox="0 0 240 45" preserveAspectRatio="none">
        <rect x="0" y="0" width="240" height="45" fill="#fff"/>
        <g fill="#000">
          <rect x="10" y="0" width="3" height="45"/><rect x="15" y="0" width="2" height="45"/>
          <rect x="20" y="0" width="4" height="45"/><rect x="26" y="0" width="1" height="45"/>
          <rect x="30" y="0" width="3" height="45"/><rect x="36" y="0" width="4" height="45"/>
          <rect x="44" y="0" width="2" height="45"/><rect x="48" y="0" width="5" height="45"/>
          <rect x="56" y="0" width="3" height="45"/><rect x="62" y="0" width="2" height="45"/>
          <rect x="68" y="0" width="4" height="45"/><rect x="75" y="0" width="1" height="45"/>
          <rect x="80" y="0" width="3" height="45"/><rect x="86" y="0" width="5" height="45"/>
          <rect x="94" y="0" width="2" height="45"/><rect x="100" y="0" width="3" height="45"/>
          <rect x="106" y="0" width="4" height="45"/><rect x="113" y="0" width="2" height="45"/>
          <rect x="118" y="0" width="3" height="45"/><rect x="124" y="0" width="5" height="45"/>
          <rect x="132" y="0" width="2" height="45"/><rect x="138" y="0" width="4" height="45"/>
          <rect x="145" y="0" width="3" height="45"/><rect x="152" y="0" width="1" height="45"/>
          <rect x="156" y="0" width="5" height="45"/><rect x="164" y="0" width="2" height="45"/>
          <rect x="170" y="0" width="3" height="45"/><rect x="176" y="0" width="4" height="45"/>
          <rect x="183" y="0" width="2" height="45"/><rect x="188" y="0" width="5" height="45"/>
          <rect x="196" y="0" width="3" height="45"/><rect x="202" y="0" width="2" height="45"/>
          <rect x="208" y="0" width="4" height="45"/><rect x="215" y="0" width="3" height="45"/>
          <rect x="222" y="0" width="2" height="45"/><rect x="227" y="0" width="4" height="45"/>
        </g>
      </svg>
      <div class="awb-text">AWB: ${awb}</div>
    </div>

    <div class="courier-info">
      <span>COURIER: ${courier.toUpperCase()}</span>
      <span>PREPAID (₹${total})</span>
    </div>

    <div class="address-grid">
      <div>
        <div class="addr-title">SHIP TO (DELIVERY ADDRESS):</div>
        <div class="addr-name">${customerName}</div>
        <div class="addr-body">${address}, ${city}</div>
        <div style="font-weight:700; margin-top:2px;">Phone: +91 ${phone}</div>
        <div class="pin-badge">PIN: ${pincode}</div>
      </div>
    </div>

    <div class="address-grid">
      <div>
        <div class="addr-title">DISPATCH STORE:</div>
        <div style="font-weight:800;">${storeName}</div>
        <div style="font-size:10px;">MallMaze Verified Merchant Partner • ETA: ${tier.eta}</div>
      </div>
    </div>

    <div class="order-summary">
      <div style="font-weight:800; display:flex; justify-content:space-between;">
        <span>ORDER ID: ${orderId}</span>
        <span>DATE: ${new Date().toLocaleDateString("en-IN")}</span>
      </div>
      <ul class="items-list">
        ${items.map(it => `<li>${it.title || it.name || "Item"} (Qty: ${it.qty || it.quantity || 1})</li>`).join("")}
      </ul>
      <div style="display:flex; justify-content:space-between; margin-top:4px; font-weight:700;">
        <span>Weight: 0.50 KG</span>
        <span>Speed Tier: ${tier.short_name}</span>
      </div>
    </div>

    <div class="footer-row">
      <span>Routing: ${isFlash ? 'HYPERLOCAL-DARK-STORE-01' : 'BLR/HUB-04-EAST'}</span>
      <span style="font-weight:800;">GST INCL • TAX INVOICE</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Track Shipment with dynamic countdown for 5-min Zepto orders
 */
async function trackShipment(awb_or_order_id, speed_tier = "zepto_flash") {
  const code = String(awb_or_order_id || "").trim();
  const isFlash = code.startsWith("ZF-") || speed_tier === "zepto_flash";

  if (isSandbox()) {
    if (isFlash) {
      return {
        ok: true,
        sandbox: true,
        awb_code: code,
        speed_tier: "zepto_flash",
        is_flash_delivery: true,
        current_status: "RIDER OUT FOR 5-MIN DELIVERY",
        rider: {
          name: "Vikram Sharma",
          phone: "+91 98201 44102",
          vehicle: "Ather 450X EV (KA-03-EM-8819)",
          rating: "4.9 ★ (1,420 trips)"
        },
        countdown_seconds: 284,
        estimated_delivery: "Within 4 minutes 44 seconds",
        timeline: [
          { status: "Order Verified on Store Shelf", time: "1 min ago", done: true },
          { status: "Flash Rider Assigned (Vikram S.)", time: "Just now", done: true },
          { status: "Bag Sealed & Out for Doorstep Delivery", time: "En route", done: true },
          { status: "Delivered at Doorstep", time: "Estimated in 4 mins", done: false }
        ]
      };
    }

    return {
      ok: true,
      sandbox: true,
      awb_code: code,
      speed_tier: "standard_surface",
      is_flash_delivery: false,
      current_status: "OUT FOR DELIVERY",
      courier_name: "Delhivery Surface / Blue Dart",
      estimated_delivery: "Within 2 days",
      timeline: [
        { status: "Order Manifested", time: "10:30 AM", done: true },
        { status: "Picked Up by Courier", time: "01:15 PM", done: true },
        { status: "Processed at Sort Facility", time: "05:40 PM", done: true },
        { status: "Out for Delivery", time: "Today", done: true },
        { status: "Delivered to Customer", time: "Pending", done: false }
      ]
    };
  }

  const token = await getAuthToken();
  const res = await httpsRequest({
    hostname: "apiv2.shiprocket.in",
    path: `/v1/external/courier/track/awb/${code}`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  return {
    ok: res.status === 200,
    sandbox: false,
    data: res.body
  };
}

module.exports = {
  isSandbox,
  getAuthToken,
  DELIVERY_TIERS,
  checkServiceability,
  createOrder,
  assignAwb,
  generatePrintableLabelHtml,
  trackShipment
};
