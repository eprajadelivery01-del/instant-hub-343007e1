import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';

const STORAGE_KEY_COMPANIES = '@epraja_cache_companies_v1';
const STORAGE_KEY_PRODUCTS = '@epraja_cache_products_v1';
const STORAGE_KEY_TIMESTAMP = '@epraja_cache_timestamp_v1';

export interface PrecachedStoreData {
  company: Company | null;
  products: Product[];
}

// Memory cache for sub-millisecond retrieval
let memoryCompanies: Company[] | null = null;
let memoryProductsByStore: Record<string, Product[]> = {};

/**
 * Initializes memory cache from localStorage on app launch.
 */
export function loadPrecacheFromStorage() {
  try {
    const cachedCompRaw = localStorage.getItem(STORAGE_KEY_COMPANIES);
    if (cachedCompRaw) {
      memoryCompanies = JSON.parse(cachedCompRaw);
    }

    const cachedProdRaw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (cachedProdRaw) {
      memoryProductsByStore = JSON.parse(cachedProdRaw);
    }
  } catch (e) {
    console.warn('[Precache] Error loading from storage:', e);
  }
}

/**
 * Retrieves cached companies instantly (0ms response).
 */
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

/**
 * Retrieves cached store and its products instantly (0ms response).
 */
export function getCachedStoreData(storeId: string | undefined): PrecachedStoreData | undefined {
  if (!storeId) return undefined;

  const companies = getCachedCompanies();
  const company = companies?.find(c => c.id === storeId || c.user_id === storeId) || null;
  const products = memoryProductsByStore[storeId] || [];

  if (company || products.length > 0) {
    return { company, products };
  }
  return undefined;
}

/**
 * Background async pre-fetcher that runs on app startup.
 * Fetches all stores & active products and saves them into persistent storage.
 */
export async function startBackgroundPrecacheSync(): Promise<void> {
  // Load local storage first
  loadPrecacheFromStorage();

  try {
    // 1. Fetch all active marketplace companies
    const { data: companies, error: compErr } = await supabase
      .from('companies')
      .select('id, name, description, category, rating, is_open, active, is_active, delivery_fee, delivery_regions_pricing, show_in_marketplace, city, state, banner_url, cover_url, logo_url, business_hours, prep_time_min, prep_time_max, created_at, user_id')
      .or('show_in_marketplace.eq.true,is_active.eq.true')
      .order('name', { ascending: true });

    if (!compErr && companies && companies.length > 0) {
      memoryCompanies = companies as Company[];
      localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(companies));
    }

    // 2. Fetch all active products
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!prodErr && products && products.length > 0) {
      const grouped: Record<string, Product[]> = {};
      products.forEach((prod: any) => {
        if (prod.company_id) {
          if (!grouped[prod.company_id]) grouped[prod.company_id] = [];
          grouped[prod.company_id].push(prod as Product);
        }
      });

      memoryProductsByStore = grouped;
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(grouped));
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
      console.log(`[Precache] Pré-carregamento concluído! ${companies?.length || 0} lojas e ${products.length} produtos armazenados permanentemente.`);
    }
  } catch (e) {
    console.warn('[Precache] Falha no pré-carregamento em segundo plano:', e);
  }
}

// Initial load on file import
loadPrecacheFromStorage();
