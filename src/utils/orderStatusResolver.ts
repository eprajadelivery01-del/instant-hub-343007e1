export interface ComputedOrderStatus {
  statusKey: string;
  label: string;
  title: string;
  description: string;
  isFinished: boolean;
  color: string;
  stepRank: number; // 0 to 5 for progress bar
}

/**
 * FUNÇÃO ÚNICA E CENTRALIZADA DE RESOLUÇÃO DE STATUS DO MARKETPLACE
 * REGRA ESTREITA E RIGOROSA DE STATUS COMERCIAIS:
 * 1. ✅ Pedido confirmado
 * 2. 👨‍🍳 Preparando seu pedido
 * 3. 📦 Seu pedido está pronto!
 * 4. 🚚 Saiu para entrega (Apenas após o lojista liberar / chamar entregador ou entrega entrar em trânsito)
 * 5. 🎉 Pedido entregue
 * 6. ❌ Pedido cancelado
 *
 * REGRA INVIOLÁVEL: Estados operacionais internos de `deliveries` como
 * `accepted`, `collecting`, `broadcasted` ou `pending`, e a presença de `driver_id`
 * pertencem estritamente à logística interna e NUNCA antecipam "Saiu para entrega" para o cliente.
 */
export function getMarketplaceStatus(orderOrPayload: any): ComputedOrderStatus {
  const orderId = orderOrPayload?.id || orderOrPayload?.order?.id;

  // 0. Verifica se o pedido foi cancelado pelo cliente localmente
  if (orderId) {
    try {
      const localCancelled: string[] = JSON.parse(localStorage.getItem('@epraja_cancelled_orders') || '[]');
      if (localCancelled.includes(orderId)) {
        return {
          statusKey: 'cancelled',
          label: 'Pedido cancelado',
          title: 'Pedido Cancelado',
          description: 'Seu pedido foi cancelado.',
          isFinished: true,
          color: 'bg-destructive',
          stepRank: 0,
        };
      }
    } catch {}
  }

  let deliveryObj = null;

  if (Array.isArray(orderOrPayload?.deliveries) && orderOrPayload.deliveries.length > 0) {
    const sorted = [...orderOrPayload.deliveries].sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
    deliveryObj = sorted[0];
  } else if (orderOrPayload?.delivery) {
    deliveryObj = orderOrPayload.delivery;
  } else {
    deliveryObj = orderOrPayload?.deliveries;
  }

  const deliveryStatus = deliveryObj?.status;
  const orderStatus = orderOrPayload?.status || orderOrPayload?.order?.status || 'pending';
  const deliveryRequested = orderOrPayload?.delivery_requested || orderOrPayload?.order?.delivery_requested;
  const marketplaceStatus = orderOrPayload?.marketplace_status || orderOrPayload?.order?.marketplace_status;

  // 1. Pedido Entregue / Concluído / Cancelado -> Histórico
  if (
    ['delivered', 'completed'].includes(deliveryStatus) ||
    ['delivered', 'completed', 'cancelled'].includes(orderStatus)
  ) {
    if (orderStatus === 'cancelled' || deliveryStatus === 'cancelled') {
      return {
        statusKey: 'cancelled',
        label: 'Pedido cancelado',
        title: 'Pedido Cancelado',
        description: 'Seu pedido foi cancelado.',
        isFinished: true,
        color: 'bg-destructive',
        stepRank: 0,
      };
    }
    return {
      statusKey: 'delivered',
      label: 'Pedido entregue',
      title: 'Seu pedido foi entregue',
      description: 'Seu pedido foi entregue com sucesso. Bom apetite!',
      isFinished: true,
      color: 'bg-green-500',
      stepRank: 5,
    };
  }

  // 2. 🚚 SAIU PARA ENTREGA:
  // APARECE EXCLUSIVAMENTE QUANDO:
  // - O pedido estiver oficialmente em rota/delivering (orders.status in ('delivering', 'in_route', 'in_transit') ou marketplace_status === 'out_for_delivery')
  // - OU o lojista tiver acionado "Chamar Entregador" / liberado o pedido (delivery_requested === true)
  // - OU a entrega estiver de fato em rota com o entregador (deliveries.status in ('in_transit', 'in_route', 'delivering'))
  // REGRA INVIOLÁVEL: Estados internos como 'accepted', 'collecting', 'broadcasted', 'pending' ou a presença de 'driver_id'
  // NUNCA alteram o status para 'delivering' enquanto o pedido não for liberado/iniciado para entrega.
  if (
    deliveryRequested ||
    marketplaceStatus === 'out_for_delivery' ||
    ['delivering', 'in_route', 'in_transit', 'out_for_delivery'].includes(orderStatus) ||
    ['in_transit', 'in_route', 'delivering'].includes(deliveryStatus)
  ) {
    return {
      statusKey: 'delivering',
      label: 'Saiu para entrega',
      title: '🚚 Saiu para entrega!',
      description: 'Seu pedido saiu para entrega e está a caminho.',
      isFinished: false,
      color: 'bg-primary animate-pulse',
      stepRank: 4,
    };
  }

  // 3. Status permitidos do pedido
  if (orderStatus === 'ready') {
    return {
      statusKey: 'ready',
      label: 'Pedido pronto',
      title: '📦 Seu pedido está pronto!',
      description: 'Seu pedido foi preparado e está aguardando a saída para entrega.',
      isFinished: false,
      color: 'bg-green-500',
      stepRank: 3,
    };
  }

  if (orderStatus === 'preparing') {
    return {
      statusKey: 'preparing',
      label: 'Preparando seu pedido',
      title: 'Seu pedido está sendo preparado',
      description: 'A loja começou a preparar o seu pedido.',
      isFinished: false,
      color: 'bg-primary',
      stepRank: 2,
    };
  }

  if (orderStatus === 'confirmed') {
    return {
      statusKey: 'confirmed',
      label: 'Pedido confirmado',
      title: 'Pedido confirmado',
      description: 'A loja confirmou o seu pedido.',
      isFinished: false,
      color: 'bg-primary',
      stepRank: 1,
    };
  }

  // Mapeamento padrão para pedidos novos pendentes de aceite do lojista
  return {
    statusKey: 'pending',
    label: 'Aguardando confirmação',
    title: 'Aguardando a loja aceitar',
    description: 'Seu pedido foi recebido e está aguardando a confirmação do restaurante.',
    isFinished: false,
    color: 'bg-amber-500',
    stepRank: 0,
  };
}
