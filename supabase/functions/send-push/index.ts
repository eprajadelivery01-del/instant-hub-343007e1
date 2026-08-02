// Edge Function: send-push
// Envia notificações push via FCM HTTP v1 usando a Service Account do Firebase.
// Secret necessário: FIREBASE_SERVICE_ACCOUNT_JSON (conteúdo do JSON da service account)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SA_RAW = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function b64url(bytes: Uint8Array | string): string {
  const arr = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let bin = "";
  arr.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OAuth falhou: ${JSON.stringify(json)}`);
  cachedToken = { value: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cachedToken.value;
}

async function sendToToken(
  sa: ServiceAccount,
  accessToken: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data,
          android: {
            priority: "HIGH",
            notification: {
              channel_id: "marketplace_orders",
              sound: "default",
              default_vibrate_timings: true,
            },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: { aps: { sound: "default", badge: 1 } },
          },
        },
      }),
    },
  );
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, response: json };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!SA_RAW) {
      return json({ error: "FIREBASE_SERVICE_ACCOUNT_JSON não configurado" }, 500);
    }
    const sa = JSON.parse(SA_RAW) as ServiceAccount;

    const body = await req.json().catch(() => ({}));
    const title: string = String(body.title ?? "É Pra Já").slice(0, 120);
    const message: string = String(body.body ?? body.message ?? "Você tem uma nova atualização.").slice(0, 400);
    const extra: Record<string, string> = {};
    if (body.orderId) extra.orderId = String(body.orderId);
    if (body.status) extra.status = String(body.status);
    if (body.url) extra.url = String(body.url);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve os tokens de destino
    let tokens: string[] = Array.isArray(body.tokens)
      ? body.tokens.filter(Boolean).map(String)
      : body.token
        ? [String(body.token)]
        : [];

    if (tokens.length === 0) {
      let userId: string | null = body.userId ? String(body.userId) : null;
      let customerId: string | null = body.customerId ? String(body.customerId) : null;

      if (!userId && !customerId && body.orderId) {
        const { data: order } = await supabase
          .from("orders")
          .select("customer_id, user_id")
          .eq("id", String(body.orderId))
          .maybeSingle();
        customerId = (order as any)?.customer_id ?? null;
        userId = (order as any)?.user_id ?? null;
      }

      const found = new Set<string>();
      if (customerId) {
        const { data } = await supabase
          .from("customers")
          .select("fcm_token")
          .or(`id.eq.${customerId},user_id.eq.${customerId}`);
        (data ?? []).forEach((r: any) => r?.fcm_token && found.add(r.fcm_token));
      }
      if (userId) {
        const { data } = await supabase
          .from("profiles")
          .select("fcm_token")
          .eq("id", userId);
        (data ?? []).forEach((r: any) => r?.fcm_token && found.add(r.fcm_token));
        const { data: c2 } = await supabase
          .from("customers")
          .select("fcm_token")
          .eq("user_id", userId);
        (c2 ?? []).forEach((r: any) => r?.fcm_token && found.add(r.fcm_token));
      }
      tokens = Array.from(found);
    }

    if (tokens.length === 0) {
      return json({ sent: 0, warning: "Nenhum token FCM encontrado para o destinatário" });
    }

    const accessToken = await getAccessToken(sa);
    const results = await Promise.all(
      tokens.map((t) => sendToToken(sa, accessToken, t, title, message, extra)),
    );
    const sent = results.filter((r) => r.ok).length;

    return json({ sent, total: tokens.length, results });
  } catch (e) {
    console.error("[send-push] erro:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
