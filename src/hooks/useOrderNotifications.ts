import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

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

  // Request permissions for mobile notifications
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().catch(() => {});
    }
  }, []);

  // Configurar Push Notifications se for plataforma nativa (Android/iOS)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    let regListener: any = null;
    let errListener: any = null;
    let pushListener: any = null;

    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === "granted") {
        PushNotifications.register().catch(e => 
          console.warn("[Push] Falha ao registrar push (safe):", e)
        );
      }
    }).catch(e => console.warn("[Push] Falha ao pedir permissões de push:", e));

    PushNotifications.addListener("registration", (token) => {
      console.log("TOKEN FCM:", token.value);
      if (user?.id) {
        Promise.all([
          supabase.from("customers").update({ fcm_token: token.value }).or(`user_id.eq.${user.id},id.eq.${user.id}`),
          supabase.from("profiles").update({ fcm_token: token.value }).eq("id", user.id),
          supabase.from("users").update({ fcm_token: token.value }).eq("id", user.id),
        ]).then(() => {
          console.log("[Push] fcm_token do cliente persistido com sucesso para user:", user.id);
        }).catch(err => console.error("[Push] Erro ao persistir fcm_token do cliente:", err));
      }
    }).then(listener => { regListener = listener; });

    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("[Push] Erro no registro de Push do cliente:", error);
    }).then(listener => { errListener = listener; });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[Push] Notificação push do cliente recebida em foreground:", notification);
      toast(notification.title || "Atualização de Pedido", {
        description: notification.body,
        duration: 8000
      });
    }).then(listener => { pushListener = listener; });

    return () => {
      if (regListener) regListener.remove();
      if (errListener) errListener.remove();
      if (pushListener) pushListener.remove();
    };
  }, [user]);

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

              // Show native local notification on mobile
              if (Capacitor.isNativePlatform()) {
                try {
                  LocalNotifications.schedule({
                    notifications: [
                      {
                        title: msg.title,
                        body: msg.description,
                        id: Math.floor(Math.random() * 100000),
                        channelId: 'default',
                        schedule: { at: new Date(Date.now() + 100) },
                        extra: {
                          orderId: payload.new.id
                        }
                      }
                    ]
                  }).catch(() => {});
                } catch (e) {
                  console.warn("Failed to show native order notification", e);
                }
              }
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
