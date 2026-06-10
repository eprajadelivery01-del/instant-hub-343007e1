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

const supabaseAdmin = createClient(envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function getEnums() {
  const { data, error } = await supabaseAdmin.rpc("exec_sql", { query: "SELECT unnest(enum_range(NULL::public.delivery_status))" });
  console.log({ data, error });
  
  if (error) {
    // try via postgrest if we have a table with it
    const { data: q } = await supabaseAdmin.from('deliveries').select('status').limit(1);
    console.log("Delivery status from row:", q);
  }
}

getEnums();
