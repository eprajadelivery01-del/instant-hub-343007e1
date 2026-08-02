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
    // 1. Cria os canais nativos incondicionalmente no Android com prioridade máxima (5)
    Promise.allSettled([
      LocalNotifications.createChannel({
        id: "default",
        name: "Notificações do Marketplace",
        description: "Avisos de novos pedidos e atualizações de entrega",
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: "default",
      }),
      LocalNotifications.createChannel({
        id: "marketplace_orders",
        name: "Atualizações de Pedidos",
        description: "Avisos em tempo real de pedidos",
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: "default",
      }),
    ]).catch(() => {});

    // 2. Solicita permissões de notificação nativa ao Android/iOS
    LocalNotifications.requestPermissions().catch((e) => {
      console.warn("[LocalNotifications] Erro ao solicitar permissões:", e);
    });
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission()
        .then((perm) => {
          console.log("[Notification] Permissão de notificação cliente:", perm);
        })
        .catch((e) => {
          console.warn("[Notification] Erro ao solicitar permissão cliente:", e);
        });
    }
  }
}

export async function sendNativeDeviceNotification(
  title: string,
  options?: { body?: string; tag?: string; icon?: string }
) {
  // 1. Aciona vibração no dispositivo
  triggerDeviceVibration();

  console.log('[SEND_NATIVE_NOTIFICATION]', {
    title,
    body: options?.body,
    platform: Capacitor.getPlatform(),
    native: Capacitor.isNativePlatform()
  });

  // 2. Aciona Notificação Nativa do Celular (Android / iOS) - SOLICITA PERMISSÃO SE NECESSÁRIO E EXIBE NA CENTRAL DO DISPOSITIVO
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== "granted") {
          console.warn("[LocalNotifications] Permissão de notificação negada pelo usuário no Android.");
        }
      }

      await LocalNotifications.createChannel({
        id: "default",
        name: "Notificações do Marketplace",
        description: "Avisos de novos pedidos e atualizações de entrega",
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: "default",
      }).catch(() => {});

      await LocalNotifications.createChannel({
        id: "marketplace_orders",
        name: "Atualizações de Pedidos",
        description: "Avisos em tempo real de pedidos",
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: "default",
      }).catch(() => {});

      const notifId = Math.floor(Math.random() * 899999) + 100000;

      const result = await LocalNotifications.schedule({
        notifications: [
          {
            title: title || "Atualização de Pedido!",
            body: options?.body || "Acesse o app para acompanhar seu pedido",
            id: notifId,
            channelId: "marketplace_orders",
            actionTypeId: "",
            extra: {
              tag: options?.tag || "epraja-marketplace-order"
            }
          }
        ]
      });

      console.log('[LOCAL_NOTIFICATION_RESULT]', result);
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
    let recentOrders: string[] = [];
    let savedPhone = '';
    try {
      recentOrders = JSON.parse(localStorage.getItem('@epraja_recent_orders') || '[]');
      savedPhone = localStorage.getItem('@epraja_customer_phone') || localStorage.getItem('epraja_customer_phone') || '';
    } catch {}

    const resolvedTargetId = userId || customerId || savedPhone || (recentOrders.length > 0 ? recentOrders[0] : null);

    console.log('[SYNC_FCM_START]', {
      token,
      userId,
      customerId,
      resolvedTargetId
    });

    if (resolvedTargetId) {
      // 1. Atualização via cliente (se houver permissão)
      Promise.allSettled([
        supabase.from("customers").update({ fcm_token: token, updated_at: new Date().toISOString() }).or(`user_id.eq.${resolvedTargetId},id.eq.${resolvedTargetId},phone.eq.${savedPhone}`),
        supabase.from("profiles").update({ fcm_token: token, updated_at: new Date().toISOString() }).eq("id", resolvedTargetId),
        supabase.from("users").update({ fcm_token: token, updated_at: new Date().toISOString() }).eq("id", resolvedTargetId),
      ]);
    }

    // 2. Invocação forçada com SERVICE_ROLE para garantir o salvamento do token FCM no banco
    let response = await supabase.functions.invoke('notify-customer', {
      body: {
        action: 'save_token',
        fcmToken: token,
        customerId: resolvedTargetId,
        userId: userId,
        phone: savedPhone,
        recentOrders: recentOrders
      }
    });

    console.log('[EDGE_RESPONSE]', response);

    // Fallback de HTTP direto caso a SDK do Supabase retorne FunctionsFetchError no WebView do Android
    if (response.error || !response.data) {
      try {
        const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs";
        const directRes = await fetch("https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/notify-customer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            action: 'save_token',
            fcmToken: token,
            customerId: resolvedTargetId,
            userId: userId,
            phone: savedPhone,
            recentOrders: recentOrders
          })
        });
        const directData = await directRes.json();
        console.log('[DIRECT_FETCH_RESPONSE]', directData);
        response = { data: directData, error: null };
      } catch (errDirect) {
        console.warn('[DIRECT_FETCH_ERROR]', errDirect);
      }
    }

    console.log('[FCM] Sincronização de token concluída:', response);
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
      console.log("[FCM_TOKEN_RECEIVED]", token.value);

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
          const orderId = (payload.new as any)?.order_id || (payload.old as any)?.order_id;
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
