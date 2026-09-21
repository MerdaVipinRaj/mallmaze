const { Pool } = require('pg');

// Replace with your actual PostgreSQL connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://your_username:your_password@localhost:5432/your_database';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function viewData() {
  try {
    console.log('🔗 Connecting to PostgreSQL...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    // View all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    console.log('\n📊 Available tables:', tablesResult.rows.map(r => r.table_name));
    
    // View data from key tables
    const keyTables = ['mm_users', 'mm_stores', 'mm_products', 'mm_orders', 'mm_scan_receipts'];
    
    for (const table of keyTables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${table}`;
        const countResult = await client.query(countQuery);
        const count = countResult.rows[0].count;
        
        if (count > 0) {
          console.log(`\n📋 ${table}: ${count} records`);
          
          const dataQuery = `SELECT * FROM ${table} LIMIT 5`;
          const dataResult = await client.query(dataQuery);
          console.log('Sample data:', JSON.stringify(dataResult.rows, null, 2));
        } else {
          console.log(`\n📋 ${table}: 0 records (empty)`);
        }
      } catch (err) {
        console.log(`\n❌ Error reading ${table}:`, err.message);
      }
    }
    
    client.release();
    await pool.end();
    console.log('\n✅ Data viewing complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure to set your DATABASE_URL environment variable');
    console.log('Example: DATABASE_URL="postgresql://user:password@localhost:5432/dbname"');
    process.exit(1);
  }
}

viewData();