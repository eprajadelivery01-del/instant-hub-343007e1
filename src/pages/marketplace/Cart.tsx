import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function Cart() {
  const { items, company, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <MarketplaceLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground">Sua sacola está vazia</p>
          <p className="text-sm text-muted-foreground mt-1 text-center">Adicione itens de um restaurante para começar</p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate('/marketplace')}>
            Ver restaurantes
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout hideNav>
      {/* Header */}
      <div className="bg-card sticky top-0 z-30 border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-foreground">Sacola</h1>
          {company && <p className="text-xs text-muted-foreground">{company.name}</p>}
        </div>
        <button onClick={clearCart} className="text-xs text-primary font-semibold">Limpar</button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Items */}
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm divide-y divide-border">
          {items.map(item => (
            <div key={item.product.id} className="p-4 flex items-center gap-3">
              {item.product.image_url && (
                <img src={item.product.image_url} alt="" className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm truncate">{item.product.name}</h4>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  R$ {((item.product.price || 0) * item.quantity).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="h-7 w-7 rounded-full border border-border flex items-center justify-center active:scale-90 transition-transform"
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  {item.quantity === 1 ? <Trash2 className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3" />}
                </button>
                <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                <button
                  className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-card rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de entrega</span>
            <span className="text-muted-foreground text-xs">Calculada no checkout</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
            <span>Total</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-bottom">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-12 rounded-xl text-base font-bold"
            onClick={() => {
              if (!user) {
                navigate('/marketplace/login');
                return;
              }
              navigate('/marketplace/checkout');
            }}
          >
            Continuar • R$ {subtotal.toFixed(2).replace('.', ',')}
          </Button>
        </div>
      </div>
    </MarketplaceLayout>
  );
}
