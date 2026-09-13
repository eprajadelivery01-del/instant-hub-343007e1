import {
  rankStores,
  resolveDayPeriod,
  getStoreTimeScore,
  normalizeText,
  hasAvailableProducts,
  getStoreCatalogTier,
} from './src/lib/storeRanking';

// Mock de lojas representativas baseadas no banco real do É Pra Já
const mockStores: any[] = [
  {
    id: 'padaria-1',
    name: 'Panificadora Pão Dourado',
    category: 'restaurante',
    description: 'Pães quentinhos, café da manhã e salgados',
    rating: 4.5,
    is_open: true,
    active: true,
    products: [{ name: 'Pão Francês', category: 'PADARIA', active: true }],
  },
  {
    id: 'marmitaria-com-produtos',
    name: 'Marmitaria Recanto dos Sabores',
    category: 'restaurante',
    description: 'Marmitas executivas, prato feito e comida caseira no almoço',
    rating: 4.4,
    is_open: true,
    active: true,
    products: [{ name: 'Marmitex Completa', category: 'A LA CARTE', active: true, is_active: true }],
  },
  {
    id: 'doceria-1',
    name: 'Fabiely Bolos e Doces',
    category: 'restaurante',
    description: 'Bolos confeitados, tortas doces, docinhos e café da tarde',
    rating: 4.7,
    is_open: true,
    active: true,
    products: [{ name: 'Bolo de Chocolate', category: 'Doces', active: true }],
  },
  {
    id: 'burger-1',
    name: 'Na Chapa Hamburgueria',
    category: 'lanches',
    description: 'Hamburguer artesanal na brasa, porções e refrigerantes',
    rating: 4.6,
    is_open: true,
    active: true,
    products: [{ name: 'X-Burguer Especial', category: 'HAMBURGUER ARTESANAL', active: true }],
  },
  {
    id: 'pizzaria-1',
    name: 'Pizzaria Bella Itália',
    category: 'restaurante',
    description: 'Pizzas tradicionais e especiais no forno a lenha',
    rating: 4.8,
    is_open: true,
    active: true,
    products: [{ name: 'Pizza Calabresa', category: 'Pizzas', active: true }],
  },
  {
    id: 'conveniencia-1',
    name: 'Conveniência 24h Pit Stop',
    category: 'mercado',
    description: 'Bebidas geladas, lanches rápidos, conveniência',
    rating: 4.5,
    is_open: true,
    active: true,
    products: [{ name: 'Cerveja Lata', category: 'Bebidas', active: true }],
  },
  {
    id: 'papelaria-com-produtos',
    name: 'D\'Papel Papelaria',
    category: 'shopping',
    description: 'Materiais escolares e escritório',
    rating: 5.0, // Nota máxima (5.0) - Neutra no almoço (score 0), MAS COM PRODUTOS!
    is_open: true,
    active: true,
    products: [{ name: 'Caderno Universitário', category: 'Outros', active: true, is_active: true }],
  },
  {
    id: 'marmitaria-sem-produtos',
    name: 'Marmitaria Almoço Fácil (Sem Produtos)',
    category: 'restaurante',
    description: 'Marmitaria e comida caseira no almoço',
    rating: 5.0,
    is_open: true,
    active: true,
    products: [], // Sem produtos cadastrados!
  },
  {
    id: 'marmitaria-produtos-inativos',
    name: 'Marmitaria Sabor Caseiro (Produtos Inativos)',
    category: 'restaurante',
    description: 'Marmitas executivas no almoço',
    rating: 4.9,
    is_open: true,
    active: true,
    products: [
      { name: 'Marmita Feijoada', active: false, is_active: true },
      { name: 'Marmita Bife', active: true, is_active: false },
    ],
  },
  {
    id: 'sem-categoria',
    name: 'Loja Sem Categoria',
    category: null,
    description: null,
    rating: 4.2,
    is_open: true,
    active: true,
    products: [{ name: 'Item Teste', active: true }],
  },
  {
    id: 'sem-horario',
    name: 'Loja Sem Horário',
    category: 'restaurante',
    description: 'Loja com horário nulo',
    business_hours: null,
    rating: 4.3,
    is_open: true,
    active: true,
    products: [{ name: 'Item Teste', active: true }],
  },
  {
    id: 'fechada-com-produtos',
    name: 'Pizzaria Madrugada Fechada (Com Produtos)',
    category: 'restaurante',
    description: 'Pizzas especiais',
    rating: 4.9,
    is_open: false, // Fechada!
    active: true,
    products: [{ name: 'Pizza Família', active: true }],
  },
  {
    id: 'fechada-sem-produtos',
    name: 'Loja Fechada Sem Catálogo',
    category: 'restaurante',
    description: 'Loja fechada sem itens',
    rating: 5.0,
    is_open: false, // Fechada!
    active: true,
    products: [],
  }
];

