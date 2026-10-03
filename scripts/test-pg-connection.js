const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env if present
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.log("⚠️ DATABASE_URL is not set in your .env file or environment.");
  console.log("Usage: Set DATABASE_URL in .env, then run: node scripts/test-pg-connection.js");
  process.exit(0);
}

console.log("🔄 Testing PostgreSQL connection to Supabase...");
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

(async () => {
  const start = Date.now();
  try {
    const res = await pool.query("SELECT current_database(), current_user, version();");
    const duration = Date.now() - start;
    console.log("✅ Successfully connected to Supabase PostgreSQL in " + duration + "ms!");
    console.log("   Database: " + res.rows[0].current_database);
    console.log("   User: " + res.rows[0].current_user);
    
    // Check tables
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
    console.log("   Public Tables (" + tables.rows.length + "): " + tables.rows.map(r => r.tablename).join(", "));
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await pool.end();
  }
})();
