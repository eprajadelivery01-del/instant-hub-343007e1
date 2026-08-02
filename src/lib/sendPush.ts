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
  * Envia notificações push para qualquer dispositivo (logado ou deslogado/visitante).
  * Inclui apikey e Authorization obrigatórios para o Gateway do Supabase.
  */
export async function callSendPush(body: Record<string, unknown>): Promise<SendPushResult> {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  // 1. Tenta chamar a Edge Function send-push
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, status: res.status, data, stale: false };
    }
  } catch (e) {
    console.warn('[sendPush] Falha ao chamar send-push, tentando fallback notify-customer:', e);
  }

  // 2. Fallback incondicional para notify-customer
  try {
    const fallbackRes = await fetch(`${SUPABASE_URL}/functions/v1/notify-customer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'send_custom_push',
        fcmToken: body.token || body.fcmToken,
        title: body.title || '🔔 É Pra Já Marketplace',
        body: body.body || 'Você recebeu uma nova notificação!',
        orderId: body.orderId,
        userId: body.userId,
      }),
    });

    const data = await fallbackRes.json().catch(() => ({}));
    return { ok: fallbackRes.ok, status: fallbackRes.status, data, stale: false };
  } catch (e: any) {
    return { ok: false, status: 0, data: null, stale: false, error: e?.message ?? String(e) };
  }
}
