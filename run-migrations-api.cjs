/**
 * Run SQL migrations via Supabase Management API (HTTPS).
 * This bypasses DNS/IPv6/firewall issues by using the same HTTPS
 * endpoints that the Supabase Dashboard uses.
 *
 * Usage:
 *   node run-migrations-api.cjs YOUR_SUPABASE_ACCESS_TOKEN
 *
 * To get your access token:
 *   1. Go to https://supabase.com/dashboard/account/tokens
 *   2. Click "Generate new token"
 *   3. Give it a name and copy the token
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const token = process.argv[2];
if (!token) {
  console.error('❌ Usage: node run-migrations-api.cjs YOUR_ACCESS_TOKEN');
  console.error('');
  console.error('   Get your token from: https://supabase.com/dashboard/account/tokens');
  console.error('   Click "Generate new token", copy the token, then run this command.');
  process.exit(1);
}

const PROJECT_REF = 'klidnyqyjvbvzmplwdfl';

const migrationFiles = [
  'supabase/migrations/20260421000000_apply_platform_lockdown.sql',
];

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('🚀 Running migrations via Supabase Management API (HTTPS)...\n');

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`⏳ Running ${file}...`);

    try {
      const result = await executeSQL(sql);
      console.log(`✅ ${file} — SUCCESS\n`);
    } catch (err) {
      console.error(`❌ ${file} — FAILED`);
      console.error(`   Error: ${err.message}\n`);
    }
  }

  console.log('🎉 Done!');
}

run();
