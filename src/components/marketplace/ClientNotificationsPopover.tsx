import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Copy, Check, Ticket, Sparkles, X, Gift, Package, Clock, ShoppingBag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getMarketplaceStatus } from '@/utils/orderStatusResolver';

export type MarketingNotifItem = {
  id: string;
  title: string;
  message: string;
  emoji?: string | null;
  image_url?: string | null;
  coupon_code?: string | null;
  created_at: string;
  status?: string;
  type?: 'marketing' | 'order_status';
  order_id?: string;
};

const ORDER_STATUS_CONFIG: Record<string, { title: string; desc: string; emoji: string }> = {
  confirmed: { title: '✅ Pedido Confirmado!', desc: 'A loja aceitou o seu pedido.', emoji: '✅' },
  preparing: { title: '👨‍🍳 Preparando seu Pedido!', desc: 'A loja começou a preparar o seu pedido com carinho.', emoji: '👨‍🍳' },
  ready: { title: '📦 Pedido Pronto!', desc: 'Seu pedido está pronto e aguardando o entregador.', emoji: '📦' },
  delivering: { title: '🛵 Saiu para Entrega!', desc: 'O entregador está a caminho do seu endereço!', emoji: '🛵' },
  in_route: { title: '🛵 Saiu para Entrega!', desc: 'O entregador está a caminho do seu endereço!', emoji: '🛵' },
  collecting: { title: '🛵 Entregador a Caminho!', desc: 'O entregador foi atribuído e está a caminho da loja.', emoji: '🛵' },
  accepted: { title: '🛵 Entregador Aceitou!', desc: 'O entregador aceitou o pedido e irá coletar em breve.', emoji: '🛵' },
  in_transit: { title: '🛵 Saiu para Entrega!', desc: 'O entregador está a caminho do seu endereço!', emoji: '🛵' },
  delivered: { title: '🎉 Pedido Entregue!', desc: 'Seu pedido foi entregue com sucesso. Bom apetite!', emoji: '🎉' },
  cancelled: { title: '❌ Pedido Cancelado', desc: 'Infelizmente o pedido foi cancelado.', emoji: '❌' },
};

interface ClientNotificationsPopoverProps {
  className?: string;
}

