import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useCancelOrder() {
  const [loading, setLoading] = useState(false);

  const cancelOrder = useCallback(async (orderId: string, companyId?: string): Promise<boolean> => {
    if (!orderId) return false;
    
    setLoading(true);
    try {
      // 1. Salva localmente para atualização instantânea na UI do cliente (evita rollback)
      try {
        const localCancelled: string[] = JSON.parse(localStorage.getItem('@epraja_cancelled_orders') || '[]');
        if (!localCancelled.includes(orderId)) {
          localCancelled.push(orderId);
          localStorage.setItem('@epraja_cancelled_orders', JSON.stringify(localCancelled));
        }
      } catch (e) {
        console.warn('[useCancelOrder] Erro ao salvar no localStorage:', e);
      }

      const cleanId = String(orderId).replace('#', '').trim();
      const nowISO = new Date().toISOString();
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId);

      let targetId = cleanId;
      if (!isUUID) {
        // Se for um short ID (ex: últimos 6 caracteres ou primeiros 8 caracteres do UUID), busca o UUID correspondente
        const { data: foundOrders } = await supabase
          .from('orders')
          .select('id')
          .neq('status', 'cancelled');
        
        const matchedOrder = foundOrders?.find(o => 
          o.id.toLowerCase().endsWith(cleanId.toLowerCase()) || 
          o.id.toLowerCase().startsWith(cleanId.toLowerCase())
        );
        if (matchedOrder) {
          targetId = matchedOrder.id;
        }
      }

      // 2. Invocação da Edge Function com SERVICE_ROLE para garantir atualização imediata no banco e notificar o lojista
      try {
        await supabase.functions.invoke('notify-customer', {
          body: {
            orderId: targetId,
            order_id: targetId,
            status: 'cancelled',
            deliveryStatus: 'cancelled',
            company_id: companyId
          }
        });
      } catch (e) {
        console.warn('[useCancelOrder] Aviso invoke notify-customer:', e);
      }

      // 3. Atualização direta no client como garantia complementar
      try {
        await Promise.allSettled([
          supabase.from('orders').update({ status: 'cancelled', updated_at: nowISO }).eq('id', targetId),
          supabase.from('deliveries').update({ status: 'cancelled', updated_at: nowISO }).eq('order_id', targetId),
        ]);
      } catch {
        // Ignora silenciosamente caso RLS restrinja UPDATE direto do cliente
      }

      toast.success("Pedido cancelado com sucesso.");
      return true;
    } catch (err) {
      console.error('[useCancelOrder] Falha ao cancelar pedido:', err);
      toast.error("Erro ao cancelar pedido. Tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { cancelOrder, loading };
}
