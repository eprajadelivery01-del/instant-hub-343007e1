const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('../pronto-agora-hub/.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

const s = createClient(url, key);

async function check() {
  const { data } = await s.from('companies').select('id, name, logo_url, cover_url').limit(1);
  console.log(data);
}
check();
