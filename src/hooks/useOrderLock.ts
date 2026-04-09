import { useState, useCallback, useRef } from 'react';
import { CartItem } from '@/types/database';

export function useOrderLock() {
  const [isLocked, setIsLocked] = useState(false);
  const lockRef = useRef(false);

  const generateIdempotencyKey = useCallback((userId: string, items: CartItem[], total: number) => {
    // Basic hash based on User, Item IDs, Quantities and Total
    const baseStr = `${userId}-${total}-${items.map(i => `${i.product.id}:${i.quantity}`).sort().join('|')}`;
    
    // We can also add a timestamp floored to the minute if we want to allow the same order 
    // to be placed again after some time, but for now, let's keep it very strict for the session.
    // Let's use a random suffix that persists until clear to allow retries on same state
    return btoa(baseStr).slice(0, 50);
  }, []);

  const acquireLock = useCallback(() => {
    if (lockRef.current) return false;
    lockRef.current = true;
    setIsLocked(true);
    return true;
  }, []);

  const releaseLock = useCallback(() => {
    lockRef.current = false;
    setIsLocked(false);
  }, []);

  return {
    isLocked,
    acquireLock,
    releaseLock,
    generateIdempotencyKey
  };
}
