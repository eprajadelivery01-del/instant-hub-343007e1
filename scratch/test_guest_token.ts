import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testGuest() {
  console.log("=== TESTANDO SALVAMENTO E ENVIO PARA DISPOSITIVO GUEST (DESLOGADO) ===");

  const guestToken = 'cwAhLSWTT6mFjuAVed...';

  // 1. Registrar token de dispositivo deslogado na tabela device_tokens
  const regRes = await supabase.from('device_tokens').upsert({
    token: guestToken,
    platform: 'android',
    last_seen_at: new Date().toISOString()
  }, { onConflict: 'token' });

  console.log("Resultado registro device_tokens:", regRes);

  // 2. Tentar notificar a Edge Function notify-customer
  const pushRes = await supabase.functions.invoke('notify-customer', {
    body: {
      action: 'send_custom_push',
      fcmToken: guestToken,
      title: '🏷️ Cupom Especial É Pra Já!',
      body: 'Você ganhou R$ 15 OFF no seu próximo pedido! Aproveite agora.'
    }
  });

  console.log("Resultado push deslogado:", JSON.stringify(pushRes, null, 2));
}

testGuest();
