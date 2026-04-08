import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderItem, Delivery, ChatMessage } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, MessageCircle, Send, Star, Check, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);

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

    const orderChannel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (p) => setOrder(prev => prev ? { ...prev, ...p.new } : null))
      .subscribe();

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

  // MapLibre - delivery tracking
  useEffect(() => {
    if (!delivery || order?.status !== 'delivering' || !mapContainerRef.current) return;
    if (mapRef.current) return; // already initialized

    const centerLat = delivery.current_latitude || delivery.delivery_latitude || -23.55;
    const centerLng = delivery.current_longitude || delivery.delivery_longitude || -46.63;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [centerLng, centerLat],
      zoom: 14,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Delivery destination marker
    if (delivery.delivery_latitude && delivery.delivery_longitude) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="width: 38px; height: 38px; border-radius: 50%; background: #f97316; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4); font-size: 20px;">
          🏠
        </div>
      `;
      new maplibregl.Marker({ element: el })
        .setLngLat([delivery.delivery_longitude, delivery.delivery_latitude])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML('<div style="font-weight: bold; padding: 4px;">Seu Endereço</div>'))
        .addTo(map);
    }

    // Pickup marker
    if (delivery.pickup_latitude && delivery.pickup_longitude) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 10px; background: #22c55e; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(34, 197, 94, 0.3); font-size: 16px;">
          🏪
        </div>
      `;
      new maplibregl.Marker({ element: el })
        .setLngLat([delivery.pickup_longitude, delivery.pickup_latitude])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<div style="font-weight: bold; padding: 4px;">${order?.company?.name || 'Loja'}</div>`))
        .addTo(map);
    }

    // Driver marker
    if (delivery.current_latitude && delivery.current_longitude) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="width: 42px; height: 42px; border-radius: 50%; background: #f97316; border: 4px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(249, 115, 22, 0.5); font-size: 22px; position: relative;">
          🛵
          <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid #f97316; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        </div>
        <style>@keyframes ping { 75%, 100% { transform: scale(1.5); opacity: 0; } }</style>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([delivery.current_longitude, delivery.current_latitude])
        .addTo(map);
      driverMarkerRef.current = marker;
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      driverMarkerRef.current = null;
    };
  }, [delivery, order?.status]);

  // Update driver position on delivery changes
  useEffect(() => {
    if (!delivery?.current_latitude || !delivery?.current_longitude || !mapRef.current) return;
    
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([delivery.current_longitude, delivery.current_latitude]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = '🛵';
      el.style.fontSize = '28px';
      driverMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([delivery.current_longitude, delivery.current_latitude])
        .addTo(mapRef.current);
    }

    mapRef.current.flyTo({
      center: [delivery.current_longitude, delivery.current_latitude],
      speed: 0.5,
    });
  }, [delivery?.current_latitude, delivery?.current_longitude]);

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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MarketplaceLayout>
    );
  }

  const currentStepIndex = statusSteps.indexOf(order.status);

  return (
    <MarketplaceLayout>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/marketplace/orders')} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Acompanhar pedido</h1>
        </div>

        {/* Map - delivery tracking */}
        {delivery && order.status === 'delivering' && (
          <Card className="overflow-hidden">
            <div ref={mapContainerRef} className="h-56 w-full" />
            <div className="p-3 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-foreground">Entregador a caminho</span>
            </div>
          </Card>
        )}

        {/* Status tracker */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Acompanhamento</h3>
          <div className="relative">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-3 relative">
                {/* Vertical line */}
                {i < statusSteps.length - 1 && (
                  <div className={`absolute left-[15px] top-8 w-0.5 h-6 ${
                    i < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10 ${
                  i <= currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i <= currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm py-2 ${i <= currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {statusLabels[step]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Order items */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3 text-sm">{order.company?.name}</h3>
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
            <Button variant="outline" className="w-full" size="sm" onClick={() => setShowChat(!showChat)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {showChat ? 'Fechar chat' : 'Chat com entregador'}
            </Button>
            {showChat && (
              <div className="mt-3">
                <div className="h-48 overflow-y-auto space-y-2 mb-3 p-2 border border-border rounded-xl bg-muted/30">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem</p>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-2xl px-3 py-2 max-w-[80%] text-sm ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-card text-foreground rounded-bl-sm border border-border'
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
                    className="rounded-xl"
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  />
                  <Button size="icon" className="rounded-xl flex-shrink-0" onClick={sendMessage}>
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
                <h3 className="font-semibold text-foreground text-sm">Como foi seu pedido?</h3>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star className={`h-8 w-8 transition-colors ${s <= rating ? 'text-warning fill-warning' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Comentário (opcional)"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="rounded-xl"
                />
                <Button className="w-full rounded-xl" onClick={submitReview}>Enviar avaliação</Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </MarketplaceLayout>
  );
}
