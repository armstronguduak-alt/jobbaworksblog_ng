const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
(async () => {
  const addrs = ['TWccR44HCFViAx5ZuA9ZVW87gnLmECCYrn', 'TXXf8fZ5dwtFAdjqmGfbC2bBkXxSXmmQjU', 'TLRiGKB9GxyWYEhdhJsiB9AJsNkRfjNAn2', 'TSaWX6c1PDVKEm6p6VWDAiS9Pii7JcE5xN', 'TXCHnVZ9ScXjdXfx9hKBT7GQ6KwPD1Hpxz'];
  const { error } = await supabase.from('system_settings').upsert({ key: 'usdt_addresses', value: addrs });
  if (error) console.error(error);
  else console.log('Successfully updated USDT addresses!');
})();
