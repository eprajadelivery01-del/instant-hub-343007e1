const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('../pronto-agora-hub/.env', 'utf8');
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];
const url = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const s = createClient(url, key);
async function test() {
  const { data } = await s.storage.listBuckets();
  console.log('Buckets on VITE_SUPABASE_URL:', data?.map(b => b.name));
}
test();
