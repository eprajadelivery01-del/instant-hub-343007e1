# Biblioteca de Bugs - É Pra Já Delivery

Este arquivo funciona como um histórico de problemas graves resolvidos para referência futura.

## 🐛 Bug: Tela Branca na Abertura (Crash no React por Cache Corrompido)

**Data do Registro:** 08 de Julho de 2026
**Severidade:** Crítica
**Onde Ocorria:** Na inicialização do aplicativo do cliente (Marketplace), resultando em tela branca imediata antes mesmo de carregar qualquer componente visual, impossibilitando o uso do App.

### Descrição do Problema
Após resolver o bug da tela branca ao "adicionar ao carrinho", a tela branca ainda estava ocorrendo imediatamente ao abrir o aplicativo. 

### Causa Raiz (Root Cause)
Como o app salvava o carrinho diretamente na memória local do celular (`localStorage`), os erros anteriores de "opções nulas" já tinham corrompido os dados salvos em cache no dispositivo dos clientes (salvando Arrays nulos/inválidos e objetos sem a propriedade `product`). 
Ao abrir o app, o `CartContext.tsx` e seus métodos de subtotal tentavam processar e calcular itens do carrinho, não verificavam se o array de `applicableProductIds` era um array válido, e também tentavam acessar `item.product.id` onde o produto não existia mais. Como o React tentava calcular isso durante o carregamento da UI e falhava sem nenhum "Error Boundary", a árvore de renderização despencava gerando tela branca permanente (já que o cache não limpava sozinho). Além disso, havia um bug secundário no carregamento de ícones dinâmicos do componente `MarketplaceMenu.tsx`.

### Solução Aplicada
1. **Defesa Anti-Corrupção de Cache:** O `CartContext.tsx` foi blindado utilizando blocos `try/catch` para capturar falhas na decodificação do `localStorage`. 
2. **Filtragem Rígida:** Adicionado filtro `parsed.filter(i => i && i.product && i.product.id)` ao carregar os itens salvos, eliminando itens fantasmas.
3. **Validação de Array:** Tratamento rigoroso `Array.isArray(parsed)` para a recuperação de cupons aplicáveis, prevenindo erro de `.length` ou `.includes` em valores nulos.
4. **Global Error Boundary (Barreira Definitiva):** Criado o componente `GlobalErrorBoundary` em `main.tsx` que encapsula o app inteiro. Se no futuro um erro do React ocorrer, o usuário verá uma tela visual com os logs de erro e um botão funcional **"Limpar Dados e Reiniciar"** (que reseta o `localStorage` e recupera o aplicativo automaticamente).
5. **Correção do Componente Menu:** Inserido um `ErrorBoundary` próprio no menu lateral (`MarketplaceMenu.tsx`) e os ícones extraídos em variável JSX para prevenir falhas de renderização de instâncias ausentes (`item.icon`).

**Arquivos Afetados:**
- `src/main.tsx`
- `src/contexts/CartContext.tsx`
- `src/components/marketplace/MarketplaceMenu.tsx`

---

## 🐛 Bug: Tela Branca ao Adicionar Produto no Carrinho (Crash no React)

**Data do Registro:** 08 de Julho de 2026
**Severidade:** Crítica
**Onde Ocorria:** No aplicativo do cliente (Marketplace), ao tentar adicionar um produto à sacola.

### Descrição do Problema
O aplicativo apresentava a temida "Tela Branca da Morte" do React no momento exato em que o usuário clicava em "Adicionar" na tela de detalhes do produto (`ProductDetailDialog.tsx`). O app congelava completamente e não permitia finalizar a compra.

### Causa Raiz (Root Cause)
Quando um produto continha opções ou complementos opcionais, a função que mapeava essas opções escolhidas no carrinho tentava encontrar dados delas. Porém, caso houvesse opções nulas ou incompletas, a lista acabava preenchida com valores `undefined`.

No arquivo `CartContext.tsx` e `ProductDetailDialog.tsx`, a leitura dos IDs das opções (ex: `options.map(o => o.id)`) ou o cálculo do preço (`opt.price`) causava um erro instantâneo do tipo:
`TypeError: Cannot read properties of undefined (reading 'id')`

Como esse erro ocorria dentro do cálculo de renderização do `CartContext`, que envolve o App inteiro, a árvore do React quebrava completamente e sumia da tela (tela branca).

### Solução Aplicada
1. **Filtro de Prevenção:** Foi implementado um método `.filter(Boolean)` ao mapear as opções dentro do `ProductDetailDialog` e do `CartContext` antes de tentar ler seus IDs.
2. **Optional Chaining no Preço:** Adicionado o operador `?.` ao tentar calcular a somatória do carrinho (`opt?.price`).
3. **Persistência Segura:** O CartContext agora limpa completamente instâncias vazias da lista de opções antes de enviar o item do carrinho para o `localStorage`, para evitar que a tela branca volte a ocorrer caso o usuário recarregue a página com itens quebrados salvos na memória.

**Arquivos Afetados:**
- `src/components/marketplace/ProductDetailDialog.tsx`
- `src/contexts/CartContext.tsx`

---

## 🐛 Bug: Erro Silencioso Ocultando a Tela de Loja Fechada e Falhas de Rede

**Data do Registro:** 09 de Julho de 2026
**Severidade:** Alta
**Onde Ocorria:** Na página de detalhes da loja (`StoreDetail.tsx`) no aplicativo do cliente (Marketplace).

### Descrição do Problema
O aplicativo exibia incorretamente a tela de "Loja não encontrada" em duas situações distintas:
1. Quando uma loja estava legitimamente fechada (e consequentemente oculta pela política RLS do banco de dados). Em vez de mostrar a interface de "Loja Fechada", a página falhava e exibia "Loja não encontrada".
2. Quando ocorria uma falha real de rede ou erro ao carregar os produtos, a UI ignorava o erro e também mostrava "Loja não encontrada", removendo a opção do usuário de clicar em "Tentar novamente".

### Causa Raiz (Root Cause)
Uma modificação feita por IA adicionou um `throw companyResponse.error;` na consulta do Supabase dentro do `StoreDetail.tsx` para tentar "propagar erros silenciosos". No entanto:
- O Supabase retorna o erro `PGRST116` (row not found) quando a loja está inativa ou bloqueada pelo RLS. Ao forçar o código a lançar (throw) essa exceção de forma bruta, a consulta abortava.
- No React (JSX), a verificação visual `if (!company)` (que renderiza "Loja não encontrada") estava posicionada **antes** da verificação de erro de rede `if (productsError)`. Como o erro na query fazia a variável `company` ficar nula, o código sempre entrava na condição de "Loja não encontrada", tornando o bloco visual de "Ocorreu um erro / Tentar novamente" completamente inacessível.

### Solução Aplicada
1. **Tratamento de PGRST116:** A consulta de `company` foi corrigida para lançar exceções APENAS se o erro for diferente de `PGRST116` (`if (error && error.code !== 'PGRST116')`). Assim, lojas bloqueadas por RLS retornam `company: null` pacificamente, permitindo que a interface lidere com as regras de negócio de loja fechada.
2. **Reordenação Visual no JSX:** O bloco `if (productsError)` (que exibe a tela de alerta e o botão de recarregar) foi movido para o topo do JSX, **antes** da checagem de loja vazia `if (!company)`. Agora, falhas técnicas mostram a tela correta, e a "Loja não encontrada" só aparece quando realmente não houverem dados a exibir.

**Arquivos Afetados:**
- `src/pages/marketplace/StoreDetail.tsx`
