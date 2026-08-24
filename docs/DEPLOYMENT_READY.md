# MallMaze Deployment Checklist

## Current Stack

- Frontend: static HTML/CSS/vanilla JS served from this repo.
- Backend: Node.js API in `backend/server.js`.
- Database: PostgreSQL when `DATABASE_URL` is set, local JSON file only for development.
- Payments: Razorpay Orders/QR APIs through the backend.
- Auth: OTP request/verify through the backend. Development mode returns `dev_otp`; production must send OTP by SMS/email provider.
- Delivery: provider boundary exists through delivery jobs; pilot defaults to `manual_ops`.

## GoDaddy Hosting Choice

Use GoDaddy Node.js Hosting or a GoDaddy VPS for production. GoDaddy's Node.js Hosting docs say apps should start from a root `npm start` command and expect a single application per upload. GoDaddy VPS docs describe VPS as the flexible route for hosting applications, server code, and databases with SSH/server control.

Recommended production shape:

- Frontend and API served by the same Node process from this project root via `npm start`.
- PostgreSQL hosted on the same VPS or a managed database.
- HTTPS enabled for the domain because camera scan and service worker features require a secure origin.

## Required Environment

Frontend:

- `assets/js/config.js`
  - `API_BASE_URL`: deployed backend URL ending in `/api`
  - `RAZORPAY_KEY_ID`: Razorpay public key id only

Backend:

- `PORT`
- `APP_ORIGIN`
- `JWT_SECRET`
- `DATABASE_URL`
- `PGSSLMODE`
- `OTP_DEV_MODE=false`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `PLATFORM_FEE_PAISE`
- `DELIVERY_FEE_PAISE`
- `TAX_BPS`
- `DELIVERY_PROVIDER`

## Local Run

```bash
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:8080`
- API: `http://localhost:4000/api/health`

Production-style local run:

```bash
npm start
```

Open `http://localhost:4000`. In this mode the same Node process serves frontend pages and `/api/*`.

Do not type `http://localhost:8080` into PowerShell as a command. Open it in a browser, or run:

```powershell
Start-Process "http://localhost:8080"
```

## PostgreSQL Setup

Create a production database and run:

```bash
psql "$DATABASE_URL" -f backend/schema.sql
```

Set `DATABASE_URL` in production. When it is present, the backend stores canonical app state in `app_state` and refreshes query-friendly tables:

- `mm_users`
- `mm_stores`
- `mm_products`
- `mm_orders`
- `mm_scan_receipts`
- `mm_stock_events`
- `mm_delivery_jobs`
- `mm_support_tickets`
- `mm_otp_challenges`

These tables are where you can inspect users, customers, store stock, orders, support tickets, and Scan & Go receipts.

## GoDaddy Deployment

1. Upload the project root, not just `backend/`.
2. Run `npm install --omit=dev` on the server, or let GoDaddy Node.js Hosting run install during deployment.
3. Configure environment variables from `backend/.env.example`.
4. Run `npm start` from the project root.
5. Point the domain to the Node app.
6. Set `assets/js/config.js` `API_BASE_URL` to `https://your-domain.com/api`.
7. Enable HTTPS.
8. Configure Razorpay webhook URL: `https://your-domain.com/api/payments/razorpay/webhook`.

## OTP Production

Before launch:

- Set `OTP_DEV_MODE=false`.
- Wire an SMS/email sender inside `POST /api/auth/otp/request`.
- Recommended providers for India launches: MSG91, Twilio, Amazon SES, SendGrid, or an approved transactional email/SMS provider.

The backend already stores OTP challenge metadata in the database. Only the actual sending integration remains provider-specific.

## Payment Flow

1. Backend calculates subtotal, platform fee, delivery fee, taxes, and total.
2. Backend creates Razorpay order.
3. Frontend opens Razorpay Checkout with backend `order_id`.
4. Backend verifies `razorpay_order_id|razorpay_payment_id` signature.
5. Backend marks order paid and creates delivery job.
6. Store payouts are settled operationally after delivery/return windows.

Development mode uses Razorpay mock payment when live keys are missing.

## Delivery Partner Pattern

Keep providers behind the existing delivery job boundary:

- `manual_ops`: launch pilot, phone/WhatsApp dispatch, direct runners.
- `porter` or similar: local runner handoff.
- `shiprocket` or similar: intercity/non-instant courier.
- `shadowfax` or similar: hyperlocal fleet.

The frontend should only depend on `delivery_jobs.status`, `estimated_minutes`, and `provider_tracking_id`.

## Launch Smoke Test

- Login with OTP from `login.html`.
- Search from home and confirm `products.html?search=...` filters products.
- Create AutoShelf store/product and confirm it appears in Products.
- Add to cart, checkout, and confirm Orders/Notifications update.
- Scan & Go: add a priced product, create receipt, open QR receipt, verify token.
- Create support ticket and confirm it appears in Notifications.
- Inspect Postgres `mm_users`, `mm_products`, `mm_stock_events`, `mm_orders`, and `mm_scan_receipts`.
