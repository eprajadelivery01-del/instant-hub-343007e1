import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BellRing, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

type Diag = { step: string; ok: boolean; detail: string };

const FUNCTIONS_URL = 'https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/send-push';

/**
 * Fallback sem preflight CORS: usa Content-Type text/plain (simple request),
 * o que evita o OPTIONS que falha quando a Edge Function deployada está desatualizada.
 */
async function invokeSendPushDirect(body: Record<string, unknown>) {
  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, data: parsed };
}

/**
 * Botão de diagnóstico: dispara uma notificação de teste via Edge Function `send-push`
 * e mostra exatamente onde o fluxo falhou (token, função, FCM).
 */
export function PushTestButton({ className }: { className?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [diags, setDiags] = useState<Diag[]>([]);
  const [raw, setRaw] = useState<string>('');

  const push = (d: Diag) => setDiags((prev) => [...prev, d]);

  const runTest = async () => {
    setLoading(true);
    setDiags([]);
    setRaw('');

    const localToken =
      localStorage.getItem('@epraja_fcm_token') || localStorage.getItem('fcm_token') || '';

    push({
      step: 'Plataforma',
      ok: true,
      detail: `${Capacitor.getPlatform()} · nativo=${Capacitor.isNativePlatform()}`,
    });

    push({
      step: 'Permissão do navegador',
      ok: typeof Notification === 'undefined' || Notification.permission === 'granted',
      detail: typeof Notification === 'undefined' ? 'API indisponível (nativo)' : Notification.permission,
    });

    push({
      step: 'Token FCM local',
      ok: Boolean(localToken),
      detail: localToken ? `${localToken.slice(0, 18)}…` : 'NENHUM token salvo neste dispositivo',
    });

    push({
      step: 'Usuário logado',
      ok: Boolean(user?.id),
      detail: user?.id ?? 'sem sessão (o push será resolvido pelo pedido)',
    });

    try {
      const body: Record<string, unknown> = {
        title: '🔔 Teste É Pra Já',
        body: 'Se você viu isso na central do celular, o push está funcionando!',
        url: '/marketplace/orders',
      };
      if (orderId.trim()) body.orderId = orderId.trim();
      else if (localToken) body.token = localToken;
      else if (user?.id) body.userId = user.id;

      const { data, error } = await supabase.functions.invoke('send-push', { body });

      if (error) {
        push({
          step: 'Edge Function (via SDK)',
          ok: false,
          detail: `${error.message ?? String(error)} — tentando via fetch direto…`,
        });

        const fallback = await invokeSendPushDirect(body);
        setRaw(JSON.stringify({ sdkError: error.message, fallback }, null, 2));

        const isStale =
          typeof fallback.data === 'string' && fallback.data.includes('Not an insert event');

        push({
          step: 'Edge Function (fetch direto)',
          ok: fallback.status >= 200 && fallback.status < 300 && !isStale,
          detail: isStale
            ? 'A função send-push publicada no Supabase está DESATUALIZADA (versão antiga, sem CORS e sem envio FCM). Faça o redeploy: supabase functions deploy send-push --no-verify-jwt'
            : `HTTP ${fallback.status} · ${typeof fallback.data === 'string' ? fallback.data : JSON.stringify(fallback.data)}`,
        });

        toast.error(
          isStale ? 'Edge Function desatualizada no Supabase' : 'Falha ao chamar send-push',
          { description: isStale ? 'Refaça o deploy de send-push' : error.message },
        );
      } else {
        setRaw(JSON.stringify(data, null, 2));
        const sent = Number((data as any)?.sent ?? 0);
        const total = Number((data as any)?.total ?? 0);
        push({
          step: 'Edge Function send-push',
          ok: true,
          detail: `requestId=${(data as any)?.requestId ?? '-'}`,
        });
        push({
          step: 'Envio FCM',
          ok: sent > 0,
          detail:
            sent > 0
              ? `${sent}/${total} dispositivo(s) notificado(s)`
              : (data as any)?.warning ?? (data as any)?.error ?? 'Nenhum envio bem-sucedido (veja o detalhe abaixo)',
        });
        if (sent > 0) toast.success(`Push enviado para ${sent} dispositivo(s)`);
        else toast.error('Nenhum push enviado', { description: (data as any)?.warning ?? 'Veja o diagnóstico' });
      }
    } catch (e: any) {
      push({ step: 'Edge Function send-push', ok: false, detail: e?.message ?? String(e) });
      setRaw(String(e?.stack ?? e));
      toast.error('Erro inesperado no teste de push');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <BellRing className="mr-2 h-4 w-4" />
        Testar notificação
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Teste de notificação push</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="push-order-id">ID do pedido (opcional)</Label>
              <Input
                id="push-order-id"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Deixe vazio para usar este dispositivo"
              />
            </div>

            <Button onClick={runTest} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
              Disparar notificação
            </Button>

            {diags.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
                {diags.map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={d.ok ? 'text-emerald-500' : 'text-destructive'}>{d.ok ? '✓' : '✕'}</span>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{d.step}</p>
                      <p className="break-all text-xs text-muted-foreground">{d.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {raw && (
              <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-[10px] leading-relaxed">
                {raw}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
