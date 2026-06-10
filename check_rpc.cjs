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

async function checkRpc() {
  const { data, error } = await supabase.rpc("update_delivery_status_safe", {
    p_delivery_id: "00000000-0000-0000-0000-000000000000",
    p_status: "accepted"
  });
  console.log({ data, error });
}

checkRpc();
