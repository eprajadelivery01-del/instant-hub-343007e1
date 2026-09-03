import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useEvaluation() {
  const [loading, setLoading] = useState(false);

  const checkHasRated = useCallback(async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);
      
      if (error) {
        // If aborted or lock contention occurred, try once more quietly
        const isAbort = 
          error.message?.toLowerCase().includes('abort') || 
          error.details?.toLowerCase().includes('abort') ||
          error.hint?.toLowerCase().includes('abort');

        if (isAbort) {
          try {
            const retry = await supabase
              .from('reviews')
              .select('id')
              .eq('order_id', orderId)
              .limit(1);
            if (!retry.error) {
              return !!(retry.data && retry.data.length > 0);
            }
          } catch {
            return false;
          }
        }

        console.warn('[useEvaluation] Warning checking rating:', error.message || error);
        return false;
      }
      return !!(data && data.length > 0);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('abort')) {
        return false;
      }
      console.warn('[useEvaluation] Exception checking rating:', err?.message || err);
      return false;
    }
  }, []);

  const submitRating = useCallback(async ({
    orderId,
    userId,
    companyId,
    driverId,
    orderRating,
    driverRating,
    comment
  }: {
    orderId: string;
    userId: string;
    companyId: string;
    driverId?: string;
    orderRating: number;
    driverRating: number;
    comment: string;
  }) => {
    setLoading(true);
    try {
      // 1. Double check if already rated to prevent duplicates
      const exists = await checkHasRated(orderId);
      if (exists) {
        toast.info('Este pedido já foi avaliado.');
        return true;
      }

      // 2. Insert the review
      // We use Math.round for compatibility, but we store the detailed comment
      const { error } = await supabase.from('reviews').insert({
        order_id: orderId,
        user_id: userId,
        company_id: companyId,
        driver_id: driverId || null,
        rating: Math.round((orderRating + driverRating) / 2),
        comment: comment || '',
        type: 'order', // Explicitly setting type
      });

      if (error) {
        console.error('[useEvaluation] Insert error:', error);
        throw error;
      }

      toast.success('Avaliação enviada com sucesso!');
      return true;
    } catch (err: any) {
      console.error('[useEvaluation] Error submitting review:', err);
      toast.error('Erro ao enviar avaliação. Verifique sua conexão.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkHasRated]);

  return {
    submitRating,
    checkHasRated,
    loading
  };
}
