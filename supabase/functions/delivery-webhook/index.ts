// Supabase Edge Function (Deno) - Ingest delivery status webhooks (ClickPost / provider-agnostic)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Optional shared secret to prevent public abuse.
// Configure `DELIVERY_WEBHOOK_SECRET` and send header: x-mm-webhook-secret: <secret>
const DELIVERY_WEBHOOK_SECRET = Deno.env.get("DELIVERY_WEBHOOK_SECRET") ?? "";

type DeliveryStatus =
  | "created"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

type WebhookEvent = {
  orderId: string;
  trackingId: string;
  rawStatus: string;
  status: DeliveryStatus;
  etaMinutes: number | null;
  raw: unknown;
};

function normalizeStatus(raw: unknown): DeliveryStatus | null {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return null;

  // Common provider terms → canonical statuses used by UI
  if (["created", "order_created", "shipment_created", "new"].includes(s)) return "created";
  if (["picked_up", "pickup_done", "pickedup", "picked up"].includes(s)) return "picked_up";
  if (["in_transit", "intransit", "transit", "on_the_way", "on the way", "shipped"].includes(s)) return "in_transit";
  if (["out_for_delivery", "outfordelivery", "ofd", "out for delivery"].includes(s)) return "out_for_delivery";
  if (["delivered", "completed", "delivered_success"].includes(s)) return "delivered";
  if (["cancelled", "canceled"].includes(s)) return "cancelled";
  if (["failed", "undelivered", "rto", "return_to_origin"].includes(s)) return "failed";

  // Heuristics for status phrases
  if (s.includes("deliver")) return "delivered";
  if (s.includes("out for")) return "out_for_delivery";
  if (s.includes("transit") || s.includes("shipp")) return "in_transit";
  if (s.includes("pick")) return "picked_up";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("fail") || s.includes("rto") || s.includes("return")) return "failed";

  return null;
}

function firstString(...vals: unknown[]): string {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function getEtaMinutes(obj: Record<string, unknown>): number | null {
  const v = obj.eta_minutes ?? obj.eta ?? obj.estimated_time_minutes ?? obj.estimated_minutes;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function toEventFromObject(obj: Record<string, unknown>): WebhookEvent | null {
  const orderId = firstString(
    obj.order_id,
    obj.orderId,
    obj.reference_number,
    obj.reference,
    obj.client_order_id,
    obj.clientOrderId,
    obj.order,
    isRecord(obj.order) ? (obj.order as Record<string, unknown>).id : "",
  );

  const trackingId = firstString(
    obj.tracking_id,
    obj.trackingId,
    obj.awb,
    obj.waybill,
    obj.tracking_number,
    obj.trackingNumber,
    obj.shipment_id,
    obj.shipmentId,
  );

  const rawStatus = firstString(
    obj.status,
    obj.shipment_status,
    obj.current_status,
    obj.event,
    obj.event_type,
    obj.eventType,
    obj.scan_type,
    obj.scanType,
  );

  const status = normalizeStatus(rawStatus) ?? "in_transit";
  const etaMinutes = getEtaMinutes(obj);

  if (!orderId && !trackingId) return null;
  return { orderId, trackingId, rawStatus, status, etaMinutes, raw: obj };
}

function extractEvents(body: unknown): WebhookEvent[] {
  const out: WebhookEvent[] = [];
  const seen = new Set<string>();

  const push = (evt: WebhookEvent | null) => {
    if (!evt) return;
    const k = `${evt.orderId}|${evt.trackingId}|${evt.status}|${evt.rawStatus}|${evt.etaMinutes ?? ""}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(evt);
  };

  const visit = (node: unknown, depth: number) => {
    if (depth > 6) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (!isRecord(node)) return;

    // If this object itself looks like an event, treat it as one.
    push(toEventFromObject(node));

    // Common wrappers: payload/data/body + arrays of updates.
    const candidates: unknown[] = [];
    for (const key of ["payload", "data", "body", "result", "message", "shipment", "tracking", "order"]) {
      if (key in node) candidates.push(node[key]);
    }
    for (const key of ["events", "event", "updates", "scans", "checkpoints", "history", "statuses", "status_updates"]) {
      if (key in node) candidates.push(node[key]);
    }
    for (const c of candidates) visit(c, depth + 1);
  };

  visit(body, 0);
  return out.length ? out : [];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return new Response("Missing Supabase env", { status: 500 });

  if (DELIVERY_WEBHOOK_SECRET) {
    const got = req.headers.get("x-mm-webhook-secret") ?? "";
    if (got !== DELIVERY_WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const events = extractEvents(body);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  let processed = 0;
  let updated = 0;
  let ignored = 0;

  for (const evt of events) {
    processed += 1;

    // Find delivery row by tracking_id OR by order_id.
    let delivery: { id: string; order_id: string; status: string | null; eta_minutes: number | null; tracking_id: string | null } | null = null;

    if (evt.trackingId) {
      const { data } = await admin
        .from("deliveries")
        .select("id, order_id, status, eta_minutes, tracking_id")
        .eq("tracking_id", evt.trackingId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) delivery = data as typeof delivery;
    }

    if (!delivery && evt.orderId) {
      const { data } = await admin
        .from("deliveries")
        .select("id, order_id, status, eta_minutes, tracking_id")
        .eq("order_id", evt.orderId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) delivery = data as typeof delivery;
    }

    if (!delivery?.id) {
      ignored += 1;
      continue;
    }

    const foundOrderId = String(delivery.order_id || evt.orderId || "");
    const prevStatus = String(delivery.status || "").trim();
    const nextStatus = evt.status;
    const prevEta = delivery.eta_minutes == null ? null : Number(delivery.eta_minutes);
    const nextEta = evt.etaMinutes;

    const shouldInsertEvent =
      prevStatus !== nextStatus ||
      (nextEta != null && prevEta !== nextEta);

    // Always touch updated_at so "last webhook" is visible.
    await admin
      .from("deliveries")
      .update({
        status: nextStatus,
        ...(nextEta != null ? { eta_minutes: nextEta } : {}),
        ...(delivery.tracking_id ? {} : (evt.trackingId ? { tracking_id: evt.trackingId } : {})),
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id);

    if (shouldInsertEvent && foundOrderId) {
      await admin.from("order_events").insert({
        order_id: foundOrderId,
        event: "delivery_status",
        payload: {
          status: nextStatus,
          tracking_id: evt.trackingId || delivery.tracking_id || null,
          raw_status: evt.rawStatus || null,
          eta_minutes: nextEta,
          webhook: evt.raw,
        },
      });
    }

    if (foundOrderId) {
      if (nextStatus === "delivered") {
        await admin.from("orders").update({ status: "delivered" }).eq("id", foundOrderId);
        if (shouldInsertEvent) {
          await admin.from("order_events").insert({
            order_id: foundOrderId,
            event: "delivered",
            payload: { tracking_id: evt.trackingId || delivery.tracking_id || null },
          });
        }
      } else if (["picked_up", "in_transit", "out_for_delivery"].includes(nextStatus)) {
        await admin.from("orders").update({ status: "out_for_delivery" }).eq("id", foundOrderId);
      }
    }

    updated += 1;
  }

  // If we couldn't detect events, still accept webhook for provider debugging.
  if (!events.length) {
    return new Response(JSON.stringify({ ok: true, ignored: true, reason: "No events detected", sample_keys: isRecord(body) ? Object.keys(body).slice(0, 30) : [] }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, processed, updated, ignored }), { headers: { "content-type": "application/json" } });
});

