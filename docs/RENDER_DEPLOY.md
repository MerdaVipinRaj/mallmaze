# Deploy MallMaze on Render

MallMaze runs as a single Node web service: static pages plus `/api/*` from `npm start`.

## Quick deploy (Blueprint)

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Open [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect the repo and apply `render.yaml`.
4. When prompted, enter Razorpay env vars (leave blank for mock payments during testing).
5. Wait for deploy; open the service URL (e.g. `https://mallmaze.onrender.com`).
6. Smoke test: `https://your-app.onrender.com/api/health` should return `{"ok":true,...}`.

The frontend auto-uses `${window.location.origin}/api` in production (`assets/js/config.js`), so no separate API URL config is needed when frontend and API share the same Render service.

## Manual deploy (without Blueprint)

1. **New → PostgreSQL** (Free for 30 days, then upgrade or data is deleted).
2. **New → Web Service** → connect repo.
3. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install --omit=dev`
   - **Start command:** `npm start`
   - **Health check path:** `/api/health`
4. Environment variables:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Internal connection string from Render Postgres |
| `JWT_SECRET` | Long random string (Render can generate) |
| `OTP_DEV_MODE` | `true` for pilot (OTP shown in API response); `false` before launch |
| `RAZORPAY_KEY_ID` | Razorpay public key (optional for mock checkout) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret |
| `DELIVERY_PROVIDER` | `manual_ops` |

Do **not** set `PGSSLMODE=disable` on Render — Postgres requires SSL (default in `server.js`).

`APP_ORIGIN` is optional: the server falls back to `RENDER_EXTERNAL_URL` automatically.

## Database

Tables are created on first API request when `DATABASE_URL` is set (`backend/server.js` bootstraps `app_state` and `mm_*` tables). You can also run `backend/schema.sql` manually if you prefer.

## Razorpay webhook

After deploy, set the webhook URL in Razorpay:

`https://your-app.onrender.com/api/payments/razorpay/webhook`

Events: `payment.captured`, `order.paid`, `transfer.processed`, `transfer.failed`.

## Free tier notes

- **Web service:** spins down after ~15 min idle; first request may take 30–60s (cold start).
- **Postgres (free):** expires after **30 days**; upgrade to a paid plan to keep data.
- **Uploads:** store images live on the local filesystem and are **not** persisted across deploys/restarts on the free web plan. Use external object storage for production image hosting.

## Custom domain

Render Dashboard → your web service → **Settings** → **Custom Domains**. HTTPS is automatic. Set `APP_ORIGIN` to `https://your-domain.com` if you use a custom domain.

## Local production-style test

```bash
npm install
set DATABASE_URL=postgresql://...
npm start
```

Open `http://localhost:4000`.
