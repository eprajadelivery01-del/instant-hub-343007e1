import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const DEFAULT_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const DEFAULT_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";

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
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || DEFAULT_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || DEFAULT_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('[telegram-logger] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados nas variáveis de ambiente.');
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

    // 1. Tenta enviar com formatação Markdown
    let telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
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
          chat_id: TELEGRAM_CHAT_ID,
          text: rawText,
        }),
      });
    }

    const resJson = await telegramResponse.json().catch(() => null);

    if (!telegramResponse.ok) {
      console.error(`[telegram-logger] Telegram API falhou:`, resJson);
      return new Response(JSON.stringify({ error: "Telegram API error", detail: resJson }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, telegram: resJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[telegram-logger] Falha geral:', error);
    return new Response(JSON.stringify({ error: String((error as any)?.message || error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
