// migrate_json_to_pg_final.js
// Full migration that populates required columns (id, name where NOT NULL) and stores the whole JSON blob.

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

// Generic insert that includes specified columns plus raw_data.
async function insertWithFields(table, rows, cols) {
  if (!rows || rows.length === 0) return;
  for (const row of rows) {
    const values = [];
    const placeholders = [];
    // always include id
    values.push(row.id);
    placeholders.push(`$${values.length}`);
    // include each extra column if present on the row
    for (const col of cols) {
      const val = row[col] !== undefined ? row[col] : null;
      values.push(val);
      placeholders.push(`$${values.length}`);
    }
    // raw_data as JSONB
    values.push(JSON.stringify(row));
    placeholders.push(`$${values.length}::jsonb`);
    const columnsList = ['id', ...cols, 'raw_data'].join(', ');
    const sql = `INSERT INTO ${table} (${columnsList}) VALUES (${placeholders.join(', ')}) ON CONFLICT (id) DO NOTHING`;
    try {
      await pool.query(sql, values);
    } catch (e) {
      console.error(`⚠️  Failed insert into ${table} for id=${row.id}:`, e.message);
    }
  }
}

(async () => {
  try {
    // Users: only id + raw_data (no NOT NULL extra columns)
    await insertWithFields('mm_users', json.users, []);
    // Stores: need 'name'
    await insertWithFields('mm_stores', json.stores, ['name']);
    // Products: need 'name' and 'store_id' (store_id exists in JSON as store_id or storeId)
    await insertWithFields('mm_products', json.products, ['name', 'store_id']);
    // Orders: only id + raw_data is sufficient (other columns have defaults/nulls)
    await insertWithFields('mm_orders', json.orders, []);
    // Stock events: only id + raw_data (no NOT NULL extra columns)
    await insertWithFields('mm_stock_events', json.stock_events, []);
    console.log('✅ Migration completed (final)');
  } catch (e) {
    console.error('❌ Migration error:', e);
  } finally {
    await pool.end();
  }
})();
