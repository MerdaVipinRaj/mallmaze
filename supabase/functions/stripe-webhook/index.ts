// Supabase Edge Function (Deno) - Stripe webhook handler
// Deploy with: supabase functions deploy stripe-webhook
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return new Response("Missing Stripe env", { status: 500 });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return new Response("Missing Supabase env", { status: 500 });

  const sig = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${String(err)}`, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = String((session.metadata as Record<string, string> | null)?.order_id || "");
    const scanSessionId = String((session.metadata as Record<string, string> | null)?.scan_session_id || "");
    if (orderId) {
      await admin.from("orders").update({ status: "paid" }).eq("id", orderId);
      await admin.from("order_events").insert({ order_id: orderId, event: "paid", payload: { stripe_session: session.id } });

      // Trigger delivery creation (Shadowfax integration lives in create-delivery function)
      // If ClickPost/Shadowfax isn't configured yet, create-delivery returns demo tracking.
      const functionsUrl = (Deno.env.get("SUPABASE_FUNCTIONS_URL") ?? "").replace(/\/+$/, "");
      const auth = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
      if (functionsUrl) {
        await fetch(`${functionsUrl}/create-delivery`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: auth },
          body: JSON.stringify({ order_id: orderId }),
        }).catch(() => {});
      }
    }

    // Scan&Go payment completed -> create receipt + mark session paid
    if (scanSessionId) {
      const { data: scanSession } = await admin
        .from("scan_sessions")
        .select("id,user_id,store_id")
        .eq("id", scanSessionId)
        .single();

      if (scanSession?.id && scanSession?.user_id) {
        const { data: items } = await admin
          .from("scan_items")
          .select("unit_price_inr,qty")
          .eq("session_id", scanSessionId);

        const totalInr = (items || []).reduce((s, i) => s + (Math.max(0, Number(i?.unit_price_inr || 0)) * Math.max(1, Number(i?.qty || 1))), 0);
        const token = crypto.randomUUID();

        await admin.from("scan_sessions").update({ status: "paid", stripe_checkout_session_id: session.id }).eq("id", scanSessionId);
        await admin.from("scan_receipts").insert({
          session_id: scanSessionId,
          user_id: scanSession.user_id,
          store_id: scanSession.store_id,
          total_inr: Math.round(totalInr),
          stripe_checkout_session_id: session.id,
          token,
        });
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "content-type": "application/json" },
  });
});

