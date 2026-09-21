import { isStoreOpenNow, resolveTimezone, type StoreStatusInput } from './storeHours';

export type DayPeriod =
  | 'MORNING'
  | 'LUNCH'
  | 'AFTERNOON'
  | 'EVENING'
  | 'NIGHT';

export interface DayPeriodConfig {
  period: DayPeriod;
  name: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

/**
 * Configuração centralizada e rigorosa dos períodos do dia.
 * Horários locais (America/Cuiaba por padrão).
 * - Manhã (05:00 - 10:00): Padarias, Cafés, Panificadoras, Café da Manhã.
 * - Almoço / Perto do Almoço (10:00 - 14:30): Marmitarias, Marmitas, Comida Caseira, Prato Feito, Almoço.
 * - Tarde (14:30 - 17:30): Lanches, Cafés, Docerias, Bolos, Salgados, Açaí, Sorvetes.
 * - Noite (17:30 - 23:30): Lanches, Hamburguerias, Pizzarias, Espetarias/Espetos, Petiscarias, Conveniências, Bebidas.
 * - Madrugada (23:30 - 05:00): Conveniências, Bebidas, Lanches 24h, Hamburguerias, Pizzarias.
 */
export const DAY_PERIODS: readonly DayPeriodConfig[] = [
  { period: 'MORNING', name: 'Manhã', startHour: 5, startMinute: 0, endHour: 10, endMinute: 0 },
  { period: 'LUNCH', name: 'Almoço', startHour: 10, startMinute: 0, endHour: 14, endMinute: 30 },
  { period: 'AFTERNOON', name: 'Tarde', startHour: 14, startMinute: 30, endHour: 17, endMinute: 30 },
  { period: 'EVENING', name: 'Noite', startHour: 17, startMinute: 30, endHour: 23, endMinute: 30 },
  { period: 'NIGHT', name: 'Madrugada', startHour: 23, startMinute: 30, endHour: 5, endMinute: 0 },
] as const;

/**
 * Normalização robusta de texto:
 * - lowercase;
 * - remoção de acentos (NFD);
 * - trim.
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Comparação segura de palavras-chave:
 * Previne falsos positivos por substrings acidentais no meio de palavras.
 */
function safeMatchesKeyword(normalizedText: string, keyword: string): boolean {
  if (!normalizedText || !keyword) return false;
  const normKw = normalizeText(keyword);
  if (!normKw) return false;

  // Se o termo possui espaços (ex: "comida caseira", "bolo de pote", "prato feito"), usa includes direto
  if (normKw.includes(' ')) {
    return normalizedText.includes(normKw);
  }

  // Palavra única: garante correspondência isolada com fronteiras não alfanuméricas
  const regex = new RegExp(`(^|[^a-z0-9])${normKw}([^a-z0-9]|$)`, 'i');
  return regex.test(normalizedText);
}

function matchesAnyKeyword(normalizedText: string, keywords: string[]): boolean {
  if (!normalizedText) return false;
  return keywords.some((kw) => safeMatchesKeyword(normalizedText, kw));
}

/**
 * Retorna o período do dia atual baseado no timezone local da plataforma (America/Cuiaba).
 */
export function resolveDayPeriod(
  date: Date = new Date(),
  explicitTimezone?: string | null
): DayPeriod {
  const tz = resolveTimezone(explicitTimezone);
  let hour = 0;
  let minute = 0;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
    hour = Number(get('hour')) || 0;
    if (hour === 24) hour = 0;
    minute = Number(get('minute')) || 0;
  } catch {
    hour = date.getHours();
    minute = date.getMinutes();
  }

  const totalMinutes = hour * 60 + minute;

