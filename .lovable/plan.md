# Push na central do aparelho — plano definitivo

Objetivo: toda mudança de status de pedido/entrega gera uma notificação **na central do celular** (bandeja do Android/iOS), com o app aberto, em segundo plano ou fechado, usando Firebase (FCM HTTP v1).

## Fluxograma da notificação

```text
[1] Loja/entregador muda status
        |
        v
[2] Postgres: UPDATE em orders.status ou deliveries.status
        |
        v
[3] Trigger notify_order_status_push()  --pg_net-->  Edge Function send-push
        |                                                   |
        |                                                   v
        |                                   [4] Resolve destinatários (cliente,
        |                                       loja, entregador) -> device_tokens
        |                                                   |
        |                                                   v
        |                                   [5] FCM HTTP v1 (OAuth service account)
        |                                       payload: notification + data
        |                                       + android.notification.channel_id
        |                                       + apns.aps (alert, sound, badge)
        |                                                   |
        |                    +------------------------------+------------------+
        |                    v                                                 v
        |        [6a] App fechado/background                        [6b] App aberto
        |        Android/iOS mostram na CENTRAL                     pushNotificationReceived
        |        automaticamente (bloco notification)               -> LocalNotifications
        |                    |                                                 |
        |                    +------------------+------------------------------+
        |                                       v
        |                        [7] Toque na notificação
        |                        -> abre /marketplace/orders/:orderId
        v
[8] Realtime no app (fallback visual em tempo real, deduplicado por tag 15s)
```

## Etapas do trabalho

1. **Trigger cobrindo entregas** — atualizar `scripts/order_status_push_trigger.sql` para incluir `deliveries` (mapeando `delivery.order_id`) e enviar `orderId`, `status`, `route` no payload, além de `orders`.
2. **send-push robusto** — remover a service account embutida no código (`DEFAULT_SA_JSON`) e exigir o secret `FIREBASE_SERVICE_ACCOUNT_JSON`; garantir payload com bloco `notification` (obrigatório para a central quando o app está fechado), `android.notification.channel_id = "epraja_orders"`, prioridade `high`, e `apns` com `sound`/`content-available`.
3. **Canal Android** — confirmar/criar o canal `epraja_orders` com importância HIGH no boot do app (`LocalNotifications.createChannel`) e no `AndroidManifest` como canal padrão do FCM.
4. **iOS** — adicionar `GoogleService-Info.plist` (falta no projeto) e capability de Push/Background Modes; sem isso, iOS nunca recebe push.
5. **Cliente** — em `useOrderNotifications.ts`: registrar token FCM sempre no login, salvar em `device_tokens`, e com app aberto converter `pushNotificationReceived` em `LocalNotifications.schedule` (a central não mostra sozinha quando em foreground). Manter dedupe por `tag`.
6. **Diagnóstico** — página/rota oculta `/marketplace/diagnostico-push` mostrando: permissão, token atual, se está salvo no banco, último envio e erro FCM retornado.

## Ações fora do Lovable (necessárias, só você pode fazer)

- `supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$(cat chave.json)"` (rotacione a chave atual, ela ficou exposta no código).
- `supabase functions deploy send-push --no-verify-jwt`
- Rodar `scripts/order_status_push_trigger.sql` no SQL Editor, incluindo os `alter database ... set app.settings.*`.
- `npm run build && npx cap sync` e gerar novo APK/AAB.

## Detalhes técnicos

- FCM HTTP v1 exige o bloco `message.notification` para exibição automática na bandeja; só `data` faz a mensagem ser entregue silenciosamente e o Android não mostra nada com o app fechado.
- `android.priority: "HIGH"` + canal HIGH evita atraso por Doze.
- Tokens inválidos (`UNREGISTERED`, `SENDER_ID_MISMATCH`) já são limpos pelo ciclo de vida em `device_tokens_lifecycle.sql`.
