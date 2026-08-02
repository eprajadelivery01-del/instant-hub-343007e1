import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPush() {
  console.log("=== TESTANDO DISPARO REAL DE PUSH FCM VIA EDGE FUNCTION ===");

  const payload = {
    orderId: '61ddfda0-bce6-4595-8cf1-cca4c7f9e2d8',
    order_id: '61ddfda0-bce6-4595-8cf1-cca4c7f9e2d8',
    status: 'delivering',
    deliveryStatus: 'delivering',
    customer_id: '1df9b294-475e-4f0a-9e44-0bd212c8f64e',
    user_id: '366f1e01-fd0b-49fc-b3dc-2f42ae6f1fc2'
  };

  const res = await supabase.functions.invoke('notify-customer', { body: payload });
  console.log("RESPOSTA DO FIREBASE PUSH:", JSON.stringify(res, null, 2));
}

testPush();
