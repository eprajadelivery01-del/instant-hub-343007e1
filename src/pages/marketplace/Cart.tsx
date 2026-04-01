import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

export default function Cart() {
  const { items, company, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <MarketplaceLayout>
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Carrinho vazio</p>
          <p className="text-sm">Adicione itens de uma loja</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/marketplace')}>
            Ver lojas
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Carrinho</h1>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
            Limpar
          </Button>
        </div>

        {company && (
          <p className="text-sm text-muted-foreground">Pedido de <span className="font-medium text-foreground">{company.name}</span></p>
        )}

        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.product.id} className="p-4 flex items-center gap-4">
              {item.product.image_url && (
                <img src={item.product.image_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{item.product.name}</h4>
                <p className="text-primary font-bold text-sm">
                  R$ {((item.product.price || 0) * item.quantity).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-medium w-6 text-center">{item.quantity}</span>
                <Button size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.product.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Totals */}
        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de entrega</span>
            <span className="text-muted-foreground">Calculada no checkout</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total estimado</span>
            <span className="text-primary">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
        </Card>

        <Button className="w-full" size="lg" onClick={() => {
          if (!user) {
            navigate('/marketplace/login');
            return;
          }
          navigate('/marketplace/checkout');
        }}>
          Finalizar pedido
        </Button>
      </div>
    </MarketplaceLayout>
  );
}
