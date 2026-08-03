import { useEffect, useMemo, useState } from 'react';
import { isStoreOpenNow, type StoreStatusInput } from '@/lib/storeHours';

/**
 * Tick compartilhado: reavalia o relógio a cada minuto (alinhado ao início
 * do minuto) e também quando o app volta ao primeiro plano.
 * Garante que uma loja feche/abra sozinha exatamente no horário cadastrado.
 */
export function useMinuteTick(): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const msToNextMinute = 60000 - (Date.now() % 60000);
    const timeout = setTimeout(() => {
      setTick(Date.now());
      interval = setInterval(() => setTick(Date.now()), 60000);
    }, msToNextMinute);

    const onVisible = () => {
      if (document.visibilityState === 'visible') setTick(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return tick;
}

/**
 * Status de abertura de UMA loja, sempre derivado do horário cadastrado
 * pelo lojista (business_hours) + pausa manual (is_open === false) +
 * empresa ativa. Nunca confia cegamente em is_open === true.
 */
export function useStoreOpenStatus(company: StoreStatusInput | null | undefined): boolean {
  const tick = useMinuteTick();
  return useMemo(() => (company ? isStoreOpenNow(company) : false), [company, tick]);
}

/**
 * Mesma regra aplicada a uma LISTA de lojas: retorna a lista com `is_open`
 * recalculado, mantendo a referência quando nada muda (evita re-render).
 */
export function useStoresOpenStatus<T extends StoreStatusInput>(companies: T[] | null | undefined): T[] {
  const tick = useMinuteTick();
  return useMemo(() => {
    if (!companies || companies.length === 0) return companies ?? [];
    let changed = false;
    const next = companies.map((c) => {
      const open = isStoreOpenNow(c);
      if (c.is_open !== open) {
        changed = true;
        return { ...c, is_open: open };
      }
      return c;
    });
    return changed ? next : companies;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, tick]);
}
