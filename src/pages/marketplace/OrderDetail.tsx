import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderItem, Delivery, ChatMessage } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, MessageCircle, Send, Star, Check } from 'lucide-react';
import { toast } from 'sonner';

const statusSteps = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
const statusLabels: Record<string, string> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivering: 'Em entrega',
  delivered: 'Entregue',
};

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
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('delivery_id', deliveryRes.data.id)
          .order('created_at');
        setMessages(msgs || []);
      }
    };
    fetchAll();

    // Realtime for order status
    const orderChannel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (p) => setOrder(prev => prev ? { ...prev, ...p.new } : null))
      .subscribe();

    // Realtime for delivery
    const deliveryChannel = supabase
      .channel(`delivery-order-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `order_id=eq.${id}` },
        (p) => {
          if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') {
            setDelivery(p.new as Delivery);
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(deliveryChannel);
    };
  }, [id]);

  // Chat realtime
  useEffect(() => {
    if (!delivery) return;
    const channel = supabase
      .channel(`chat-${delivery.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `delivery_id=eq.${delivery.id}` },
        (p) => setMessages(prev => [...prev, p.new as ChatMessage]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [delivery]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !delivery || !user) return;
    await supabase.from('chat_messages').insert({
      delivery_id: delivery.id,
      sender_id: user.id,
      message: newMessage.trim(),
    });
    setNewMessage('');
  };

  const submitReview = async () => {
    if (!order || !user) return;
    try {
      await supabase.from('reviews').insert({
        order_id: order.id,
        user_id: user.id,
        company_id: order.company_id,
        driver_id: delivery?.driver_id,
        rating,
        comment: reviewComment || null,
      });
      toast.success('Avaliação enviada!');
      setShowReview(false);
    } catch {
      toast.error('Erro ao enviar avaliação');
    }
  };

  if (!order) {
    return (
      <MarketplaceLayout>
        <p className="text-muted-foreground py-16 text-center">Carregando...</p>
      </MarketplaceLayout>
    );
  }

  const currentStepIndex = statusSteps.indexOf(order.status);

  return (
    <MarketplaceLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Pedido</h1>
        </div>

        {/* Status tracker */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Acompanhamento</h3>
          <div className="space-y-3">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i <= currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i <= currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm ${i <= currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {statusLabels[step]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Delivery map placeholder - would use MapLibre */}
        {delivery && order.status === 'delivering' && delivery.current_latitude && (
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Entregador a caminho
            </h3>
            <p className="text-sm text-muted-foreground">
              Lat: {delivery.current_latitude?.toFixed(4)}, Lng: {delivery.current_longitude?.toFixed(4)}
            </p>
          </Card>
        )}

        {/* Order items */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3">{order.company?.name}</h3>
          <div className="space-y-2">
            {orderItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.quantity}x {item.product_name}</span>
                <span>R$ {((item.price || 0) * item.quantity).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span>R$ {(order.delivery_fee || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {(order.total || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Chat */}
        {delivery && (
          <Card className="p-4">
            <Button variant="outline" className="w-full" onClick={() => setShowChat(!showChat)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {showChat ? 'Fechar chat' : 'Chat com entregador'}
            </Button>
            {showChat && (
              <div className="mt-4">
                <div className="h-48 overflow-y-auto space-y-2 mb-3 p-2 border border-border rounded-lg">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem</p>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  />
                  <Button size="icon" onClick={sendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Review */}
        {order.status === 'delivered' && (
          <Card className="p-4">
            {!showReview ? (
              <Button variant="outline" className="w-full" onClick={() => setShowReview(true)}>
                <Star className="h-4 w-4 mr-2" />
                Avaliar pedido
              </Button>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Avaliação</h3>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star className={`h-8 w-8 ${s <= rating ? 'text-warning fill-warning' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Comentário (opcional)"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
                <Button className="w-full" onClick={submitReview}>Enviar avaliação</Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </MarketplaceLayout>
  );
}
