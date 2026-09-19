import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Order, OrderItem, Delivery } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, MessageCircle, MapPin, Banknote, Smartphone, AlertCircle } from 'lucide-react';
import { OrderStoreChat } from '@/components/marketplace/OrderStoreChat';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { getMarketplaceStatus } from '@/utils/orderStatusResolver';
import { useCancelOrder } from '@/hooks/useCancelOrder';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';

// Métrica temporária de abertura da tela (só em desenvolvimento).
const PERF = import.meta.env.DEV;
const mark = (label: string) => {
  if (PERF) console.log(`[DELIVERY] ${label}`, `${Math.round(performance.now())}ms`);
};

export const orderSeedKey = (id: string) => ['order-seed', id] as const;

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cancelOrder } = useCancelOrder();

  const [showStoreChat, setShowStoreChat] = useState(false);
  const notif = useNotificationPermission();

  useEffect(() => {
    mark('mount');
  }, []);

  useEffect(() => {
    if (!PERF) return;
    console.log('[NOTIFICATION] platform', notif.isNative ? 'native' : 'web');
    console.log('[NOTIFICATION] native-permission', notif.permission);
    console.log('[NOTIFICATION] preference', notif.preference);
    console.log('[NOTIFICATION] effective-state', notif.effectiveEnabled);
  }, [notif.isNative, notif.permission, notif.preference, notif.effectiveEnabled]);

  // ---------- 1. Cabeçalho: libera a renderização da tela ----------
  const {
    data: header,
    isPlaceholderData: headerIsSeed,
    isLoading: headerLoading,
  } = useQuery({
    queryKey: ['order-header', id],
    enabled: !!id,
    staleTime: 10_000,
    placeholderData: () => {
      const seed = queryClient.getQueryData<Order>(orderSeedKey(id!));
      return seed ? { order: seed } : undefined;
    },
    queryFn: async () => {
      mark('header-start');
      const { data } = await supabase
        .from('orders')
        .select('*, company:companies(*), address:addresses(*)')
        .eq('id', id!)
        .maybeSingle();
      mark('header-end');
      return { order: (data ?? null) as Order | null };
    },
  });

  // ---------- 2. Detalhes: chegam depois, sem bloquear a tela ----------
  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ['order-details', id],
    enabled: !!id,
    staleTime: 10_000,
    queryFn: async () => {
      mark('items-start');
      mark('delivery-start');
      const [itemsRes, deliveryRes] = await Promise.all([
        supabase.from('order_items').select('*, products(*)').eq('order_id', id!),
        supabase.from('deliveries').select('*').eq('order_id', id!).maybeSingle(),
      ]);
      mark('items-end');
      mark('delivery-end');
      return {
        items: (itemsRes.data ?? []) as OrderItem[],
        delivery: (deliveryRes.data ?? null) as Delivery | null,
      };
    },
  });

  const order = header?.order ?? null;
  const orderItems = details?.items;
  const delivery = details?.delivery ?? null;
  // "Semente" da lista: não contém endereço/itens/entrega — esses blocos ficam
  // em carregamento até a consulta real terminar.
  const headerPartial = headerIsSeed;
  const detailsPending = detailsLoading || !details;

  const firstRenderLogged = useRef(false);
  useEffect(() => {
    if (order && !firstRenderLogged.current) {
      firstRenderLogged.current = true;
      mark('first-render');
    }
  }, [order]);

  const maxStatusRankRef = useRef<number>(0);
  const STATUS_HIERARCHY: Record<string, number> = useMemo(
    () => ({ pending: 1, confirmed: 2, preparing: 3, ready: 4, delivering: 5, delivered: 6 }),
    []
  );

  useEffect(() => {
    const status = order?.status as string | undefined;
    if (!status) return;
    const currentRank = STATUS_HIERARCHY[status] || 0;
    if (currentRank > maxStatusRankRef.current) maxStatusRankRef.current = currentRank;
  }, [order?.status, STATUS_HIERARCHY]);

  // A chave de notificações NÃO deve recriar o canal Realtime — lida via ref.
  const notifEnabledRef = useRef(notif.effectiveEnabled);
  useEffect(() => {
    notifEnabledRef.current = notif.effectiveEnabled;
  }, [notif.effectiveEnabled]);

  useEffect(() => {
    if (!id) return;
    const channelName = `order-${id}-${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const orderChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (p) => {
          if (!p.new) return;
          queryClient.setQueryData(['order-header', id], (old: any) =>
            old?.order ? { ...old, order: { ...old.order, ...p.new } } : old
          );
          if (
            notifEnabledRef.current &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted' &&
            !(window as any).Capacitor?.isNativePlatform?.()
          ) {
            const statusLabels: Record<string, string> = {
              confirmed: '✅ Pedido confirmado pela loja!',
              preparing: '👨‍🍳 Seu pedido está sendo preparado',
              ready: '📦 Pedido pronto! Aguardando entregador',
              delivering: '🛵 Entregador saiu para entrega!',
              delivered: '🎉 Pedido entregue! Bom apetite!',
              cancelled: '❌ Pedido cancelado',
            };
            const newStatus = (p.new as any).status as string;
            const newRank = STATUS_HIERARCHY[newStatus] || 0;
            const shouldNotify = newStatus === 'cancelled' || newRank > maxStatusRankRef.current;
            if (newRank > maxStatusRankRef.current) maxStatusRankRef.current = newRank;
            const msg = statusLabels[newStatus];
            if (msg && shouldNotify) {
              new Notification('É Pra Já Delivery', { body: msg, icon: '/logo.png', badge: '/logo.png' });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `order_id=eq.${id}` },
        (p) => {
          if (!p.new) return;
          queryClient.setQueryData(['order-details', id], (old: any) =>
            old ? { ...old, delivery: { ...(old.delivery ?? {}), ...p.new } } : old
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [id, queryClient, STATUS_HIERARCHY]);

  const handleToggleNotif = useCallback(async () => {
    if (notif.effectiveEnabled) {
      notif.disable();
      return;
    }
    await notif.enable();
  }, [notif]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) return;
    const success = await cancelOrder(order.id, order.company_id);
    if (success) navigate('/marketplace/orders');
  };

  if (!order) {
    return (
      <MarketplaceLayout>
        <div className="mx-auto max-w-lg px-4 pt-6 space-y-4">
          {headerLoading ? (
            <>
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-40 w-full rounded-3xl" />
            </>
          ) : (
            <div className="py-20 text-center text-sm text-muted-foreground">Pedido não encontrado.</div>
          )}
        </div>
      </MarketplaceLayout>
    );
  }

  const computedStatus = getMarketplaceStatus({ order, delivery, deliveries: delivery ? [delivery] : [] });
  const title = computedStatus.title;
  const currentStepIndex = computedStatus.stepRank;
  const deliveryCode = id ? parseInt(id.replace(/[^0-9]/g, '').substring(0, 4)) || 6656 : 6656;
  const itemsCount = orderItems ? orderItems.reduce((acc, curr) => acc + curr.quantity, 0) : 0;
  const itemsSubtotal = orderItems
    ? orderItems.reduce((acc, curr) => acc + (curr.price || curr.unit_price || 0) * curr.quantity, 0)
    : 0;

  const notifText = notif.isNative
    ? notif.effectiveEnabled
      ? '🔔 Notificações ativadas! Você receberá alertas na central do celular.'
      : notif.blocked
      ? 'Notificações desativadas. Você pode reativar nas configurações do aparelho.'
      : 'Ative para receber os avisos do seu pedido na central do celular.'
    : notif.unsupported
    ? 'Seu navegador não suporta notificações.'
    : notif.effectiveEnabled
    ? '🔔 Notificações ativadas! Você será avisado sobre seu pedido.'
    : notif.blocked
    ? 'Notificações bloqueadas. Habilite nas configurações do navegador.'
    : 'Fique sabendo na hora se houver algum problema com seu pedido.';

  const notifTitle = notif.effectiveEnabled ? 'Notificações ativadas' : 'Ative as notificações e acompanhe seu pedido';

  return (
    <MarketplaceLayout>
      <div className="relative min-h-[calc(100vh-64px)] pb-32">
        {/* Background Mapa Fictício */}
        <div
          className="absolute top-0 left-0 right-0 h-[40vh] z-0 opacity-80"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(1px) sepia(20%) hue-rotate(-10deg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        </div>

        {/* Top Bar Nav */}
        <div className="sticky top-0 z-20 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] flex justify-between items-center bg-transparent backdrop-blur-sm">
          <button onClick={() => navigate('/marketplace/orders')} className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-md border border-border/50">
            <ArrowLeft className="h-5 w-5 text-primary" />
          </button>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-background shadow-md rounded-full text-sm font-bold text-primary border border-border/50">
              Ajuda
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-md border border-border/50" onClick={() => setShowStoreChat(true)}>
              <MessageCircle className="h-5 w-5 text-primary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-lg px-4 pt-16 space-y-4">

          {/* Card Principal: Tracking */}
          <div className="bg-background rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-border">
            <h2 className="text-xl font-bold text-foreground mb-1 pr-4">{title}</h2>
            {computedStatus.description && (
              <p className="text-sm text-muted-foreground mb-4 leading-snug">{computedStatus.description}</p>
            )}

            <div className="flex gap-1 mb-5">
              {[0, 1, 2, 3, 4, 5].map((step, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full ${idx <= currentStepIndex ? 'bg-[#00A868]' : 'bg-muted'}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
              <span className="text-[15px] text-muted-foreground font-medium">Previsão de entrega: <span className="text-foreground font-bold ml-1">30 - 45 min</span></span>
            </div>

            <div className="flex justify-between items-center bg-secondary/30 p-3 rounded-2xl border border-border/50">
              <span className="text-sm font-medium text-muted-foreground">Código de entrega</span>
              <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                <span className="text-xs font-bold text-foreground">•••</span>
                <span className="text-sm font-bold tracking-widest">{deliveryCode}</span>
              </div>
            </div>
          </div>

          {/* Notificações */}
          <div className="bg-background rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-border">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-base mb-1">{notifTitle}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{notifText}</p>
              </div>
              <Switch
                checked={notif.effectiveEnabled}
                onCheckedChange={handleToggleNotif}
                disabled={notif.loading || notif.unsupported || (notif.blocked && !notif.effectiveEnabled)}
                aria-label={notif.effectiveEnabled ? 'Desativar notificações' : 'Ativar notificações'}
                className="data-[state=checked]:bg-[#00A868] data-[state=unchecked]:bg-muted-foreground/30 shrink-0"
              />
            </div>
          </div>

          {/* Endereço de entrega */}
          <div className="bg-background rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-border">
            <h3 className="font-bold text-base mb-4">Endereço de entrega</h3>
            <div className="flex gap-3 mb-4">
              <div className="mt-0.5 bg-secondary/50 p-1.5 rounded-full h-fit">
                <MapPin className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                {headerPartial ? (
                  <Skeleton className="h-5 w-4/5" />
                ) : (
                  <p className="font-bold text-[15px] leading-tight text-foreground">
                    {order.delivery_address || 'Endereço não informado'}
                  </p>
                )}
              </div>
            </div>
            {!detailsPending && computedStatus.statusKey === 'delivering' && (
              <div className="bg-muted/50 p-3 rounded-xl border border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Esta entrega é feita pela loja e não poderá ser rastreada</span>
                <div className="h-4 w-4 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[10px] font-bold">?</div>
              </div>
            )}
          </div>

          {/* Detalhes do Pedido */}
          <div className="bg-background rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-border">
            <h3 className="font-bold text-base mb-4">Detalhes do pedido</h3>

            <div className="flex items-center justify-between mb-5 cursor-pointer" onClick={() => navigate('/marketplace/store/' + order.company_id)}>
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-secondary border border-border shrink-0 flex items-center justify-center overflow-hidden">
                   <img src={order.company?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.company?.name?.charAt(0) || 'L')}&background=random`} className="w-full h-full object-cover" alt={order.company?.name || 'Loja'} />
                </div>
                <div>
                  <p className="font-bold text-[15px]">{order.company?.name}</p>
                  {detailsPending ? (
                    <Skeleton className="mt-1 h-3 w-32" />
                  ) : (
                    <p className="text-xs text-muted-foreground">Pedido Nº {id?.split('-')[0]} • {itemsCount} item{itemsCount > 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
            </div>

            {/* Lista de Itens */}
            <div className="mb-5 space-y-3">
              {detailsPending ? (
                <>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                  <Skeleton className="h-5 w-2/3" />
                </>
              ) : (
                orderItems!.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div className="flex gap-2">
                      <span className="font-medium text-muted-foreground">{item.quantity}x</span>
                      <div>
                        <p className="font-medium text-foreground">{item.product_name || (item as any).products?.name}</p>
                        {Array.isArray(item.options) && item.options.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.options.map((opt: any, optIdx: number) => {
                              const optQty = Number(opt.quantity) > 0 ? Number(opt.quantity) : 1;
                              const optPrice = Number(opt.price) || 0;
                              return (
                                <p key={optIdx} className="text-xs text-muted-foreground">
                                  + {optQty > 1 ? `${optQty}x ` : ''}{opt.name}
                                  {optPrice > 0 ? ` (+ R$ ${(optPrice * optQty).toFixed(2).replace('.', ',')})` : ''}
                                </p>
                              );
                            })}
                          </div>
                        )}
                        {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                      </div>
                    </div>
                    <span className="font-medium text-foreground shrink-0 pl-4">R$ {((item.price || item.unit_price || 0) * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))
              )}
            </div>

            {/* Subtotais */}
            {(() => {
              const deliveryFee = Number(order.delivery_fee) || 0;
              const orderTotal = order.total != null ? Number(order.total) : (itemsSubtotal + deliveryFee);
              const discountAmount = Math.max(0, (itemsSubtotal + deliveryFee) - orderTotal);

              return (
                <>
                  <div className="space-y-2 mb-5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      {detailsPending ? (
                        <Skeleton className="h-4 w-16" />
                      ) : (
                        <span className="font-medium text-foreground">R$ {itemsSubtotal.toFixed(2).replace('.', ',')}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de entrega</span>
                      <span className="font-medium text-foreground">
                        {deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : 'Grátis'}
                      </span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-primary font-medium">
                        <span>Desconto (Cupom)</span>
                        <span>- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                  </div>

                  {headerPartial ? (
                    <Skeleton className="h-10 w-2/3 mb-5" />
                  ) : (
                    <div className="flex gap-3 mb-5">
                      {order.payment_method === 'money' ? (
                        <Banknote className="h-5 w-5 text-[#00A868] shrink-0 mt-0.5" />
                      ) : (
                        <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold text-[15px] flex items-center gap-1">Pagamento na entrega <span className="text-[#00A868]">●</span> {order.payment_method === 'money' ? 'Dinheiro' : 'Máquina'}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.payment_method === 'money'
                            ? (order.notes?.includes('Troco para R$')
                                ? order.notes.split('Troco para R$')[1].split(' •')[0].trim() ? `Troco para R$ ${order.notes.split('Troco para R$')[1].split(' •')[0].trim()}` : 'Sem troco necessário'
                                : 'Sem troco necessário')
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center font-bold text-base mb-6">
                    <span className="text-foreground">Total com entrega</span>
                    {detailsPending ? (
                      <Skeleton className="h-5 w-20" />
                    ) : (
                      <span>R$ {orderTotal.toFixed(2).replace('.', ',')}</span>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="border-t border-border/50 pt-5 text-center flex flex-col gap-3">
              <button
                className="text-[#EA1D2C] font-bold text-[15px] flex items-center justify-center gap-2 mx-auto"
                onClick={() => setShowStoreChat(true)}
              >
                <MessageCircle className="h-4 w-4" /> Chat com a loja
              </button>

              {(computedStatus.statusKey === 'pending' || computedStatus.statusKey === 'preparing' || computedStatus.statusKey === 'ready') && (
                <button
                  className="text-muted-foreground font-medium text-[14px] flex items-center justify-center gap-2 mx-auto hover:text-destructive transition-colors"
                  onClick={handleCancelOrder}
                >
                  <AlertCircle className="h-4 w-4" /> Cancelar Pedido
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Store Chat Drawer */}
      {showStoreChat && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-x-0 bottom-0 z-50 mt-24 h-[85vh] rounded-t-3xl border bg-background shadow-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">Chat com {order.company?.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowStoreChat(false)}>Fechar</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <OrderStoreChat orderId={order.id} companyId={order.company_id} companyName={order.company?.name} />
            </div>
          </div>
        </div>
      )}
    </MarketplaceLayout>
  );
}
