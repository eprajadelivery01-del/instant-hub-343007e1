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
 * Retorna o período do dia atual baseado no timezone local da plataforma.
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
 * Extrai texto normalizado para busca de palavras-chave da loja.
 */
function getStoreSearchableText(company: any): string {
  if (!company) return '';
  const parts: string[] = [];
  if (company.category) parts.push(String(company.category));
  if (company.name) parts.push(String(company.name));
  if (company.description) parts.push(String(company.description));

  if (Array.isArray(company.products)) {
    company.products.forEach((p: any) => {
      if (p?.category) parts.push(String(p.category));
      if (p?.name) parts.push(String(p.name));
    });
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Verifica se o texto da loja contém alguma das palavras ou categorias fornecidas.
 */
function matchesKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

/**
 * Calcula a pontuação de prioridade da loja para o período do dia.
 * Retorna:
 * +50 para forte relação
 * +30 para relação moderada
 * +0 para categoria neutra / sem prioridade
 */
export function getStoreTimeScore(
  company: any,
  period: DayPeriod
): number {
  if (!company) return 0;
  const text = getStoreSearchableText(company);
  if (!text) return 0;

  switch (period) {
    case 'MORNING': {
      // De manhã cedo (05:00 - 09:00):
      // Alta prioridade (+50): Padarias, Cafés, Cafeterias, Panificadoras, Conveniências, Mercados
      const strongKeywords = ['padaria', 'panificadora', 'cafeteria', 'café', 'cafe', 'conveniencia', 'conveniência', 'mercado', 'empório', 'emporio'];
      if (matchesKeywords(text, strongKeywords)) return 50;

      // Se for loja tipicamente de almoço ou noite, não pontua de manhã cedo
      if (matchesKeywords(text, ['marmitaria', 'hamburguer', 'burger', 'pizza', 'pizzaria'])) return 0;

      // Média prioridade (+30): Lanches matinais, Salgados, Bebidas
      const moderateKeywords = ['salgado', 'pastel', 'suco', 'lanche'];
      if (matchesKeywords(text, moderateKeywords)) return 30;

      return 0;
    }

    case 'LATE_MORNING': {
      // Meio da manhã (09:00 - 11:00):
      // Alta prioridade (+50): Padarias, Cafeterias, Mercados, Conveniências
      const strongKeywords = ['padaria', 'panificadora', 'cafeteria', 'café', 'cafe', 'mercado', 'conveniencia', 'conveniência', 'hortifruti', 'feirinha'];
      if (matchesKeywords(text, strongKeywords)) return 50;

      // Média prioridade (+30): Restaurantes/Marmitarias se preparando para almoço, Lanches, Salgados
      const moderateKeywords = ['marmitaria', 'restaurante', 'almoço', 'almoco', 'lanche', 'salgado'];
      if (matchesKeywords(text, moderateKeywords)) return 30;

      return 0;
    }

    case 'LUNCH': {
      // Horário do almoço (11:00 - 14:00):
      // Alta prioridade (+50): Marmitarias, Restaurantes, Comida Caseira, Self-service, Almoço
      const strongKeywords = ['marmitaria', 'comida caseira', 'almoço', 'almoco', 'marmita', 'prato feito', 'buffet', 'caseira'];
      if (matchesKeywords(text, strongKeywords)) return 50;

      // Se for padaria, doceria, bolos, geladinho, sorvete: não é almoço
      if (matchesKeywords(text, ['padaria', 'panificadora', 'doceria', 'bolo', 'bolos', 'geladinho', 'sorvete', 'papelaria', 'aviamentos'])) {
        return 0;
      }

      // Média prioridade (+30): Restaurantes em geral, Lanchonetes, Petiscaria, Carnes/Assados, Bebidas
      const moderateKeywords = ['restaurante', 'lanches', 'lanche', 'petiscaria', 'espetaria', 'churrasco', 'assados', 'bebidas'];
      if (matchesKeywords(text, moderateKeywords)) return 30;

      return 0;
    }

    case 'AFTERNOON': {
      // Meio da tarde (14:00 - 17:00):
      // Alta prioridade (+50): Padarias, Cafeterias, Docerias, Bolos, Doces, Lanches, Sorveterias, Geladinhos, Açaí
      const strongKeywords = ['padaria', 'cafeteria', 'café', 'cafe', 'doceria', 'bolo', 'doces', 'lanches', 'lanche', 'sorvete', 'geladinho', 'açaí', 'acai', 'pastel'];
      if (matchesKeywords(text, strongKeywords)) return 50;

      // Se for marmitaria exclusiva de almoço: não pontua à tarde
      if (matchesKeywords(text, ['marmitaria', 'marmita', 'almoço'])) return 0;

      // Média prioridade (+30): Mercados, Conveniências, Bebidas
      const moderateKeywords = ['mercado', 'conveniencia', 'conveniência', 'bebidas'];
      if (matchesKeywords(text, moderateKeywords)) return 30;

      return 0;
    }

    case 'EVENING': {
      // À noite (17:00 - 23:00):
      // Alta prioridade (+50): Hamburguerias, Pizzarias, Lanchonetes, Petiscarias, Espetarias, Restaurantes janta, Açaí, Conveniências
      const strongKeywords = ['hamburguer', 'hambúrguer', 'burger', 'pizza', 'pizzaria', 'lanches', 'lanche', 'petiscaria', 'espetaria', 'espetinho', 'açaí', 'acai', 'conveniencia', 'conveniência', 'chapa'];
      if (matchesKeywords(text, strongKeywords)) return 50;

      // Se for padaria matinal ou marmitaria exclusiva de almoço: não pontua no pico noturno
      if (matchesKeywords(text, ['padaria', 'panificadora', 'marmitaria', 'marmita', 'almoço'])) return 0;

      // Média prioridade (+30): Restaurantes, Bebidas, Geladinhos/Doces, Mercados
      const moderateKeywords = ['restaurante', 'bebidas', 'cerveja', 'geladinho', 'doces', 'mercado'];
      if (matchesKeywords(text, moderateKeywords)) return 30;

      return 0;
    }

    case 'NIGHT': {
      // Madrugada (23:00 - 05:00):
      // Alta prioridade (+50): Lanchonetes, Hamburguerias, Conveniências, Bebidas, Pizzarias abertas
      const strongKeywords = ['lanches', 'lanche', 'hamburguer', 'hambúrguer', 'burger', 'conveniencia', 'conveniência', 'bebidas', 'pizza', 'pizzaria', 'chapa'];
      if (matchesKeywords(text, strongKeywords)) return 50;

      // Se for padaria, marmitaria ou comércio diurno: não pontua na madrugada
      if (matchesKeywords(text, ['padaria', 'panificadora', 'marmitaria', 'marmita', 'almoço', 'papelaria', 'aviamentos'])) return 0;

      // Média prioridade (+30): Restaurantes em geral abertos nesse horário
      const moderateKeywords = ['restaurante', 'petiscaria'];
      if (matchesKeywords(text, moderateKeywords)) return 30;

      return 0;
    }

    default:
      return 0;
  }
}

/**
 * Ordena as lojas de forma inteligente:
 * 1º - Lojas ABERTAS vêm primeiro (regra suprema do sistema preservada).
 * 2º - Maior Score de Prioridade por Horário (+50, +30, 0).
 * 3º - Melhor Avaliação (rating) como critério de desempate.
 * 4º - Ordem alfabética pelo nome.
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
    // 1º Critério: Abertas vs Fechadas
    const aOpen = isStoreOpenNow(a) === true;
    const bOpen = isStoreOpenNow(b) === true;

    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;

    // 2º Critério: Score de Prioridade por Horário
    const aScore = getStoreTimeScore(a, period);
    const bScore = getStoreTimeScore(b, period);

    if (bScore !== aScore) {
      return bScore - aScore;
    }

    // 3º Critério: Avaliação (rating)
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
