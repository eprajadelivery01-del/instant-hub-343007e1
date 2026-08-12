import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/lib/supabase";
import { callSendPush } from "@/lib/sendPush";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendNativeDeviceNotification } from "@/hooks/useOrderNotifications";

type Row = { label: string; value: string };

export default function PushDiagnostics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [log, setLog] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const collect = async () => {
    const out: Row[] = [];
    const platform = Capacitor.getPlatform();
    out.push({ label: "Plataforma", value: `${platform} (nativo: ${Capacitor.isNativePlatform()})` });

    const token =
      localStorage.getItem("@epraja_fcm_token") || localStorage.getItem("fcm_token") || "";
    out.push({ label: "Token FCM local", value: token ? `${token.slice(0, 24)}…` : "AUSENTE" });

    if (Capacitor.isNativePlatform()) {
      try {
        const p = await FirebaseMessaging.checkPermissions();
        out.push({ label: "Permissão push", value: p.receive });
      } catch (e: any) {
        out.push({ label: "Permissão push", value: `erro: ${e?.message ?? e}` });
      }
      try {
        const l = await LocalNotifications.checkPermissions();
        out.push({ label: "Permissão central (local)", value: l.display });
      } catch (e: any) {
        out.push({ label: "Permissão central (local)", value: `erro: ${e?.message ?? e}` });
      }
      if (!token) {
        try {
          const result = await FirebaseMessaging.getToken();
          if (result.token) {
            localStorage.setItem("@epraja_fcm_token", result.token);
            localStorage.setItem("fcm_token", result.token);
            out.push({ label: "Token FCM Firebase", value: `${result.token.slice(0, 24)}…` });
          }
        } catch (e: any) {
          out.push({ label: "Token FCM Firebase", value: `erro: ${e?.message ?? e}` });
        }
      }
    } else {
      out.push({
        label: "Permissão navegador",
        value: typeof Notification !== "undefined" ? Notification.permission : "indisponível",
      });
    }

    if (token) {
      const { data, error } = await supabase
        .from("device_tokens")
        .select("token, platform, updated_at, disabled_at, last_error_code")
        .eq("token", token)
        .maybeSingle();
      out.push({
        label: "Token salvo no banco",
        value: error
          ? `erro: ${error.message}`
          : data
            ? `sim (${(data as any).platform ?? "?"}) ${(data as any).disabled_at ? "— DESATIVADO" : "— ativo"}`
            : "NÃO ENCONTRADO",
      });
    }

    setRows(out);
  };

  useEffect(() => {
    collect();
  }, []);

  const testLocal = async () => {
    await sendNativeDeviceNotification("Teste na central", {
      body: "Se você está vendo isso na bandeja, as notificações locais funcionam.",
      tag: `diag-${Date.now()}`,
    });
    setLog("Notificação local disparada.");
  };

  const testServer = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("@epraja_fcm_token") || localStorage.getItem("fcm_token") || "";
      const res = await callSendPush({
        token: token || undefined,
        title: "Teste via Firebase",
        body: "Push enviado pela Edge Function send-push.",
      });
      setLog(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setLog(`Falha: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
      collect();
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">Diagnóstico de Push</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium text-right break-all">{r.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={testLocal} variant="secondary">Testar central (local)</Button>
        <Button onClick={testServer} disabled={loading}>
          {loading ? "Enviando…" : "Testar via Firebase"}
        </Button>
        <Button onClick={collect} variant="outline">Atualizar</Button>
      </div>

      {log && (
        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-80 whitespace-pre-wrap">{log}</pre>
      )}
    </div>
  );
}
