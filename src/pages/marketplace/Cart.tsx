import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { MediaImage } from '@/components/shared/MediaImage';
import { getPrimaryProductImage } from '@/lib/media';

export default function Cart() {
  const { items, company, updateQuantity, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <MarketplaceLayout>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground">Sua sacola está vazia</p>
          <p className="mt-1 text-sm text-muted-foreground">Adicione itens de uma loja para começar</p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate('/marketplace')}>
            Ver lojas
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout hideNav>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-foreground">Sacola</h1>
          {company && <p className="text-xs text-muted-foreground">{company.name}</p>}
        </div>
        <button onClick={clearCart} className="text-xs font-semibold text-primary">Limpar</button>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <div className="premium-card overflow-hidden rounded-[28px] divide-y divide-border">
          {items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                <MediaImage
                  src={getPrimaryProductImage(item.product)}
                  alt={item.product.name || 'Produto no carrinho'}
                  className="h-full w-full object-cover"
                  fallback={<div className="flex h-full w-full items-center justify-center text-muted-foreground"><ShoppingBag className="h-5 w-5" /></div>}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-medium text-foreground">{item.product.name}</h4>
                <p className="mt-0.5 text-sm font-bold text-foreground">
                  R$ {((item.product.price || 0) * item.quantity).toFixed(2).replace('.', ',')}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition-transform active:scale-90"
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  {item.quantity === 1 ? <Trash2 className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3" />}
                </button>
                <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90"
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="premium-card space-y-2 rounded-[28px] p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de entrega</span>
            <span className="text-xs text-muted-foreground">Calculada no checkout</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 safe-area-bottom">
        <div className="mx-auto max-w-lg">
          <Button
            className="h-12 w-full rounded-xl text-base font-bold"
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
