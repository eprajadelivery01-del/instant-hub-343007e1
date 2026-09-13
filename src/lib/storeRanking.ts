import { isStoreOpenNow, resolveTimezone, type StoreStatusInput } from './storeHours';

export type DayPeriod =
  | 'MORNING'
  | 'LATE_MORNING'
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
 * Configuração centralizada e extensível dos períodos do dia.
 * Horários locais (America/Cuiaba por padrão).
 */
export const DAY_PERIODS: readonly DayPeriodConfig[] = [
  { period: 'MORNING', name: 'Manhã Cedo', startHour: 5, startMinute: 0, endHour: 9, endMinute: 0 },
  { period: 'LATE_MORNING', name: 'Meio da Manhã', startHour: 9, startMinute: 0, endHour: 11, endMinute: 0 },
  { period: 'LUNCH', name: 'Almoço', startHour: 11, startMinute: 0, endHour: 14, endMinute: 0 },
  { period: 'AFTERNOON', name: 'Meio da Tarde', startHour: 14, startMinute: 0, endHour: 17, endMinute: 0 },
  { period: 'EVENING', name: 'Noite', startHour: 17, startMinute: 0, endHour: 23, endMinute: 0 },
  { period: 'NIGHT', name: 'Madrugada', startHour: 23, startMinute: 0, endHour: 5, endMinute: 0 },
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

  // Se o termo possui espaços (ex: "comida caseira", "bolo de pote"), usa includes direto
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

  // 05:00 às 08:59:59 (300 a 539 min)
  if (totalMinutes >= 5 * 60 && totalMinutes < 9 * 60) {
    return 'MORNING';
  }
  // 09:00 às 10:59:59 (540 a 659 min)
  if (totalMinutes >= 9 * 60 && totalMinutes < 11 * 60) {
    return 'LATE_MORNING';
  }
  // 11:00 às 13:59:59 (660 a 839 min)
  if (totalMinutes >= 11 * 60 && totalMinutes < 14 * 60) {
    return 'LUNCH';
  }
  // 14:00 às 16:59:59 (840 a 1019 min)
  if (totalMinutes >= 14 * 60 && totalMinutes < 17 * 60) {
    return 'AFTERNOON';
  }
  // 17:00 às 22:59:59 (1020 a 1379 min)
  if (totalMinutes >= 17 * 60 && totalMinutes < 23 * 60) {
    return 'EVENING';
  }
  // 23:00 às 04:59:59 (>= 1380 min ou < 300 min - Madrugada atravessando meia-noite)
  return 'NIGHT';
}

/**
 * Avalia um texto específico para determinar se pontua para o período dado.
 */
function evaluateTextForPeriod(text: string, period: DayPeriod): number {
  if (!text) return 0;

  switch (period) {
    case 'MORNING': {
      // 05:00 - 09:00:
      // 1. Padarias, Panificadoras, Cafés, Cafeterias (+50)
      // 2. Conveniências, Mercados, Empórios (+30)
      // 3. Salgados, Lanches rápidos (+20)
      if (matchesAnyKeyword(text, ['doceria', 'confeitaria', 'bolo', 'bolos', 'doces', 'tarde', 'sorvete', 'geladinho'])) {
        return 0;
      }

      if (matchesAnyKeyword(text, ['marmitaria', 'hamburguer', 'burger', 'pizza', 'pizzaria'])) return 0;

      const bakeryAndCoffeeKeywords = ['padaria', 'panificadora', 'cafeteria', 'cafe', 'pao', 'paes'];
      if (matchesAnyKeyword(text, bakeryAndCoffeeKeywords)) return 50;

      const convenienceAndMarketKeywords = ['conveniencia', 'mercado', 'emporio'];
      if (matchesAnyKeyword(text, convenienceAndMarketKeywords)) return 30;

      const breakfastSnacksKeywords = ['salgado', 'pastel', 'suco', 'lanche'];
      if (matchesAnyKeyword(text, breakfastSnacksKeywords)) return 20;

      return 0;
    }

    case 'LATE_MORNING': {
      // 09:00 - 11:00: Padarias, Cafeterias, Mercados, Conveniências, Feirinhas
      const strongKeywords = ['padaria', 'panificadora', 'cafeteria', 'cafe', 'mercado', 'conveniencia', 'hortifruti', 'feirinha'];
      if (matchesAnyKeyword(text, strongKeywords)) return 50;

      const moderateKeywords = ['marmitaria', 'restaurante', 'almoco', 'lanche', 'salgado'];
      if (matchesAnyKeyword(text, moderateKeywords)) return 30;
      return 0;
    }

    case 'LUNCH': {
      // 11:00 - 14:00: Marmitarias, Restaurantes almoço, Comida Caseira, Self-service
      const strongKeywords = ['marmitaria', 'comida caseira', 'almoco', 'marmita', 'prato feito', 'buffet', 'caseira'];
      if (matchesAnyKeyword(text, strongKeywords)) return 50;

      // Se for padaria, doceria, bolos, geladinho, sorvete, papelaria: não é almoço (+0)
      if (matchesAnyKeyword(text, ['padaria', 'panificadora', 'doceria', 'bolo', 'bolos', 'geladinho', 'sorvete', 'papelaria', 'aviamentos'])) {
        return 0;
      }

      const moderateKeywords = ['restaurante', 'lanches', 'lanche', 'petiscaria', 'espetaria', 'churrasco', 'assados', 'bebidas'];
      if (matchesAnyKeyword(text, moderateKeywords)) return 30;
      return 0;
    }

    case 'AFTERNOON': {
      // 14:00 - 17:00: Padarias, Cafeterias, Docerias, Bolos, Lanches, Sorveterias, Geladinhos, Açaí
      const strongKeywords = ['padaria', 'cafeteria', 'cafe', 'doceria', 'bolo', 'doces', 'lanches', 'lanche', 'sorvete', 'geladinho', 'acai', 'pastel'];
      if (matchesAnyKeyword(text, strongKeywords)) return 50;

      if (matchesAnyKeyword(text, ['marmitaria', 'marmita', 'almoco'])) return 0;

      const moderateKeywords = ['mercado', 'conveniencia', 'bebidas'];
      if (matchesAnyKeyword(text, moderateKeywords)) return 30;
      return 0;
    }

    case 'EVENING': {
      // 17:00 - 23:00: Hamburguerias, Pizzarias, Lanchonetes, Petiscarias, Espetarias, Janta, Açaí, Conveniências
      const strongKeywords = ['hamburguer', 'burger', 'pizza', 'pizzaria', 'lanches', 'lanche', 'petiscaria', 'espetaria', 'espetinho', 'acai', 'conveniencia', 'chapa'];
      if (matchesAnyKeyword(text, strongKeywords)) return 50;

      if (matchesAnyKeyword(text, ['padaria', 'panificadora', 'marmitaria', 'marmita', 'almoco'])) return 0;

      const moderateKeywords = ['restaurante', 'bebidas', 'cerveja', 'geladinho', 'doces', 'mercado'];
      if (matchesAnyKeyword(text, moderateKeywords)) return 30;
      return 0;
    }

    case 'NIGHT': {
      // 23:00 - 05:00: Lanchonetes, Hamburguerias, Conveniências, Bebidas, Pizzarias abertas na madrugada
      const strongKeywords = ['lanches', 'lanche', 'hamburguer', 'burger', 'conveniencia', 'bebidas', 'pizza', 'pizzaria', 'chapa'];
      if (matchesAnyKeyword(text, strongKeywords)) return 50;

      if (matchesAnyKeyword(text, ['padaria', 'panificadora', 'marmitaria', 'marmita', 'almoco', 'papelaria', 'aviamentos'])) return 0;

      const moderateKeywords = ['restaurante', 'petiscaria'];
      if (matchesAnyKeyword(text, moderateKeywords)) return 30;
      return 0;
    }

    default:
      return 0;
  }
}

