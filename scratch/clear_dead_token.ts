import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearToken() {
  console.log("=== LIMPANDO TOKEN OBSOLETO DAS TABELAS ===");

  // Envia solicitacao para limpar token nulo via Edge Function
  const res = await supabase.functions.invoke('notify-customer', {
    body: {
      action: 'save_token',
      fcmToken: '',
      customerId: '1df9b294-475e-4f0a-9e44-0bd212c8f64e',
      userId: '366f1e01-fd0b-49fc-b3dc-2f42ae6f1fc2',
      phone: '66999426656'
    }
  });

  console.log("Resultado da limpeza:", res);
}

clearToken();
