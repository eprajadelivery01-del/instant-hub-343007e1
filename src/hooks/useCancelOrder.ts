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
        // Se for um short ID (ex: últimos 6 caracteres do UUID), busca o UUID correspondente
        const { data: foundOrders } = await supabase
          .from('orders')
          .select('id')
          .neq('status', 'cancelled');
        
        const matchedOrder = foundOrders?.find(o => 
          o.id.toLowerCase().endsWith(cleanId.toLowerCase())
        );
        if (matchedOrder) {
          targetId = matchedOrder.id;
        }
      }

      // 2. Atualiza tabelas orders e deliveries no Supabase usando o ID completo (UUID)
      const results = await Promise.all([
        supabase.from('orders').update({ status: 'cancelled', updated_at: nowISO }).eq('id', targetId),
        supabase.from('deliveries').update({ status: 'cancelled', updated_at: nowISO }).eq('order_id', targetId),
      ]);

      for (const res of results) {
        if (res.error) {
          console.error('[useCancelOrder] Erro ao atualizar banco:', res.error);
        }
      }

      // 3. Se possuir companyId, notifica os lojistas na tabela notifications
      if (companyId) {
        try {
          const { data: companyUsers } = await supabase
            .from('company_users')
            .select('user_id')
            .eq('company_id', companyId);
            
          if (companyUsers && companyUsers.length > 0) {
            const notifications = companyUsers.map(cu => ({
              user_id: cu.user_id,
              title: "Pedido Cancelado pelo Cliente",
              message: `O cliente cancelou o pedido #${orderId.split('-')[0].toUpperCase()}.`,
              type: "order_cancelled"
            }));
            await supabase.from('notifications').insert(notifications);
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
