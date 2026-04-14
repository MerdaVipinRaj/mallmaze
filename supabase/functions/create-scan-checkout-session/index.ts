// Supabase Edge Function (Deno) - Create Stripe Checkout session for Scan&Go
// Deploy with: supabase functions deploy create-scan-checkout-session
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!STRIPE_SECRET_KEY) return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return new Response("Missing Supabase env", { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.scan_session_id || "");
    const successPath = String(body?.success_path || "/scan-receipt.html");
    const cancelPath = String(body?.cancel_path || "/scan.html");

    if (!sessionId) return new Response(JSON.stringify({ error: "Missing scan_session_id" }), { status: 400, headers: { "content-type": "application/json" } });

    // Verify user from Supabase JWT
    const authHeader = req.headers.get("authorization") || "";
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Ensure session belongs to user
    const { data: scanSession } = await admin
      .from("scan_sessions")
      .select("id,user_id,store_id,status")
      .eq("id", sessionId)
      .single();

    if (!scanSession) return new Response(JSON.stringify({ error: "Scan session not found" }), { status: 404, headers: { "content-type": "application/json" } });
    if (String(scanSession.user_id) !== userData.user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
    if (String(scanSession.status) !== "open") return new Response(JSON.stringify({ error: "Session not open" }), { status: 400, headers: { "content-type": "application/json" } });

    // Load scan items
    const { data: items } = await admin
      .from("scan_items")
      .select("name,unit_price_inr,qty")
      .eq("session_id", sessionId)
      .order("id", { ascending: false });

    const safeItems = (items || [])
      .map((i) => ({
        name: String(i?.name || "Item"),
        unit_price_inr: Math.max(0, Math.round(Number(i?.unit_price_inr || 0))),
        qty: Math.max(1, Math.round(Number(i?.qty || 1))),
      }))
      .filter((i) => i.unit_price_inr > 0);

    if (!safeItems.length) {
      return new Response(JSON.stringify({ error: "No payable items. Ensure scanned items have prices." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const subtotalInr = safeItems.reduce((s, i) => s + i.unit_price_inr * i.qty, 0);

    const line_items = safeItems.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: "inr",
        product_data: { name: i.name },
        unit_amount: i.unit_price_inr * 100,
      },
    }));

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${SITE_URL}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}${cancelPath}`,
      metadata: { scan_session_id: sessionId, type: "scan_go" },
    });

    await admin
      .from("scan_sessions")
      .update({ status: "pending_payment", stripe_checkout_session_id: stripeSession.id })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ id: stripeSession.id, url: stripeSession.url, total_inr: subtotalInr }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});

