# MallMaze Backend

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/health` | Simple health‑check – returns `{status:"ok"}` |
| GET    | `/stores` | Returns all stores (id, name, category, owner, phone, address, verification status, timestamps) |
| GET    | `/products` | Returns all products (id, store_id, name, category, price_paise, stock_qty, is_active, timestamps) |
| GET    | `/orders` | Returns all orders (id, customer_id, status, payment_status, financial fields, timestamps) |
| GET    | `/stock_events` | Returns all stock events (id, store_id, product_id, event_type, qty_delta, stock_after, reason, timestamps) |
| GET    | `/api/catalog` | Public catalog with stores and products (filtered by city, verification) |
| GET    | `/api/location/cities` | List of supported cities |
| POST   | `/api/auth/otp` | Request OTP for login |
| POST   | `/api/auth/otp/verify` | Verify OTP and obtain JWT |
| POST   | `/api/auth/demo-login` | Demo login for testing |
| ...    | Additional admin / payment routes as defined in `server.js` |

## How to Run
```bash
# Build and start containers
docker compose up -d --build
```

## Data Export
The script `export_db_to_json.js` creates JSON files under `/app/backend/export` inside the backend container. After running it, copy the files to the host:
```bash
docker exec dreams-backend-1 node /app/backend/export_db_to_json.js
mkdir -p export && docker cp dreams-backend-1:/app/backend/export ./export
```

## Front‑end Demo Pages
- `products.html` – fetches `/products` and lists them.
- `profit‑loss.html` – fetches `/orders`, computes total revenue, platform fees, delivery fees, tax, and displays a summary.

## Testing
A simple `check_all.sh` script curls each endpoint and prints the HTTP status. See `check_all.sh` in the repository.

## Notes
- The backend uses PostgreSQL (`DATABASE_URL`). Ensure `PGSSLMODE=disable` is set in `.env` for local connections.
- All routes require the server to be reachable on port `4000` (default).

## Verification
You can confirm the backend and database are fully operational with two quick methods:

1. **Automated health‑check script** – run the provided `check_all.sh` (found at the project root). It curls each public endpoint and prints the HTTP status code. A `200` response for every line means the API and DB are healthy.
   ```bash
   ./check_all.sh   # make sure it is executable: chmod +x check_all.sh (on Windows use Git Bash)
   ```
2. **Manual checks** – execute the following commands inside the running backend container. They use `curl` (installed via the Dockerfile) and `jq` (also installed) to pretty‑print the returned JSON.
   ```powershell
   docker exec dreams-backend-1 curl -s http://localhost:4000/health | jq .
   docker exec dreams-backend-1 curl -s http://localhost:4000/stores | jq .
   docker exec dreams-backend-1 curl -s http://localhost:4000/products | jq .
   docker exec dreams-backend-1 curl -s http://localhost:4000/orders | jq .
   docker exec dreams-backend-1 curl -s http://localhost:4000/stock_events | jq .
   ```
   All commands should output a JSON object/array with `status: "ok"` or the expected data rows.

If any command fails, verify that:
- The containers are up (`docker ps` shows `dreams-backend-1` as **Up**).
- The Dockerfile includes `RUN apk add --no‑cache curl jq` (the latest build does).
- The `.env` file contains a valid `DATABASE_URL` pointing to the PostgreSQL container.

## Database Schema
The PostgreSQL schema is defined in the `schema.sql` file (and incremental migrations `schema_alter.sql`, `schema_alter2.sql`). It creates the tables `stores`, `products`, `orders`, `stock_events`, and related indexes. For a quick overview you can inspect the schema directly:
```bash
psql $DATABASE_URL -f schema.sql   # or open the file in an editor
```
These SQL files are stored as artifacts and kept in the repository under the root.

## Optional Tooling
- **jq** – a lightweight JSON processor useful for debugging API responses. It is now installed in the backend image; you can also install it locally (`choco install jq` on Windows) for use outside the container.
- **Postman / VS Code REST Client** – alternative ways to test the API.

---
Feel free to add any additional documentation or scripts as needed; the core backend and database are now fully functional and documented.

- The backend uses PostgreSQL (`DATABASE_URL`). Ensure `PGSSLMODE=disable` is set in `.env` for local connections.
- All routes require the server to be reachable on port `4000` (default)."