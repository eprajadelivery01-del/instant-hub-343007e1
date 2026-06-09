const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('../pronto-agora-hub/.env', 'utf8');
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];
const url = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];

const s = createClient(url, key);

async function test() {
  const { data: { session }, error: authErr } = await s.auth.signInWithPassword({
    email: 'davinynsilva@gmail.com',
    password: 'Helô2023'
  });
  
  if (authErr) {
    console.error('Auth err', authErr);
    return;
  }
  
  console.log('Auth OK, user:', session.user.id);
  
  const file = Buffer.from('test');
  const { data, error } = await s.storage.from('store-assets').upload(`test/test-${Date.now()}.txt`, file, {upsert: true});
  console.log('Upload result:', data, error);
}

test();
