# MallMaze

MallMaze is a Swiggy/Zomato-style local commerce app for malls, nearby stores, delivery orders, AutoShelf stock operations, and Scan & Go receipts.

## Stack

- Frontend: static HTML/CSS/vanilla JavaScript.
- Backend: Node.js API in `backend/server.js`.
- Database: PostgreSQL in production through `DATABASE_URL`; local JSON file fallback for development.
- Auth: email/phone OTP through the backend.
- Payments: Razorpay order and QR payment APIs through the backend.
- Delivery: delivery-job abstraction ready for manual ops or partner integrations.

## Run Locally

```bash
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:8080`
- API health: `http://localhost:4000/api/health`

In PowerShell, do not type the URL as a command. Open it in a browser, or run:

```powershell
Start-Process "http://localhost:8080"
```

## Deploy on Render

Use the included `render.yaml` Blueprint or follow [docs/RENDER_DEPLOY.md](docs/RENDER_DEPLOY.md).

1. Push the repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → connect repo.
3. Apply; set Razorpay keys when prompted (optional for mock checkout).
4. Open `https://your-service.onrender.com`.

## Production Database

Set `DATABASE_URL` and run:

```bash
psql "$DATABASE_URL" -f backend/schema.sql
```

When `DATABASE_URL` is present, writes are stored in PostgreSQL and projected into:

- `mm_users`
- `mm_stores`
- `mm_products`
- `mm_orders`
- `mm_scan_receipts`
- `mm_stock_events`
- `mm_delivery_jobs`
- `mm_support_tickets`
- `mm_otp_challenges`

These are the operational tables for customer data, store data, stock, receipts, orders, delivery, and support.

## Config

Frontend public config:

- `assets/js/config.js`
  - `API_BASE_URL`
  - `RAZORPAY_KEY_ID`

Backend private config:

- `backend/.env.example`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `OTP_DEV_MODE`
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
  - fees/tax/delivery settings

Never put database credentials, Razorpay secret, OTP provider secrets, or delivery partner secrets in frontend files.

## Main Pages

- `index.html`: home/search
- `products.html`: product listing and filters
- `cart.html`: cart and Razorpay checkout
- `orders.html`, `order.html`: customer order history/detail
- `autoshelf.html`: stores, product stock, QR payments, operations
- `scan.html`: Scan & Go cart
- `scan-receipt.html`: receipt QR
- `verify-receipt.html`: staff receipt verification
- `admin-dashboard.html`: admin surface
- `store-dashboard.html`: store surface
- `notifications.html`: orders, receipts, support notifications

## Deployment

See [docs/DEPLOYMENT_READY.md](docs/DEPLOYMENT_READY.md).

This project is shaped for GoDaddy Node.js Hosting or GoDaddy VPS:

- root `package.json`
- `npm start`
- runtime dependencies in `dependencies`
- server binds to `process.env.PORT`
- secrets read from environment variables

## Launch Checklist

1. Set production `DATABASE_URL`.
2. Run `backend/schema.sql`.
3. Set `JWT_SECRET`.
4. Set `OTP_DEV_MODE=false` and wire an SMS/email OTP provider.
5. Add Razorpay keys and webhook secret.
6. Update `assets/js/config.js` with production `API_BASE_URL`.
7. Enable HTTPS on the domain.
8. Test login, search, products, cart checkout, Scan & Go receipt verification, AutoShelf store/product creation, notifications, and support tickets.


## Product Image System (AI Camera & Upload Studio)

MallMaze includes a professional ecommerce-grade product photography and upload studio inspired by Amazon and Flipkart seller portals:

### 1. Camera Experience
- **Viewfinder Modal**: Built with native HTML5 `navigator.mediaDevices.getUserMedia` targeting high-resolution streams (`1920x1080`, `facingMode: "environment"`).
- **Product Framing Reticle**: Non-destructive framing overlay with guidance badge ("Fit product inside frame • Keep centered").
- **Camera Switching & Torch**: Switch between rear and front cameras on mobile devices; toggle hardware torch on devices where supported without crashing.
- **Strict Stream Cleanup**: Stops all tracks immediately upon capture, close, navigation, or component unmount to prevent battery drain or active camera LEDs.

### 2. Multi-Image Upload & Management
- Supports up to 9 product photos (1 Primary `MAIN IMAGE` + up to 8 secondary gallery images).
- Desktop drag-and-drop zone and mobile touch controls.
- Reorder photos, set primary photo, or delete individual photos.
- Client-side validation enforcing `image/jpeg`, `image/png`, and `image/webp`, with a 10MB per-image limit and automatic compression (< 2000px, 0.88 quality).

### 3. AI Photo Review & Enhancement
- **Natural Enhance**: Client-side and server-side contrast, exposure, and color saturation normalization without distorting true product shapes or logos.
- **Clean Background**: Neutral catalog backdrop isolation with color options (Pure White, Dark Onyx, Warm Sand, Glacier Ice, or Transparent).
- **1:1 Auto-Centering**: Centers product with safe 12% padding inside a standardized square catalog canvas.
- **Quality Checks**: Automatic luminance analysis warning sellers if lighting is too dark or overexposed.

### 4. AI Providers & Architecture
- **Provider Abstraction** (`backend/image-service.js`): `ImageProcessingProvider` base class supporting:
  - `LocalProcessor`: Native zero-dependency algorithmic processing (default fallback).
  - `RemoveBgProvider`: Remove.bg external AI API integration when `BACKGROUND_REMOVAL_API_KEY` is configured.
  - `CloudinaryProvider`: Optional cloud media integration.
- Graceful degradation: If third-party AI keys are missing or timed out, the local studio fallback automatically completes the publish flow.

### 5. Storage & Database Migration
- **Storage** (`backend/uploads.js`): Structured folders under `uploads/stores/{storeId}/products/{productId}/processed/` and `original/` ensuring original high-res captures are never overwritten.
- **Privacy**: Automatically strips EXIF GPS coordinates prior to storing.
- **Database Migration**: `backend/migrations/003_product_images.sql` adds dedicated `product_images` table with indexes on `product_id` and `store_id`.

### 6. Environment Variables
- `IMAGE_PROCESSING_PROVIDER=local`
- `BACKGROUND_REMOVAL_PROVIDER=local`
- `IMAGE_ENHANCEMENT_PROVIDER=local`
- `BACKGROUND_REMOVAL_API_KEY=` (Optional)
- `IMAGE_AI_API_KEY=` (Optional)
- `IMAGE_AI_TIMEOUT=30000`
- `MAX_IMAGE_SIZE=10485760`
- `MAX_IMAGES_PER_PRODUCT=9`

### 7. Automated Testing
Run the media studio test suite:
```bash
node scratch/run_studio_tests.js
npm run build
```
