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

const supabase = createClient(envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkRpc() {
  const { data: deliveries } = await supabaseAdmin.from('deliveries').select('id, status').limit(1);
  if (!deliveries || deliveries.length === 0) return console.log("No deliveries");
  
  const deliveryId = deliveries[0].id;
  
  const { data, error } = await supabaseAdmin.rpc("update_delivery_status_safe", {
    p_delivery_id: deliveryId,
    p_status: "accepted"
  });
  console.log({ data, error });
}

checkRpc();
