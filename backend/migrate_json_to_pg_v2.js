// migrate_json_to_pg_v2.js
// Simplified migration: only inserts id and raw JSON data into each table.
// This avoids column mismatches and satisfies NOT NULL constraints.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DB_FILE = '/app/backend/data/app-db.json';
if (!fs.existsSync(DB_FILE)) {
  console.error('❌ Cannot find app-db.json at', DB_FILE);
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function insertSimple(table, rows) {
  if (!rows || rows.length === 0) return;
  for (const row of rows) {
    try {
      await pool.query(
        `INSERT INTO ${table} (id, raw_data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`,
        [row.id, JSON.stringify(row)]
      );
    } catch (e) {
      console.error(`⚠️  Failed insert into ${table} for id=${row.id}:`, e.message);
    }
  }
}

(async () => {
  try {
    await insertSimple('mm_users', json.users);
    await insertSimple('mm_stores', json.stores);
    await insertSimple('mm_products', json.products);
    await insertSimple('mm_orders', json.orders);
    await insertSimple('mm_stock_events', json.stock_events);
    console.log('✅ Migration completed (v2)');
  } catch (e) {
    console.error('❌ Migration error:', e);
  } finally {
    await pool.end();
  }
})();
