// Supabase Edge Function (Deno) - Create a delivery job with Shadowfax (via ClickPost) or direct API
// Recommended: integrate Shadowfax through a logistics aggregator (ClickPost) unless you have direct Shadowfax API access.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ClickPost (optional)
const CLICKPOST_BASE_URL = Deno.env.get("CLICKPOST_BASE_URL") ?? ""; // e.g. https://api.clickpost.in
const CLICKPOST_API_KEY = Deno.env.get("CLICKPOST_API_KEY") ?? "";

// Provider metadata
const PROVIDER = Deno.env.get("DELIVERY_PROVIDER") ?? "shadowfax";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return new Response("Missing Supabase env", { status: 500 });

  const body = await req.json().catch(() => ({}));
  const orderId = String(body?.order_id || "");
  if (!orderId) return new Response(JSON.stringify({ error: "Missing order_id" }), { status: 400 });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Idempotency: if a delivery already exists for this order, return it.
  const { data: existingDelivery } = await admin
    .from("deliveries")
    .select("id, provider, tracking_id, status, eta_minutes, updated_at")
    .eq("order_id", orderId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingDelivery?.id) {
    return new Response(JSON.stringify({ ok: true, idempotent: true, delivery: existingDelivery }), {
      headers: { "content-type": "application/json" },
    });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, city, delivery_name, delivery_phone, delivery_address")
    .eq("id", orderId)
    .single();

  if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { "content-type": "application/json" } });

  // v1 minimal: require delivery_address.text
  const addrText = (order.delivery_address && typeof order.delivery_address === "object")
    ? String((order.delivery_address as Record<string, unknown>).text || "")
    : "";
  if (!addrText) return new Response(JSON.stringify({ error: "Missing delivery address on order" }), { status: 400, headers: { "content-type": "application/json" } });

  // If ClickPost configured, create shipment via ClickPost -> Shadowfax
  if (CLICKPOST_BASE_URL && CLICKPOST_API_KEY) {
    // NOTE: Exact ClickPost endpoints/payload can differ by account.
    // This is a safe scaffold: you will map your warehouse pickup + drop details here.
    const payload = {
      reference_number: orderId,
      courier_partner: "shadowfax",
      drop: {
        name: order.delivery_name || "Customer",
        phone: order.delivery_phone || "",
        address: addrText,
        city: order.city || "",
      },
    };

    const resp = await fetch(`${CLICKPOST_BASE_URL.replace(/\/+$/, "")}/api/v1/create-order`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: CLICKPOST_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "ClickPost create-order failed", details: json }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    const trackingId = String(json?.tracking_id || json?.awb || json?.waybill || "");
    if (trackingId) {
      await admin.from("deliveries").insert({
        order_id: orderId,
        provider: PROVIDER,
        tracking_id: trackingId,
        status: "created",
        eta_minutes: 35,
        updated_at: new Date().toISOString(),
      });
      await admin.from("order_events").insert({ order_id: orderId, event: "delivery_created", payload: { provider: PROVIDER, tracking_id: trackingId } });
    }

    return new Response(JSON.stringify({ provider: PROVIDER, tracking_id: trackingId || null, raw: json }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Fallback demo
  const demoTracking = `TRK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await admin.from("deliveries").insert({ order_id: orderId, provider: PROVIDER, tracking_id: demoTracking, status: "created", eta_minutes: 35, updated_at: new Date().toISOString() });
  await admin.from("order_events").insert({ order_id: orderId, event: "delivery_created", payload: { provider: PROVIDER, tracking_id: demoTracking, mode: "demo" } });
  return new Response(JSON.stringify({ provider: PROVIDER, tracking_id: demoTracking, mode: "demo" }), { headers: { "content-type": "application/json" } });
});

