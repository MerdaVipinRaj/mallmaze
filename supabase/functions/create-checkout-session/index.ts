// Supabase Edge Function (Deno) - Create Stripe Checkout session
// Deploy with: supabase functions deploy create-checkout-session
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

type Item = { product_id?: string; name: string; unit_amount_paise: number; qty: number };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!STRIPE_SECRET_KEY) return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase env", { status: 500 });
  }

  try {
    const body = await req.json();
    const items: Item[] = Array.isArray(body?.items) ? body.items : [];
    const successPath = String(body?.success_path || "/checkout-success.html");
    const cancelPath = String(body?.cancel_path || "/cart.html");
    const city = String(body?.city || "");
    const delivery = (body?.delivery && typeof body.delivery === "object") ? body.delivery : null;
    const deliveryName = delivery ? String(delivery.name || "") : "";
    const deliveryPhone = delivery ? String(delivery.phone || "") : "";
    const deliveryAddress = delivery ? delivery.address || null : null;

    if (!items.length) return new Response(JSON.stringify({ error: "Empty cart" }), { status: 400 });

    // Verify user from Supabase JWT
    const authHeader = req.headers.get("authorization") || "";
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    // Create pending order server-side (service role)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const subtotalPaise = items.reduce((s, i) => s + (Math.max(0, Math.round(Number(i.unit_amount_paise || 0))) * Math.max(1, Number(i.qty || 1))), 0);
    const taxPaise = Math.round(subtotalPaise * 0.18);
    const totalPaise = subtotalPaise + taxPaise;

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: userData.user.id,
        city: city || null,
        status: "pending_payment",
        subtotal_inr: Math.round(subtotalPaise / 100),
        tax_inr: Math.round(taxPaise / 100),
        total_inr: Math.round(totalPaise / 100),
        delivery_name: deliveryName || null,
        delivery_phone: deliveryPhone || null,
        delivery_address: deliveryAddress || null,
      })
      .select("id")
      .single();
    if (orderErr || !order?.id) return new Response(JSON.stringify({ error: "Order create failed" }), { status: 500 });

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      name: String(i.name || "Item"),
      unit_price_inr: Math.round(Math.max(0, Math.round(Number(i.unit_amount_paise || 0))) / 100),
      qty: Math.max(1, Number(i.qty || 1)),
    }));
    await admin.from("order_items").insert(orderItems);

    const line_items = items.map((i) => ({
      quantity: Math.max(1, Number(i.qty || 1)),
      price_data: {
        currency: "inr",
        product_data: { name: String(i.name || "Item") },
        unit_amount: Math.max(0, Math.round(Number(i.unit_amount_paise || 0))),
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${SITE_URL}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}${cancelPath}`,
      metadata: { order_id: order.id },
    });

    await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});

