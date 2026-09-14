# Exibir WhatsApp das 3 farmácias no cartão da listagem

## Objetivo
Mostrar o número de WhatsApp (e botão de conversa) diretamente no cartão da loja na vitrine — fora da página da loja — **somente** para as 3 farmácias configuradas em `src/lib/whatsappStores.ts`:

1. Drogaria Difarma — (65) 99606-8049
2. Drogaria Paulista — (65) 99915-4448
3. Farma Popular — (65) 99659-0987

Nenhuma outra loja recebe essa exibição. Nada de banco, RLS, migrations ou Edge Functions.

## Mudanças

### 1. `src/components/marketplace/StoreTabCard.tsx` (cartão da vitrine)
- Importar `getWhatsAppOnlyStore` e `buildWhatsAppLink` de `@/lib/whatsappStores`.
- Detectar se a loja do cartão é uma das 3: `const whatsappStore = getWhatsAppOnlyStore(company)` (verificação por ID, com fallback por nome já existente).
- Quando for uma das 3, substituir o bloco vazio "Cardápio em atualização" por um bloco de WhatsApp contendo:
  - Ícone/rótulo "Pedir pelo WhatsApp";
  - O número formatado exibido (ex.: `(65) 99606-8049`, derivado de `displayPhone`);
  - Um botão verde "Chamar no WhatsApp" que abre o link `https://wa.me/<numero-completo-com-9>?text=<mensagem codificada com encodeURIComponent>` via `buildWhatsAppLink` — números já corretos no código (5565996068049, 5565999154448, 5565996590987).
- O botão de WhatsApp usa `e.stopPropagation()` para abrir o WhatsApp **sem** navegar para a página da loja; o restante do cartão continua levando à loja normalmente.
- Lojas que não estão na lista: nenhuma mudança visual.

### 2. Validação
- Conferir no código que os 3 links usam os números completos com o 9 inicial.
- Verificar na tela inicial que apenas os 3 cartões de farmácia exibem o número/botão e que os demais (ex.: Na Chapa) permanecem iguais.
- `tsgo` + build OK.

## Fora de escopo
- Sem alteração em banco de dados, RLS, migrations, Edge Functions, push ou fluxo de pedidos.
- Sem exibir WhatsApp de nenhuma outra loja.
