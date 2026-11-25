// export_db_to_json.js
// Dumps all MallMaze tables to JSON files in /app/backend/export
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const tables = [
  'mm_users',
  'mm_stores',
  'mm_products',
  'mm_orders',
  'mm_stock_events',
  'mm_scan_receipts',
  'mm_delivery_jobs',
  'mm_support_tickets',
  'mm_feedback',
  'mm_otp_challenges',
];

(async () => {
  try {
    const exportDir = path.join(__dirname, 'export');
    fs.mkdirSync(exportDir, { recursive: true });
    for (const table of tables) {
      const res = await pool.query(`SELECT * FROM ${table}`);
      const rows = res.rows;
      const filePath = path.join(exportDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
      console.log(`✅ Exported ${rows.length} rows from ${table} to ${filePath}`);
    }
  } catch (e) {
    console.error('❌ Export error:', e.message);
  } finally {
    await pool.end();
  }
})();
