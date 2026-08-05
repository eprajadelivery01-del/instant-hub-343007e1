# Garantir notificações de acompanhamento na central do celular

## Objetivo
Unificar as atualizações de pedido para que cada mudança relevante apareça tanto na central interna do app quanto na central nativa do Android/iPhone, inclusive com o app fechado ou em segundo plano.

## Diagnóstico confirmado
- A central interna acompanha `orders` e `deliveries` via Supabase Realtime e gera notificações locais apenas enquanto o app está executando.
- O push em segundo plano depende do trigger PostgreSQL chamar a Edge Function `send-push`; hoje o trigger cobre somente mudanças em `orders.status`, não mudanças em `deliveries.status`.
- Existem dois consumidores Realtime no cliente disparando notificações nativas para os mesmos eventos, o que pode gerar duplicidade quando o app está aberto.
- O registro do token FCM é repetido e usa vários fallbacks, inclusive outra função (`notify-customer`), dificultando saber se o token canônico foi realmente salvo.
- A `send-push` contém uma credencial privada Firebase embutida como fallback. Ela deve ser removida do código e lida exclusivamente do secret seguro `FIREBASE_SERVICE_ACCOUNT_JSON`.
- A função possui um fallback que, se não encontrar o destinatário do pedido, envia para os últimos dispositivos ativos. Isso pode notificar clientes errados e será removido.

## Implementação
1. **Criar uma fonte única de eventos de acompanhamento**
   - Padronizar os status de `orders` e `deliveries` com o mesmo resolvedor e mensagens usadas pela central interna.
   - Cobrir: pedido confirmado, em preparo, pronto, entregador aceitou, coleta, saiu para entrega, entregue e cancelado.
   - Não notificar o status inicial `pending` e deduplicar por `pedido + status`.

2. **Corrigir o envio em segundo plano no Supabase externo**
   - Atualizar o SQL do trigger para observar alterações relevantes em `orders` e `deliveries`.
   - Enviar `orderId`, status normalizado, título, mensagem e rota do pedido para `send-push`.
   - Registrar o resultado assíncrono do `pg_net` para permitir diagnóstico de falhas do trigger/função.

3. **Endurecer a Edge Function `send-push`**
   - Remover a chave privada Firebase do repositório e exigir o secret seguro.
   - Validar o payload e localizar tokens somente do cliente proprietário do pedido.
   - Remover o envio de emergência para dispositivos não relacionados.
   - Manter prioridade alta, canal `marketplace_orders`, som e vibração, com payload correto para Android e APNs/iPhone.
   - Retornar e registrar contagens de enviados, tokens ausentes, inválidos e erros FCM.

4. **Simplificar o registro do token no app**
   - Tornar `device_tokens` a fonte canônica e registrar cada token uma única vez pela `send-push`.
   - Associar corretamente `user_id`, `customer_id`, plataforma e dispositivo; atualizar rotação e reativação do token.
   - Remover chamadas duplicadas e fallbacks inconsistentes para `profiles`, `users` e `notify-customer`.
   - Expor logs claros quando a permissão foi negada, o registro nativo falhou ou o token não chegou ao servidor.

5. **Unificar foreground e central interna**
   - Manter um único listener global no app para atualizar o histórico interno e, quando necessário, criar a notificação local no foreground.
   - Evitar que o push recebido e o Realtime gerem duas notificações iguais.
   - Ao tocar na notificação, abrir diretamente o acompanhamento do pedido correspondente.

6. **Validar o fluxo completo**
   - Testar cada status com o app aberto, em segundo plano e fechado.
   - Confirmar permissão nativa, token ativo em `device_tokens`, execução do trigger, resposta da Edge Function e recebimento pelo FCM/APNs.
   - Verificar ausência de duplicatas e garantir que nenhum token de outro cliente receba o pedido.

## Publicação necessária
As correções de background só entram em vigor depois de aplicar o SQL e publicar novamente a Edge Function `send-push` no Supabase externo. Mudanças nativas também exigem gerar e instalar uma nova versão Android/iOS; o preview web não consegue validar notificações com o app fechado.