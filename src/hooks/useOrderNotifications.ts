import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { getMarketplaceStatus } from '@/utils/orderStatusResolver';

const statusMessages: Record<string, { title: string; description: string; icon: string }> = {
  confirmed: {
    title: '✅ Pedido confirmado!',
    description: 'A loja aceitou seu pedido e já vai iniciar o preparo.',
    icon: '✅',
  },
  preparing: {
    title: '👨‍🍳 Preparando seu pedido',
    description: 'A loja começou a preparar os itens do seu pedido.',
    icon: '👨‍🍳',
  },
  ready: {
    title: '📦 Pedido pronto!',
    description: 'Seu pedido está pronto e aguardando a saída para entrega.',
    icon: '📦',
  },
  accepted: {
    title: '🏍️ Entregador a caminho!',
    description: 'Um entregador aceitou seu pedido e está indo à loja.',
    icon: '🏍️',
  },
  collecting: {
    title: '🏬 Entregador na loja!',
    description: 'O entregador chegou à loja e está retirando seu pedido.',
    icon: '🏬',
  },
  in_route: {
    title: '🛵 Saiu para entrega!',
    description: 'O entregador está a caminho do seu endereço com seu pedido.',
    icon: '🛵',
  },
  delivering: {
    title: '🛵 Saiu para entrega!',
    description: 'O entregador está a caminho do seu endereço com seu pedido.',
    icon: '🛵',
  },
  delivered: {
    title: '🎉 Pedido entregue!',
    description: 'Seu pedido foi entregue com sucesso. Aproveite!',
    icon: '🎉',
  },
  cancelled: {
    title: '❌ Pedido cancelado',
    description: 'Seu pedido foi cancelado.',
    icon: '❌',
  },
};

let activeNativeNotif: Notification | null = null;

export function triggerDeviceVibration(pattern: number[] = [500, 200, 500]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

export function requestNativeNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    LocalNotifications.requestPermissions().then((res) => {
      if (res.display === "granted" || (res as any).receive === "granted") {
        LocalNotifications.createChannel({
          id: "default",
          name: "Notificações do Marketplace",
          description: "Avisos de novos pedidos e atualizações de entrega",
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: "default",
        }).catch(() => {});

        LocalNotifications.createChannel({
          id: "marketplace_orders",
          name: "Atualizações de Pedidos",
          description: "Avisos em tempo real de pedidos",
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: "default",
        }).catch(() => {});
      }
    }).catch(() => {});
  }
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission()
        .then((perm) => {
          console.log("[Notification] Permissão de notificação nativa cliente:", perm);
        })
        .catch((e) => {
          console.warn("[Notification] Erro ao solicitar permissão cliente:", e);
        });
    }
  }
}

export function sendNativeDeviceNotification(
  title: string,
  options?: { body?: string; tag?: string; icon?: string }
) {
  // 1. Aciona vibração no dispositivo
  triggerDeviceVibration();

  // 2. Aciona Notificação Nativa do Celular (Android / iOS) - IDÊNTICO AO APP DO LOJISTA
  if (Capacitor.isNativePlatform()) {
    try {
      LocalNotifications.schedule({
        notifications: [
          {
            title: title || "Atualização de Pedido!",
            body: options?.body || "Acesse o app para acompanhar seu pedido",
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 100) },
            channelId: "default",
            extra: {
              tag: options?.tag || "epraja-marketplace-order"
            }
          }
        ]
      }).catch((e) => {
        console.warn("[LocalNotifications] Erro ao agendar notificação nativa no canal default:", e);
        LocalNotifications.schedule({
          notifications: [
            {
              title: title || "Atualização de Pedido!",
              body: options?.body || "Acesse o app para acompanhar seu pedido",
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 100) },
              channelId: "marketplace_orders",
            }
          ]
        }).catch((err) => console.warn("[LocalNotifications] Erro ao agendar notificação nativa secundária:", err));
      });
    } catch (e) {
      console.warn("[LocalNotifications] Erro nativo cliente:", e);
    }
  }

  // 3. Aciona Notificação Nativa do Navegador (Desktop / PWA) - IDÊNTICO AO APP DO LOJISTA
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        if (activeNativeNotif) {
          activeNativeNotif.close();
        }
        activeNativeNotif = new Notification(title, {
          body: options?.body || "Acesse o app para acompanhar seu pedido",
          icon: options?.icon || "/favicon.ico",
          badge: "/favicon.ico",
          tag: options?.tag || "epraja-marketplace-order",
          requireInteraction: true,
        });

        activeNativeNotif.onclick = () => {
          try {
            window.focus();
          } catch {}
          activeNativeNotif?.close();
          activeNativeNotif = null;
        };
      } catch (e) {
        console.warn("[Notification] Erro ao instanciar notificação nativa cliente:", e);
      }
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          sendNativeDeviceNotification(title, options);
        }
      });
    }
  }
}

