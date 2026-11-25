// migrate_json_to_pg.js
// One‑off script to copy data from the local JSON store (app-db.json) into PostgreSQL tables.
// Run after the containers are up and DATABASE_URL is set:
//   docker exec -it dreams-backend-1 node migrate_json_to_pg.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Path to the JSON file (same as the app uses)
const DB_FILE = '/app/backend/data/app-db.json';

if (!fs.existsSync(DB_FILE)) {
  console.error('❌ Cannot find app-db.json at', DB_FILE);
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function insert(table, rows) {
  if (!rows || rows.length === 0) return;
  for (const row of rows) {
    const cols = Object.keys(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
    try {
      await pool.query(sql, cols.map(c => row[c]));
    } catch (e) {
      console.error(`⚠️  Failed insert into ${table} for id=${row.id}:`, e.message);
    }
  }
}

(async () => {
  try {
    await insert('mm_users', json.users);
    await insert('mm_stores', json.stores);
    await insert('mm_products', json.products);
    await insert('mm_orders', json.orders);
    await insert('mm_stock_events', json.stock_events);
    console.log('✅ Migration completed');
  } catch (e) {
    console.error('❌ Migration error:', e);
  } finally {
    await pool.end();
  }
})();
