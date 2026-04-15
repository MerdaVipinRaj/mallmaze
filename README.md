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
- `SUPABASE_FUNCTIONS_URL` (optional; if blank, derived from `SUPABASE_URL`)

Supabase SQL files:
- `supabase/schema.sql`
- `supabase/schema_orders_address.sql` (delivery fields on `orders`)
- `supabase/policies.sql`
- `supabase/schema_extra.sql` (support tickets + order events)
- `supabase/schema_scan_receipts.sql` (Scan&Go receipts)

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
- `scan.html` Scan&Go
- `scan-receipt.html` Scan&Go receipt (QR)
- `verify-receipt.html` Staff receipt verify
- `admin-dashboard.html` Admin suite
- `store-dashboard.html` Store manager control room

## Deploy (deploy-ready checklist)
### 1) Frontend (static hosting)
- Host this folder on any static host (Netlify / Cloudflare Pages / Vercel static / GitHub Pages).
- Make sure pages are served over HTTPS (required for camera + service worker).

### 2) Supabase DB
Run these SQL files in Supabase SQL editor (in order):
1. `supabase/schema.sql`
2. `supabase/schema_orders_address.sql`
3. `supabase/schema_extra.sql`
4. `supabase/schema_scan_receipts.sql`
5. `supabase/policies.sql`

### 3) Supabase Edge Functions
Deploy functions:
- `create-checkout-session`
- `stripe-webhook`
- `create-delivery`
- `delivery-webhook`
- `create-scan-checkout-session`
- `refund-order`

Set required env vars:
- **Common**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Auth verify** (checkout + refunds): `SUPABASE_ANON_KEY`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Site**: `SITE_URL` (your deployed frontend URL, e.g. `https://your-site.com`)
- **Delivery webhook security (recommended)**: `DELIVERY_WEBHOOK_SECRET`
- **ClickPost (optional)**: `CLICKPOST_BASE_URL`, `CLICKPOST_API_KEY`

### 4) Stripe webhooks
Add a Stripe webhook endpoint pointing to your Supabase function `stripe-webhook`.
Enable at least:
- `checkout.session.completed`

### 5) Final config
Update `assets/js/config.js` on the frontend:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- (optional) `SUPABASE_FUNCTIONS_URL`

### 6) Quick smoke test
- Login (`login.html`)
- Add items → Cart → Pay → Orders shows status + delivery tracking
- Scan&Go (`scan.html`) → Pay → receipt QR (`scan-receipt.html`) → verify (`verify-receipt.html` as staff/admin)
- Create refund ticket from Orders → approve/refund in Admin dashboard

