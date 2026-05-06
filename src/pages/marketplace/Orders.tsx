import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { ClipboardList, ChevronRight, Store, Search, Receipt, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import OrderSummaryDialog from '@/components/marketplace/OrderSummaryDialog';

const statusLabels: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto para retirada',
  delivering: 'Saiu para entrega',
  in_route: 'Saiu para entrega',
  in_transit: 'Saiu para entrega',
  delivered: 'Entregue',
  completed: 'Entregue',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning',
  confirmed: 'bg-primary',
  preparing: 'bg-primary',
  ready: 'bg-green-500',
  delivering: 'bg-primary animate-pulse',
  in_route: 'bg-primary animate-pulse',
  in_transit: 'bg-primary animate-pulse',
  delivered: 'bg-green-500',
  completed: 'bg-green-500',
  cancelled: 'bg-destructive',
};

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [summaryOrderId, setSummaryOrderId] = useState<string | null>(null);
  const PAGE_SIZE = 8;

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, company:companies(*)')
          .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

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

    // Realtime: escuta inserts e updates dos pedidos do cliente
    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const nextOrder = (payload.new || payload.old) as
            | (Partial<Order> & { id?: string; user_id?: string })
            | undefined;
          if (!nextOrder) return;
          const isMine =
            nextOrder.customer_id === user.id || nextOrder.user_id === user.id;
          if (!isMine) return;

          if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === nextOrder.id ? { ...o, ...(payload.new as Order) } : o,
              ),
            );
          } else {
            // INSERT ou DELETE: refazer fetch para manter ordem e relations
            fetchOrders();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const name = o.company?.name?.toLowerCase() || '';
      const status = (statusLabels[o.status] || o.status || '').toLowerCase();
      const idShort = o.id.slice(0, 8).toLowerCase();
      return name.includes(q) || status.includes(q) || idShort.includes(q);
    });
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (!user) { navigate('/marketplace/login'); return null; }

  return (
    <MarketplaceLayout>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Meus pedidos</h1>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por loja, status ou ID..."
            className="pl-9 rounded-xl h-10"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 h-[72px] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-foreground">
              {search ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {search ? 'Tente outro termo de busca' : 'Seus pedidos aparecerão aqui'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginated.map((order) => (
                <div
                  key={order.id}
                  className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Link
                      to={`/marketplace/orders/${order.id}`}
                      className="flex-1 min-w-0"
                    >
                      <h4 className="font-medium text-sm text-foreground truncate">
                        {order.company?.name || 'Pedido'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            statusColors[order.status] || 'bg-muted-foreground'
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {statusLabels[order.status] || order.status}
                        </span>
                      </div>
                    </Link>
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
                  <div className="mt-3 pt-3 border-t border-border flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs ml-auto"
                      onClick={() => setSummaryOrderId(order.id)}
                    >
                      <Receipt className="h-3.5 w-3.5 mr-1.5" />
                      Ver resumo
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <OrderSummaryDialog
        orderId={summaryOrderId}
        open={!!summaryOrderId}
        onOpenChange={(o) => !o && setSummaryOrderId(null)}
      />
    </MarketplaceLayout>
  );
}
