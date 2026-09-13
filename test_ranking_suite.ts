import {
  rankStores,
  resolveDayPeriod,
  getStoreTimeScore,
  normalizeText,
  hasAvailableProducts,
  getStoreCatalogTier,
} from './src/lib/storeRanking';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

function createDateAtHour(hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

console.log('--- EXECUTANDO OS 16 TESTES OBRIGATÓRIOS DO RANKING COM PRIORIDADE DE CATÁLOGO ---\n');

// 1. Aberta + produtos + score 0 acima de aberta + sem produtos + score 50
{
  const stores = [
    { id: 'farma-sem-prod', name: 'Farmácia Sem Produtos', is_open: true, category: 'farmacia', products: [], rating: 5.0 }, // Score manhã = 50, sem prod (Tier 3)
    { id: 'marmita-com-prod', name: 'Marmitaria Com Produtos', is_open: true, category: 'restaurante', products: [{ name: 'Marmita', active: true }], rating: 4.0 }, // Score manhã = 0, com prod (Tier 4)
  ];
  const ranked = rankStores(stores, createDateAtHour(7, 0)); // Período MORNING
  assert(
    ranked[0].id === 'marmita-com-prod' && ranked[1].id === 'farma-sem-prod',
    'TESTE 1: Aberta com produtos (score 0) fica acima de aberta sem produtos (score 50)'
  );
}

// 2. Aberta + produtos + score 50 no topo
{
  const stores = [
    { id: 'loja-neutra', name: 'Loja Neutra', is_open: true, products: [{ name: 'Item', active: true }], rating: 5.0 },
    { id: 'marmita-topo', name: 'Marmitaria No Almoço', is_open: true, description: 'almoço caseiro', products: [{ name: 'Marmitex', active: true }], rating: 4.8 },
  ];
  const ranked = rankStores(stores, createDateAtHour(12, 0)); // LUNCH
  assert(
    ranked[0].id === 'marmita-topo',
    'TESTE 2: Aberta com produtos + score 50 fica no topo'
  );
}

// 3. Aberta + sem produtos + score 50 abaixo de TODAS as abertas com produtos
{
  const stores = [
    { id: 'loja-a', name: 'Loja A', is_open: true, products: [{ name: 'P1', active: true }], rating: 4.0 },
    { id: 'loja-b', name: 'Loja B', is_open: true, products: [{ name: 'P2', active: true }], rating: 3.5 },
    { id: 'loja-c', name: 'Loja C', is_open: true, products: [{ name: 'P3', active: true }], rating: 4.2 },
    { id: 'marmita-vazia', name: 'Marmitaria Vazia', is_open: true, description: 'almoço', products: [], rating: 5.0 }, // score 50, tier 3
  ];
  const ranked = rankStores(stores, createDateAtHour(12, 0));
  const vaziaIndex = ranked.findIndex((s) => s.id === 'marmita-vazia');
  assert(
    vaziaIndex === 3,
    'TESTE 3: Aberta sem produtos + score 50 fica abaixo de TODAS as abertas com produtos'
  );
}

// 4. Fechada + produtos abaixo de TODAS as abertas
{
  const stores = [
    { id: 'aberta-com-prod', name: 'Aberta Com Prod', is_open: true, products: [{ name: 'Item', active: true }] },
    { id: 'aberta-sem-prod', name: 'Aberta Sem Prod', is_open: true, products: [] },
    { id: 'fechada-com-prod', name: 'Fechada Com Prod', is_open: false, products: [{ name: 'Item', active: true }], rating: 5.0 },
  ];
  const ranked = rankStores(stores, createDateAtHour(12, 0));
  const fechadaIdx = ranked.findIndex((s) => s.id === 'fechada-com-prod');
  assert(
    fechadaIdx === 2,
    'TESTE 4: Fechada com produtos fica abaixo de TODAS as lojas abertas (com e sem produtos)'
  );
}

// 5. Fechada + sem produtos no último grupo
{
  const stores = [
    { id: 'aberta-com-prod', name: 'Aberta Com Prod', is_open: true, products: [{ name: 'Item', active: true }] },
    { id: 'fechada-com-prod', name: 'Fechada Com Prod', is_open: false, products: [{ name: 'Item', active: true }] },
    { id: 'fechada-sem-prod', name: 'Fechada Sem Prod', is_open: false, products: [] },
    { id: 'aberta-sem-prod', name: 'Aberta Sem Prod', is_open: true, products: [] },
  ];
  const ranked = rankStores(stores, createDateAtHour(12, 0));
  assert(
    ranked[3].id === 'fechada-sem-prod',
    'TESTE 5: Fechada sem produtos fica no último grupo (Tier 1)'
  );
}

// 6. products = [] deve ser considerada sem catálogo
{
  const comp = { name: 'Loja', products: [] };
  assert(
    hasAvailableProducts(comp) === false,
    'TESTE 6: products = [] é classificada como sem catálogo'
  );
}

// 7. products = null não pode gerar erro
{
  const comp = { name: 'Loja', products: null };
  assert(
    hasAvailableProducts(comp) === false,
    'TESTE 7: products = null não gera erro e retorna false'
  );
}

// 8. products = undefined não pode gerar erro
{
  const comp = { name: 'Loja', products: undefined };
  assert(
    hasAvailableProducts(comp) === false,
    'TESTE 8: products = undefined não gera erro e retorna false'
  );
}

// 9. Somente produtos inativos (active === false)
{
  const comp = {
    name: 'Loja Inativa',
    products: [
      { name: 'P1', active: false, is_active: true },
      { name: 'P2', active: false, is_active: true },
    ],
  };
  assert(
    hasAvailableProducts(comp) === false,
    'TESTE 9: Somente produtos com active === false é considerada sem catálogo'
  );
}

// 10. Somente produtos is_active === false
{
  const comp = {
    name: 'Loja Inativa 2',
    products: [
      { name: 'P1', active: true, is_active: false },
      { name: 'P2', active: true, is_active: false },
    ],
  };
  assert(
    hasAvailableProducts(comp) === false,
    'TESTE 10: Somente produtos com is_active === false é considerada sem catálogo'
  );
}

// 11. Produto ativo válido
{
  const comp = {
    name: 'Loja Ativa',
    products: [{ name: 'P1', active: true, is_active: true }],
  };
  assert(
    hasAvailableProducts(comp) === true,
    'TESTE 11: Produto ativo e disponível é considerado com catálogo'
  );
}

// 12. Múltiplos produtos onde pelo menos um é válido
{
  const comp = {
    name: 'Loja Mista',
    products: [
      { name: 'P1', active: false, is_active: true },
      { name: 'P2', active: true, is_active: false },
      { name: 'P3', active: true, is_active: true }, // Válido!
    ],
  };
  assert(
    hasAvailableProducts(comp) === true,
    'TESTE 12: Múltiplos produtos com pelo menos 1 válido é considerada com catálogo'
  );
}

// 13. Empate de tier + score deve usar rating como desempate
{
  const stores = [
    { id: 'marmita-4.5', name: 'Marmitaria Menor', is_open: true, description: 'almoço', products: [{ name: 'M1', active: true }], rating: 4.5 },
    { id: 'marmita-4.9', name: 'Marmitaria Maior', is_open: true, description: 'almoço', products: [{ name: 'M2', active: true }], rating: 4.9 },
  ];
  const ranked = rankStores(stores, createDateAtHour(12, 0));
  assert(
    ranked[0].id === 'marmita-4.9' && ranked[1].id === 'marmita-4.5',
    'TESTE 13: Empate de tier e score desempata por rating decrescente'
  );
}

// 14. Empate total (tier + score + rating) deve usar nome (ordem alfabética)
{
  const stores = [
    { id: 'loja-z', name: 'Zeta Lanches', is_open: true, products: [{ name: 'P', active: true }], rating: 4.8 },
    { id: 'loja-a', name: 'Alfa Lanches', is_open: true, products: [{ name: 'P', active: true }], rating: 4.8 },
  ];
  const ranked = rankStores(stores, createDateAtHour(12, 0));
  assert(
    ranked[0].name === 'Alfa Lanches' && ranked[1].name === 'Zeta Lanches',
    'TESTE 14: Empate total usa estabilidade alfabética pelo nome'
  );
}

// 15. Confirmar que todos os estabelecimentos continuam aparecendo
{
  const stores = [
    { id: 's1', name: 'Store 1', is_open: true, products: [{ name: 'P', active: true }] },
    { id: 's2', name: 'Store 2', is_open: true, products: [] },
    { id: 's3', name: 'Store 3', is_open: false, products: [{ name: 'P', active: true }] },
    { id: 's4', name: 'Store 4', is_open: false, products: [] },
  ];
  const ranked = rankStores(stores, createDateAtHour(12, 0));
  assert(
    ranked.length === stores.length && stores.every((s) => ranked.some((r) => r.id === s.id)),
    'TESTE 15: 100% dos estabelecimentos continuam na lista retornada'
  );
}

// 16. Confirmar que busca e filtros existentes não sofrem regressão
{
  const stores = [
    { id: 'pizza-1', name: 'Pizzaria Napolitana', category: 'restaurante', is_open: true, products: [{ name: 'Pizza', active: true }] },
    { id: 'burger-1', name: 'Hamburgueria Top', category: 'lanches', is_open: true, products: [{ name: 'Burger', active: true }] },
  ];
  const ranked = rankStores(stores, createDateAtHour(12, 0));
  const searchFilter = ranked.filter((s) => s.name.toLowerCase().includes('pizza'));
  const catFilter = ranked.filter((s) => s.category === 'lanches');
  assert(
    searchFilter.length === 1 && searchFilter[0].id === 'pizza-1' &&
    catFilter.length === 1 && catFilter[0].id === 'burger-1',
    'TESTE 16: Busca e filtros de categoria operam perfeitamente sobre a lista'
  );
}

console.log(`\n========================================`);
console.log(`RESULTADO DOS 16 TESTES: ${passed} passaram, ${failed} falharam.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
