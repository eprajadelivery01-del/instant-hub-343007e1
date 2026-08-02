import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSave() {
  console.log("=== TESTANDO SALVAMENTO DE TOKEN VIA EDGE FUNCTION SERVICE ROLE ===");

  const payload = {
    action: 'save_token',
    fcmToken: 'dj3C_qzHTnWhROJ5ljNWR2:APA91bGTQfPrPBGF8UgktS_ZPrsfQdX_aRfUF7JW4fYxJz9TU0LkhfBCLHIBkF2ueaO6MmJ6RI9J9hmPkENNg7oiUwQv5hPe4LMLVZm3YuJXI8bJN8SJq0k',
    customerId: '1df9b294-475e-4f0a-9e44-0bd212c8f64e',
    userId: '366f1e01-fd0b-49fc-b3dc-2f42ae6f1fc2',
    phone: '66999426656'
  };

  const res = await supabase.functions.invoke('notify-customer', { body: payload });
  console.log("Resposta Edge Function:", JSON.stringify(res, null, 2));
}

testSave();
