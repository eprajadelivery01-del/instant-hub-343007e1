import React, { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

const NOTIFICATION_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const statusMessages: Record<string, { title: string; description: string; icon: string }> = {
  confirmed: { title: '✅ Pedido confirmado!', description: 'A loja aceitou seu pedido.', icon: '✅' },
  preparing: { title: '👨‍🍳 Preparando seu pedido', description: 'A loja começou a preparar seu pedido.', icon: '👨‍🍳' },
  ready: { title: '📦 Pedido pronto!', description: 'Seu pedido está pronto e aguardando o entregador.', icon: '📦' },
  delivering: { title: '🛵 Saiu para entrega!', description: 'O entregador está a caminho do seu endereço.', icon: '🛵' },
  in_route: { title: '🛵 Saiu para entrega!', description: 'O entregador está a caminho do seu endereço.', icon: '🛵' },
  collecting: { title: '🛵 Entregador a caminho da loja!', description: 'O entregador foi atribuído e está indo coletar seu pedido.', icon: '🛵' },
  accepted: { title: '🛵 Entregador aceitou a entrega!', description: 'O entregador aceitou seu pedido e irá coletar em breve.', icon: '🛵' },
  in_transit: { title: '🛵 Saiu para entrega!', description: 'O entregador está a caminho do seu endereço.', icon: '🛵' },
  delivered: { title: '🎉 Pedido entregue!', description: 'Seu pedido foi entregue. Bom apetite!', icon: '🎉' },
  cancelled: { title: '❌ Pedido cancelado', description: 'Seu pedido foi cancelado.', icon: '❌' },
};

export function GlobalMarketingListener() {
  const { user } = useAuth();
  const userOrderIdsRef = useRef<Set<string>>(new Set());

  // Sincroniza automaticamente todos os IDs de pedidos do usuário logado no localStorage e na Ref
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('orders')
      .select('id')
      .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
      .then(({ data }) => {
        if (data) {
          data.forEach(o => userOrderIdsRef.current.add(o.id));
          try {
            const recent = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
            const merged = Array.from(new Set([...recent, ...data.map(o => o.id)]));
            localStorage.setItem('@epraja_recent_orders', JSON.stringify(merged));
          } catch {}
        }
      });
  }, [user?.id]);

  // 1. Configura canal de notificações do Android com som padrão e alta prioridade
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().then((res) => {
        if (res.display === 'granted' && Capacitor.getPlatform() === 'android') {
          LocalNotifications.createChannel({
            id: 'default',
            name: 'Notificações É Pra Já',
            description: 'Alertas de cupons, ofertas e pedidos',
            importance: 4, // High importance
            visibility: 1, // Public on lockscreen
            vibration: true,
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // Register Service Worker & Web Notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          swRegRef.current = reg;
        })
        .catch((err) => {
          console.warn('[SW] Erro ao registrar Service Worker:', err);
        });
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // 2. Configura Push Notifications (FCM) no dispositivo móvel
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === 'granted') {
        PushNotifications.register().catch(() => {});
      }
    }).catch(() => {});

    PushNotifications.addListener('registration', (token) => {
      console.log("TOKEN FCM:", token.value);
      if (user?.id) {
        Promise.all([
          supabase.from('customers').update({ fcm_token: token.value }).or(`user_id.eq.${user.id},id.eq.${user.id}`),
          supabase.from('profiles').update({ fcm_token: token.value }).eq('id', user.id),
          supabase.from('users').update({ fcm_token: token.value }).eq('id', user.id),
        ]).catch(() => {});
      }
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notificação recebida em primeiro plano:', notification);
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.schedule({
          notifications: [{
            title: notification.title || '🔔 É Pra Já!',
            body: notification.body || 'Você recebeu um novo alerta.',
            id: Math.floor(Math.random() * 100000),
            channelId: 'default',
            schedule: { at: new Date(Date.now() + 100) },
          }],
        }).catch(() => {});
      }
    });
  }, [user?.id]);

  // 3. Realtime Listener para Cupons Novos, Ofertas e Atualizações de Pedido
  useEffect(() => {
    const channelId = `global-client-listener-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      // A) Ofertass e Notificações de Marketing
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketing_notifications' },
        (payload) => {
          const newNotif = payload.new;
          playNotificationAudio();

          triggerNativeNotification(newNotif, swRegRef.current);

          toast.custom((t) => (
            <div className="relative flex flex-col gap-3 p-4 bg-background border border-border rounded-xl shadow-2xl w-[350px] animate-in slide-in-from-top-2">
              <button 
                onClick={() => toast.dismiss(t)}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors z-10"
              >
                <X className="h-3 w-3" />
              </button>

              {newNotif.image_url && (
                <img 
                  src={newNotif.image_url} 
                  alt="Oferta" 
                  className="w-full h-36 object-cover rounded-lg"
                />
              )}
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 pr-6">
                  {newNotif.emoji && <span className="text-2xl">{newNotif.emoji}</span>}
                  <h3 className="font-bold text-base leading-tight">{newNotif.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{newNotif.message}</p>
              </div>
              
              {newNotif.coupon_code && (
                <div 
                  className="mt-1 bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(newNotif.coupon_code);
                    toast.success('Cupom copiado!', { id: 'coupon-copied' });
                  }}
                >
                  <span className="font-mono font-bold text-primary text-lg">{newNotif.coupon_code}</span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    <Copy className="h-3 w-3" /> Copiar
                  </div>
                </div>
              )}
            </div>
          ), {
            duration: 15000,
            position: 'top-center',
          });
        }
      )
      // B) Novos Cupons criados pelo Admin na tabela 'coupons'
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'coupons' },
        (payload) => {
          const coupon = payload.new;
          playNotificationAudio();

          const title = `🎟️ Novo Cupom de Desconto!`;
          const message = coupon.code 
            ? `Aproveite o cupom ${coupon.code} no seu próximo pedido!` 
            : (coupon.description || 'Novo cupom disponível no app!');

          triggerNativeNotification({
            title,
            message,
            coupon_code: coupon.code,
            emoji: '🎟️'
          }, swRegRef.current);

          toast.success(title, {
            description: message,
            duration: 10000,
          });
        }
      )
      // C) Atualizações nos Pedidos do Cliente na tabela 'orders'
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as any;
          
          let myOrderIds: string[] = [];
          try {
            myOrderIds = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
          } catch {}

          const isMyOrder = 
            (user && (
              order.customer_id === user.id || 
              order.user_id === user.id || 
              order.client_id === user.id ||
              order.buyer_id === user.id
            )) ||
            myOrderIds.includes(order.id);

          console.log("[TESTE] REALTIME ORDER UPDATE:", order.id, "STATUS:", order.status, "IS_MY_ORDER:", isMyOrder);

          if (!isMyOrder) return;

          const newStatus = order.status;
          const oldStatus = payload.old?.status;

          console.log("[TESTE] STATUS ATUAL:", newStatus);

          if (newStatus && newStatus !== oldStatus) {
            const msg = statusMessages[newStatus];
            if (msg) {
              console.log("[TESTE] PUSH RECEBIDO - NOTIFICAÇÃO SALVA E TOAST EXIBIDO:", msg);
              playNotificationAudio();

              triggerNativeNotification({
                title: msg.title,
                message: msg.description,
                emoji: msg.icon
              }, swRegRef.current);

              toast.info(msg.title, {
                description: msg.description,
                duration: 10000,
              });
            }
          }
        }
      )
      // D) Atualizações nas Entregas dos Entregadores na tabela 'deliveries'
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliveries' },
        (payload) => {
          const delivery = payload.new as any;
          
          let myOrderIds: string[] = [];
          try {
            myOrderIds = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
          } catch {}

          const isMyDelivery =
            Boolean(delivery.order_id) &&
            (myOrderIds.includes(delivery.order_id) || userOrderIdsRef.current.has(delivery.order_id));

          console.log('[TESTE] REALTIME DELIVERY UPDATE:', { deliveryId: delivery.id, orderId: delivery.order_id, status: delivery.status, isMyDelivery });

          if (!isMyDelivery) return;

          const newStatus = delivery.status;
          const oldStatus = payload.old?.status;

          console.log("[TESTE] DELIVERY STATUS:", newStatus);

          if (newStatus && newStatus !== oldStatus) {
            const msg = statusMessages[newStatus];
            if (msg) {
              console.log("[TESTE] PUSH ENVIADO PARA O CLIENTE (Delivery status):", msg);
              playNotificationAudio();

              triggerNativeNotification({
                title: msg.title,
                message: msg.description,
                emoji: msg.icon
              }, swRegRef.current);

              toast.info(msg.title, {
                description: msg.description,
                duration: 10000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
}

function playNotificationAudio() {
  try {
    const audio = new Audio(NOTIFICATION_AUDIO_URL);
    audio.play().catch(() => {});
  } catch (e) {}

  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}

function triggerNativeNotification(notif: any, swRegistration: ServiceWorkerRegistration | null) {
  const title = `${notif.emoji ? notif.emoji + ' ' : ''}${notif.title || 'Novo Alerta É Pra Já!'}`;
  const body = notif.message || (notif.coupon_code ? `Use o cupom: ${notif.coupon_code}` : 'Confira no app!');

  // Notificação na central do celular (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 100000),
            channelId: 'default',
            schedule: { at: new Date(Date.now() + 100) },
            extra: {
              coupon: notif.coupon_code
            }
          }
        ]
      }).catch((e) => console.warn('[LocalNotif] Falha ao agendar notificação nativa:', e));
    } catch (e) {
      console.error('[Notification] Erro ao disparar notificação nativa:', e);
    }
  }

  // Notificação Web / Service Worker
  if ('Notification' in window && Notification.permission === 'granted') {
    const options = {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      image: notif.image_url || undefined,
      tag: `epraja-marketing-${notif.id || Date.now()}`,
      data: {
        url: '/marketplace/coupons',
        coupon: notif.coupon_code
      }
    };

    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(title, options).catch(() => {
        try {
          new Notification(title, options);
        } catch (e) {}
      });
    } else {
      try {
        new Notification(title, options);
      } catch (e) {}
    }
  }
}
