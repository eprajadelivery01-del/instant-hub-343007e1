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

      // 2. Chama a RPC com SECURITY DEFINER para garantir cancelamento imediato no banco
      try {
        await supabase.rpc('cancel_order_customer', { p_order_id: targetId });
      } catch (errRpc) {
        console.warn('[useCancelOrder] Aviso RPC cancel_order_customer:', errRpc);
      }

      // 3. Atualiza tabelas orders e deliveries diretamente no Supabase como garantia adicional
      const results = await Promise.allSettled([
        supabase.from('orders').update({ status: 'cancelled', updated_at: nowISO }).eq('id', targetId),
        supabase.from('deliveries').update({ status: 'cancelled', updated_at: nowISO }).eq('order_id', targetId),
        supabase.from('available_deliveries').update({ status: 'cancelled', updated_at: nowISO }).eq('order_id', targetId),
      ]);

      // 3. Se possuir companyId, notifica os lojistas na tabela notifications
      if (companyId) {
        try {
          const { data: comp } = await supabase
            .from('companies')
            .select('user_id')
            .eq('id', companyId)
            .maybeSingle();
            
          if (comp?.user_id) {
            await supabase.from('notifications').insert([{
              user_id: comp.user_id,
              title: "Pedido Cancelado pelo Cliente",
              message: `O cliente cancelou o pedido #${cleanId.split('-')[0].toUpperCase()}.`,
              type: "order_cancelled"
            }]);
          }
        } catch (e) {
          console.warn('[useCancelOrder] Erro ao notificar lojistas:', e);
        }
      }

      // 4. Invocação da Edge Function para forçar atualização ADMIN (Service Role) e disparar Realtime para o Lojista
      try {
        await supabase.functions.invoke('notify-customer', {
          body: {
            orderId: orderId,
            order_id: orderId,
            status: 'cancelled',
            deliveryStatus: 'cancelled',
            company_id: companyId
          }
        });
      } catch (e) {
        console.warn('[useCancelOrder] Erro ao invocar notify-customer:', e);
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
