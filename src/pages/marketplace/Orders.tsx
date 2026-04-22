import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { ClipboardList, ChevronRight, Store } from 'lucide-react';

const statusLabels: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto para retirada',
  delivering: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning',
  confirmed: 'bg-primary',
  preparing: 'bg-primary',
  ready: 'bg-green-500',
  delivering: 'bg-primary animate-pulse',
  delivered: 'bg-green-500',
  cancelled: 'bg-destructive',
};

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      try {
        // 1. Busca o telefone do perfil atual para usar como backup
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        const phone = profile?.phone?.replace(/\D/g, "");

        // 2. Busca pedidos por ID ou por Telefone (Recuperação resiliente)
        let query = supabase
          .from('orders')
          .select('*, company:companies(*)');
        
        const filters = [`customer_id.eq.${user.id}`, `user_id.eq.${user.id}`];
        if (phone) filters.push(`customer_phone.eq.${phone}`);

        const { data, error } = await query.or(filters.join(',')).order('created_at', { ascending: false });
        
        if (error) throw error;
        console.log(`[Orders] Pedidos encontrados para ${user.id}:`, data?.length || 0);
        setOrders(data || []);
      } catch (error) {
        console.error("[Orders] Erro ao buscar pedidos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();

    const channel = supabase
      .channel('customer-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
      }, (payload) => {
        const nextOrder = payload.new as Partial<Order> & { id?: string; user_id?: string };
        const isMine = nextOrder.customer_id === user.id || nextOrder.user_id === user.id;
        if (!isMine) return;

        if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === nextOrder.id ? { ...o, ...nextOrder } : o));
        } else if (payload.eventType === 'INSERT') {
          fetchOrders();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!user) { navigate('/marketplace/login'); return null; }

  return (
    <MarketplaceLayout>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Meus pedidos</h1>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 h-[72px] animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-foreground">Nenhum pedido ainda</p>
            <p className="text-sm text-muted-foreground mt-0.5">Seus pedidos aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <Link key={order.id} to={`/marketplace/orders/${order.id}`}>
                <div className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-colors active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate">
                        {order.company?.name || 'Pedido'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${statusColors[order.status] || 'bg-muted-foreground'}`} />
                        <span className="text-xs text-muted-foreground">
                          {statusLabels[order.status] || order.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm text-foreground">
                        R$ {(order.total || 0).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
