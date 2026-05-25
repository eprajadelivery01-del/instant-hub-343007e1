## Redesign da tela de Perfil

Direção travada: **Charcoal & Ember + Space Grotesk/DM Sans + Bento Grid**, referência **iFood premium**.

### Princípios

- Grade Bento real: cards de tamanhos diferentes, hierarquia rica, nada de "tudo do mesmo tamanho".
- Densidade iFood: informação útil em cada bloco (saldo, próximo pedido, cupom em destaque), não só rótulos.
- Tipografia Space Grotesk pesada para números/headlines, DM Sans para corpo. Aplicada via `tailwind.config` e `index.css`.
- Paleta charcoal (#1a1a1a / #2d2d2d) com accent ember (#e85d3a) usada com parcimônia — só onde precisa puxar o olho.
- Zero gradientes pastel, zero "Clube VIP" genérico. Cada card tem propósito.

### Estrutura nova (mobile-first)

```text
┌─────────────────────────────────┐
│  HERO COMPACTO                  │
│  [avatar] Nome              [⚙] │
│          email · membro desde   │
└─────────────────────────────────┘
┌──────────────┬──────────────────┐
│ CARTEIRA     │ NÍVEL            │
│ R$ 0,00      │ Bronze ▰▱▱       │
│ Adicionar →  │ 0/5 pedidos      │
├──────────────┴──────────────────┤
│ CUPOM EM DESTAQUE (wide)        │
│ 20% OFF · expira em 3d   [usar] │
└─────────────────────────────────┘
┌──────────────┬──────────────────┐
│ PEDIDOS  0   │ FAVORITOS  0     │
│ ↗ ver tudo   │ ↗ ver tudo       │
└──────────────┴──────────────────┘
┌─────────────────────────────────┐
│ ENDEREÇO ATIVO (wide)           │
│ 📍 Cuiabá - MT      [trocar →]  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ AÇÕES RÁPIDAS — grid 4 ícones   │
│ [Pedidos][Cupons][Ajuda][Tema]  │
└─────────────────────────────────┘

LISTA — Conta
LISTA — Ajuda & Legal
CTA — Seja entregador (full-bleed)
Sair · Excluir conta
```

### Especificações visuais

- **Background**: `#1a1a1a` (modo escuro padrão da tela), tema claro mantém `bg-background`.
- **Cards bento**: `bg-[#2d2d2d]` no escuro / `bg-card` no claro, raio `rounded-3xl`, border `border-white/5`, sombra discreta.
- **Accent ember `#e85d3a`**: CTA primário, cupom destacado, badge de status — nunca em fundo grande.
- **Números grandes**: Space Grotesk 900, `text-4xl`/`text-5xl`, tracking apertado.
- **Labels**: DM Sans 500, uppercase, `tracking-widest`, opacity 60%.
- **Densidade**: padding interno `p-5`, gap entre cards `gap-3`, sem rounded extremos.
- **Avatar**: 64px (não 96px), ring ember sutil de 2px, foto domina.
- **Hero**: uma linha só, sem hero gigante — iFood não desperdiça espaço.
- **VIP/Cupom**: vira "Cupom em destaque" com código real visível e CTA "Aplicar" — não card decorativo vazio.
- **Nível/Carteira**: dois cards lado a lado com dado real (mesmo que zero), preparando ground para features futuras.

### Detalhes técnicos

- Editar **apenas** `src/pages/marketplace/Profile.tsx` (mantém toda a lógica: `fetchOrders`, `fetchCoupons`, `handlePhotoUpload`, sheets de Editar/Cupons/Suporte).
- Adicionar fontes Space Grotesk + DM Sans em `index.html` (Google Fonts) e referenciar em `tailwind.config.ts` como `font-display` e `font-sans`.
- Adicionar tokens charcoal no `index.css` como CSS variables HSL — sem hardcode no JSX além dos blocos bento escuros.
- Sem novas dependências. Sem mudanças no DB. Sem tocar em outras telas.
- Carteira mostra `R$ 0,00` placeholder com link "Em breve" via toast (até feature existir).
- Nível calculado client-side a partir de `orders.length` (Bronze 0-4, Prata 5-14, Ouro 15+).
- Cupom em destaque: pega o primeiro de `coupons` ordenado por maior desconto; se vazio, mostra empty state com CTA "Ver promoções".

### Entrega

Uma única edição em `Profile.tsx` + adição de fontes/tokens. Sem mexer em rotas, contextos ou backend.
