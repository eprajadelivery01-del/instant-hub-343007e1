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
      
      if (error) return false;
      return !!data;
    } catch {
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
      const { error } = await supabase.from('reviews').insert({
        order_id: orderId,
        user_id: userId,
        company_id: companyId,
        driver_id: driverId,
        rating: Math.round((orderRating + driverRating) / 2),
        comment: `[Pedido: ${orderRating} Estrelas | Entregador: ${driverRating} Estrelas] ${comment || ''}`.trim(),
      });

      if (error) throw error;

      toast.success('Avaliação enviada com sucesso!');
      return true;
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error('Erro ao enviar avaliação. Tente novamente.');
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
