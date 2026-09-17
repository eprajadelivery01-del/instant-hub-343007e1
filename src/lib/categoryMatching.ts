export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  lanches: [
    'lanche',
    'lanches',
    'hamburguer',
    'hamburgueria',
    'hamburgueres',
    'burger',
    'burguer',
    'sanduiche',
    'sanduíche',
    'pastel',
    'pastelaria',
    'salgado',
    'salgados',
    'hot dog',
    'hotdog',
    'cachorro quente',
    'chapa',
    'fast food',
    'batata recheada',
    'tapioca',
    'coxinha',
    'empada',
    'fritas',
  ],
  farmacia: [
    'farmacia',
    'farmácia',
    'drogaria',
    'drogarias',
    'farmaceutica',
    'farmacêutica',
    'medicamentos',
    'medicamento',
    'remedios',
    'remédios',
    'remedio',
    'remédio',
    'saude',
    'saúde',
    'farma',
    'suplementos',
  ],
  mercado: [
    'mercado',
    'supermercado',
    'mercearia',
    'hortifruti',
    'acougue',
    'açougue',
    'conveniencia',
    'conveniência',
    'armazem',
    'armazém',
    'padaria',
    'frios',
  ],
  restaurante: [
    'restaurante',
    'restaurantes',
    'marmitaria',
    'marmita',
    'marmitas',
    'comida',
    'refeicao',
    'refeição',
    'culinaria',
    'culinária',
    'alacarte',
    'a la carte',
    'prato feito',
    'executivo',
    'churrascaria',
    'pizzaria',
    'pizza',
    'sushi',
    'japones',
    'japonesa',
    'geladinho',
    'sorvete',
    'doceria',
  ],
  petiscaria: [
    'petiscaria',
    'petiscos',
    'petisco',
    'espetaria',
    'espetinho',
    'espetinhos',
    'porcao',
    'porcoes',
    'porção',
    'porções',
    'bar',
    'churrasco',
    'tira-gosto',
  ],
  bebidas: [
    'bebidas',
    'bebida',
    'adega',
    'distribuidora',
    'distribuidora de bebidas',
    'conveniencia',
    'conveniência',
    'cerveja',
    'cervejas',
    'chopp',
    'refrigerante',
    'sucos',
    'drink',
    'drinks',
  ],
  shopping: [
    'shopping',
    'loja',
    'variedades',
    'papelaria',
    'aviamentos',
    'presentes',
    'moda',
    'calcados',
    'calçados',
    'utilidades',
    'acessorios',
    'acessórios',
    'vestuario',
    'vestuário',
    'bazar',
  ],
};

export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Verifica se um texto (categoria, nome da loja, produto, descrição)
 * corresponde à categoria alvo selecionada ou termo buscado.
 */
export function matchesCategoryFilter(
  targetCategory: string,
  categoryOrText?: string | null
): boolean {
  if (!targetCategory) return true;
  if (!categoryOrText) return false;

  const normTarget = normalizeText(targetCategory);
  const normText = normalizeText(categoryOrText);

  if (!normTarget || !normText) return false;

  // 1. Correspondência direta ou substring
  if (normText.includes(normTarget) || normTarget.includes(normText)) {
    return true;
  }

  // 2. Correspondência por palavras-chave mapeadas
  const keywords = CATEGORY_KEYWORDS[normTarget];
  if (keywords && keywords.length > 0) {
    return keywords.some((kw) => {
      const normKw = normalizeText(kw);
      return normText.includes(normKw) || normKw.includes(normText);
    });
  }

  // 3. Se o alvo for uma keyword de alguma categoria conhecida (busca reversa)
  for (const [catKey, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (normTarget === catKey || kws.some((k) => normalizeText(k) === normTarget)) {
      if (normText === catKey || kws.some((k) => normText.includes(normalizeText(k)))) {
        return true;
      }
    }
  }

  return false;
}
