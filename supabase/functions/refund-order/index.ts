// Supabase Edge Function (Deno) - Admin-triggered Stripe refund (full/partial)
// Deploy with: supabase functions deploy refund-order
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!STRIPE_SECRET_KEY) return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return new Response("Missing Supabase env", { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.order_id || "");
    const ticketId = String(body?.support_ticket_id || "");
    const percent = clampPct(Number(body?.refund_percent ?? 100));

    if (!orderId) return new Response(JSON.stringify({ error: "Missing order_id" }), { status: 400, headers: { "content-type": "application/json" } });

    // Verify caller via Supabase JWT
    const authHeader = req.headers.get("authorization") || "";
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await authed.auth.getUser();
    const caller = userData?.user;
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });

    // Admin check + privileged operations via service role
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (String(roleRow?.role || "") !== "admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "content-type": "application/json" } });

    const { data: order } = await admin
      .from("orders")
      .select("id, total_inr, stripe_checkout_session_id, status")
      .eq("id", orderId)
      .single();

    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { "content-type": "application/json" } });
    if (!order.stripe_checkout_session_id) return new Response(JSON.stringify({ error: "Order has no Stripe session" }), { status: 400, headers: { "content-type": "application/json" } });

    const session = await stripe.checkout.sessions.retrieve(String(order.stripe_checkout_session_id), { expand: ["payment_intent"] });
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? "");
    if (!paymentIntentId) return new Response(JSON.stringify({ error: "Missing payment_intent on session" }), { status: 400, headers: { "content-type": "application/json" } });

    const totalInr = Math.max(0, Math.round(Number(order.total_inr || 0)));
    const refundInr = Math.round((totalInr * percent) / 100);
    const refundAmount = Math.max(0, refundInr * 100); // paise

    if (refundAmount <= 0) return new Response(JSON.stringify({ error: "Refund amount is 0" }), { status: 400, headers: { "content-type": "application/json" } });

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      metadata: {
        order_id: orderId,
        support_ticket_id: ticketId || "",
        refund_percent: String(percent),
      },
    });

    await admin.from("orders").update({ status: "refunded" }).eq("id", orderId);
    await admin.from("order_events").insert({ order_id: orderId, event: "refund_initiated", payload: { stripe_refund: refund.id, refund_percent: percent, amount_inr: refundInr } });

    if (ticketId) {
      await admin.from("support_tickets").update({ status: "resolved" }).eq("id", ticketId);
    }

    return new Response(JSON.stringify({ ok: true, refund_id: refund.id, refund_percent: percent, amount_inr: refundInr }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
});

