/**
 * Run SQL migrations directly against Supabase PostgreSQL.
 * 
 * Usage:
 *   node run-migrations.cjs YOUR_DATABASE_PASSWORD
 *   -- OR --
 *   node run-migrations.cjs --uri "postgresql://postgres.REF:PASS@HOST:PORT/postgres"
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'klidnyqyjvbvzmplwdfl';

const migrationFiles = [
  'supabase/migrations/20260420000000_dynamic_streak_rewards.sql',
  'supabase/migrations/20260420000001_dynamic_post_rewards.sql',
];

let connectionConfig;

if (process.argv[2] === '--uri') {
  // User provided a full connection URI
  connectionConfig = { connectionString: process.argv[3] };
  if (!process.argv[3]) {
    console.error('❌ Please provide the URI after --uri');
    process.exit(1);
  }
} else if (process.argv[2]) {
  const password = process.argv[2];
  const encodedPassword = encodeURIComponent(password);
  // Use separate params to avoid URL-encoding issues with special chars in password
  connectionConfig = {
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  };
} else {
  console.error('❌ Usage: node run-migrations.cjs YOUR_DATABASE_PASSWORD');
  console.error('   -- OR --');
  console.error('   node run-migrations.cjs --uri "YOUR_CONNECTION_STRING"');
  console.error('');
  console.error('   Get your connection string from: Supabase Dashboard → Connect');
  process.exit(1);
}

async function run() {
  console.log(`🔌 Connecting to Supabase PostgreSQL...`);
  const client = new Client(connectionConfig);

  try {
    await client.connect();
    console.log(`✅ Connected!\n`);
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    console.error('');
    console.error('Try using the full connection string from your Supabase Dashboard:');
    console.error('  1. Go to Supabase Dashboard → click "Connect" button (top of page)');
    console.error('  2. Select "Direct connection" or "Transaction pooler"');
    console.error('  3. Copy the URI and run:');
    console.error('     node run-migrations.cjs --uri "postgresql://..."');
    process.exit(1);
  }

  // Run each migration file
  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`⏳ Running ${file}...`);

    try {
      await client.query(sql);
      console.log(`✅ ${file} — SUCCESS\n`);
    } catch (err) {
      console.error(`❌ ${file} — FAILED`);
      console.error(`   Error: ${err.message}\n`);
    }
  }

  await client.end();
  console.log('🔌 Disconnected. All done!');
}

run();
