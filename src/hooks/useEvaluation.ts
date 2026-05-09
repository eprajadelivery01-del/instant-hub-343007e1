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
        .maybeSingle();
      
      if (error) {
        console.error('[useEvaluation] Error checking rating:', error);
        return true; // Assume true on error to avoid bothering user if DB is down
      }
      return !!data;
    } catch (err) {
      console.error('[useEvaluation] Exception checking rating:', err);
      return true;
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