export async function syncFcmTokenToDatabase(providedToken?: string) {
  const token = providedToken || localStorage.getItem('@epraja_fcm_token') || localStorage.getItem('fcm_token');
  if (!token) return;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    const customerId = localStorage.getItem('@epraja_customer_id') || localStorage.getItem('epraja_customer_id') || userId;
    const targetId = userId || customerId;

    if (targetId) {
      // 1. Atualização via cliente (se houver permissão)
      Promise.allSettled([
        supabase.from("customers").update({ fcm_token: token, updated_at: new Date().toISOString() }).or(`user_id.eq.${targetId},id.eq.${targetId}`),
        supabase.from("profiles").update({ fcm_token: token, updated_at: new Date().toISOString() }).eq("id", targetId),
        supabase.from("users").update({ fcm_token: token, updated_at: new Date().toISOString() }).eq("id", targetId),
      ]);

      // 2. Invocação forçada com SERVICE_ROLE para garantir o salvamento do token FCM no banco sem bloqueio de RLS
      supabase.functions.invoke('notify-customer', {
        body: {
          action: 'save_token',
          fcmToken: token,
          customerId: targetId,
          userId: targetId
        }
      }).then(res => {
        console.log("[FCM] Token salvo no banco via Admin Service Role:", res);
      }).catch(err => {
        console.warn("[FCM] Erro ao invocar save_token via Edge Function:", err);
      });
    }
  } catch (e) {
    console.warn("[FCM] Erro ao sincronizar token com o banco:", e);
  }
}

export function useOrderNotifications() {
  const { user } = useAuth();
  const subscribedRef = useRef(false);

  // Request permissions for mobile notifications
  useEffect(() => {
    requestNativeNotificationPermission();
  }, []);

  // Tenta sincronizar o token FCM salvo localmente sempre que o estado do usuário mudar
  useEffect(() => {
    syncFcmTokenToDatabase();
  }, [user?.id]);

  // Configurar Push Notifications e Canal nativo se for plataforma nativa (Android/iOS)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let regListener: any = null;
    let errListener: any = null;
    let pushListener: any = null;

    PushNotifications.createChannel({
      id: 'marketplace_orders',
      name: 'Atualizações de Pedidos',
      description: 'Notificações nativas do Marketplace para o cliente',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    }).catch(() => {});

    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === "granted") {
        PushNotifications.register().catch(e => 
          console.warn("[Push] Falha ao registrar push (safe):", e)
        );
      }
    }).catch(e => console.warn("[Push] Falha ao pedir permissões de push:", e));

    PushNotifications.addListener("registration", (token) => {
      console.log("[Firebase] FCM Token obtido:", token.value);
      try {
        localStorage.setItem('@epraja_fcm_token', token.value);
        localStorage.setItem('fcm_token', token.value);
      } catch {}
      syncFcmTokenToDatabase(token.value);
    }).then(listener => { regListener = listener; });

    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("[Push] Erro no registro de Push do cliente:", error);
    }).then(listener => { errListener = listener; });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[Push] Notificação push do cliente recebida:", notification);
      const title = notification.title || "Atualização de Pedido";
      const body = notification.body || "";
      toast(title, { description: body, duration: 8000 });

      sendNativeDeviceNotification(title, { body, tag: "fcm-push" });
    }).then(listener => { pushListener = listener; });

    return () => {
      if (regListener) regListener.remove();
      if (errListener) errListener.remove();
      if (pushListener) pushListener.remove();
    };
  }, [user?.id]);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const isMyOrder = (ord: any): boolean => {
      if (!ord || !ord.id) return false;
      let myOrderIds: string[] = [];
      try {
        myOrderIds = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
      } catch {}

      if (myOrderIds.includes(ord.id)) return true;

      if (user && (
        ord.customer_id === user.id ||
        ord.user_id === user.id ||
        ord.client_id === user.id ||
        ord.buyer_id === user.id
      )) return true;

      return false;
    };

    const handleOrderNotification = async (orderId: string) => {
      try {
        const { data: ord } = await supabase
          .from('orders')
          .select('*, company:companies(*), deliveries(*)')
          .eq('id', orderId)
          .single();

        if (!ord) return;
        if (!isMyOrder(ord)) return;
        if (ord.status === 'pending') return; // NUNCA dispara toast/notificacao para status pending

        const computed = getMarketplaceStatus(ord);
        toast(computed.title, {
          description: `${computed.label} (Pedido #${ord.id.slice(0, 8)})`,
          duration: 5000,
          action: {
            label: 'Ver pedido',
            onClick: () => {
              window.location.href = `/marketplace/orders/${ord.id}`;
            },
          },
        });

        // DISPARA A NOTIFICAÇÃO NATIVA DA CENTRAL DO DISPOSITIVO (ANDROID/IOS/WEB)!
        sendNativeDeviceNotification(computed.title, {
          body: `${computed.label} (Pedido #${ord.id.slice(0, 8)})`,
          tag: `order-${ord.id}-${computed.statusKey}`
        });
      } catch (err) {
        console.warn("[useOrderNotifications] Erro ao disparar toast de notificação:", err);
      }
    };

    const channelId = `order-notifications-${user?.id || 'guest'}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => handleOrderNotification(payload.new.id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        (payload) => {
          const orderId = payload.new?.order_id || payload.old?.order_id;
          if (orderId) handleOrderNotification(orderId);
        }
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
