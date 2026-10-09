import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import admin from "npm:firebase-admin@11.11.1";

const rawSa = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "";
if (rawSa) {
  try {
    const serviceAccount = JSON.parse(rawSa);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (e) {
    console.warn('[notify-customer] Aviso ao inicializar Firebase Admin via env:', e);
  }
}

const statusMessages: Record<string, { title: string; description: string }> = {
  confirmed: {
    title: '✅ Pedido confirmado',
    description: 'A loja aceitou seu pedido.',
  },
  preparing: {
    title: '👨‍🍳 Preparando seu pedido',
    description: 'A loja começou a preparar seu pedido.',
  },
  ready: {
    title: '📦 Pedido pronto',
    description: 'Seu pedido está pronto na loja.',
  },
  accepted: {
    title: '🛵 Entregador a caminho',
    description: 'O entregador aceitou o pedido e está indo retirar na loja.',
  },
  collecting: {
    title: '🛵 Entregador na loja',
    description: 'O entregador chegou à loja e está retirando seu pedido.',
  },
  broadcasted: {
    title: '📢 Corrida em broadcast',
    description: 'Buscando entregadores parceiros.',
  },
  delivering: {
    title: '🛵 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
  },
  in_route: {
    title: '🛵 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
  },
  in_transit: {
    title: '🛵 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
  },
  delivered: {
    title: '🎉 Pedido entregue!',
    description: 'Seu pedido foi entregue com sucesso.',
  },
  completed: {
    title: '🎉 Pedido entregue!',
    description: 'Seu pedido foi entregue com sucesso.',
  },
  cancelled: {
    title: '❌ Pedido cancelado',
    description: 'Seu pedido foi cancelado.',
  }
};

const recentPushCache = new Map<string, number>();

function isDuplicatePush(orderId: string, status: string): boolean {
  const key = `${orderId}_${status}`;
  const now = Date.now();
  const lastTime = recentPushCache.get(key);
  
  if (recentPushCache.size > 500) {
    for (const [k, v] of recentPushCache.entries()) {
      if (now - v > 120000) recentPushCache.delete(k);
    }
  }

  if (lastTime && (now - lastTime < 45000)) {
    return true;
  }
  
  recentPushCache.set(key, now);
  return false;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization, X-Client-Info, ApiKey, Content-Type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: 'Missing Supabase vars' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Extrai e valida o token JWT do usuário chamador para evitar vulnerabilidades de IDOR
    const authHeader = req.headers.get('Authorization') || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '');
    let authenticatedUserId: string | null = null;

    if (bearerToken && ANON_KEY && bearerToken !== ANON_KEY && bearerToken !== SERVICE_ROLE) {
      try {
        const authClient = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${bearerToken}` } }
        });
        const { data: userData } = await authClient.auth.getUser();
        authenticatedUserId = userData?.user?.id || null;
      } catch (e) {
        console.warn('[notify-customer] Falha ao verificar autenticação do chamador:', e);
      }
    }

    const payload = await req.json();
    console.log("Customer Push Webhook payload received:", payload);

    // Se a requisição for para restaurar status de pedido
    if (payload.action === 'restore_order') {
      const cleanId = String(payload.orderId || payload.order_id).replace('#', '').trim();
      const targetStatus = payload.status || 'preparing';
      console.log(`[notify-customer] RESTAURANDO PEDIDO #${cleanId} PARA STATUS ${targetStatus}`);
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId);
      if (isUUID) {
        if (authenticatedUserId) {
          const { data: targetOrder } = await adminClient
            .from('orders')
            .select('id, company_id')
            .eq('id', cleanId)
            .maybeSingle();

          if (targetOrder?.company_id) {
            const { data: storeOwner } = await adminClient
              .from('companies')
              .select('user_id')
              .eq('id', targetOrder.company_id)
              .maybeSingle();
            if (storeOwner?.user_id !== authenticatedUserId) {
              return new Response(JSON.stringify({ error: 'Acesso negado: apenas o lojista responsável pode restaurar este pedido.' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        }

        await Promise.allSettled([
          adminClient.from('orders').update({ status: targetStatus, updated_at: new Date().toISOString() }).eq('id', cleanId),
          adminClient.from('deliveries').update({ status: targetStatus, updated_at: new Date().toISOString() }).eq('order_id', cleanId),
        ]);
      }
      return new Response(JSON.stringify({ success: true, message: `Order ${cleanId} restored to ${targetStatus}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Se a requisição for para salvar token FCM do cliente com admin service role
    if (payload.action === 'save_token' || (payload.fcmToken && !payload.status && !payload.deliveryStatus)) {
      const fcmToken = payload.fcmToken || payload.fcm_token;
      const targetId = payload.customerId || payload.customer_id || payload.userId || payload.user_id || payload.phone;
      const recentOrders: string[] = payload.recentOrders || [];

      if (fcmToken) {
        console.log(`[notify-customer] SALVANDO/UPSERT TOKEN FCM COM ADMIN ROLE PARA CLIENTE: ${targetId} | orders: ${recentOrders.join(',')}`);
        
        if (targetId) {
          const { data: updatedCust } = await adminClient
            .from('customers')
            .update({ fcm_token: fcmToken, updated_at: new Date().toISOString() })
            .or(`id.eq.${targetId},user_id.eq.${targetId},phone.eq.${targetId}`)
            .select('id');

          if (!updatedCust || updatedCust.length === 0) {
            await adminClient
              .from('customers')
              .upsert({
                id: targetId,
                user_id: targetId,
                fcm_token: fcmToken,
                name: 'Cliente Marketplace',
                updated_at: new Date().toISOString()
              });
          }
        }

        if (recentOrders.length > 0) {
          const { data: ords } = await adminClient.from('orders').select('customer_id, user_id').in('id', recentOrders);
          if (ords && ords.length > 0) {
            const custIds = [...new Set(ords.flatMap(o => [o.customer_id, o.user_id]).filter(Boolean))];
            if (custIds.length > 0) {
              await Promise.allSettled(
                custIds.map(cid => 
                  adminClient.from('customers').upsert({
                    id: cid,
                    fcm_token: fcmToken,
                    name: 'Cliente Marketplace',
                    updated_at: new Date().toISOString()
                  })
                )
              );
            }
          }
        }

        return new Response(JSON.stringify({ success: true, message: 'FCM token saved & upserted' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const record = payload.record || payload;
    const oldRecord = payload.old_record;
    const targetOrderId = record.orderId || record.order_id || record.id;
    const newStatus = payload.deliveryStatus || payload.status || record.status || record.deliveryStatus;

    // Se a chamada for um invoke manual vindo do frontend (sem o campo table preenchido),
    // ignoramos para evitar duplicidade com a trigger oficial do banco de dados (EXCETO para cancelamentos)
    if (!payload.table && newStatus !== 'cancelled') {
      console.log(`[notify-customer] Bloqueando chamada manual legada do frontend (sem tabela) para o pedido #${targetOrderId}`);
      return new Response(JSON.stringify({ success: true, message: 'Dropped legacy manual invocation' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Se a chamada for de outra tabela que não seja 'orders', ignoramos para evitar duplicidade.
    if (payload.table && payload.table !== 'orders') {
      console.log(`[notify-customer] Ignorando trigger da tabela '${payload.table}'. Apenas a tabela 'orders' envia notificações para o cliente.`);
      return new Response(JSON.stringify({ success: true, message: `Ignored table ${payload.table}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!targetOrderId) {
      return new Response(JSON.stringify({ error: 'No orderId or record found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ALLOWED_STATUSES = ['preparing', 'in_transit', 'in_route', 'delivering', 'delivered', 'completed', 'cancelled'];
    if (!ALLOWED_STATUSES.includes(newStatus)) {
      console.log(`[notify-customer] Status '${newStatus}' não está na lista de enviáveis. Ignorando push para o pedido #${targetOrderId}`);
      return new Response(JSON.stringify({ success: true, message: `Ignored status: ${newStatus}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (oldRecord && oldRecord.status === record.status) {
      console.log(`[notify-customer] Status do pedido #${targetOrderId} não mudou (${record.status}). Ignorando push duplicado.`);
      return new Response(JSON.stringify({ success: true, message: 'Status unchanged, ignoring' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Normalização de chave de status para deduplicação (ex: in_route / delivering -> in_transit)
    const normStatus = (newStatus === 'in_route' || newStatus === 'delivering') ? 'in_transit' : newStatus;
    
    if (isDuplicatePush(String(targetOrderId), normStatus)) {
      console.log(`[notify-customer] DEDUPLICAÇÃO ATIVA: Notificação do status '${normStatus}' para o pedido #${targetOrderId} já foi enviada recentemente. Dropando.`);
      return new Response(JSON.stringify({ success: true, message: `Deduplicated push for status ${normStatus}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const STATUS_RANK: Record<string, number> = {
      pending: 1,
      confirmed: 2,
      preparing: 3,
      ready: 4,
      accepted: 4,
      collecting: 4,
      in_transit: 5,
      in_route: 5,
      delivering: 5,
      delivered: 6,
      completed: 6,
      cancelled: 99
    };

    // Bloqueio de Notificação Retrocedida (Out-of-Order):
    if (targetOrderId && newStatus !== 'cancelled') {
      try {
        const cleanId = String(targetOrderId).replace('#', '').trim();
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId);
        if (isUUID) {
          const { data: dbOrder } = await adminClient.from('orders').select('status').eq('id', cleanId).maybeSingle();
          if (dbOrder && dbOrder.status) {
            const currentRank = STATUS_RANK[dbOrder.status] || 0;
            const incomingRank = STATUS_RANK[newStatus] || 0;
            if (incomingRank > 0 && currentRank > 0 && incomingRank < currentRank) {
              console.log(`[notify-customer] BLOQUEIO RETROCEDIDO: Notificação '${newStatus}' (rank ${incomingRank}) é menor que o status atual no banco '${dbOrder.status}' (rank ${currentRank}) do pedido #${cleanId}. Dropando.`);
              return new Response(JSON.stringify({ success: true, message: `Dropped backward status push (${newStatus} < ${dbOrder.status})` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }
        }
      } catch (errRank) {
        console.warn(`[notify-customer] Erro ao checar rank de status:`, errRank);
      }
    }

    if (newStatus === 'cancelled' && targetOrderId) {
      const cleanId = String(targetOrderId).replace('#', '').trim();
      console.log(`[notify-customer] FORÇANDO ATUALIZAÇÃO ADMIN DE CANCELAMENTO DO PEDIDO #${cleanId}`);
      try {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId);
        let actualOrderId = cleanId;
        if (!isUUID) {
          const { data: foundOrders } = await adminClient.from('orders').select('id').neq('status', 'cancelled');
          const matched = foundOrders?.find((o: any) => o.id.toLowerCase().endsWith(cleanId.toLowerCase()) || o.id.toLowerCase().startsWith(cleanId.toLowerCase()));
          if (matched) actualOrderId = matched.id;
        }

        // Validação de Autorização (Prevenção de IDOR):
        // Se a chamada veio de um cliente autenticado (e não de webhook do banco de dados), valida a titularidade
        if (authenticatedUserId && !payload.table) {
          const { data: targetOrder } = await adminClient
            .from('orders')
            .select('id, user_id, customer_id, company_id')
            .eq('id', actualOrderId)
            .maybeSingle();

          if (targetOrder) {
            let isStoreOwner = false;
            if (targetOrder.company_id) {
              const { data: storeOwner } = await adminClient
                .from('companies')
                .select('user_id')
                .eq('id', targetOrder.company_id)
                .maybeSingle();
              if (storeOwner?.user_id === authenticatedUserId) isStoreOwner = true;
            }

            const isOrderCustomer = targetOrder.user_id === authenticatedUserId || targetOrder.customer_id === authenticatedUserId;
            if (!isOrderCustomer && !isStoreOwner) {
              console.warn(`[notify-customer] IDOR BLOQUEADO: Usuário ${authenticatedUserId} tentou cancelar pedido ${actualOrderId}`);
              return new Response(JSON.stringify({ error: 'Acesso negado: Você não possui autorização para cancelar este pedido.' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        }

        await Promise.allSettled([
          adminClient.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', actualOrderId),
          adminClient.from('deliveries').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('order_id', actualOrderId),
        ]);

        // Notifica o lojista com role de admin
        try {
          let compId = payload.company_id;
          if (!compId) {
            const { data: ord } = await adminClient.from('orders').select('company_id').eq('id', actualOrderId).maybeSingle();
            compId = ord?.company_id;
          }
          if (compId) {
            const { data: comp } = await adminClient.from('companies').select('user_id').eq('id', compId).maybeSingle();
            if (comp?.user_id) {
              await adminClient.from('notifications').insert([{
                user_id: comp.user_id,
                title: 'Pedido Cancelado pelo Cliente',
                message: `O cliente cancelou o pedido #${cleanId.split('-')[0].toUpperCase()}.`,
                type: 'order_cancelled',
                created_at: new Date().toISOString(),
              }]);
            }
          }
        } catch (errNotif) {
          console.warn('[notify-customer] Erro ao notificar lojista:', errNotif);
        }
      } catch (errDb) {
        console.error(`[notify-customer] Erro ao atualizar banco para cancelado via adminClient:`, errDb);
      }
    }

    if (newStatus === 'preparing' && targetOrderId) {
      try {
        const cleanId = String(targetOrderId).replace('#', '').trim();
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId);
        let orderUuid = cleanId;
        if (!isUUID) {
          const { data: matched } = await adminClient.from('orders').select('id').ilike('id', `%${cleanId}%`).maybeSingle();
          if (matched) orderUuid = matched.id;
        }

        const { data: orderDetails } = await adminClient
          .from('orders')
          .select('id, company_id, customer_id, user_id')
          .eq('id', orderUuid)
          .maybeSingle();

        if (orderDetails?.company_id) {
          const { data: comp } = await adminClient
            .from('companies')
            .select('id, user_id, opening_hours')
            .eq('id', orderDetails.company_id)
            .maybeSingle();

          const hours = typeof comp?.opening_hours === 'string'
            ? JSON.parse(comp.opening_hours)
            : (comp?.opening_hours || {});

          if (hours.auto_message_enabled !== false) {
            const DEFAULT_MSG = "Olá! Pedido confirmado com sucesso! 🚀✨\nNossa equipe já iniciou o preparo com todo capricho e atenção aos detalhes.\n\nQualquer dúvida ou observação sobre seu pedido, estamos à sua disposição aqui pelo chat. Bom apetite! 🍽️🛵";
            const autoText = (typeof hours.auto_message === 'string' && hours.auto_message.trim())
              ? hours.auto_message.trim()
              : DEFAULT_MSG;

            const senderUserId = comp?.user_id || comp?.id;
            const targetCustomer = orderDetails.user_id || orderDetails.customer_id;

            let { data: conv } = await adminClient
              .from('conversations')
              .select('id')
              .eq('order_id', orderUuid)
              .maybeSingle();

            if (!conv) {
              const participants = Array.from(new Set([senderUserId, targetCustomer].filter(Boolean)));
              const { data: newConv } = await adminClient
                .from('conversations')
                .insert({
                  order_id: orderUuid,
                  participants: participants.length > 0 ? participants : [senderUserId],
                  topic: 'Suporte do Pedido'
                })
                .select()
                .maybeSingle();
              conv = newConv;
            }

            if (conv?.id) {
              const { data: existingMsgs } = await adminClient
                .from('messages')
                .select('id')
                .eq('conversation_id', conv.id)
                .limit(1);

              if (!existingMsgs || existingMsgs.length === 0) {
                await adminClient.from('messages').insert({
                  conversation_id: conv.id,
                  sender_id: senderUserId,
                  content: autoText
                });
                console.log(`[notify-customer] Mensagem automática da loja inserida no pedido #${orderUuid}`);
              }
            }
          }
        }
      } catch (errAuto) {
        console.warn('[notify-customer] Erro ao disparar mensagem automática da loja:', errAuto);
      }
    }

    const msg = statusMessages[newStatus];
    if (!msg) {
      return new Response(JSON.stringify({ message: `Status '${newStatus}' has no mapping, ignoring` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let customerId = payload.customer_id || record.customer_id;
    let userId = payload.user_id || record.user_id;

    if (targetOrderId) {
      const cleanId = String(targetOrderId).replace('#', '').trim();
      let orderData: any = null;

      try {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId);
        if (isUUID) {
          const { data: oData } = await adminClient
            .from('orders')
            .select('customer_id, user_id')
            .eq('id', cleanId)
            .maybeSingle();
          orderData = oData;
        }
      } catch {}

      if (!orderData) {
        try {
          const { data: listOrds } = await adminClient
            .from('orders')
            .select('id, customer_id, user_id')
            .order('created_at', { ascending: false })
            .limit(20);
          if (listOrds && listOrds.length > 0) {
            orderData = listOrds.find((o: any) => String(o.id).toLowerCase().includes(cleanId.toLowerCase()));
          }
        } catch {}
      }

      if (orderData) {
        if (!customerId) customerId = orderData.customer_id;
        if (!userId) userId = orderData.user_id;
      }
    }

    // Busca token FCM nas tabelas: customers, profiles e users
    let fcmToken: string | null = null;
    const targetIds = [...new Set([customerId, userId].filter(Boolean))] as string[];

    if (targetIds.length > 0) {
      const { data: custData } = await adminClient
        .from('customers')
        .select('fcm_token')
        .in('id', targetIds);
      if (custData && custData.length > 0) {
        const found = custData.find((c: any) => c.fcm_token);
        if (found) fcmToken = found.fcm_token;
      }

      if (!fcmToken) {
        const { data: custUserData } = await adminClient
          .from('customers')
          .select('fcm_token')
          .in('user_id', targetIds);
        if (custUserData && custUserData.length > 0) {
          const found = custUserData.find((c: any) => c.fcm_token);
          if (found) fcmToken = found.fcm_token;
        }
      }

      if (!fcmToken) {
        const { data: profData } = await adminClient
          .from('profiles')
          .select('fcm_token')
          .in('id', targetIds);
        if (profData && profData.length > 0) {
          const found = profData.find((p: any) => p.fcm_token);
          if (found) fcmToken = found.fcm_token;
        }
      }

      if (!fcmToken) {
        const { data: usrData } = await adminClient
          .from('users')
          .select('fcm_token')
          .in('id', targetIds);
        if (usrData && usrData.length > 0) {
          const found = usrData.find((u: any) => u.fcm_token);
          if (found) fcmToken = found.fcm_token;
        }
      }
    }

    if (!fcmToken) {
      console.log(`[notify-customer] Nenhum token FCM encontrado no sistema.`);
      if (newStatus === 'cancelled') {
        return new Response(JSON.stringify({ success: true, message: 'Order status updated to cancelled in DB' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ message: 'Customer does not have an FCM token' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let targetToken = fcmToken;
    if (/^[0-9a-fA-F]{64}$/.test(fcmToken.trim())) {
      console.log(`[notify-customer] Token APNs bruto detectado (${fcmToken.slice(0, 10)}...). Convertendo para FCM...`);
      try {
        const tokenObj = await (admin.app().options.credential as any)?.getAccessToken?.();
        const accessTok = tokenObj?.access_token;
        if (accessTok) {
          const candidateBundles = ["br.com.epraja.appFma", "br.com.epraja.lojista", "br.com.epraja.entregador"];
          for (const bId of candidateBundles) {
            for (const sandbox of [false, true]) {
              try {
                const res = await fetch("https://iid.googleapis.com/iid/v1:batchImport", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${accessTok}`,
                    "access_token_auth": "true",
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    application: bId,
                    sandbox: sandbox,
                    apns_tokens: [fcmToken.trim()]
                  })
                });
                const data = await res.json();
                const mapped = data?.results?.[0];
                if (mapped?.status === "OK" && mapped.registration_token) {
                  console.log(`[notify-customer] Token APNs convertido com sucesso para ${bId}:`, mapped.registration_token.slice(0, 15));
                  targetToken = mapped.registration_token;
                  break;
                }
              } catch (errConv) {
                console.warn(`[notify-customer] Erro ao converter token APNs para ${bId}:`, errConv);
              }
            }
            if (targetToken !== fcmToken) break;
          }
        }
      } catch (errAuth) {
        console.warn("[notify-customer] Erro ao obter access token para conversão APNs:", errAuth);
      }
    }

    const message = {
      data: {
        type: 'order_status',
        orderId: String(targetOrderId),
        status: String(newStatus),
        title: msg.title,
        body: msg.description,
        app: 'marketplace',
        bundleId: 'br.com.epraja.appFma'
      },
      notification: {
        title: msg.title,
        body: msg.description
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'marketplace_orders',
          priority: 'high' as const,
          visibility: 'public' as const
        }
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert"
        },
        payload: {
          aps: {
            alert: {
              title: msg.title,
              body: msg.description
            },
            sound: 'default',
            badge: 1,
            "content-available": 1,
            contentAvailable: true,
            "mutable-content": 1
          }
        }
      },
      token: targetToken
    };

    console.log(`[notify-customer] ENVIANDO PUSH PARA O PEDIDO #${targetOrderId} | token: ${targetToken} | status: ${newStatus}`);
    const response = await admin.messaging().send(message);
    console.log("[notify-customer] PUSH ENTREGUE PELO FIREBASE:", response);

    return new Response(JSON.stringify({ success: true, response }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error("[notify-customer] Erro ao enviar push para o cliente:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