/**
 * Calcula a pontuação de prioridade da loja para o período do dia.
 * Respeita ESTRITAMENTE a ordem de consulta do item 7:
 * 1º - company.category
 * 2º - company.name
 * 3º - company.description
 * 4º - company.products[].category
 *
 * Retorna:
 * +50 para forte relação com o horário
 * +30 para relação moderada
 * +0 para categoria neutra / sem prioridade
 */
export function getStoreTimeScore(company: any, period: DayPeriod): number {
  if (!company) return 0;

  // 1º - company.category
  const normCategory = normalizeText(company.category);
  const categoryScore = evaluateTextForPeriod(normCategory, period);
  // Se a categoria direta já for forte (ex: lanches/mercado/bebidas), pode ser considerada
  // Mas se for categoria ampla ("restaurante"), verificamos a especialização no nome/descrição
  if (categoryScore === 50) {
    return 50;
  }

  // 2º - informações já disponíveis do nome (company.name)
  const normName = normalizeText(company.name);
  const nameScore = evaluateTextForPeriod(normName, period);
  if (nameScore === 50) {
    return 50;
  }

  // 3º - descrição já disponível (company.description)
  const normDesc = normalizeText(company.description);
  const descScore = evaluateTextForPeriod(normDesc, period);
  if (descScore === 50) {
    return 50;
  }

  // 4º - categorias dos produtos já carregados
  if (Array.isArray(company.products) && company.products.length > 0) {
    for (const p of company.products) {
      const prodCategory = normalizeText(p?.category);
      const prodScore = evaluateTextForPeriod(prodCategory, period);
      if (prodScore === 50) {
        return 50;
      }
    }
  }

  // Se nenhum nível deu +50, verifica se algum nível obteve pontuação moderada (+30)
  if (categoryScore === 30 || nameScore === 30 || descScore === 30) {
    return 30;
  }

  if (Array.isArray(company.products) && company.products.length > 0) {
    for (const p of company.products) {
      const prodCategory = normalizeText(p?.category);
      if (evaluateTextForPeriod(prodCategory, period) === 30) {
        return 30;
      }
    }
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
 * Ordena as lojas de forma inteligente com a nova hierarquia:
 * 1º - Grupo de Disponibilidade de Catálogo:
 *      1. Aberta + Com Produtos (Tier 4)
 *      2. Aberta + Sem Produtos (Tier 3)
 *      3. Fechada + Com Produtos (Tier 2)
 *      4. Fechada + Sem Produtos (Tier 1)
 *
 * 2º - Score de Prioridade por Horário (+50, +30, 0):
 *      (Dentro de "Aberta + Com Produtos", lojas relevantes ficam acima de neutras).
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

    // 2º Critério: Score de Prioridade por Horário (+50, +30, 0)
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