  // 05:00 às 09:59:59 (300 a 599 min) -> Manhã (Padarias / Cafés)
  if (totalMinutes >= 5 * 60 && totalMinutes < 10 * 60) {
    return 'MORNING';
  }
  // 10:00 às 14:29:59 (600 a 869 min) -> Almoço / Perto do Almoço (Marmitarias / Almoço)
  if (totalMinutes >= 10 * 60 && totalMinutes < 14 * 60 + 30) {
    return 'LUNCH';
  }
  // 14:30 às 17:29:59 (870 a 1049 min) -> Tarde (Lanches / Bolos / Cafés)
  if (totalMinutes >= 14 * 60 + 30 && totalMinutes < 17 * 60 + 30) {
    return 'AFTERNOON';
  }
  // 17:30 às 23:29:59 (1050 a 1409 min) -> Noite (Lanches / Espetos / Hamburguerias / Pizzarias / Conveniências)
  if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 23 * 60 + 30) {
    return 'EVENING';
  }
  // 23:30 às 04:59:59 (>= 1410 min ou < 300 min) -> Madrugada (Conveniências / Bebidas / Lanches)
  return 'NIGHT';
}

/**
 * Regras semânticas de palavras-chave por período do dia
 */
const PERIOD_RULES = {
  MORNING: {
    // 05:00 - 10:00 -> Padarias e Cafés em 1º lugar
    strong: [
      'padaria', 'panificadora', 'cafeteria', 'cafe', 'pao', 'paes',
      'pao de queijo', 'salgado', 'salgados', 'cafe da manha', 'confeitaria'
    ],
    moderate: [
      'mercado', 'conveniencia', 'hortifruti', 'feirinha', 'emporio'
    ],
    disqualify: [
      'marmitaria', 'marmita', 'marmitas', 'marmitex', 'almoco', 'hamburguer', 'burger',
      'pizza', 'pizzaria', 'chapa', 'espetaria', 'espeto', 'espetinho', 'espetos',
      'petiscaria', 'petisco', 'papelaria', 'aviamentos', 'shopping', 'farmacia', 'drogaria'
    ],
  },
  LUNCH: {
    // 10:00 - 14:30 -> Marmitarias e Comida de Almoço em 1º lugar
    strong: [
      'marmitaria', 'marmita', 'marmitas', 'marmitex', 'almoco', 'comida caseira',
      'prato feito', 'assados', 'galinhada', 'feijoada', 'peixaria', 'self service',
      'buffet', 'caseira'
    ],
    moderate: [
      'restaurante', 'churrasco', 'churrascaria', 'grelhados', 'comida',
      'refeicao', 'tapioca'
    ],
    disqualify: [
      'feirinha', 'hortifruti', 'bolo', 'bolos', 'doceria', 'confeitaria', 'doces',
      'geladinho', 'geladinhos', 'sorvete', 'sorvetes', 'sorveteria', 'papelaria',
      'aviamentos', 'shopping', 'farmacia', 'drogaria', 'suplemento', 'suplementos',
      'hamburguer', 'burger', 'burgers', 'pizza', 'pizzaria', 'chapa', 'petiscaria',
      'acai', 'cerveja', 'cervejas'
    ],
  },
  AFTERNOON: {
    // 14:30 - 17:30 -> Lanches, Cafés, Bolos, Docerias em 1º lugar
    strong: [
      'lanches', 'lanche', 'lanchonete', 'padaria', 'panificadora', 'cafeteria',
      'cafe', 'doceria', 'confeitaria', 'bolo', 'bolos', 'doces', 'pastel',
      'pastelaria', 'salgado', 'salgados', 'sorvete', 'sorvetes', 'sorveteria',
      'geladinho', 'geladinhos', 'acai', 'tapioca', 'crepe', 'suco', 'sucos'
    ],
    moderate: [
      'mercado', 'conveniencia', 'bebidas', 'emporio'
    ],
    disqualify: [
      'marmitaria', 'marmita', 'marmitas', 'marmitex', 'almoco', 'prato feito',
      'galinhada', 'feijoada', 'papelaria', 'aviamentos', 'shopping', 'farmacia',
      'drogaria', 'suplemento'
    ],
  },
  EVENING: {
    // 17:30 - 23:30 -> Lanches, Espetos, Hamburguerias, Pizzarias e Conveniências em 1º lugar
    strong: [
      'lanches', 'lanche', 'lanchonete', 'hamburguer', 'hamburgueria', 'burger',
      'burgers', 'pizza', 'pizzaria', 'espetaria', 'espetinho', 'espetinhos',
      'espetos', 'espeto', 'petiscaria', 'petisco', 'petiscos', 'churrasco',
      'porcao', 'porcoes', 'conveniencia', 'bebidas', 'cerveja', 'cervejas',
      'distribuidora', 'chapa', 'acai', 'pasteis', 'pastel'
    ],
    moderate: [
      'restaurante', 'sushi', 'japonesa', 'jantar', 'oriental', 'temaki',
      'macarrao', 'massa'
    ],
    disqualify: [
      'marmitaria', 'marmita', 'marmitas', 'marmitex', 'almoco', 'prato feito',
      'padaria', 'panificadora', 'bolo', 'bolos', 'doceria', 'papelaria',
      'aviamentos', 'shopping', 'farmacia', 'drogaria', 'feirinha', 'hortifruti'
    ],
  },
  NIGHT: {
    // 23:30 - 05:00 -> Conveniências, Bebidas, Lanches 24h e Pizzarias da madrugada
    strong: [
      'conveniencia', 'bebidas', 'distribuidora', 'cerveja', 'cervejas',
      'lanches', 'lanche', 'hamburguer', 'burger', 'pizza', 'pizzaria', 'chapa'
    ],
    moderate: [
      'petiscaria', 'petisco', 'petiscos', 'porcao'
    ],
    disqualify: [
      'marmitaria', 'marmita', 'padaria', 'panificadora', 'almoco', 'bolo',
      'papelaria', 'aviamentos', 'shopping', 'feirinha', 'hortifruti'
    ],
  },
};

