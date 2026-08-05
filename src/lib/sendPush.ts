import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

export type SendPushResult = {
  ok: boolean;
  status: number;
  data: any;
  stale: boolean;
  error?: string;
};

/**
 * Envia notificações push via Supabase Client SDK `supabase.functions.invoke`.
 * Evita erros de CORS/Failed to fetch em WebViews nativas no Android.
 */
export async function callSendPush(body: Record<string, unknown>): Promise<SendPushResult> {
  // 1. Tenta via Supabase Functions Client (Método Oficial SDK)
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body,
    });

    if (!error && data) {
      return { ok: true, status: 200, data, stale: false };
    }
    if (error) {
      console.warn('[sendPush] Erro no SDK ao chamar send-push:', error.message || error);
    }
  } catch (e: any) {
    console.warn('[sendPush] Exceção ao chamar send-push via SDK:', e);
  }

  // 2. Tenta via notify-customer via Supabase Functions Client
  try {
    const { data, error } = await supabase.functions.invoke('notify-customer', {
      body: {
        action: 'send_custom_push',
        fcmToken: body.token || body.fcmToken,
        title: body.title || '🔔 É Pra Já Marketplace',
        body: body.body || 'Você recebeu uma nova notificação!',
        orderId: body.orderId,
        userId: body.userId,
      },
    });

    if (!error && data) {
      return { ok: true, status: 200, data, stale: false };
    }
    if (error) {
      return { ok: false, status: 400, data: null, stale: false, error: error.message || String(error) };
    }
  } catch (e: any) {
    console.warn('[sendPush] Exceção ao chamar notify-customer:', e);
  }

  // 3. Fallback final via fetch direto com headers sanitizados
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data, stale: false, error: !res.ok ? JSON.stringify(data) : undefined };
  } catch (e: any) {
    return { ok: false, status: 0, data: null, stale: false, error: e?.message ?? String(e) };
  }
}
