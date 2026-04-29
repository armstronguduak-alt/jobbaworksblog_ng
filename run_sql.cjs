const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try multiple connection methods
const configs = [
  {
    name: 'Direct DB',
    host: 'db.klidnyqyjvbvzmplwdfl.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'jR&LKyR&Q28akaQ',
  },
  {
    name: 'Pooler (Transaction)',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.klidnyqyjvbvzmplwdfl',
    password: 'jR&LKyR&Q28akaQ',
  },
  {
    name: 'Pooler (Session)',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.klidnyqyjvbvzmplwdfl',
    password: 'jR&LKyR&Q28akaQ',
  },
  {
    name: 'Pooler US-East',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.klidnyqyjvbvzmplwdfl',
    password: 'jR&LKyR&Q28akaQ',
  },
];

async function tryConnect(config) {
  const client = new Client({
    host: config.host,
    port: config.port,
    database: 'postgres',
    user: config.user,
    password: config.password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log(`✅ ${config.name}: Connected!`);
    
    const sqlFile = process.argv[2];
    if (sqlFile) {
      const sql = fs.readFileSync(path.resolve(sqlFile), 'utf8');
      console.log(`Running SQL from: ${sqlFile} (${sql.length} bytes)`);
      await client.query(sql);
      console.log('✅ SQL executed successfully!');
    } else {
      const res = await client.query('SELECT NOW() as time, current_database() as db');
      console.log('Server:', res.rows[0]);
    }
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ ${config.name}: ${err.message}`);
    try { await client.end(); } catch(e) {}
    return false;
  }
}

async function run() {
  for (const config of configs) {
    const ok = await tryConnect(config);
    if (ok) return;
  }
  console.log('\n⚠️  All connection methods failed.');
}

run();
