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
 * REGRA ESTREITA E RIGOROSA DE STATUS PERMITIDOS:
 * 1. ✅ Pedido confirmado
 * 2. 👨‍🍳 Preparando seu pedido
 * 3. 📦 Seu pedido está pronto!
 * 4. 🚚 Saiu para entrega (Apenas após o lojista clicar em "Chamar Entregador")
 * 5. 🎉 Pedido entregue
 * 6. ❌ Pedido cancelado
 *
 * STATUS "pending" / "Aguardando confirmação" E NOTIFICAÇÃO DE "SOLICITADO" SÃO REMOVIDOS.
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
  const orderStatus = orderOrPayload?.status || orderOrPayload?.order?.status || 'confirmed';
  const deliveryRequested = orderOrPayload?.delivery_requested || orderOrPayload?.order?.delivery_requested;

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
  // APARECE QUANDO O ENTREGADOR ACEITAR A CORRIDA, TIVER MOTORISTA ATRIBUÍDO, ESTIVER EM ROTA OU CHAMADO PELO LOJISTA
  if (
    deliveryRequested ||
    ['delivering', 'in_route', 'in_transit'].includes(orderStatus) ||
    ['accepted', 'collecting', 'in_transit', 'in_route', 'delivering'].includes(deliveryStatus) ||
    Boolean(deliveryObj?.driver_id)
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

  // Mapeamento padrão (pending e confirmed são exibidos como Pedido confirmado)
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
