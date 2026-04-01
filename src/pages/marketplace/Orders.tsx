import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList } from 'lucide-react';

const statusLabels: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivering: 'Em entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  preparing: 'bg-primary/10 text-primary border-primary/20',
  ready: 'bg-success/10 text-success border-success/20',
  delivering: 'bg-primary/10 text-primary border-primary/20',
  delivered: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, company:companies(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();

    // Realtime updates
    const channel = supabase
      .channel('customer-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
        } else if (payload.eventType === 'INSERT') {
          fetchOrders();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <MarketplaceLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Meus pedidos</h1>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nenhum pedido ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Link key={order.id} to={`/marketplace/orders/${order.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">
                      {order.company?.name || 'Pedido'}
                    </h4>
                    <Badge className={`${statusColors[order.status] || ''} border`}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                    <span className="font-semibold text-foreground">
                      R$ {(order.total || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
