import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderItem } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, CreditCard, StickyNote, Receipt, Package } from 'lucide-react';

interface Props {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  money: 'Dinheiro',
  credit: 'Cartão de crédito',
  debit: 'Cartão de débito',
  card: 'Cartão',
  card_machine: 'Cartão na entrega',
  online: 'Pagamento online',
};

export default function OrderSummaryDialog({ orderId, open, onOpenChange }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId || !open) return;
    setLoading(true);
    (async () => {
      try {
        const [orderRes, itemsRes] = await Promise.all([
          supabase
            .from('orders')
            .select('*, company:companies(*)')
            .eq('id', orderId)
            .single(),
          supabase.from('order_items').select('*').eq('order_id', orderId),
        ]);
        setOrder(orderRes.data as Order);
        setItems((itemsRes.data as OrderItem[]) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, open]);

  const subtotal = items.reduce(
    (acc, it) => acc + (it.price || 0) * (it.quantity || 0),
    0,
  );
  const deliveryFee = order?.delivery_fee || 0;
  const total = order?.total || subtotal + deliveryFee;
  const paymentLabel = order?.payment_method
    ? paymentLabels[order.payment_method] || order.payment_method
    : 'Não informado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Resumo do pedido
          </DialogTitle>
        </DialogHeader>

        {loading || !order ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-secondary rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Loja */}
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Package className="h-4 w-4 text-muted-foreground" />
              {order.company?.name || 'Loja'}
            </div>

            {/* Itens */}
            <div className="bg-secondary/40 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Itens ({items.length})
              </p>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem itens.</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span className="text-foreground">
                      {item.quantity}x {item.product_name || 'Produto'}
                    </span>
                    <span className="text-foreground shrink-0">
                      R${' '}
                      {((item.price || 0) * item.quantity)
                        .toFixed(2)
                        .replace('.', ',')}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Endereço */}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Endereço de entrega
                </p>
                <p className="text-foreground mt-0.5">
                  {order.delivery_address || 'Endereço não informado'}
                </p>
              </div>
            </div>

            {/* Pagamento */}
            <div className="flex items-start gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Forma de pagamento
                </p>
                <p className="text-foreground mt-0.5">{paymentLabel}</p>
              </div>
            </div>

            {/* Observações */}
            {order.notes && (
              <div className="flex items-start gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Observações
                  </p>
                  <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                    {order.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Totais */}
            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa de entrega</span>
                <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1">
                <span className="text-foreground">Total</span>
                <span className="text-primary">
                  R$ {total.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
