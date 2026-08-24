# MallMaze API

Node API for the deployable MVP:

- OTP login by email or phone
- Catalog API for frontend data hydration
- Razorpay order creation with **Route transfers** to store linked accounts
- Automated store payouts on paid orders (`store_payouts` ledger)
- Store registration collects bank details and provisions Razorpay linked accounts
- Order storage with platform fee, delivery fee, and tax breakdown
- Direct order detail and notification APIs for customer pages
- Delivery job abstraction for manual ops or partner integrations
- Local Stores product/store persistence endpoints
- Scan & Go receipt creation and exit verification APIs
- Support ticket creation and history
- Razorpay webhook handling for paid orders
- PostgreSQL production persistence through `DATABASE_URL`, with queryable `mm_*` tables for users, stores, products, stock, orders, receipts, delivery, and support data

## Run

```bash
npm install
copy backend\.env.example backend\.env
npm start
```

The API runs on `http://localhost:4000` by default.

Without `DATABASE_URL`, the API stores development data in `backend/data/app-db.json`.
With `DATABASE_URL`, the same routes store the canonical state in PostgreSQL `app_state`
and maintain query-friendly reporting tables such as `mm_users`, `mm_products`,
`mm_stock_events`, `mm_orders`, and `mm_scan_receipts`.

## Active Routes

- `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`
- `GET /api/catalog`
- `POST /api/stores/register`, `POST /api/stores/bank-details`, `GET /api/store/payouts`
- `POST /api/payments/razorpay/order`, `POST /api/payments/razorpay/verify`, `POST /api/payments/razorpay/webhook`
- `GET /api/orders`, `GET /api/orders/detail?id=ORD-...`
- `GET /api/notifications`
- `POST /api/scan/receipts`, `GET /api/scan/receipts?token=MM-...`, `POST /api/scan/receipts/verify`
- `GET /api/support/tickets`, `POST /api/support/tickets`
- `GET /api/autoshelf/stores`, `POST /api/autoshelf/stores`, `DELETE /api/autoshelf/stores?id=...`
- `POST /api/autoshelf/products`, `DELETE /api/autoshelf/products?id=...`

## Production Notes

- Set `OTP_DEV_MODE=false` and wire an SMS/email provider in `POST /api/auth/otp/request`.
- Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Enable **Razorpay Route** on your business account.
- Store owners must submit bank details at registration; linked accounts are created automatically.
- Create a PostgreSQL database and set `DATABASE_URL`. Run `psql "$DATABASE_URL" -f backend/schema.sql` once before real traffic.
- Configure webhooks for `payment.captured`, `order.paid`, `transfer.processed`, and `transfer.failed` → `/api/payments/razorpay/webhook`.
- Delivery partners should be implemented behind the `deliveryPlanForOrder` boundary so the order lifecycle stays stable while providers change.
