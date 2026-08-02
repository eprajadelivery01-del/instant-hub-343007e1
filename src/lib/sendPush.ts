const SEND_PUSH_URL = 'https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/send-push';

export type SendPushResult = {
  ok: boolean;
  status: number;
  data: any;
  /** true quando a função publicada no Supabase ainda é a versão antiga */
  stale: boolean;
  error?: string;
};

/**
 * Chama a Edge Function `send-push` usando um "simple request" (Content-Type
 * text/plain), o que evita o preflight OPTIONS. O WebView do Android falhava
 * com "Failed to send a request to the Edge Function" porque a versão publicada
 * da função não responde ao preflight.
 */
export async function callSendPush(body: Record<string, unknown>): Promise<SendPushResult> {
  try {
    const res = await fetch(SEND_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {}

    const stale = typeof data === 'string' && data.includes('Not an insert event');

    return { ok: res.ok && !stale, status: res.status, data, stale };
  } catch (e: any) {
    return { ok: false, status: 0, data: null, stale: false, error: e?.message ?? String(e) };
  }
}
