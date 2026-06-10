const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env manually
const envPath = path.resolve('../express-lane-nexus/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*?)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY || envVars.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function tryInsert(typeValue) {
  const { data, error } = await supabase.from('reviews').insert({
    order_id: '00000000-0000-0000-0000-000000000000',
    user_id: '05c4cbc4-d14f-4ee7-beb4-9d625c4e2b6b', // The user from the logs
    company_id: '00000000-0000-0000-0000-000000000000',
    rating: 5,
    type: typeValue
  });
  console.log(`Trying type '${typeValue}':`, error ? error.message : 'SUCCESS');
}

async function run() {
  await tryInsert('order');
  await tryInsert('STORE');
  await tryInsert('store');
  await tryInsert('company');
  await tryInsert('COMPANY');
  await tryInsert('app');
  await tryInsert('delivery');
}

run();
