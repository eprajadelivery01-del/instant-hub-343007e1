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

async function testRpc() {
  // Let's get a real delivery to test the RPC
  const { data: deliveries } = await supabase.from('deliveries').select('id, status').limit(1);
  if (!deliveries || deliveries.length === 0) return console.log("No deliveries found");
  
  const deliveryId = deliveries[0].id;
  
  const { data, error } = await supabase.rpc("update_delivery_status_safe", {
    p_delivery_id: deliveryId,
    p_status: "accepted"
  });
  
  console.log("RPC Response:", { data, error });
}

testRpc();
