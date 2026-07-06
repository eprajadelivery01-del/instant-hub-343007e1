const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const DEV_URL = "https://mqhzlhuaxdntkupnkmdk.supabase.co";
const prodKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs";

const checkJose = fs.readFileSync('c:/Userás/antho/.gemini/antigravity-ide/scratch/eprajadelivery01-del/pronto-agora-hub/check_jose.cjs', 'utf8');
const devKeyMatch = checkJose.match(/SUPABASE_PUBLISHABLE_KEY = "(.*)"/);
const devKeyActual = devKeyMatch ? devKeyMatch[1] : null;

async function check() {
  console.log("=== DEV DB ===");
  const devClient = createClient(DEV_URL, devKeyActual);
  const { data: devData, error: devError } = await devClient.from('companies').select('id, name, active, is_active, show_in_marketplace');
  console.log("Dev Error:", devError);
  console.log("Dev Companies Count:", devData ? devData.length : 0);
  if (devData) console.log("Dev Companies:", devData.map(c => `${c.name} (active: ${c.active}, show: ${c.show_in_marketplace})`));

  console.log("\n=== PROD DB ===");
  const prodClient = createClient("https://nptkxlrhrlssdsevpgqe.supabase.co", prodKey);
  const { data: prodData, error: prodError } = await prodClient.from('companies').select('id, name, active, is_active, show_in_marketplace');
  console.log("Prod Error:", prodError);
  console.log("Prod Companies Count:", prodData ? prodData.length : 0);
  if (prodData) console.log("Prod Companies:", prodData.map(c => `${c.name} (active: ${c.active}, show: ${c.show_in_marketplace})`));
}

check();
