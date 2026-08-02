import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("=== BUSCANDO CLIENTE DE TESTE VIA EDGE FUNCTION ===");
  const res = await supabase.functions.invoke('notify-customer', {
    body: {
      action: 'save_token',
      customerId: '1df9b294-475e-4f0a-9e44-0bd212c8f64e',
      phone: '66999426656'
    }
  });
  console.log("Resultado:", JSON.stringify(res, null, 2));
}

run();
