import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderItem, Delivery, ChatMessage } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MessageCircle, Send, Star, Check, Navigation, Store } from 'lucide-react';
import { toast } from 'sonner';
import { OrderStoreChat } from '@/components/marketplace/OrderStoreChat';

const statusSteps = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
const statusLabels: Record<string, string> = {
  pending: 'Pedido solicitado',
  confirmed: 'Aceito pelo lojista',
  preparing: 'Em preparo',
  ready: 'Pronto para retirada',
  delivering: 'Saiu para entrega',
  in_transit: 'Saiu para entrega',
  in_route: 'Saiu para entrega',
  delivered: 'Entregue',
  completed: 'Entregue',
};
const statusDescriptions: Record<string, string> = {
  pending: 'Aguardando confirmação do lojista.',
  confirmed: 'O lojista aceitou seu pedido.',
  preparing: 'Seu pedido está sendo preparado.',
  ready: 'Pedido pronto, aguardando entregador.',
  delivering: 'O entregador está a caminho.',
  in_transit: 'O entregador está a caminho.',
  delivered: 'Pedido entregue. Bom apetite!',
  completed: 'Pedido entregue. Bom apetite!',
};

const STORE_CHAT_STATUSES = ['confirmed', 'preparing', 'ready', 'delivering', 'in_route', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showStoreChat, setShowStoreChat] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [orderRes, itemsRes, deliveryRes] = await Promise.all([
        supabase.from('orders').select('*, company:companies(*)').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
        supabase.from('deliveries').select('*').eq('order_id', id).maybeSingle(),
      ]);
      setOrder(orderRes.data);
      setOrderItems(itemsRes.data || []);
      setDelivery(deliveryRes.data);
      if (deliveryRes.data) {
        const { data: msgs } = await supabase.from('chat_messages').select('*').eq('delivery_id', deliveryRes.data.id).order('created_at');
        setMessages(msgs || []);
      }
    };
    fetchAll();

    const orderChannel = supabase.channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (p) => setOrder(prev => prev ? { ...prev, ...p.new } : null))
      .subscribe();

    const deliveryChannel = supabase.channel(`delivery-order-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `order_id=eq.${id}` },
        (p) => { if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') setDelivery(p.new as Delivery); })
      .subscribe();

    return () => { supabase.removeChannel(orderChannel); supabase.removeChannel(deliveryChannel); };
  }, [id]);



  useEffect(() => {
    if (!delivery) return;
    const channel = supabase.channel(`chat-${delivery.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `delivery_id=eq.${delivery.id}` },
        (p) => setMessages(prev => [...prev, p.new as ChatMessage]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [delivery]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !delivery || !user) return;
    await supabase.from('chat_messages').insert({ delivery_id: delivery.id, sender_id: user.id, message: newMessage.trim() });
    setNewMessage('');
  };

  const submitReview = async () => {
    if (!order || !user) return;
    try {
      await supabase.from('reviews').insert({
        order_id: order.id, user_id: user.id, company_id: order.company_id,
        driver_id: delivery?.driver_id, rating, comment: reviewComment || null,
      });
      toast.success('Avaliação enviada!');
      setShowReview(false);
    } catch { toast.error('Erro ao enviar avaliação'); }
  };

  if (!order) {
    return (
      <MarketplaceLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MarketplaceLayout>
    );
  }

  const currentOrderStatus = (delivery?.status === 'completed' || delivery?.status === 'delivered') ? 'delivered' : order.status;
  
  const currentStepIndex = statusSteps.indexOf(
    currentOrderStatus === 'in_route' || currentOrderStatus === 'in_transit' ? 'delivering' : 
    currentOrderStatus === 'completed' ? 'delivered' : 
    currentOrderStatus
  );

  return (
    <MarketplaceLayout>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/marketplace/orders')} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Acompanhar pedido</h1>
        </div>

        {/* Status Delivery */}
        {delivery && ['delivering', 'in_route', 'in_transit'].includes(currentOrderStatus) && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Entregador a caminho</p>
              <p className="text-xs text-muted-foreground">O entregador já coletou seu pedido e está se deslocando.</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground text-sm">Acompanhamento</h3>
            <span className="text-[11px] uppercase tracking-wide text-primary font-semibold">
              {statusLabels[order.status] || 'Em andamento'}
            </span>
          </div>
          <div className="relative">
            {statusSteps.map((step, i) => {
              const done = i < currentStepIndex;
              const current = i === currentStepIndex;
              return (
                <div key={step} className="flex items-start gap-3 relative pb-4 last:pb-0">
                  {i < statusSteps.length - 1 && (
                    <div
                      className={`absolute left-[13px] top-7 w-0.5 h-[calc(100%-12px)] ${
                        done ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 z-10 transition-all ${
                      done
                        ? 'bg-primary text-primary-foreground'
                        : current
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse'
                          : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p
                      className={`text-sm leading-tight ${
                        done || current ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {statusLabels[step]}
                    </p>
                    {current && statusDescriptions[step] && (
                      <p className="text-xs text-muted-foreground mt-0.5">{statusDescriptions[step]}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat com lojista — disponível assim que o pedido é aceito */}
        {order.company_id && STORE_CHAT_STATUSES.includes(order.status) && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <Button
              variant="outline"
              className="w-full rounded-xl h-10"
              size="sm"
              onClick={() => setShowStoreChat((v) => !v)}
            >
              <Store className="h-4 w-4 mr-2" />
              {showStoreChat ? 'Fechar chat com lojista' : `Chat com ${order.company?.name || 'lojista'}`}
            </Button>
            {showStoreChat && (
              <OrderStoreChat
                orderId={order.id}
                companyId={order.company_id}
                companyName={order.company?.name}
              />
            )}
          </div>
        )}

        {/* Items */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-medium text-foreground mb-3 text-sm">{order.company?.name}</h3>
          <div className="space-y-2">
            {orderItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.quantity}x {item.product_name || (item as any).products?.name || 'Produto'}</span>
                <span className="text-foreground">R$ {((item.price || 0) * item.quantity).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entrega</span>
                <span>R$ {(order.delivery_fee || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">R$ {(order.total || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        {delivery && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <Button variant="outline" className="w-full rounded-xl h-10" size="sm" onClick={() => setShowChat(!showChat)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {showChat ? 'Fechar chat com entregador' : 'Chat com entregador'}
            </Button>
            {showChat && (
              <div className="mt-3">
                <div className="h-44 overflow-y-auto space-y-2 mb-3 p-3 border border-border rounded-xl bg-secondary/30">
                  {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensagem</p>}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-2xl px-3 py-2 max-w-[80%] text-sm ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-card text-foreground rounded-bl-md border border-border'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Digite..." className="rounded-xl h-10" onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                  <Button size="icon" className="rounded-xl h-10 w-10 shrink-0" onClick={sendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review */}
        {order.status === 'delivered' && (
          <div className="bg-card border border-border rounded-2xl p-4">
            {!showReview ? (
              <Button variant="outline" className="w-full rounded-xl h-10" onClick={() => setShowReview(true)}>
                <Star className="h-4 w-4 mr-2" /> Avaliar pedido
              </Button>
            ) : (
              <div className="space-y-4">
                <h3 className="font-medium text-foreground text-sm">Como foi seu pedido?</h3>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star className={`h-7 w-7 transition-colors ${s <= rating ? 'text-warning fill-warning' : 'text-muted-foreground/30'}`} />
                    </button>
                  ))}
                </div>
                <Input placeholder="Comentário (opcional)" value={reviewComment} onChange={e => setReviewComment(e.target.value)} className="rounded-xl h-10" />
                <Button className="w-full rounded-xl h-10" onClick={submitReview}>Enviar avaliação</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
