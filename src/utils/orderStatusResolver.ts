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
 * REGRA ESTREITA E RIGOROSA DE STATUS:
 * 1. Pedido confirmado
 * 2. Preparando seu pedido
 * 3. 📦 Seu pedido está pronto! (Seu pedido foi preparado e está aguardando a saída para entrega.)
 * 4. 🚚 Saiu para entrega (Apenas após o lojista clicar em "Chamar Entregador")
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
  // APARECE APENAS E TÃO SOMENTE APÓS O LOJISTA CLICAR EM "CHAMAR ENTREGADOR"
  // (orders.status === 'delivering' / 'in_route', ou deliveryRequested === true, ou delivery.status === 'in_route' / 'in_transit' / 'delivering')
  // IGNORA TOTALMENTE 'accepted', 'collecting', 'broadcasted', 'pending', 'draft' da tabela deliveries
  if (
    deliveryRequested ||
    ['delivering', 'in_route'].includes(orderStatus) ||
    ['in_route', 'in_transit', 'delivering'].includes(deliveryStatus)
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

  // 3. Status normais do pedido
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

  return {
    statusKey: 'pending',
    label: 'Aguardando confirmação',
    title: 'Seu pedido foi solicitado',
    description: 'Aguardando a loja aceitar seu pedido.',
    isFinished: false,
    color: 'bg-warning',
    stepRank: 0,
  };
}