/**
 * Calcula a pontuação de prioridade da loja para o período do dia.
 * Retorna:
 * +50 para forte relação com o horário (ex: Marmitarias no Almoço, Padarias de Manhã, Lanches/Espetos/Conveniências à Noite)
 * +25 para relação moderada (ex: Restaurantes gerais no Almoço sem desqualificação)
 * +0 para neutras / desqualificadas do horário
 */
export function getStoreTimeScore(company: any, period: DayPeriod): number {
  if (!company) return 0;

  const rule = PERIOD_RULES[period] || PERIOD_RULES.LUNCH;

  const normName = normalizeText(company.name);
  const normCategory = normalizeText(company.category);
  const normDesc = normalizeText(company.description);

  // Coleta produtos
  const productTexts: string[] = [];
  if (Array.isArray(company.products) && company.products.length > 0) {
    for (const p of company.products) {
      if (p?.name) productTexts.push(normalizeText(p.name));
      if (p?.category) productTexts.push(normalizeText(p.category));
    }
  }
  const allProductText = productTexts.join(' ');

  // 1. Verificação de Desqualificação Rigorosa
  // Se o nome da loja ou sua categoria tiver palavras desqualificadoras para este horário
  // (ex: "FABIELLY BOLOS E DOCES" ou "EMPÓRIO DOS GELADINHOS" no horário de Almoço), zera o score.
  if (matchesAnyKeyword(normName, rule.disqualify)) {
    return 0;
  }
  if (matchesAnyKeyword(normCategory, rule.disqualify)) {
    // Se a categoria for desqualificada, só permite se o nome tiver forte correspondência com o horário
    if (!matchesAnyKeyword(normName, rule.strong)) {
      return 0;
    }
  }

  // 2. Pontuação Forte (+50)
  // Prioriza se o Nome, Descrição, Categoria ou Produtos tiverem termo forte do horário
  if (matchesAnyKeyword(normName, rule.strong)) {
    return 50;
  }
  if (matchesAnyKeyword(normDesc, rule.strong)) {
    return 50;
  }
  if (matchesAnyKeyword(normCategory, rule.strong)) {
    return 50;
  }
  if (allProductText && matchesAnyKeyword(allProductText, rule.strong)) {
    return 50;
  }

  // 3. Pontuação Moderada (+25)
  // Lojas de apoio (ex: restaurantes no almoço, sushi à noite, mercados de manhã)
  if (matchesAnyKeyword(normName, rule.moderate)) {
    return 25;
  }
  if (matchesAnyKeyword(normCategory, rule.moderate)) {
    return 25;
  }
  if (matchesAnyKeyword(normDesc, rule.moderate)) {
    return 25;
  }
  if (allProductText && matchesAnyKeyword(allProductText, rule.moderate)) {
    return 25;
  }

  return 0;
}

