import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, X, Store } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { OrderStoreChat } from './OrderStoreChat';
import { getMarketplaceStatus } from '@/utils/orderStatusResolver';
import { useLocation } from 'react-router-dom';

interface ActiveOrderData {
  id: string;
  company_id: string;
  status: string;
  created_at: string;
  company?: {
    id: string;
    name: string;
    logo_url?: string | null;
  } | null;
  deliveries?: any[];
}

export function ActiveOrderChatFab() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeOrder, setActiveOrder] = useState<ActiveOrderData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const conversationIdRef = useRef<string | null>(null);

  // Não exibe o FAB na página do próprio chat do pedido para não duplicar
  const isOrderDetailPage = location.pathname.includes(`/marketplace/orders/${activeOrder?.id}`);

  // 1. Busca pedido ativo do cliente
  const fetchActiveOrder = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('id, company_id, status, created_at, company:companies(id, name, logo_url), deliveries(id, status, updated_at)')
        .order('created_at', { ascending: false })
        .limit(10);

      let foundOrders: any[] = [];

      if (user?.id) {
        const { data, error } = await query.or(`customer_id.eq.${user.id},user_id.eq.${user.id}`);
        if (!error && data) foundOrders = data;
      } else {
        // Suporte a pedidos de convidados no localStorage
        try {
          const k1 = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
          const k2 = JSON.parse(localStorage.getItem('epraja_recent_orders') || '[]');
          const k3 = localStorage.getItem('last_order_id');
          const guestIds = [...(Array.isArray(k1) ? k1 : []), ...(Array.isArray(k2) ? k2 : []), ...(k3 ? [k3] : [])];
          if (guestIds.length > 0) {
            const { data } = await query.in('id', guestIds);
            if (data) foundOrders = data;
          }
        } catch {}
      }

      // Filtra pelo primeiro pedido que NÃO esteja finalizado e que já tenha sido confirmado/aceito
      const currentActive = foundOrders.find((ord) => {
        const resolved = getMarketplaceStatus(ord);
        if (resolved.isFinished) return false;
        // O balão abre a partir do momento em que a loja aceita/prepara o pedido
        const activeStatuses = ['confirmed', 'preparing', 'ready', 'in_route', 'delivering', 'accepted', 'collecting'];
        return activeStatuses.includes(ord.status) || ord.status !== 'pending';
      });

      if (currentActive) {
        setActiveOrder(currentActive);
        findConversation(currentActive.id);
      } else {
        setActiveOrder(null);
        setIsOpen(false);
      }
    } catch (e) {
      console.warn('[ActiveOrderChatFab] Erro ao buscar pedido ativo:', e);
    }
  };

  const findConversation = async (orderId: string) => {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      const lastRead = localStorage.getItem(`@epraja_chat_read_${orderId}`);

      if (data?.id) {
        conversationIdRef.current = data.id;

        const { data: msgs } = await supabase
          .from('messages')
          .select('id, sender_id, created_at')
          .eq('conversation_id', data.id);

        const storeMsgs = (msgs || []).filter((m) => m.sender_id !== user?.id);

        if (!lastRead) {
          // Se ainda não abriu o chat deste pedido, exibe a contagem de mensagens do lojista (mínimo 1 para a de boas-vindas)
          setUnreadCount(Math.max(storeMsgs.length, 1));
        } else {
          const unread = storeMsgs.filter((m) => new Date(m.created_at) > new Date(lastRead));
          setUnreadCount(unread.length);
        }
      } else {
        // Conversa pronta para o pedido ativo aguardando abertura pelo cliente
        if (!lastRead) {
          setUnreadCount(1);
        } else {
          setUnreadCount(0);
        }
      }
    } catch (e) {
      console.warn('[ActiveOrderChatFab] Erro ao buscar contagem de mensagens:', e);
    }
  };

  useEffect(() => {
    fetchActiveOrder();

    // Escuta em tempo real atualizações de status de pedidos e entregas
    const channelName = `fab-active-order-${user?.id || 'guest'}-${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchActiveOrder();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        fetchActiveOrder();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (conversationIdRef.current && newMsg.conversation_id === conversationIdRef.current) {
          if (newMsg.sender_id !== user?.id) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Se não houver pedido ativo ou estiver na própria tela de detalhe do pedido, não renderiza o botão
  if (!activeOrder || isOrderDetailPage) {
    return null;
  }

  const computed = getMarketplaceStatus(activeOrder);
  const companyName = activeOrder.company?.name || 'Restaurante';

  const handleOpenChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
    if (activeOrder?.id) {
      localStorage.setItem(`@epraja_chat_read_${activeOrder.id}`, new Date().toISOString());
    }
  };

  return (
    <>
      {/* Botão Flutuante Circular Laranja (FAB) */}
      <div className="fixed right-4 bottom-20 md:bottom-24 z-40 flex items-center gap-2 group animate-in fade-in slide-in-from-bottom-5 duration-300">
        <button
          onClick={handleOpenChat}
          aria-label="Abrir conversa do pedido ativo"
          className="relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_8px_25px_rgba(234,88,12,0.45)] hover:shadow-[0_12px_30px_rgba(234,88,12,0.6)] flex items-center justify-center border-2 border-white/90 active:scale-95 hover:scale-105 transition-all cursor-pointer"
        >
          <MessageCircle className="h-7 w-7 text-white stroke-[2.2]" />
          
          {/* Badge Contador de Mensagens no Balão */}
          {unreadCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[22px] px-1.5 items-center justify-center rounded-full bg-[#EA1D2C] text-[11px] font-black text-white shadow-[0_2px_8px_rgba(234,29,44,0.6)] border-2 border-white animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : (
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white" />
            </span>
          )}
        </button>
      </div>

      {/* Sheet Lateral / Inferior do Chat (z-[250] acima da barra de navegação z-[100]) */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          hideClose
          className="!z-[250] rounded-t-[2.5rem] border-none p-0 h-[88vh] max-h-[92vh] flex flex-col bg-background shadow-2xl overflow-hidden"
          aria-describedby={undefined}
        >
          <SheetTitle className="sr-only">Chat do Pedido</SheetTitle>
          
          {/* Header do Chat */}
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between shrink-0 bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0 shadow-2xs">
                {activeOrder.company?.logo_url ? (
                  <img src={activeOrder.company.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground truncate">{companyName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary shrink-0">
                    {computed.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Pedido #{activeOrder.id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors text-muted-foreground shrink-0 cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Área do Chat com altura total flexível */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <OrderStoreChat
              orderId={activeOrder.id}
              companyId={activeOrder.company_id}
              companyName={companyName}
              fullHeight
              className="flex-1 min-h-0 flex flex-col h-full overflow-hidden"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