export function ClientNotificationsPopover({ className }: ClientNotificationsPopoverProps) {
  const { user } = useAuth();
  const userOrderIdsRef = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<MarketingNotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const STORAGE_KEY = '@epraja_notification_history';
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

  // --- Helpers para persistir histórico de notificações no localStorage ---
  const loadPersistedNotifications = (): MarketingNotifItem[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: MarketingNotifItem[] = JSON.parse(raw);
      const now = Date.now();
      
      const seenCanonicalIds = new Set<string>();
      const rawFiltered: MarketingNotifItem[] = [];

      // 1. Normaliza IDs legados (que continham -rt- ou timestamps no ID)
      for (const n of parsed) {
        const t = new Date(n.created_at).getTime();
        const isPending =
          n.id.includes('-pending') ||
          (n.title && n.title.toLowerCase().includes('solicitado')) ||
          (n.message && (n.message.toLowerCase().includes('solicitado') || n.message.toLowerCase().includes('aguardando confirmação')));
        
        if (isNaN(t) || (now - t) > FORTY_EIGHT_HOURS_MS || isPending) continue;

        // Normaliza ID legado para chave canônica única por pedido e status
        let canonicalId = n.id;
        if (n.order_id && n.type === 'order_status') {
          const statusMatch = n.id.match(/(preparing|ready|delivering|delivered|confirmed|cancelled)/);
          if (statusMatch) {
            canonicalId = `order-notif-${n.order_id}-${statusMatch[1]}`;
          }
        }

        if (seenCanonicalIds.has(canonicalId)) continue;
        seenCanonicalIds.add(canonicalId);
        rawFiltered.push({ ...n, id: canonicalId });
      }

      // 2. Corrige timestamps idênticos para notificações do mesmo pedido
      const statusWeight: Record<string, number> = {
        confirmed: 1,
        preparing: 2,
        ready: 3,
        delivering: 4,
        in_route: 4,
        delivered: 5,
        cancelled: 6
      };

      const orderByOrder: Record<string, MarketingNotifItem[]> = {};
      const nonOrderItems: MarketingNotifItem[] = [];

      rawFiltered.forEach(item => {
        if (item.order_id && item.type === 'order_status') {
          if (!orderByOrder[item.order_id]) orderByOrder[item.order_id] = [];
          orderByOrder[item.order_id].push(item);
        } else {
          nonOrderItems.push(item);
        }
      });

      const fixedOrderItems: MarketingNotifItem[] = [];

      Object.values(orderByOrder).forEach(items => {
        // Ordena do menor status para o maior status (preparing -> ready -> delivering -> delivered)
        items.sort((a, b) => {
          const sA = a.id.split('-').pop() || '';
          const sB = b.id.split('-').pop() || '';
          return (statusWeight[sA] || 0) - (statusWeight[sB] || 0);
        });

        // Garante que cada passo subsequente do pedido tenha horário cronológico distinto
        for (let i = 0; i < items.length; i++) {
          if (i > 0) {
            const prevTime = new Date(items[i - 1].created_at).getTime();
            const currTime = new Date(items[i].created_at).getTime();
            // Se o horário for idêntico ou anterior ao passo anterior, adiciona um deslocamento lógico de 2 minutos
            if (currTime <= prevTime) {
              const adjustedTime = new Date(prevTime + 2 * 60 * 1000).toISOString();
              items[i] = { ...items[i], created_at: adjustedTime };
            }
          }
        }
        fixedOrderItems.push(...items);
      });

      const result = [...nonOrderItems, ...fixedOrderItems];

      return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  };

  const persistNotification = (item: MarketingNotifItem) => {
    // Nunca persiste notificação do status 'pending' / solicitado
    if (
      item.id.includes('-pending') ||
      (item.title && item.title.toLowerCase().includes('solicitado')) ||
      (item.message && (item.message.toLowerCase().includes('solicitado') || item.message.toLowerCase().includes('aguardando confirmação')))
    ) {
      return;
    }
    const existing = loadPersistedNotifications();
    if (existing.some(n => n.id === item.id)) return;
    const updated = [item, ...existing]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const persistMultipleNotifications = (items: MarketingNotifItem[]) => {
    const validItems = items.filter(item => !(
      item.id.includes('-pending') ||
      (item.title && item.title.toLowerCase().includes('solicitado')) ||
      (item.message && (item.message.toLowerCase().includes('solicitado') || item.message.toLowerCase().includes('aguardando confirmação')))
    ));
    const existing = loadPersistedNotifications();
    const existingIds = new Set(existing.map(n => n.id));
    const newItems = validItems.filter(n => !existingIds.has(n.id));
    if (newItems.length === 0) return;
    const updated = [...newItems, ...existing]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const twoDaysAgoISO = new Date(Date.now() - FORTY_EIGHT_HOURS_MS).toISOString();

      // 1. Busca notificações de marketing e cupons dos últimos 2 dias (48 horas)
      const { data: mData } = await supabase
        .from('marketing_notifications')
        .select('*')
        .gte('created_at', twoDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(20);

      const marketingItems: MarketingNotifItem[] = (mData || []).map((m: any) => ({
        ...m,
        type: 'marketing'
      }));

      persistMultipleNotifications(marketingItems);

      // 2. Busca pedidos recentes do cliente para gerar notificações dos status permitidos
      let myOrderIds: string[] = [];
      try {
        myOrderIds = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
      } catch {}

      try {
        let oData: any[] = [];

        if (myOrderIds.length > 0) {
          const { data: byIds } = await supabase
            .from('orders')
            .select('id, status, updated_at, created_at, company_id, companies(name), deliveries(*)')
            .in('id', myOrderIds)
            .order('created_at', { ascending: false });
          if (byIds) oData.push(...byIds);
        }

        if (user?.id) {
          const { data: byUser } = await supabase
            .from('orders')
            .select('id, status, updated_at, created_at, company_id, companies(name), deliveries(*)')
            .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(15);
          if (byUser) {
            byUser.forEach(o => {
              if (!oData.some(existing => existing.id === o.id)) {
                oData.push(o);
              }
            });
          }
        }

        if (oData && oData.length > 0) {
          const newOrderNotifs: MarketingNotifItem[] = [];
          oData.forEach((ord: any) => {
            if (ord.status === 'pending') return;
            const computed = getMarketplaceStatus(ord);
            if (computed.statusKey === 'pending') return;

            const companyName = ord.companies?.name ? ` em ${ord.companies.name}` : '';
            const emoji = computed.statusKey === 'delivered' ? '🎉' : computed.statusKey === 'delivering' ? '🚚' : computed.statusKey === 'ready' ? '📦' : computed.statusKey === 'preparing' ? '👨‍🍳' : computed.statusKey === 'confirmed' ? '✅' : '❌';
            
            // Extrai timestamp real da entrega ou do pedido
            const del = Array.isArray(ord.deliveries) ? ord.deliveries[0] : ord.deliveries;
            let exactTimestamp = ord.created_at;
            if (computed.statusKey === 'delivered' && del?.updated_at) {
              exactTimestamp = del.updated_at;
            } else if ((computed.statusKey === 'delivering' || computed.statusKey === 'in_route') && (del?.updated_at || del?.created_at)) {
              exactTimestamp = del.updated_at || del.created_at;
            } else if (computed.statusKey === 'ready' && (del?.created_at || ord.updated_at)) {
              exactTimestamp = del?.created_at || ord.updated_at;
            } else if (ord.updated_at) {
              exactTimestamp = ord.updated_at;
            }

            const notifItem: MarketingNotifItem = {
              id: `order-notif-${ord.id}-${computed.statusKey}`,
              title: `${emoji} ${computed.title.replace(/^(📦|🚚|🎉|✅|👨‍🍳|❌)\s*/, '')}`,
              message: `${computed.description} (Pedido #${ord.id.slice(0, 8)}${companyName})`,
              emoji: emoji,
              created_at: exactTimestamp,
              type: 'order_status',
              order_id: ord.id
            };
            newOrderNotifs.push(notifItem);
          });
          persistMultipleNotifications(newOrderNotifs);
        }
      } catch (e) {
        console.warn('[ClientNotificationsPopover] Erro ao carregar pedidos para notificação:', e);
      }

      // 3. Carrega TUDO do localStorage (histórico completo preservado com horários cronológicos)
      const allPersisted = loadPersistedNotifications();

      setNotifications(allPersisted);

      const lastRead = localStorage.getItem('epraja_last_read_notif_time');
      if (!lastRead) {
        setUnreadCount(allPersisted.length);
      } else {
        const unread = allPersisted.filter((n) => new Date(n.created_at) > new Date(lastRead)).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.error('[ClientNotificationsPopover] Exception:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    let mChannel: any = null;
    let oChannel: any = null;

    try {
      const channelId = `client-notif-popover-${Math.random().toString(36).substring(2, 9)}`;
      mChannel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'marketing_notifications' },
          (payload) => {
            const newNotif = { ...(payload.new as any), type: 'marketing' } as MarketingNotifItem;
            persistNotification(newNotif);
            setNotifications((prev) => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      // Ouve alterações nos pedidos do cliente em tempo real usando getMarketplaceStatus
      const oChannelId = `client-orders-popover-${Math.random().toString(36).substring(2, 9)}`;
      oChannel = supabase
        .channel(oChannelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          async (payload) => {
            const rawOrd = (payload.new || payload.old) as any;
            if (!rawOrd || !rawOrd.id) return;

            let myOrderIds: string[] = [];
            try {
              myOrderIds = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
            } catch {}

            const isMyOrder =
              myOrderIds.includes(rawOrd.id) ||
              (user && (
                rawOrd.customer_id === user.id || 
                rawOrd.user_id === user.id || 
                rawOrd.client_id === user.id || 
                rawOrd.buyer_id === user.id
              ));

            if (isMyOrder && rawOrd.status && rawOrd.status !== 'pending') {
              const { data: ord } = await supabase
                .from('orders')
                .select('*, companies(name), deliveries(*)')
                .eq('id', rawOrd.id)
                .single();

              const targetOrd = ord || rawOrd;
              const computed = getMarketplaceStatus(targetOrd);

              if (computed.statusKey !== 'pending') {
                const companyName = targetOrd.companies?.name ? ` em ${targetOrd.companies.name}` : '';
                const emoji = computed.statusKey === 'delivered' ? '🎉' : computed.statusKey === 'delivering' ? '🚚' : computed.statusKey === 'ready' ? '📦' : computed.statusKey === 'preparing' ? '👨‍🍳' : computed.statusKey === 'confirmed' ? '✅' : '❌';
                const newItem: MarketingNotifItem = {
                  id: `order-notif-${targetOrd.id}-${computed.statusKey}`,
                  title: `${emoji} ${computed.title.replace(/^(📦|🚚|🎉|✅|👨‍🍳|❌)\s*/, '')}`,
                  message: `${computed.description} (Pedido #${targetOrd.id.slice(0, 8)}${companyName})`,
                  emoji: emoji,
                  created_at: new Date().toISOString(),
                  type: 'order_status',
                  order_id: targetOrd.id
                };
                persistNotification(newItem);
                const currentHistory = loadPersistedNotifications();
                setNotifications(currentHistory);
                setUnreadCount((prev) => prev + 1);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'deliveries' },
          async (payload) => {
            const del = (payload.new || payload.old) as any;
            if (!del || !del.order_id) return;

            let myOrderIds: string[] = [];
            try {
              myOrderIds = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
            } catch {}

            const isMyDelivery =
              Boolean(del.order_id) &&
              (myOrderIds.includes(del.order_id) || userOrderIdsRef.current.has(del.order_id));

            if (isMyDelivery && del.status) {
              const { data: targetOrd } = await supabase
                .from('orders')
                .select('*, companies(name), deliveries(*)')
                .eq('id', del.order_id)
                .single();

              if (targetOrd) {
                const computed = getMarketplaceStatus(targetOrd);
                if (computed.statusKey !== 'pending') {
                  const companyName = targetOrd.companies?.name ? ` em ${targetOrd.companies.name}` : '';
                  const emoji = computed.statusKey === 'delivered' ? '🎉' : computed.statusKey === 'delivering' ? '🚚' : computed.statusKey === 'ready' ? '📦' : computed.statusKey === 'preparing' ? '👨‍🍳' : computed.statusKey === 'confirmed' ? '✅' : '❌';
                  const newItem: MarketingNotifItem = {
                    id: `order-notif-${targetOrd.id}-${computed.statusKey}`,
                    title: `${emoji} ${computed.title.replace(/^(📦|🚚|🎉|✅|👨‍🍳|❌)\s*/, '')}`,
                    message: `${computed.description} (Pedido #${targetOrd.id.slice(0, 8)}${companyName})`,
                    emoji: emoji,
                    created_at: new Date().toISOString(),
                    type: 'order_status',
                    order_id: targetOrd.id
                  };
                  persistNotification(newItem);
                  const currentHistory = loadPersistedNotifications();
                  setNotifications(currentHistory);
                  setUnreadCount((prev) => prev + 1);
                }
              }
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[ClientNotificationsPopover] Realtime subscription error:', err);
    }

    return () => {
      if (mChannel) supabase.removeChannel(mChannel);
      if (oChannel) supabase.removeChannel(oChannel);
    };
  }, [user?.id]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setUnreadCount(0);
      localStorage.setItem('epraja_last_read_notif_time', new Date().toISOString());
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Cupom ${code} copiado com sucesso!`, {
      description: 'Cole na tela de checkout para garantir seu desconto.'
    });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return '';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "premium-card relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:text-foreground active:scale-95",
            className
          )}
          title="Notificações e Cupons"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white shadow-md animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 border-l border-border bg-background">
        <div className="flex flex-col h-full pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] sm:pt-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-card/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-black tracking-tight text-foreground">
                  Central de Notificações
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Alertas de pedidos, cupons e promoções
                </p>
              </div>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs">Carregando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-muted-foreground space-y-3">
                <div className="p-4 bg-muted/30 rounded-full">
                  <Bell className="w-8 h-8 opacity-40" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Nenhuma notificação por enquanto</h4>
                <p className="text-xs max-w-xs leading-relaxed">
                  Fique atento! Aqui você acompanha o andamento dos seus pedidos e recebe cupons exclusivos.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden",
                    notif.type === 'order_status' ? 'border-primary/30 bg-primary/5' : 'border-border/80'
                  )}
                >
                  {/* Image optional */}
                  {notif.image_url && (
                    <div className="w-full h-32 mb-3 rounded-xl overflow-hidden bg-muted relative">
                      <img
                        src={notif.image_url}
                        alt="Promoção"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Header Title */}
                  <div className="flex items-start gap-2.5 mb-2">
                    {notif.emoji && <span className="text-2xl shrink-0 leading-none">{notif.emoji}</span>}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground leading-snug">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(notif.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    {notif.message}
                  </p>

                  {/* Coupon Box */}
                  {notif.coupon_code && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Ticket className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-mono font-black text-primary text-sm tracking-wider truncate">
                          {notif.coupon_code}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleCopyCoupon(notif.coupon_code!)}
                        className={cn(
                          'h-8 px-3 text-xs font-bold rounded-lg transition-all shrink-0',
                          copiedCode === notif.coupon_code
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-primary hover:bg-primary/90 text-white'
                        )}
                      >
                        {copiedCode === notif.coupon_code ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
