import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { callSendPush } from '@/lib/sendPush';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BellRing, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from 'sonner';

type Diag = { step: string; ok: boolean; detail: string };

/**
 * Botão de diagnóstico: dispara uma notificação de teste nativa local E via Edge Function `send-push`
 * e mostra exatamente onde o fluxo falhou (permissão, canal, token, função, FCM).
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

    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        push({
          step: 'Permissão Nativa Android',
          ok: perm.display === 'granted',
          detail: `permissão display=${perm.display}`,
        });

        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          push({
            step: 'Solicitação de Permissão Nativa',
            ok: req.display === 'granted',
            detail: `resultado display=${req.display}`,
          });
        }

        await LocalNotifications.createChannel({
          id: 'marketplace_orders',
          name: 'Atualizações de Pedidos',
          description: 'Avisos em tempo real de pedidos',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'default',
        });

        const notifId = Math.floor(Math.random() * 899999) + 100000;
        await LocalNotifications.schedule({
          notifications: [
            {
              title: '🔔 Teste de Notificação na Central do Celular',
              body: 'Se você viu este alerta no topo do celular, o disparo nativo local está 100% OK!',
              id: notifId,
              channelId: 'marketplace_orders',
              smallIcon: 'ic_launcher',
              iconColor: '#FF5722',
              sound: 'default',
              extra: { tag: 'diagnostic-test' },
            },
          ],
        });

        push({
          step: 'Disparo Nativo Local (Central do Celular)',
          ok: true,
          detail: `id=${notifId} agendado diretamente no NotificationManager do Android`,
        });
      } catch (errLocal: any) {
        push({
          step: 'Disparo Nativo Local (Central do Celular)',
          ok: false,
          detail: `Erro: ${errLocal?.message || String(errLocal)}`,
        });
      }
    }

    push({
      step: 'Token FCM local',
      ok: Boolean(localToken),
      detail: localToken ? `${localToken.slice(0, 22)}…` : 'NENHUM token salvo neste dispositivo',
    });

    push({
      step: 'Usuário logado',
      ok: Boolean(user?.id),
      detail: user?.id ?? 'sem sessão (o push será resolvido pelo pedido)',
    });

    try {
      const body: Record<string, unknown> = {
        title: '🔔 Teste Servidor É Pra Já',
        body: 'Se você viu isso na central do celular, a Edge Function e o FCM enviaram com sucesso!',
        url: '/marketplace/orders',
      };
      if (orderId.trim()) body.orderId = orderId.trim();
      else if (localToken) body.token = localToken;
      else if (user?.id) body.userId = user.id;

      const res = await callSendPush(body);
      const data = res.data;
      setRaw(JSON.stringify(res, null, 2));

      if (!res.ok) {
        push({
          step: 'Edge Function send-push (Servidor)',
          ok: false,
          detail: res.error
            ? `Sem resposta da rede: ${res.error}`
            : `HTTP ${res.status} · ${typeof data === 'string' ? data : JSON.stringify(data)}`,
        });
        toast.error('Falha ao chamar send-push', { description: res.error ?? `HTTP ${res.status}` });
      } else {
        const sent = Number((data as any)?.sent ?? 0);
        const total = Number((data as any)?.total ?? 0);
        push({
          step: 'Edge Function send-push (Servidor)',
          ok: true,
          detail: `requestId=${(data as any)?.requestId ?? '-'}`,
        });
        push({
          step: 'Envio FCM Google',
          ok: sent > 0,
          detail:
            sent > 0
              ? `${sent}/${total} dispositivo(s) notificado(s) via Google FCM`
              : (data as any)?.warning ?? (data as any)?.error ?? 'Nenhum envio bem-sucedido',
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
