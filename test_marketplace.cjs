const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../express-lane-nexus/.env');
const env = fs.readFileSync(envPath, 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL="(.*)"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data, error } = await supabase.from('companies').select('id, name, description, category, rating, is_open, active, is_active, delivery_fee, delivery_regions_pricing, show_in_marketplace, city, state, banner_url, cover_url, logo_url, business_hours, prep_time_min, prep_time_max, created_at, products(*)');
  console.log('Error:', JSON.stringify(error, null, 2));
  console.log('Data length:', data ? data.length : 0);
}
run();
