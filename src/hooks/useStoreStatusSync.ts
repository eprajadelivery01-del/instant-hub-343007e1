import { useEffect } from 'react';
import { isStoreOpenNow } from '@/lib/storeHours';

/**
 * Hook para manter o status `is_open` das lojas (ou loja única) atualizado
 * conforme o relógio avança, sem precisar fazer requisições constantes.
 * Ele reavalia o horário a cada minuto e atualiza o estado apenas se houver mudança.
 */
export function useStoreStatusSync<T extends { is_open?: boolean | null }>(
  items: T | T[] | null,
  setItems: React.Dispatch<React.SetStateAction<any>>
) {
  useEffect(() => {
    const interval = setInterval(() => {
      setItems((currentData: any) => {
        if (!currentData) return currentData;

        if (Array.isArray(currentData)) {
          let hasChanges = false;
          const updatedItems = currentData.map((item) => {
            const calculatedStatus = isStoreOpenNow(item as any);
            if (item.is_open !== calculatedStatus) {
              hasChanges = true;
              return { ...item, is_open: calculatedStatus };
            }
            return item;
          });
          return hasChanges ? updatedItems : currentData;
        } else {
          // Single object
          const calculatedStatus = isStoreOpenNow(currentData as any);
          if (currentData.is_open !== calculatedStatus) {
            return { ...currentData, is_open: calculatedStatus };
          }
          return currentData;
        }
      });
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, [setItems]);
}
