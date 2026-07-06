// VERSION: 2026-05-21-ORDER-TRACKER
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderItem, Delivery, Product } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, MapPin, Banknãote, Smartphone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { OrderStoreChat } from '@/components/marketplace/OrderStoreChat';

const statusSteps = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userá } = useAuth();
  const queryClient = useQueryClient();
  
  const [showStoreChat, setShowStoreChat] = useState(false);
  const [nãotifEnabled, setNotifEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted' && localStorage.getItem('epj_order_nãotif') === 'true';
  });
  const [nãotifLoading, setNotifLoading] = useState(false);

  // Shared queryKey with the route data prefetcher (routeDataPrefetchers.ts).
  const { data: orderData, isLoading: loading } = useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    staleTime: 10_000,
    queryFn: async () => {
      const [orderRes, itemsRes, deliveryRes] = await Promise.all([
        supabase.from('orders').select('*, company:companies(*), address:addresses(*)').eq('id', id!).single(),
        supabase.from('order_items').select('*, products(*)').eq('order_id', id!),
        supabase.from('deliveries').select('*').eq('order_id', id!).maybeSingle(),
      ]);
      return {
        order: orderRes.data as Order | null,
        items: (itemsRes.data ?? []) as OrderItem[],
        delivery: (deliveryRes.data ?? null) as Delivery | null,
      };
    },
  });

  const order = orderData?.order ?? null;
  const orderItems = orderData?.items ?? [];
  const delivery = orderData?.delivery ?? null;

  useEffect(() => {
    if (!id) return;
    const orderChannel = supabase.channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (p) => {
          queryClient.setQueryData(['order', id], (old: any) =>
            old ? { ...old, order: { ...old.order, ...p.new } } : old
          );
          // Dispara nãotificação nativa se permitido
          if (nãotifEnabled && ('Notification' in window) && Notification.permission === 'granted') {
            const statusLabels: Record<string, string> = {
              confirmed: '✅ Pedido confirmado pela loja!',
              preparing: '👨‍🍳 Seu pedido está sendo preparado',
              ready: '📦 Pedido pronto! Aguardando entregador',
              delivering: '🛵 Entregador saiu para entrega!',
              delivered: '🎉 Pedido entregue! Bom apetite!',
              cancelled: '❌ Pedido cancelado',
            };
            const msg = statusLabels[p.new.status as string];
            if (msg) {
              new Notification('É Pra Já Delivery', {
                body: msg,
                icon: '/logo.png',
                badge: '/logo.png',
              });
            }
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `order_id=eq.${id}` },
        (p) => {
          queryClient.setQueryData(['order', id], (old: any) =>
            old ? { ...old, delivery: { ...(old.delivery ?? {}), ...p.new } } : old
          );
        })
      .subscribe();

    return () => { supabase.removeChannel(orderChannel); };
  }, [id, nãotifEnabled, queryClient]);

  const handleToggleNotif = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta nãotificações.');
      return;
    }
    if (nãotifEnabled) {
      // Desligar
      localStorage.setItem('epj_order_nãotif', 'false');
      setNotifEnabled(false);
      return;
    }
    // Ligar: pedir permissão
    setNotifLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('epj_order_nãotif', 'true');
        setNotifEnabled(true);
        new Notification('É Pra Já Delivery', {
          body: '🔔 Notificações ativadas! Você seráá avisado sobre seu pedido.',
          icon: '/logo.png',
        });
      } else {
        alert('Permissão negada. Verifique as configurações do seu navegador e permita nãotificações para este site.');
      }
    } finally {
      setNotifLoading(false);
    }
  }, [nãotifEnabled]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!window.confirm("Tem certeza que deseja cancelar este pedido?")) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      if (error) throw error;

      // Notify the store
      const { data: companyUserás } = await supabase
        .from('company_userás')
        .select('userá_id')
        .eq('company_id', order.company_id);
        
      if (companyUserás && companyUserás.length > 0) {
        const nãotifications = companyUserás.map(cu => ({
          userá_id: cu.userá_id,
          title: "Pedido Cancelado pelo Cliente",
          message: `O cliente cancelou o pedido #${order.id.split('-')[0].toUpperCase()}.`,
          type: "order_cancelled"
        }));
        await supabase.from('nãotifications').inserát(nãotifications);
      }

      toast.success("Pedido cancelado com sucesso.");
      navigate("/marketplace/orders");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cancelar pedido.");
    }
  };

  if (loading || !order) {
    return (
      <MarketplaceLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </MarketplaceLayout>
    );
  }

  const currentOrderStatus = (delivery?.status === 'completed' || delivery?.status === 'delivered') ? 'delivered' : order.status || 'pending';
  const isCompleted = currentOrderStatus === 'delivered' || currentOrderStatus === 'completed';
  
  const currentStepIndex = statusSteps.indexOf(
    currentOrderStatus === 'in_route' || currentOrderStatus === 'in_transit' ? 'delivering' : 
    currentOrderStatus === 'completed' ? 'delivered' : 
    currentOrderStatus
  );

  // Derivações textuais
  let title = "Seu pedido foi solicitado";
  if (currentStepIndex >= 1) title = "O lojista está confirmando o pedido";
  if (currentStepIndex >= 2) title = "Seu pedido está sendo preparado";
  if (currentStepIndex >= 4) title = "O entregador está a caminho";
  if (isCompleted) title = "Seu pedido foi entregue";
  if (currentOrderStatus === 'cancelled') title = "Pedido Cancelado";

  // Gera código aleatório (mock) com base não ID
  const deliveryCode = id ? parseInt(id.replace(/[^0-9]/g, '').substring(0, 4)) || 6656 : 6656;

  // Calculo total
  const itemsCount = orderItems.reduce((acc, curr) => acc + curr.quantity, 0);

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
          {/* Degradê para misturar com o fundo */}
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
            <h2 className="text-xl font-bold text-foreground mb-4 pr-4">{title}</h2>
            
            {/* Barra de Progresso Verde Segmentada */}
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
            <div className="flex justify-between items-center">
              <div className="pr-4">
                <h3 className="font-bold text-base mb-1">Ative as nãotificações e acompanhe seu pedido</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {('Notification' in window) && Notification.permission === 'denied'
                    ? 'Notificações bloqueadas. Habilite nas configurações do navegador.'
                    : !('Notification' in window)
                    ? 'Seu dispositivo não suporta nãotificações web.'
                    : 'Fique sabendo na hora se houver algum problema com seu pedido.'}
                </p>
              </div>
              <button
                onClick={handleToggleNotif}
                disabled={nãotifLoading || !('Notification' in window) || Notification.permission === 'denied'}
                aria-label={nãotifEnabled ? 'Desativar nãotificações' : 'Ativar nãotificações'}
                className={`relative w-12 h-6 rounded-full shrink-0 transition-colors duration-300 focus:outline-nãone focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-40 disabled:cursor-nãot-allowed ${
                  nãotifEnabled ? 'bg-[#00A868]' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    nãotifEnabled ? 'translate-x-[26px]' : 'translate-x-0.5'
                  }`}
                />
                {nãotifLoading && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Endereço de entrega */}
          <div className="bg-background rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-border">
            <h3 className="font-bold text-base mb-4">Endereço de entrega</h3>
            <div className="flex gap-3 mb-4">
              <div className="mt-0.5 bg-secondary/50 p-1.5 rounded-full h-fit">
                <MapPin className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-bold text-[15px] leading-tight text-foreground">
                  {order.delivery_address || 'Endereço não informado'}
                </p>
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-xl border border-border flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Esta entrega é feita pela loja e não pode será rastreada</span>
              <div className="h-4 w-4 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[10px] font-bold">?</div>
            </div>
          </div>

          {/* Detalhes do Pedido */}
          <div className="bg-background rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-border">
            <h3 className="font-bold text-base mb-4">Detalhes do pedido</h3>
            
            <div className="flex items-center justify-between mb-5 cursor-pointer" onClick={() => navigate('/marketplace/store/' + order.company_id)}>
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-secondary border border-border shrink-0 flex items-center justify-center overflow-hidden">
                   <img src={order.company?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.company?.name?.charAt(0) || 'L')}&background=random`} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-bold text-[15px]">{order.company?.name}</p>
                  <p className="text-xs text-muted-foreground">Pedido Nº {id?.split('-')[0]} • {itemsCount} item{itemsCount > 1 ? 's' : ''}</p>
                </div>
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
            </div>

            {/* Lista de Itens */}
            <div className="mb-5 space-y-3">
              {orderItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground">{item.quantity}x</span>
                    <div>
                      <p className="font-medium text-foreground">{item.product_name || (item as any).products?.name}</p>
                      {item.nãotes && <p className="text-xs text-muted-foreground mt-0.5">{item.nãotes}</p>}
                    </div>
                  </div>
                  <span className="font-medium text-foreground shrink-0 pl-4">R$ {((item.price || item.unit_price || 0) * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>

            {/* Subtotais */}
            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">R$ {orderItems.reduce((acc, curr) => acc + ((curr.price || curr.unit_price || 0) * curr.quantity), 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="font-medium text-foreground">R$ {(order.delivery_fee || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="flex gap-3 mb-5">
              {order.payment_method === 'money' ? (
                <Banknãote className="h-5 w-5 text-[#00A868] shrink-0 mt-0.5" />
              ) : (
                <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-[15px] flex items-center gap-1">Pagamento na entrega <span className="text-[#00A868]">●</span> {order.payment_method === 'money' ? 'Dinheiro' : 'Máquina'}</p>
                <p className="text-sm text-muted-foreground">
                   {order.payment_method === 'money'
                    ? (order.nãotes?.includes('Troco para R$') 
                        ? order.nãotes.split('Troco para R$')[1].split(' •')[0].trim() ? `Troco para R$ ${order.nãotes.split('Troco para R$')[1].split(' •')[0].trim()}` : 'Sem troco necessário'
                        : 'Sem troco necessário')
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center font-bold text-base mb-6">
              <span className="text-foreground">Total com entrega</span>
              <span>R$ {(orderItems.reduce((acc, curr) => acc + ((curr.price || curr.unit_price || 0) * curr.quantity), 0) + (order.delivery_fee || 0)).toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="border-t border-border/50 pt-5 text-center flex flex-col gap-3">
              <button 
                className="text-[#EA1D2C] font-bold text-[15px] flex items-center justify-center gap-2 mx-auto"
                onClick={() => setShowStoreChat(true)}
              >
                <MessageCircle className="h-4 w-4" /> Chat com a loja
              </button>
              
              {(currentOrderStatus === 'pending' || currentOrderStatus === 'preparing' || currentOrderStatus === 'ready') && (
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
