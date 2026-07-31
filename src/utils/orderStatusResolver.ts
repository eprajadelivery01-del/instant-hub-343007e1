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
 * Obrigatória em todas as telas:
 * - Meus Pedidos (Orders.tsx)
 * - Detalhes do Pedido (OrderDetail.tsx)
 * - Central de Notificações (ClientNotificationsPopover.tsx)
 * - Push Notifications (useOrderNotifications.ts)
 * - Histórico (Orders.tsx)
 */
export function getMarketplaceStatus(orderOrPayload: any): ComputedOrderStatus {
  let deliveryObj = null;

  // Extrai delivery relation seja de array ou objeto único
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

  // 2. 🚚 SE EXISTIR QUALQUER REGISTRO ATIVO NA TABELA deliveries -> "Saiu para entrega"
  if (deliveryStatus && !['cancelled'].includes(deliveryStatus)) {
    return {
      statusKey: 'delivering',
      label: 'Saiu para entrega',
      title: 'O entregador está a caminho com seu pedido!',
      isFinished: false,
      color: 'bg-primary animate-pulse',
      stepRank: 4,
    };
  }

  // 3. Fallbacks com base na tabela orders
  if (['delivering', 'in_route'].includes(orderStatus)) {
    return {
      statusKey: 'delivering',
      label: 'Saiu para entrega',
      title: 'O entregador está a caminho com seu pedido!',
      isFinished: false,
      color: 'bg-primary animate-pulse',
      stepRank: 4,
    };
  }

  if (orderStatus === 'ready') {
    return {
      statusKey: 'ready',
      label: 'Pedido pronto',
      title: 'Seu pedido está pronto para entrega!',
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
      title: 'O lojista confirmou o seu pedido',
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
