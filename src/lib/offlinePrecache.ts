import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';

const STORAGE_KEY_COMPANIES = '@epraja_cache_companies_v1';
const STORAGE_KEY_PRODUCTS = '@epraja_cache_products_v1';
const STORAGE_KEY_TIMESTAMP = '@epraja_cache_timestamp_v1';

export interface PrecachedStoreData {
  company: Company | null;
  products: Product[];
}

let memoryCompanies: Company[] | null = null;
let memoryProductsByStore: Record<string, Product[]> = {};

export function loadPrecacheFromStorage() {
  try {
    const cachedCompRaw = localStorage.getItem(STORAGE_KEY_COMPANIES);
    if (cachedCompRaw) {
      memoryCompanies = JSON.parse(cachedCompRaw);
    }
    // Carrega produtos sob demanda para não bloquear o parsing inicial do bundle
    const cachedProdRaw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (cachedProdRaw) {
      try {
        memoryProductsByStore = JSON.parse(cachedProdRaw);
      } catch {}
    }
  } catch (e) {
    console.warn('[Precache] Error loading from storage:', e);
  }
}

export function getCachedCompanies(): Company[] | undefined {
  if (memoryCompanies && memoryCompanies.length > 0) {
    return memoryCompanies;
  }
  try {
    const cached = localStorage.getItem(STORAGE_KEY_COMPANIES);
    if (cached) {
      memoryCompanies = JSON.parse(cached);
      return memoryCompanies || undefined;
    }
  } catch {}
  return undefined;
}

export function getCachedStoreData(storeId: string | undefined): PrecachedStoreData | undefined {
  if (!storeId) return undefined;

  const companies = getCachedCompanies();
  const company = companies?.find(c => c.id === storeId || c.user_id === storeId) || null;
  if (!company) return undefined;

  const actualId = company.id;
  const actualUserId = company.user_id;

  const products = (
    memoryProductsByStore[storeId] ||
    (actualId ? memoryProductsByStore[actualId] : undefined) ||
    (actualUserId ? memoryProductsByStore[actualUserId] : undefined) ||
    []
  );

  return { company, products };
}

export async function startBackgroundPrecacheSync(): Promise<void> {
  const lastSync = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
  const now = Date.now();
  if (lastSync && now - Number(lastSync) < 30 * 60 * 1000 && memoryCompanies && memoryCompanies.length > 0) {
    return;
  }

  // Executa em idle/background de forma não-bloqueante
  const runner = async () => {
    try {
      const { data: companies, error: compErr } = await supabase
        .from('companies')
        .select('id, name, description, category, rating, is_open, active, is_active, delivery_fee, delivery_regions_pricing, show_in_marketplace, city, state, address, phone, banner_url, cover_url, logo_url, business_hours, prep_time, prep_time_min, prep_time_max, created_at, user_id')
        .or('show_in_marketplace.eq.true,is_active.eq.true')
        .order('name', { ascending: true })
        .limit(50);

      if (!compErr && companies && companies.length > 0) {
        memoryCompanies = companies as Company[];
        try {
          localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(companies));
          localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
        } catch {}
      }
    } catch (e) {
      console.warn('[Precache] Falha suave no pré-carregamento:', e);
    }
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => runner(), { timeout: 4000 });
  } else {
    setTimeout(() => runner(), 1500);
  }
}

// Inicialização preguiçosa não bloqueante
if (typeof window !== 'undefined') {
  setTimeout(() => loadPrecacheFromStorage(), 100);
}
