# Tela de entrega mais rápida + chave de notificações correta

Duas correções na tela de detalhes do pedido (`/marketplace/orders/:id`), sem tocar em banco, RLS, Edge Functions, envio de push, tokens ou canais existentes.

## Problema 1 — tela demora a abrir

Hoje a tela só desenha algo depois que **três** consultas terminam juntas (pedido + itens + entrega). Enquanto isso mostra apenas um círculo girando, e como o cache expira em 10 segundos, ao voltar e entrar de novo o cliente espera outra vez.

Correção:
- Separar a consulta: cabeçalho do pedido libera a tela; itens e entrega chegam depois, com espaços reservados no lugar.
- Aproveitar o que a lista "Meus pedidos" já tem apenas como **estado inicial** para a primeira pintura. Nenhum campo ausente será inventado: sem dados reais, cada bloco (endereço, itens, entrega, pagamento) fica em carregamento até a consulta terminar — nunca "endereço não informado", lista vazia ou total zerado por falta de dado.
- Ao reabrir, exibir o que já foi carregado antes e atualizar por trás.
- Corrigir a assinatura de tempo real, hoje derrubada e recriada sempre que a chave de notificações muda — sem duplicar nem perder ouvintes ao trocar de pedido, voltar à lista ou mexer na chave.

## Problema 2 — "Seu navegador não suporta notificações" e chave inconsistente

No aplicativo instalado a tela verifica se o *navegador* suporta notificações, o que nunca vale ali. Por isso surge a mensagem falsa, a chave aparece sempre ligada ignorando a permissão real, e tocar nela pode gerar aviso indevido.

Mecanismo já existente (auditado): a permissão de push no app é controlada por `@capacitor-firebase/messaging` (`checkPermissions` / `requestPermissions`); `@capacitor/local-notifications` só cria canais e exibe avisos locais. Nada novo será instalado.

Três estados distintos:
- preferência local do cliente (a que a chave guarda hoje);
- permissão real do aparelho;
- estado efetivo = preferência ligada **e** permissão concedida — é isso que a chave mostra.

Comportamento:
- Textos refletem o estado real: "Notificações ativadas", "Ativar notificações", "Notificações desativadas" (com orientação para reativar nos ajustes do aparelho quando o sistema não permitir pedir de novo).
- Ao ligar: pede permissão pelo caminho nativo. Concedida → liga. Negada → permanece desligada. Sem possibilidade de novo pedido → permanece desligada com a orientação acima.
- Ao desligar: apenas a preferência local muda. Nada de apagar token, cancelar canais, remover registro ou alterar o recebimento global que já funciona.
- Nenhum popup ou aviso ao abrir a tela.
- Na web, o comportamento atual continua igual.

## Medição

Marcações temporárias `[DELIVERY] mount / header-start / header-end / items-start / items-end / delivery-start / delivery-end / first-render` e `[NOTIFICATION] platform / native-permission / preference / effective-state`. Serão medidos **dois** tempos: do toque até a primeira informação útil visível, e do toque até o pedido completo. Os registros temporários saem depois da validação.

## Detalhes técnicos

- `src/pages/marketplace/OrderDetail.tsx`: dividir a `useQuery` `['order', id]` em cabeçalho + detalhes; `placeholderData` do cache da lista apenas como semente, com flags por bloco para distinguir "sem dado ainda" de "dado vazio"; remover o gate `loading || !order`; tirar `notifEnabled` das dependências do `useEffect` do canal Realtime (ler via ref).
- `src/lib/routeDataPrefetchers.ts`: alinhar o prefetch de `/marketplace/orders` às novas chaves, mantendo o mesmo SELECT.
- Novo hook fino de UI (`src/hooks/useNotificationPermission.ts`) que ramifica com `Capacitor.isNativePlatform()`, usa `FirebaseMessaging.checkPermissions()/requestPermissions()` no app e a Notification API na web. Só leitura de estado e pedido de permissão — nenhum ouvinte, canal ou envio novo.
- `src/hooks/useOrderNotifications.ts`, `supabase/functions/*`, SQL e tokens: intocados.

## Validação

Build + verificação de tipos, os dois tempos medidos, e teste de fluxo (abrir pedido, ligar/desligar, voltar, abrir outro pedido, reabrir, reiniciar o app). O teste final de permissão nativa precisa ser feito por você no Android real, com um build novo.
