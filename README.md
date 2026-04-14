# MallMaze (HTML/CSS/JS)

MallMaze is a static (HTML/CSS/vanilla JS) marketplace prototype for **nearby malls + independent stores**, with delivery shopping, reserve & try, and **Scan&Go**.

## Run locally
Any static server works.

### Option A: VS Code Live Server
- Install “Live Server”
- Right-click `index.html` → **Open with Live Server**

### Option B: Python

```bash
python -m http.server 5500
```

Then open `http://localhost:5500/index.html`.

## Configure Supabase + Stripe
Edit `assets/js/config.js`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STRIPE_PUBLISHABLE_KEY` (for real checkout)

Supabase SQL files:
- `supabase/schema.sql`
- `supabase/policies.sql`

Supabase edge function scaffolds:
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/create-delivery/index.ts`
- `supabase/functions/delivery-webhook/index.ts` (ingest delivery tracking updates)
- `supabase/functions/create-scan-checkout-session/index.ts` (Scan&Go payment)
- `supabase/functions/refund-order/index.ts` (admin refund via Stripe)

### Webhook security
- Delivery webhook can be protected by setting `DELIVERY_WEBHOOK_SECRET` and sending header `x-mm-webhook-secret`.

## Delivery webhook secret (recommended)
If you set `DELIVERY_WEBHOOK_SECRET` on the Supabase `delivery-webhook` function, every webhook request must include:
- Header `x-mm-webhook-secret: <your secret>`

Suggested function env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DELIVERY_WEBHOOK_SECRET` (optional but recommended)
- `DELIVERY_PROVIDER` (optional; default `shadowfax`)
- `CLICKPOST_BASE_URL` (optional)
- `CLICKPOST_API_KEY` (optional)

## Pages
- `index.html` Home
- `malls.html` Malls list
- `mall.html` Mall detail
- `products.html` Product listing (search + category)
- `product.html` Product detail
- `cart.html` Cart + checkout
- `orders.html` Orders
- `wishlist.html` Wishlist
- `reservations.html` Reserve & Try
- `queue.html` Queue booking
- `walkthrough.html` Virtual walkthrough (mock)
- `scan.html` Scan&Go (PWA starter)
- `admin-dashboard.html` Admin suite (mocked today; wire to Supabase next)
- `store-dashboard.html` Store manager control room (mocked today; wire to Supabase next)

