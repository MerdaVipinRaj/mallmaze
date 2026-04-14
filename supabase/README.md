# Supabase setup (MallMaze)

## 1) Create Supabase project
- Create a new Supabase project.

## 2) Apply schema + policies
- Open **SQL Editor** in Supabase.
- Run [`schema.sql`](schema.sql)
- Run [`policies.sql`](policies.sql)

## 3) Fill frontend config
Edit `assets/js/config.js`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 4) Seed initial data (optional)
Insert a few malls/stores/products in the Supabase Table Editor.

## Delivery tracking (webhook)
The delivery ingestion runs via Supabase edge function:
- `supabase/functions/delivery-webhook/index.ts`

If you set a secret on that function (`DELIVERY_WEBHOOK_SECRET`), your webhook caller must include:
- Header `x-mm-webhook-secret: <secret>`

## Notes
- The frontend is static HTML/CSS/JS. All security must be enforced with **RLS** and server-side functions for payments/webhooks.

