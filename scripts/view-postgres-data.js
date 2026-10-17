const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Try loading .env and backend/.env
function loadEnvFile(envPath) {
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnvFile(path.resolve(__dirname, '..', '.env'));
loadEnvFile(path.resolve(__dirname, '..', 'backend', '.env'));

const connectionString = process.env.DATABASE_URL;

async function viewData() {
  console.log('====================================================');
  console.log('🐘 MALLMAZE POSTGRESQL & BACKEND DATA VIEWER');
  console.log('====================================================');

  if (!connectionString) {
    console.log('\n⚠️  DATABASE_URL is not set in your .env or backend/.env.');
    console.log('👉 To connect live PostgreSQL:');
    console.log('   Add this line to backend/.env:');
    console.log('   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"\n');
    
    // Read local fallback database
    const localDbPath = path.resolve(__dirname, '..', 'backend', 'data', 'app-db.json');
    if (fs.existsSync(localDbPath)) {
      const data = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      console.log('📦 Showing Local Active Database Data:');
      for (const [table, records] of Object.entries(data)) {
        if (Array.isArray(records)) {
          console.log(`   • Table: mm_${table} -> ${records.length} records`);
          if (records.length > 0) {
            console.log(`     Sample:`, JSON.stringify(records[0], null, 2).slice(0, 150) + '...\n');
          }
        }
      }
    }
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: String(process.env.PGSSLMODE || '').toLowerCase() === 'disable' ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected successfully to PostgreSQL database!\n');

    // List all public tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`📋 Available Tables (${tables.length}):`, tables.join(', '));
    console.log('----------------------------------------------------');

    const keyTables = ['mm_stores', 'mm_products', 'mm_orders', 'mm_users', 'mm_reservations', 'mm_delivery_jobs', 'stores', 'products', 'orders'];
    const tablesToCheck = keyTables.filter(t => tables.includes(t));

    for (const table of tablesToCheck) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = countRes.rows[0].count;
        console.log(`\n📊 Table [${table}]: ${count} records`);
        
        if (Number(count) > 0) {
          const sampleRes = await client.query(`SELECT * FROM ${table} LIMIT 3`);
          console.log('Sample Data:');
          console.log(JSON.stringify(sampleRes.rows, null, 2));
        } else {
          console.log('   (Table is currently empty)');
        }
      } catch (err) {
        console.log(`   Error reading ${table}: ${err.message}`);
      }
    }

    client.release();
    await pool.end();
    console.log('\n====================================================');
    console.log('✅ PostgreSQL data inspection complete!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ PostgreSQL Connection Error:', err.message);
  }
}

viewData();