export interface WhatsAppStoreConfig {
  id: string;
  name: string;
  phone: string;        // Número formatado para wa.me (ex: 556596068049)
  displayPhone: string; // Exibição formatada amigável (ex: +55 65 9606-8049)
  defaultMessage?: string;
}

export const DEFAULT_WHATSAPP_ORDER_MESSAGE =
  'Olá! Vim pelo É Pra Já e gostaria de fazer um pedido.';

/**
 * Configuração centralizada das lojas que recebem pedidos exclusivamente via WhatsApp
 * quando ainda não possuem catálogo cadastrado no É Pra Já.
 */
export const WHATSAPP_ONLY_STORES: Record<string, WhatsAppStoreConfig> = {
  // 1. Drogaria Difarma
  '746054ea-4a94-4adc-b890-1e9476d3de9d': {
    id: '746054ea-4a94-4adc-b890-1e9476d3de9d',
    name: 'Drogaria Difarma',
    phone: '556596068049',
    displayPhone: '+55 65 9606-8049',
    defaultMessage: DEFAULT_WHATSAPP_ORDER_MESSAGE,
  },

  // 2. DROGARIA PAULISTA
  'd62614e7-d781-40f6-959a-e812a5d1ba96': {
    id: 'd62614e7-d781-40f6-959a-e812a5d1ba96',
    name: 'DROGARIA PAULISTA',
    phone: '556599154448',
    displayPhone: '+55 65 9915-4448',
    defaultMessage: DEFAULT_WHATSAPP_ORDER_MESSAGE,
  },

  // 3. FARMA POPULAR
  '5d6183dc-d941-4a46-8ccc-6375271c2683': {
    id: '5d6183dc-d941-4a46-8ccc-6375271c2683',
    name: 'FARMA POPULAR',
    phone: '55659650987',
    displayPhone: '+55 65 9659-0987',
    defaultMessage: DEFAULT_WHATSAPP_ORDER_MESSAGE,
  },
};

/**
 * Identifica se a loja fornecida pertence à lista de lojas exclusivas de WhatsApp.
 * Usa prioritariamente o `id` da empresa e possui fallback seguro pelo nome.
 */
export function getWhatsAppOnlyStore(company: any): WhatsAppStoreConfig | null {
  if (!company) return null;

  // 1. Verificação prioritária por ID da loja
  if (company.id && WHATSAPP_ONLY_STORES[company.id]) {
    return WHATSAPP_ONLY_STORES[company.id];
  }

  // 2. Fallback secundário por nome normalizado caso o ID venha divergente por sessão/user_id
  const normName = String(company.name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const store of Object.values(WHATSAPP_ONLY_STORES)) {
    const storeNorm = store.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (storeNorm === normName) {
      return store;
    }
  }

  return null;
}

/**
 * Monta o link wa.me oficial com mensagem pré-codificada
 */
export function buildWhatsAppLink(phone: string, message: string = DEFAULT_WHATSAPP_ORDER_MESSAGE): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(message).replace(/!/g, '%21');
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

