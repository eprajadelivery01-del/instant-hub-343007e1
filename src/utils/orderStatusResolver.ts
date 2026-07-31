export interface ComputedOrderStatus {
  statusKey: string;
  label: string;
  title: string;
  isFinished: boolean;
  color: string;
  stepRank: number; // 0 to 5 for progress bar
}

/**
 * FUNÇÃO ÚNICA E CENTRALIZADA DE RESOLUÇÃO DE STATUS DO MARKETPLACE
 * REGRA EXPLICITA:
 * IGNORA COMPLETAMENTE: 'accepted', 'collecting', 'broadcasted', 'pending', 'draft' da tabela deliveries.
 * O cliente vê APENAS:
 * 1. Pedido confirmado
 * 2. Preparando seu pedido
 * 3. Pedido pronto
 * 4. Saiu para entrega (apenas se orders.status in ('delivering', 'in_route') ou delivery_requested || delivery.status in ('in_route', 'in_transit', 'delivering'))
 * 5. Pedido entregue
 */
export function getMarketplaceStatus(orderOrPayload: any): ComputedOrderStatus {
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

  // 1. Pedido Entregue / Concluído / Cancelado -> Histórico
  if (
    ['delivered', 'completed'].includes(deliveryStatus) ||
    ['delivered', 'completed', 'cancelled'].includes(orderStatus)
  ) {
    if (orderStatus === 'cancelled') {
      return {
        statusKey: 'cancelled',
        label: 'Pedido cancelado',
        title: 'Pedido Cancelado',
        isFinished: true,
        color: 'bg-destructive',
        stepRank: 0,
      };
    }
    return {
      statusKey: 'delivered',
      label: 'Pedido entregue',
      title: 'Seu pedido foi entregue',
      isFinished: true,
      color: 'bg-green-500',
      stepRank: 5,
    };
  }

  // 2. 🚚 SAIU PARA ENTREGA:
  // Apenas se a loja/sistema colocar orders.status = 'delivering' / 'in_route',
  // ou se delivery_requested for verdadeiro,
  // ou se a corrida estiver de fato em trânsito ('in_route', 'in_transit', 'delivering')
  // IGNORA 'accepted', 'collecting', 'broadcasted', 'pending', 'draft'
  if (
    deliveryRequested ||
    ['delivering', 'in_route'].includes(orderStatus) ||
    ['in_route', 'in_transit', 'delivering'].includes(deliveryStatus)
  ) {
    return {
      statusKey: 'delivering',
      label: 'Saiu para entrega',
      title: 'Saiu para entrega',
      isFinished: false,
      color: 'bg-primary animate-pulse',
      stepRank: 4,
    };
  }

  // 3. Status normais da loja
  if (orderStatus === 'ready') {
    return {
      statusKey: 'ready',
      label: 'Pedido pronto',
      title: 'Seu pedido está pronto',
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
      isFinished: false,
      color: 'bg-primary',
      stepRank: 1,
    };
  }

  return {
    statusKey: 'pending',
    label: 'Aguardando confirmação',
    title: 'Seu pedido foi solicitado',
    isFinished: false,
    color: 'bg-warning',
    stepRank: 0,
  };
}
