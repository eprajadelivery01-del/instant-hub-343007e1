// edge-runtime types import removed (unresolvable npm:openai types)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const FALLBACK_BOT_TOKEN = "8822944243:AAE1dZ0GhBzvnDZRoIw4w9kjv5mRM3oyuWk";
const FALLBACK_CHAT_IDS = ["-5164097344", "538563060"];

const MAX_BODY_BYTES = 32 * 1024; // 32 KB

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || FALLBACK_BOT_TOKEN;
    const envChat = Deno.env.get("TELEGRAM_CHAT_ID");
    const targetChatIds = Array.from(new Set([envChat, ...FALLBACK_CHAT_IDS].filter(Boolean)));

    if (!TELEGRAM_BOT_TOKEN || targetChatIds.length === 0) {
      console.warn('[telegram-logger] TELEGRAM_BOT_TOKEN ou CHAT_IDS não configurados.');
      return new Response(JSON.stringify({ error: 'Telegram não configurado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }



    const rawBody = await req.text()
    if (rawBody.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Payload muito grande' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 413,
      })
    }

    let payload: Record<string, any>
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!payload || typeof payload !== 'object') {
      return new Response(JSON.stringify({ error: 'Corpo inválido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Filtro estrito: Ignorar apenas ruídos inofensivos de sessão expirada no browser ou plugins não implementados no Capacitor (ex: iOS/macOS)
    const errMsg = String(payload.error_message || payload.message || '').toLowerCase();
    const rawPayloadStr = rawBody.toLowerCase();
    if (
      errMsg.includes("authsessionmissingerror") ||
      errMsg.includes("invalid refresh token") ||
      errMsg.includes("failed to fetch") ||
      errMsg.includes("load failed") ||
      errMsg.includes("unimplemented") ||
      errMsg.includes("not implemented") ||
      errMsg.includes("implementation unavailable") ||
      rawPayloadStr.includes('"code":"unimplemented"') ||
      rawPayloadStr.includes('"message":"not implemented"')
    ) {
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let message = "";
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'Desconhecido';

    if (payload.type === 'INSERT' && payload.table === 'system_alerts') {
      const record = (payload.record ?? {}) as Record<string, any>;
      const title = "🚨 ALERTA DO SISTEMA (Sentinela) 🚨";
      message = `
${title}
📍 *Tipo:* ${record.type || 'Geral'}
🕒 *Hora:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}

❌ *Mensagem:* ${record.message || 'N/A'}

📝 *Detalhes:*
\`\`\`json
${JSON.stringify(record.details || {}, null, 2).substring(0, 1000)}
\`\`\`
`.trim();
    } else {
      const { app_name, error_message, stack_trace, user_id, user_email, url, additional_info, is_attack } = payload;
      
      let title = "🚨 ERRO DETECTADO NO SISTEMA 🚨";
      if (is_attack || (typeof error_message === 'string' && error_message.includes("[ATAQUE DETECTADO]"))) {
        title = "🚨 ATAQUE / ATIVIDADE SUSPEITA DETECTADA 🚨";
      }

      message = `
${title}
📱 *App:* ${app_name || 'Desconhecido'}
🕒 *Hora:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}

👤 *Usuário:* ${user_email || 'Anônimo'} (${user_id || 'N/A'})
🌐 *IP do Cliente:* ${clientIp}
🔗 *URL:* ${url || 'N/A'}

❌ *Mensagem:* ${error_message || 'N/A'}
`.trim();

      if (stack_trace) {
        const cleanStack = String(stack_trace).substring(0, 1000);
        message += `\n\n📝 *Stack Trace:*\n\`\`\`\n${cleanStack}\n\`\`\``;
      }

      if (additional_info && Object.keys(additional_info).length > 0) {
        const cleanInfo = JSON.stringify(additional_info, null, 2).substring(0, 1000);
        message += `\n\n⚙️ *Detalhes Extras:*\n\`\`\`json\n${cleanInfo}\n\`\`\``;
      }
    }

    const sendResults: Record<string, any>[] = [];

    for (const chatId of targetChatIds) {
      try {
        // 1. Tenta enviar com formatação Markdown
        let telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        // 2. Se falhar por causa de caracteres Markdown, tenta enviar como texto puro
        if (!telegramResponse.ok) {
          const rawText = message.replace(/[*`_]/g, '');
          telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: rawText,
            }),
          });
        }

        const resJson = await telegramResponse.json().catch(() => null);
        sendResults.push({ chat_id: chatId, ok: telegramResponse.ok, response: resJson });
      } catch (chatErr) {
        sendResults.push({ chat_id: chatId, ok: false, error: (chatErr as Error).message });
      }
    }

    const anySuccess = sendResults.some(r => r.ok && r.response?.ok);

    return new Response(JSON.stringify({ success: anySuccess, results: sendResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: anySuccess ? 200 : 500,
    });
  } catch (error) {
    console.error('[telegram-logger] Falha geral:', error);
    return new Response(JSON.stringify({ error: String((error as any)?.message || error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
