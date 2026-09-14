# Tela de entrega mais rápida + chave de notificações correta

Duas correções na tela de detalhes do pedido (`/marketplace/orders/:id`), sem tocar em banco, RLS, Edge Functions, envio de push ou canais existentes.

## Problema 1 — tela demora a abrir

Hoje a tela só desenha algo depois que **três** consultas terminam juntas (pedido + itens + entrega). Enquanto isso ela mostra apenas um círculo girando, e como o cache expira em 10 segundos, ao voltar e entrar de novo o cliente vê a espera outra vez.

Correção:
- Mostrar imediatamente os dados que a lista "Meus pedidos" já tem (loja, valor, status) e completar o resto em segundo plano — sem tela em branco.
- Separar a consulta: cabeçalho do pedido libera a tela; itens e entrega chegam depois, com espaços reservados no lugar.
- Ao reabrir a tela, exibir os dados anteriores na hora e atualizar por trás.
- Corrigir a assinatura de tempo real, que hoje é derrubada e recriada sempre que a chave de notificações muda.
- Medir o tempo antes/depois com marcações `[DELIVERY]` (montagem, início/fim de cada consulta, primeira renderização) e remover essas medições ao final.

## Problema 2 — "Seu navegador não suporta notificações" e chave inconsistente

No aplicativo Android a tela verifica se o *navegador* suporta notificações, o que nunca vale para o app instalado. O texto e a chave usam a mesma checagem errada, então a chave aparece sempre ligada, ignorando a permissão real, e ao tocar nela pode surgir um aviso falso.

Correção:
- No app instalado (Android/iOS): usar a permissão real do próprio aplicativo, já disponível pelo mecanismo de notificações que o projeto usa. Nenhuma biblioteca nova.
- No navegador: manter o comportamento atual.
- Textos passam a refletir o estado real: "Notificações ativadas", "Ativar notificações", "Notificações desativadas" (com orientação para reativar nos ajustes do aparelho).
- A chave liga só quando a permissão está de fato concedida; ao ligar, o app pede permissão pelo caminho nativo; se o cliente recusar, a chave volta para desligado.
- Desligar apenas guarda a preferência local — nada de apagar registro do aparelho, canais ou envio de push.
- Nenhum aviso ou popup ao abrir a tela.

## Detalhes técnicos

- `src/pages/marketplace/OrderDetail.tsx`: dividir a `useQuery` `['order', id]` em cabeçalho + detalhes; `placeholderData` a partir do cache da lista de pedidos; remover o gate `loading || !order` para renderizar com esqueleto; tirar `notifEnabled` das dependências do `useEffect` do canal Realtime (ler via ref).
- `src/lib/routeDataPrefetchers.ts`: alinhar o prefetch de `/marketplace/orders` às novas chaves de consulta, mantendo o mesmo SELECT.
- Novo hook fino de UI (ex.: `src/hooks/useNotificationPermission.ts`) que ramifica com `Capacitor.isNativePlatform()`, lê `checkPermissions()`/`requestPermissions()` do plugin já instalado (`@capacitor/local-notifications` / `@capacitor-firebase/messaging`) e cai no `Notification` API na web. Só leitura de estado e pedido de permissão — nenhum listener, canal ou envio novo.
- `src/hooks/useOrderNotifications.ts`, `supabase/functions/*`, SQL e tokens: intocados.

## Validação

Build + verificação de tipos, medição do tempo de abertura antes/depois, e teste de fluxo (abrir pedido, ligar/desligar a chave, voltar e reabrir). O teste final de permissão nativa precisa ser feito por você no Android real, com um build novo.
