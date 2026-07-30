import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Copy, Check, Ticket, Sparkles, X, Gift, Package, Clock, ShoppingBag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
  delivered: { title: '🎉 Pedido Entregue!', desc: 'Seu pedido foi entregue com sucesso. Bom apetite!', emoji: '🎉' },
  cancelled: { title: '❌ Pedido Cancelado', desc: 'Infelizmente o pedido foi cancelado.', emoji: '❌' },
};

interface ClientNotificationsPopoverProps {
  className?: string;
}

export function ClientNotificationsPopover({ className }: ClientNotificationsPopoverProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MarketingNotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
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

      // 2. Busca atualizações de pedidos do cliente dos últimos 2 dias (48 horas)
      let myOrderIds: string[] = [];
      try {
        myOrderIds = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
      } catch {}

      let orderItems: MarketingNotifItem[] = [];

      try {
        let orderQuery = supabase
          .from('orders')
          .select('id, status, updated_at, created_at, company_id, companies(name)')
          .gte('updated_at', twoDaysAgoISO);

        if (user?.id) {
          if (myOrderIds.length > 0) {
            orderQuery = orderQuery.or(`customer_id.eq.${user.id},user_id.eq.${user.id},id.in.(${myOrderIds.join(',')})`);
          } else {
            orderQuery = orderQuery.or(`customer_id.eq.${user.id},user_id.eq.${user.id}`);
          }
        } else if (myOrderIds.length > 0) {
          orderQuery = orderQuery.in('id', myOrderIds);
        }

        const { data: oData } = await orderQuery.order('updated_at', { ascending: false }).limit(10);

        if (oData && oData.length > 0) {
          oData.forEach((ord: any) => {
            const cfg = ORDER_STATUS_CONFIG[ord.status];
            if (cfg) {
              const companyName = ord.companies?.name ? ` em ${ord.companies.name}` : '';
              orderItems.push({
                id: `order-notif-${ord.id}-${ord.status}`,
                title: cfg.title,
                message: `${cfg.desc} (Pedido #${ord.id.slice(0, 8)}${companyName})`,
                emoji: cfg.emoji,
                created_at: ord.updated_at || ord.created_at,
                type: 'order_status',
                order_id: ord.id
              });
            }
          });
        }
      } catch (e) {
        console.warn('[ClientNotificationsPopover] Erro ao carregar pedidos para notificação:', e);
      }

      // Combina, filtra estritamente por 48 horas e ordena por data mais recente
      const now = Date.now();
      const combined = [...orderItems, ...marketingItems]
        .filter(n => {
          const itemTime = new Date(n.created_at).getTime();
          return !isNaN(itemTime) && (now - itemTime) <= FORTY_EIGHT_HOURS_MS;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(combined);

      // Checa contagem de não lidos
      const lastRead = localStorage.getItem('epraja_last_read_notif_time');
      if (!lastRead) {
        setUnreadCount(combined.length);
      } else {
        const unread = combined.filter((n) => new Date(n.created_at) > new Date(lastRead)).length;
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
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      // Ouve alterações nos pedidos do cliente em tempo real
      const oChannelId = `client-orders-popover-${Math.random().toString(36).substring(2, 9)}`;
      oChannel = supabase
        .channel(oChannelId)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => {
            const ord = payload.new as any;
            let myOrderIds: string[] = [];
            try {
              myOrderIds = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
            } catch {}

            const isMyOrder =
              (user && (ord.customer_id === user.id || ord.user_id === user.id)) ||
              myOrderIds.includes(ord.id);

            if (isMyOrder && ord.status) {
              const cfg = ORDER_STATUS_CONFIG[ord.status];
              if (cfg) {
                const newItem: MarketingNotifItem = {
                  id: `order-notif-rt-${ord.id}-${ord.status}-${Date.now()}`,
                  title: cfg.title,
                  message: `${cfg.desc} (Pedido #${ord.id.slice(0, 8)})`,
                  emoji: cfg.emoji,
                  created_at: new Date().toISOString(),
                  type: 'order_status',
                  order_id: ord.id
                };
                setNotifications((prev) => [newItem, ...prev]);
                setUnreadCount((prev) => prev + 1);
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
