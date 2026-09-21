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

console.log('--- EXECUTANDO TESTES DO RANKING DE HORÁRIOS DO DIA NO É PRA JÁ ---\n');

// 1. Aberta + produtos + score 0 acima de aberta + sem produtos + score 50
{
  const stores = [
    { id: 'farma-sem-prod', name: 'Farmácia Sem Produtos', is_open: true, category: 'farmacia', products: [], rating: 5.0 },
    { id: 'marmita-com-prod', name: 'Marmitaria Com Produtos', is_open: true, category: 'restaurante', products: [{ name: 'Marmita', active: true }], rating: 4.0 },
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
    { id: 'marmita-vazia', name: 'Marmitaria Vazia', is_open: true, description: 'almoço', products: [], rating: 5.0 },
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
      { name: 'P3', active: true, is_active: true },
    ],
  };
  assert(
    hasAvailableProducts(comp) === true,
    'TESTE 12: Múltiplos produtos com pelo menos 1 válido é considerada com catálogo'
  );
}

// 13. TESTE DE HORÁRIO: MANHÃ (08:00) -> Padaria deve ficar no topo!
{
  const stores = [
    { id: 'marmitaria', name: 'Marmitaria Central', category: 'restaurante', is_open: true, products: [{ name: 'Marmita P', active: true }], rating: 5.0 },
    { id: 'padaria', name: 'Padaria Doce Pão', category: 'padaria', is_open: true, products: [{ name: 'Pão Francês', active: true }], rating: 4.8 },
    { id: 'hamburgueria', name: 'Burger Show', category: 'lanches', is_open: true, products: [{ name: 'X-Burger', active: true }], rating: 5.0 },
  ];
  const ranked = rankStores(stores, createDateAtHour(8, 0));
  assert(
    ranked[0].id === 'padaria',
    'TESTE 13: De manhã (08:00), Padarias têm prioridade máxima e ficam no topo'
  );
}

// 14. TESTE DE HORÁRIO: PERTO DO ALMOÇO (10:57) -> Marmitarias no topo, Bolos e Feirinhas abaixo!
{
  const stores = [
    { id: 'feirinha', name: 'FEIRINHA EM CASA', category: 'restaurante', is_open: true, products: [{ name: 'Chuchu', active: true }], rating: 5.0 },
    { id: 'mercado', name: 'MERCADO CENTRAL', category: 'mercado', is_open: true, products: [{ name: 'Arroz', active: true }], rating: 4.3 },
    { id: 'bolos', name: 'FABIELLY BOLOS E DOCES', category: 'restaurante', is_open: true, products: [{ name: 'Bolo de Cenoura', active: true }], rating: 5.0 },
    { id: 'marmitaria-fortaleza', name: 'MARMITARIA FORTALEZA', category: 'restaurante', is_open: true, products: [{ name: 'Marmita Completa', active: true }], rating: 5.0 },
    { id: 'marmitaria-recanto', name: 'MARMITARIA RECANTO', category: 'restaurante', is_open: true, products: [{ name: 'Marmita P', active: true }], rating: 4.6 },
    { id: 'recanto-sonhos', name: 'RESTAURANTE RECANTO DOS SONHOS', category: 'restaurante', is_open: true, products: [{ name: 'Prato Executivo', active: true }], rating: 5.0 },
  ];
  const ranked = rankStores(stores, createDateAtHour(10, 57));
  assert(
    ranked[0].id === 'marmitaria-fortaleza' &&
    ranked[1].id === 'marmitaria-recanto' &&
    ranked[2].id === 'recanto-sonhos',
    'TESTE 14: Perto do almoço (10:57), Marmitarias e Restaurantes de Almoço ficam no topo absoluto'
  );
}

// 15. TESTE DE HORÁRIO: TARDE (15:30) -> Lanches, Bolos, Docerias e Cafés no topo!
{
  const stores = [
    { id: 'marmitaria', name: 'Marmitaria Fortaleza', category: 'restaurante', is_open: true, products: [{ name: 'Marmita', active: true }], rating: 5.0 },
    { id: 'doceria', name: 'FABIELLY BOLOS E DOCES', category: 'restaurante', is_open: true, products: [{ name: 'Bolo', active: true }], rating: 5.0 },
    { id: 'lanche', name: 'Lanchonete e Pastelaria', category: 'lanches', is_open: true, products: [{ name: 'Pastel', active: true }], rating: 4.9 },
  ];
  const ranked = rankStores(stores, createDateAtHour(15, 30));
  assert(
    (ranked[0].id === 'doceria' || ranked[0].id === 'lanche') && ranked[2].id === 'marmitaria',
    'TESTE 15: À tarde (15:30), Lanches, Docerias e Bolos ficam no topo e Marmitarias vão para baixo'
  );
}

// 16. TESTE DE HORÁRIO: NOITE (19:30) -> Lanches, Espetos e Conveniências no topo!
{
  const stores = [
    { id: 'marmitaria', name: 'Marmitaria Fortaleza', category: 'restaurante', is_open: true, products: [{ name: 'Marmita', active: true }], rating: 5.0 },
    { id: 'padaria', name: 'Padaria Central', category: 'padaria', is_open: true, products: [{ name: 'Pão', active: true }], rating: 5.0 },
    { id: 'espeto', name: 'ESPETARIA PONTO CERTO', category: 'petiscaria', is_open: true, products: [{ name: 'Espetinho', active: true }], rating: 5.0 },
    { id: 'conveniencia', name: 'CONVENIÊNCIA 2A', category: 'bebidas', is_open: true, products: [{ name: 'Cerveja', active: true }], rating: 4.8 },
    { id: 'burger', name: 'NA CHAPA HAMBURGUERIA', category: 'hamburguer', is_open: true, products: [{ name: 'NC Bacon', active: true }], rating: 5.0 },
  ];
  const ranked = rankStores(stores, createDateAtHour(19, 30));
  assert(
    (ranked[0].id === 'burger' || ranked[0].id === 'espeto') &&
    ranked.findIndex(s => s.id === 'marmitaria') > 2,
    'TESTE 16: À noite (19:30), Hamburguerias, Espetarias e Conveniências ficam no topo'
  );
}

console.log(`\n========================================`);
console.log(`RESULTADO DOS TESTES: ${passed} passaram, ${failed} falharam.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
