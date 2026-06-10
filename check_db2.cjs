const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve('../express-lane-nexus/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*?)"?$/);
  if (match) { envVars[match[1]] = match[2]; }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL, envVars.VITE_SUPABASE_PUBLISHABLE_KEY || envVars.SUPABASE_PUBLISHABLE_KEY);

async function findBotOrders() {
  const { data, error } = await supabase.from('orders')
    .select('id, created_at, total, status, customer_id, user_id, delivery_address, customers(name)')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

findBotOrders();