function createDateAtHour(hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

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

console.log('--- INICIANDO BATERIA DE TESTES DO RANKING INTELIGENTE (COM PRIORIDADE DE CATÁLOGO) ---\n');

// TESTES ESPECÍFICOS DE PRIORIDADE DE CATÁLOGO:
// TESTE 1: Loja aberta + produtos + score 0 DEVE ficar ACIMA de loja aberta + sem produtos + score 50
{
  const d = createDateAtHour(12, 0); // Horário de almoço
  const ranked = rankStores(mockStores, d);
  const papelariaIdx = ranked.findIndex((s: any) => s.id === 'papelaria-com-produtos'); // Aberta + Produtos + Score 0
  const marmitaSemProdIdx = ranked.findIndex((s: any) => s.id === 'marmitaria-sem-produtos'); // Aberta + Sem Produtos + Score 50

  assert(
    papelariaIdx !== -1 && marmitaSemProdIdx !== -1 && papelariaIdx < marmitaSemProdIdx,
    'TESTE OBRIGATÓRIO 1: Loja aberta + produtos (score 0) fica ACIMA de loja aberta sem produtos (score 50)',
    `Papelaria idx: ${papelariaIdx}, Marmita Sem Prod idx: ${marmitaSemProdIdx}`
  );
}

// TESTE 2: Loja aberta + produtos + score 50 deve ficar no topo
{
  const d = createDateAtHour(12, 0);
  const ranked = rankStores(mockStores, d);
  const firstStore = ranked[0];
  assert(
    firstStore.id === 'marmitaria-com-produtos',
    'TESTE OBRIGATÓRIO 2: Loja aberta + produtos + score 50 fica no topo absoluto',
    `1ª colocada: ${firstStore.name} (${firstStore.id})`
  );
}

// TESTE 3: Loja aberta + sem produtos + score 50 deve ficar abaixo de TODAS as lojas abertas com produtos
{
  const d = createDateAtHour(12, 0);
  const ranked = rankStores(mockStores, d);
  const marmitaSemProdIdx = ranked.findIndex((s: any) => s.id === 'marmitaria-sem-produtos');
  
  // Todas as lojas abertas com produtos devem ter índice menor que marmitaSemProdIdx
  const openWithProducts = ranked.filter(
    (s: any) => s.is_open === true && hasAvailableProducts(s) === true
  );
  const allAbove = openWithProducts.every((s: any) => ranked.indexOf(s) < marmitaSemProdIdx);

  assert(
    allAbove,
    'TESTE OBRIGATÓRIO 3: Loja aberta sem produtos fica abaixo de TODAS as lojas abertas com produtos',
    `Total abertas c/ prod: ${openWithProducts.length}, Marmita Sem Prod idx: ${marmitaSemProdIdx}`
  );
}

// TESTE 4: Loja fechada + produtos deve ficar abaixo de TODAS as lojas abertas
{
  const d = createDateAtHour(12, 0);
  const ranked = rankStores(mockStores, d);
  const fechadaComProdIdx = ranked.findIndex((s: any) => s.id === 'fechada-com-produtos');
  
  const allOpenStores = ranked.filter((s: any) => s.is_open === true);
  const allOpenAbove = allOpenStores.every((s: any) => ranked.indexOf(s) < fechadaComProdIdx);

  assert(
    allOpenAbove,
    'TESTE OBRIGATÓRIO 4: Loja fechada com produtos fica abaixo de TODAS as lojas abertas',
    `Total abertas: ${allOpenStores.length}, Fechada c/ prod idx: ${fechadaComProdIdx}`
  );
}

// TESTE 5: Loja fechada + sem produtos deve ficar no final da lista
{
  const d = createDateAtHour(12, 0);
  const ranked = rankStores(mockStores, d);
  const lastStore = ranked[ranked.length - 1];
  assert(
    lastStore.id === 'fechada-sem-produtos',
    'TESTE OBRIGATÓRIO 5: Loja fechada sem produtos fica no final da lista',
    `Última loja: ${lastStore.name} (${lastStore.id})`
  );
}

// TESTE 6: Empresa com products = [] deve ser considerada sem catálogo
{
  const company = { name: 'Teste Vazia', products: [] };
  assert(
    hasAvailableProducts(company) === false,
    'TESTE OBRIGATÓRIO 6: Empresa com products = [] tem hasAvailableProducts === false'
  );
}

// TESTE 7: Empresa sem products (null ou undefined) não pode gerar erro
{
  const compNull = { name: 'Sem prop products', products: null };
  const compUndef = { name: 'Sem prop products' };
  assert(
    hasAvailableProducts(compNull) === false && hasAvailableProducts(compUndef) === false,
    'TESTE OBRIGATÓRIO 7: Empresa com products nulo ou indefinido não gera erro e retorna false'
  );
}

// TESTE 8: Produtos existentes mas todos inativos (active: false ou is_active: false)
{
  const compInativa = mockStores.find((s: any) => s.id === 'marmitaria-produtos-inativos');
  assert(
    hasAvailableProducts(compInativa) === false,
    'TESTE OBRIGATÓRIO 8: Loja com produtos apenas inativos é considerada sem catálogo disponível'
  );
}

// TESTE 9: Busca por loja continua funcionando
{
  const search = 'pizza';
  const ranked = rankStores(mockStores, createDateAtHour(19, 0));
  const filtered = ranked.filter((s: any) => s.name.toLowerCase().includes(search));
  assert(
    filtered.length > 0 && filtered[0].id === 'pizzaria-1',
    'TESTE OBRIGATÓRIO 9: Busca por "pizza" retorna loja correspondente perfeitamente'
  );
}

// TESTE 10: Filtro por categoria continua funcionando
{
  const categoryFilter = 'shopping';
  const ranked = rankStores(mockStores, createDateAtHour(14, 0));
  const filtered = ranked.filter((s: any) => s.category === categoryFilter);
  assert(
    filtered.length === 1 && filtered[0].id === 'papelaria-com-produtos',
    'TESTE OBRIGATÓRIO 10: Filtro por shopping retorna D\'Papel Papelaria'
  );
}

// TESTES DOS PERÍODOS DE HORÁRIO:
// TESTE 11 (07:00): Padaria com catálogo no topo
{
  const d = createDateAtHour(7, 0);
  const ranked = rankStores(mockStores, d);
  assert(
    ranked[0].id === 'padaria-1',
    'TESTE 11 (07:00): Padaria com catálogo é a 1ª colocada'
  );
}

// TESTE 12 (15:00): Doceria com catálogo no topo à tarde
{
  const d = createDateAtHour(15, 0);
  const ranked = rankStores(mockStores, d);
  assert(
    ranked[0].id === 'doceria-1',
    'TESTE 12 (15:00): Doceria com catálogo é a 1ª colocada à tarde'
  );
}

// TESTE 13 (19:00): Hamburgueria e Pizzaria com catálogo no topo à noite
{
  const d = createDateAtHour(19, 0);
  const ranked = rankStores(mockStores, d);
  const topTwo = [ranked[0].id, ranked[1].id];
  assert(
    topTwo.includes('burger-1') && topTwo.includes('pizzaria-1'),
    'TESTE 13 (19:00): Hamburgueria e Pizzaria com catálogo estão no topo à noite'
  );
}

// TESTE 15 (CENÁRIO REAL DO BANCO É PRA JÁ):
// Valida que lojas reais abertas com produtos ficam acima das lojas sem produtos (farmácias/papelaria),
// e que lojas fechadas ficam abaixo das abertas.
{
  const realStoresMock = [
    { id: 'farma-popular', name: 'FARMA POPULAR', is_open: true, products: [], rating: 5.0, category: 'farmacia' },
    { id: 'drogaria-paulista', name: 'DROGARIA PAULISTA', is_open: true, products: [], rating: 5.0, category: 'farmacia' },
    { id: 'dpapel', name: "D'PAPEL PAPELARIA", is_open: true, products: [], rating: 5.0, category: 'shopping' },
    { id: 'marmitaria-fortaleza', name: 'MARMITARIA FORTALEZA', is_open: true, products: [{ name: 'Marmita', active: true }], rating: 4.8, category: 'restaurante' },
    { id: 'recanto-sonhos', name: 'RESTAURANTE RECANTO DOS SONHOS', is_open: true, products: [{ name: 'Prato Feito', active: true }], rating: 4.8, category: 'restaurante' },
    { id: 'mercado-central', name: 'MERCADO CENTRAL', is_open: true, products: [{ name: 'Arroz', active: true }], rating: 4.8, category: 'mercado' },
    { id: 'vem-que-tem', name: 'VEM QUE TEM', is_open: false, products: [{ name: 'Item', active: true }], rating: 4.9, category: 'restaurante' },
    { id: 'santa-brasa', name: 'SANTA BRASA', is_open: false, products: [{ name: 'Carne', active: true }], rating: 4.9, category: 'restaurante' },
  ];

  const d = createDateAtHour(12, 30); // Horário de almoço
  const ranked = rankStores(realStoresMock, d);

  // 1º colocado deve ser Marmitaria Fortaleza
  assert(
    ranked[0].id === 'marmitaria-fortaleza',
    'TESTE 15 (CENÁRIO REAL): No almoço, MARMITARIA FORTALEZA fica em 1º lugar no topo absoluto'
  );

  // Lojas sem produtos (farma-popular, drogaria-paulista, dpapel) devem ficar ABAIXO das lojas abertas com produtos
  const marmitaIdx = ranked.findIndex((s) => s.id === 'marmitaria-fortaleza');
  const recantoIdx = ranked.findIndex((s) => s.id === 'recanto-sonhos');
  const mercadoIdx = ranked.findIndex((s) => s.id === 'mercado-central');
  const farmaIdx = ranked.findIndex((s) => s.id === 'farma-popular');
  const paulistaIdx = ranked.findIndex((s) => s.id === 'drogaria-paulista');
  const dpapelIdx = ranked.findIndex((s) => s.id === 'dpapel');
  const vemQueTemIdx = ranked.findIndex((s) => s.id === 'vem-que-tem');

  const allActiveWithCatalogAbove = [marmitaIdx, recantoIdx, mercadoIdx].every(
    (idx) => idx < farmaIdx && idx < paulistaIdx && idx < dpapelIdx
  );
  assert(
    allActiveWithCatalogAbove,
    'TESTE 15 (CENÁRIO REAL): Lojas abertas com catálogo ficam todas ACIMA de lojas que exibem "Cardápio em atualização"'
  );

  // Lojas fechadas ficam abaixo das abertas
  assert(
    vemQueTemIdx > farmaIdx && vemQueTemIdx > dpapelIdx,
    'TESTE 15 (CENÁRIO REAL): Lojas fechadas ficam abaixo das lojas abertas'
  );
}

console.log(`\n========================================`);
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
