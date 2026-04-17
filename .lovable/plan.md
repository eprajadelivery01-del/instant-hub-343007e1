

## Redesign UI Futurista — "Sunset Tech 2070"

**Objetivo:** transformar a aparência visual do app em uma estética futurista premium (Tesla + Apple VisionOS + cyberpunk clean) mantendo 100% do layout, grids, posicionamento, tamanhos de cards e fluxo. Apenas cores, sombras, blur, glow e tipografia.

### Estratégia: edits cirúrgicos em 2 arquivos centrais

Como o projeto já usa um sistema sólido de tokens (`hsl(var(--*))`) e utilities semânticas (`premium-card`, `premium-panel`, `premium-chip`, `glass-card`, `glass-nav`, `app-shell`, `bg-sunset`, `hero-image-overlay`), o redesign se propaga automaticamente para TODAS as telas (Home, Cart, Checkout, Profile, Orders, StoreDetail, etc.) ao alterar apenas:

1. `src/index.css` — tokens HSL + utilities globais
2. `tailwind.config.ts` — gradiente `sunset` + box-shadow `glow`

Nenhum componente .tsx será modificado → zero risco de quebrar layout.

---

### 1. `src/index.css` — Mudanças

**Forçar tema dark como padrão visual** (movendo as variáveis dark para `:root` + mantendo `.dark` para compatibilidade). O concept "futuro 2070 sunset tech" exige fundo escuro.

**Nova paleta (HSL):**
- `--background: 0 0% 5%` (preto profundo #0D0D0D)
- `--foreground: 0 0% 96%` (branco suave #F5F5F5)
- `--card: 0 0% 10% / glass` (cinza carvão)
- `--surface-glass: 0 0% 100%` com alpha 0.06
- `--primary: 17 100% 56%` (#FF5A1F sunset)
- `--accent: 22 100% 62%` (#FF7A3D glow)
- `--ring: 17 100% 56%`
- `--border: 0 0% 100%` usado com alpha 0.08
- `--muted-foreground: 0 0% 100%` com alpha 0.6

**Utilities atualizadas:**
- `.app-shell` → `radial-gradient(circle at top, #1A1A1A, #0D0D0D)` + sutil orange glow no topo
- `.premium-card` → glassmorphism: `backdrop-filter: blur(14px)` + `background: rgba(255,255,255,0.04)` + `border: 1px solid rgba(255,255,255,0.08)` + `box-shadow: 0 10px 30px rgba(0,0,0,0.6)`
- `.premium-card-interactive:hover` → glow laranja: `box-shadow: 0 0 30px rgba(255,90,31,0.25), 0 20px 50px rgba(0,0,0,0.7)` + `border-color: rgba(255,122,61,0.4)`
- `.premium-panel` → glass mais intenso (blur 20px)
- `.premium-chip` → `background: rgba(255,255,255,0.05)` + borda neon sutil
- `.glass-nav` → blur 24px + background `rgba(13,13,13,0.7)` + borda top neon orange
- `.hero-image-overlay` → gradiente sunset bottom: `linear-gradient(180deg, transparent 0%, rgba(13,13,13,0.4) 40%, rgba(13,13,13,0.95) 100%)`
- Imagens de produto: nova classe global aplicada via `img` em `.premium-card` → `filter: contrast(1.08) saturate(1.12)` + `transition: filter 0.3s`
- Botões `.bg-sunset` → atualizar gradiente para `linear-gradient(135deg, #FF5A1F, #FF7A3D)` + adicionar pseudo-glow externo
- Nova utility `.btn-glow` (opcional para uso futuro): `box-shadow: 0 0 20px rgba(255,90,31,0.5)`
- `.text-sunset` → ajustar gradiente
- Tipografia: aumentar peso default de títulos via base; cor secundária via `--muted-foreground` translúcido
- Adicionar `transition: all 0.25s ease` global em `button, a, .premium-chip`
- Microanimação `@keyframes neon-pulse` para indicadores ativos

### 2. `tailwind.config.ts` — Mudanças

- `backgroundImage.sunset` → `linear-gradient(135deg, #FF5A1F, #FF7A3D, #FFB199)`
- Adicionar `boxShadow.glow: '0 0 20px rgba(255,90,31,0.5), 0 0 40px rgba(255,90,31,0.2)'` (caso queira usar `shadow-glow` no futuro, sem obrigar refactor)

### 3. Forçar tema dark no boot

- Em `src/contexts/ThemeContext.tsx`: alterar default de `'light'` para `'dark'` (apenas o fallback do `useState`). Mantém o toggle funcional, mas a estética futurista é o padrão.

---

### Cobertura visual automática

Como TODOS os componentes principais já consomem essas utilities/tokens, eles ganham o novo visual sem edição:

| Componente | Utility consumida | Resultado |
|---|---|---|
| StoreTabCard | `premium-card`, `premium-chip`, `hero-image-overlay`, `premium-panel` | Glass card escuro com glow no hover |
| MarketplaceLayout / nav inferior | `app-shell`, `bg-background`, `border-border` | Fundo radial escuro + barra glass |
| Botão "Ver Sacola" flutuante | `bg-primary` + shadow inline | Recebe nova cor sunset (#FF5A1F) |
| Cart / Checkout / Profile / Orders | `premium-card`, `premium-panel`, tokens | Glass escuro consistente |
| Inputs de busca | `bg-background`, `border-input` | Glass escuro com ring neon |
| MarketplaceMenu (sheet) | usa `bg-white` hardcoded → permanece claro intencionalmente (drawer lateral) | Sem mudança (não conflita) |

### Garantias

- Zero alteração em JSX, grids, flex, paddings, sizes, posições
- Zero alteração em rotas, contexts de dados, hooks
- Toggle de tema continua funcional (light mode ainda existe via `.light` fallback se usuário trocar)
- Ícones, espaçamentos, hierarquia 100% preservados

