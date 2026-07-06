import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const statusMessages: Record<string, { title: string; description: string; icon: string }> = {
  confirmed: {
    title: '✅ Pedido confirmado!',
    description: 'A loja aceitou seu pedido.',
    icon: '✅',
  },
  preparing: {
    title: '👨‍🍳 Preparando seu pedido',
    description: 'A loja começou a preparar seu pedido.',
    icon: '👨‍🍳',
  },
  ready: {
    title: '📦 Pedido pronto!',
    description: 'Seu pedido está pronto e aguardando o entregador.',
    icon: '📦',
  },
  delivering: {
    title: '🛵 Saiu para entrega!',
    description: 'O entregador está a caminho do seu endereço.',
    icon: '🛵',
  },
  delivered: {
    title: '🎉 Pedido entregue!',
    description: 'Seu pedido foi entregue. Bom apetite!',
    icon: '🎉',
  },
  cancelled: {
    title: '❌ Pedido cancelado',
    description: 'Seu pedido foi cancelado.',
    icon: '❌',
  },
};

export function useOrderNotifications() {
  const { user } = useAuth();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!user || subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel(`order-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new as any;
          if (order.customer_id !== user.id && order.user_id !== user.id) return;
          
          const newStatus = payload.new.status as string;
          const oldStatus = payload.old?.status as string | undefined;

          if (newStatus && newStatus !== oldStatus) {
            const msg = statusMessages[newStatus];
            if (msg) {
              toast(msg.title, {
                description: msg.description,
                duration: 5000,
                action: {
                  label: 'Ver pedido',
                  onClick: () => {
                    window.location.href = `/marketplace/orders/${payload.new.id}`;
                  },
                },
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user]);
}