/**
 * Determina se a loja possui produtos válidos/disponíveis no catálogo.
 * Segue a regra exata existente no É Pra Já:
 * produtos com active !== false && is_active !== false.
 */
export function hasAvailableProducts(company: any): boolean {
  if (!company || !Array.isArray(company.products) || company.products.length === 0) {
    return false;
  }
  return company.products.some(
    (p: any) => p && p.active !== false && p.is_active !== false
  );
}

/**
 * Retorna o nível de prioridade baseado no status da loja e catálogo:
 * 4 = ABERTA + COM PRODUTOS
 * 3 = ABERTA + SEM PRODUTOS
 * 2 = FECHADA + COM PRODUTOS
 * 1 = FECHADA + SEM PRODUTOS
 */
export function getStoreCatalogTier(company: StoreStatusInput): number {
  const isOpen = isStoreOpenNow(company) === true;
  const hasProducts = hasAvailableProducts(company);

  if (isOpen && hasProducts) return 4;
  if (isOpen && !hasProducts) return 3;
  if (!isOpen && hasProducts) return 2;
  return 1;
}

/**
 * Ordena as lojas de forma inteligente com a hierarquia:
 * 1º - Grupo de Disponibilidade de Catálogo:
 *      1. Aberta + Com Produtos (Tier 4)
 *      2. Aberta + Sem Produtos (Tier 3)
 *      3. Fechada + Com Produtos (Tier 2)
 *      4. Fechada + Sem Produtos (Tier 1)
 *
 * 2º - Score de Prioridade por Horário (+50, +25, 0):
 *      (Dentro de "Aberta + Com Produtos", lojas relevantes ao horário ficam no topo).
 *
 * 3º - Melhor Avaliação (rating) como critério de desempate secundário.
 *
 * 4º - Ordem alfabética pelo nome (estabilidade visual).
 *
 * NOTA: Esta função não mutaciona os objetos e não filtra nenhuma loja.
 * Todas as lojas continuam na lista.
 */
export function rankStores<T extends StoreStatusInput>(
  stores: T[] | null | undefined,
  currentDate: Date = new Date(),
  explicitTimezone?: string | null
): T[] {
  if (!stores || stores.length === 0) return stores ?? [];

  const period = resolveDayPeriod(currentDate, explicitTimezone);

  return [...stores].sort((a, b) => {
    // 1º Critério: Grupo de Disponibilidade de Catálogo
    const aTier = getStoreCatalogTier(a);
    const bTier = getStoreCatalogTier(b);

    if (bTier !== aTier) {
      return bTier - aTier;
    }

    // 2º Critério: Score de Prioridade por Horário (+50, +25, 0)
    const aScore = getStoreTimeScore(a, period);
    const bScore = getStoreTimeScore(b, period);

    if (bScore !== aScore) {
      return bScore - aScore;
    }

    // 3º Critério: Avaliação (rating) como desempate secundário
    const aRating = Number((a as any).rating) || 0;
    const bRating = Number((b as any).rating) || 0;

    if (bRating !== aRating) {
      return bRating - aRating;
    }

    // 4º Critério: Nome (estabilidade)
    const aName = String((a as any).name || '');
    const bName = String((b as any).name || '');
    return aName.localeCompare(bName);
  });
}
