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
    // Expire 1 day early to stay safe (8 days = 691200 seconds)
    tokenExpiresAt = now + (8 * 24 * 60 * 60 * 1000);
    return cachedToken;
  }

  throw new Error(res.body?.message || "Failed to authenticate with Shiprocket API");
}

/**
 * Check courier serviceability & estimated shipping costs
 */
async function checkServiceability({ pickup_postcode, delivery_postcode, weight = 0.5, cod = 0 }) {
  const pickup = String(pickup_postcode || "560001").trim();
  const delivery = String(delivery_postcode || "560034").trim();

  if (isSandbox()) {
    // Determine if hyperlocal (same first 3 pincode digits) or standard domestic
    const isSameCity = pickup.slice(0, 3) === delivery.slice(0, 3);
    return {
      ok: true,
      sandbox: true,
      pickup_postcode: pickup,
      delivery_postcode: delivery,
      is_hyperlocal: isSameCity,
      recommended_courier_id: isSameCity ? 12 : 24,
      available_couriers: [
        {
          courier_company_id: 12,
          courier_name: isSameCity ? "Shadowfax Hyperlocal" : "Delhivery Surface",
          min_weight: 0.5,
          freight_charge: isSameCity ? 38.00 : 44.00,
          cod_charges: 0.00,
          total_charge: isSameCity ? 38.00 : 44.00,
          estimated_delivery_days: isSameCity ? "45 Minutes" : "1-2 Days",
          rating: 4.8,
          mode: isSameCity ? "Hyperlocal Rider" : "Surface Express"
        },
        {
          courier_company_id: 24,
          courier_name: "Blue Dart Express Air",
          min_weight: 0.5,
          freight_charge: 76.00,
          cod_charges: 0.00,
          total_charge: 76.00,
          estimated_delivery_days: "Next Day",
          rating: 4.9,
          mode: "Air Express"
        },
        {
          courier_company_id: 31,
          courier_name: "DTDC Surface",
          min_weight: 0.5,
          freight_charge: 42.00,
          cod_charges: 0.00,
          total_charge: 42.00,
          estimated_delivery_days: "2-3 Days",
          rating: 4.5,
          mode: "Surface"
        }
      ]
    };
  }

  const token = await getAuthToken();
  const query = new URLSearchParams({
    pickup_postcode: pickup,
    delivery_postcode: delivery,
    weight: String(weight),
    cod: String(cod)
  });

  const res = await httpsRequest({
    hostname: "apiv2.shiprocket.in",
    path: `/v1/external/courier/serviceability/?${query.toString()}`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  return {
    ok: res.status === 200,
    sandbox: false,
    data: res.body?.data || res.body
  };
}

/**
 * Create Shiprocket Order / Shipment from MallMaze Order
 */
async function createOrder(order, store = {}) {
  const pickupLocation = store.pickup_location || process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";
  const customerName = order.customer_name || order.delivery?.name || "MallMaze Customer";
  const customerPhone = order.customer_phone || order.delivery?.phone || "9876543210";
  const address = order.delivery?.address || order.shipping_address || "MG Road, Central Market";
  const city = order.delivery?.city || "Bengaluru";
  const state = order.delivery?.state || "Karnataka";
  const pincode = String(order.delivery?.pincode || "560001");
  const subTotal = (order.totals?.totalPaise ? order.totals.totalPaise / 100 : order.total_inr) || 499;

  const orderItems = (order.items || []).map((it, idx) => ({
    name: it.title || it.name || `MallMaze Product ${idx + 1}`,
    sku: it.sku || `SKU-${it.id || idx + 1}`,
    units: Number(it.qty || it.quantity || 1),
    selling_price: String(it.price || it.unit_price || 299),
    discount: 0
  }));

  if (orderItems.length === 0) {
    orderItems.push({
      name: "MallMaze Retail Order",
      sku: "MM-ITEM-001",
      units: 1,
      selling_price: String(subTotal),
      discount: 0
    });
  }

  const payload = {
    order_id: String(order.id),
    order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
    pickup_location: pickupLocation,
    channel_id: "",
    comment: "Dispatched via MallMaze AutoShelf Unified POS",
    billing_customer_name: customerName.split(" ")[0] || "Customer",
    billing_last_name: customerName.split(" ").slice(1).join(" ") || "Store",
    billing_address: address,
    billing_city: city,
    billing_pincode: pincode,
    billing_state: state,
    billing_country: "India",
    billing_email: order.customer_email || "support@mallmaze.in",
    billing_phone: customerPhone,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: (order.payment_status === "paid" || order.paid) ? "Prepaid" : "COD",
    sub_total: subTotal,
    length: 12,
    breadth: 10,
    height: 6,
    weight: 0.5
  };

  if (isSandbox()) {
    const srOrderId = 9840000 + Math.floor(Math.random() * 90000);
    const shipmentId = 4820000 + Math.floor(Math.random() * 90000);
    return {
      ok: true,
      sandbox: true,
      order_id: order.id,
      shiprocket_order_id: srOrderId,
      shipment_id: shipmentId,
      status: "NEW",
      status_code: 1,
      pickup_location: pickupLocation,
      courier_company_id: 12,
      courier_name: "Shadowfax Hyperlocal",
      created_at: new Date().toISOString()
    };
  }

  const token = await getAuthToken();
  const res = await httpsRequest({
    hostname: "apiv2.shiprocket.in",
    path: "/v1/external/orders/create/adhoc",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  }, payload);

  return {
    ok: res.status === 200 || res.status === 201,
    sandbox: false,
    data: res.body
  };
}

/**
 * Assign Courier & Generate AWB (Air Waybill)
 */
async function assignAwb({ shipment_id, courier_id }) {
  if (isSandbox()) {
    const awbSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
    const courierName = Number(courier_id) === 24 ? "Blue Dart Express Air" : "Delhivery Surface";
    return {
      ok: true,
      sandbox: true,
      shipment_id: Number(shipment_id),
      awb_code: `SR${awbSuffix}`,
      courier_company_id: courier_id || 12,
      courier_name: courierName,
      routing_code: "BLR/HUB-04-EAST",
      applied_weight: "0.50",
      pickup_scheduled_date: new Date(Date.now() + 3600000).toISOString(),
      label_ready: true
    };
  }

  const token = await getAuthToken();
  const res = await httpsRequest({
    hostname: "apiv2.shiprocket.in",
    path: "/v1/external/courier/assign/awb",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  }, { shipment_id, courier_id });

  return {
    ok: res.status === 200,
    sandbox: false,
    data: res.body?.response?.data || res.body
  };
}

/**
 * Generate Printable Shipping Label (4x6 thermal ready)
 */
function generatePrintableLabelHtml({ order, shipment_id, awb_code, courier_name }) {
  const storeName = order.store_name || "MallMaze Partner Store";
  const customerName = order.customer_name || order.delivery?.name || "Valued Customer";
  const address = order.delivery?.address || "MG Road, Suite 4B";
  const city = order.delivery?.city || "Bengaluru";
  const pincode = order.delivery?.pincode || "560001";
  const phone = order.customer_phone || order.delivery?.phone || "9876543210";
  const awb = awb_code || `SR${shipment_id || "99821"}`;
  const courier = courier_name || "Delhivery Surface Express";
  const orderId = order.id || "ORD-LIVE-101";
  const total = order.total_inr || (order.totals?.totalPaise ? Math.round(order.totals.totalPaise / 100) : 499);
  const items = order.items && order.items.length ? order.items : [{ name: "MallMaze Retail Order", qty: 1 }];

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
      border: 2px solid #000;
      padding: 10px;
      max-width: 380px;
      margin: 0 auto;
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
      font-size: 16px;
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
      border-bottom: 1px dashed #000;
    }
    .barcode-svg {
      width: 85%;
      height: 48px;
    }
    .awb-text {
      font-size: 14px;
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
      color: #444;
      margin-bottom: 2px;
    }
    .addr-name {
      font-size: 13px;
      font-weight: 900;
    }
    .addr-body {
      font-size: 11px;
      margin-top: 2px;
    }
    .pin-badge {
      display: inline-block;
      font-size: 14px;
      font-weight: 900;
      background: #000;
      color: #fff;
      padding: 2px 8px;
      margin-top: 4px;
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
  <button class="btn-print" onclick="window.print()">🖨️ Print Label / Save PDF</button>

  <div class="label-box">
    <div class="header-row">
      <div>
        <div class="brand-title">MALLMAZE</div>
        <div style="font-size:9px; color:#444;">Express Local & Hyperlocal Delivery</div>
      </div>
      <div class="partner-tag">POWERED BY SHIPROCKET</div>
    </div>

    <div class="barcode-section">
      <!-- Simulated Code128 Barcode via SVG -->
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
        <div class="addr-title">SHIPPED FROM (STORE DISPATCH):</div>
        <div style="font-weight:800;">${storeName}</div>
        <div style="font-size:10px;">MallMaze Verified Merchant Partner</div>
        <div style="font-size:10px;">Pickup Ref: Primary Location | Return Pincode: 560001</div>
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
        <span>Dimensions: 12x10x6 CM</span>
      </div>
    </div>

    <div class="footer-row">
      <span>Routing: BLR/HUB-04-EAST</span>
      <span style="font-weight:800;">GST INCL • TAX INVOICE</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Track Shipment Status
 */
async function trackShipment(awb_or_order_id) {
  const code = String(awb_or_order_id || "").trim();

  if (isSandbox()) {
    return {
      ok: true,
      sandbox: true,
      awb_code: code,
      current_status: "OUT FOR DELIVERY",
      courier_name: "Shadowfax / Delhivery Express",
      estimated_delivery: "Today, by 6:00 PM",
      timeline: [
        {
          status: "Order Created & Manifested",
          location: "Store Pickup Hub",
          timestamp: new Date(Date.now() - 7200000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          done: true
        },
        {
          status: "Package Picked Up by Shiprocket Rider",
          location: "Central Merchant Store",
          timestamp: new Date(Date.now() - 3600000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          done: true
        },
        {
          status: "In Transit via Express Route",
          location: "City Sort Center Hub",
          timestamp: new Date(Date.now() - 1800000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          done: true
        },
        {
          status: "Out for Doorstep Delivery",
          location: "Local Dispatch Unit",
          timestamp: "Just now",
          done: true
        },
        {
          status: "Delivered to Customer",
          location: "Customer Doorstep",
          timestamp: "Estimated within 45 mins",
          done: false
        }
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
  checkServiceability,
  createOrder,
  assignAwb,
  generatePrintableLabelHtml,
  trackShipment
};
