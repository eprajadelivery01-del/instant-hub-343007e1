import { Product } from '@/types/database';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingBag, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { MediaImage } from '@/components/shared/MediaImage';
import { getProductImageUrls } from '@/lib/media';

interface ProductDetailDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  initialQuantity?: number;
  isClosed?: boolean;
}

export function ProductDetailDialog({ product, isOpen, onClose, onAddToCart, initialQuantity = 0 }: ProductDetailDialogProps) {
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setQuantity(initialQuantity || 1);
    setCurrentImageIndex(0);
  }, [initialQuantity, product?.id, isOpen]);

  if (!product) return null;

  const images = getProductImageUrls(product);

  const handleAdd = () => {
    onAddToCart(product, quantity);
    onClose();
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-h-[92vh] max-w-lg overflow-y-auto rounded-t-[32px] border-none bg-card p-0 shadow-2xl scrollbar-hide sm:rounded-[32px] sm:max-h-[85vh] [&>button]:hidden"
      >
        <div className="relative h-64 sm:h-72 w-full flex-shrink-0 bg-secondary/30">
          {images.length > 0 ? (
            <>
              <MediaImage
                src={images[currentImageIndex]}
                alt={product.name || 'Produto'}
                className="h-full w-full object-cover transition-opacity duration-500"
                fallback={<div className="flex h-full w-full items-center justify-center opacity-10"><ShoppingBag className="h-20 w-20 text-foreground" /></div>}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent pointer-events-none" />

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/50"
                  >
                    <ChevronLeft className="h-6 w-6 stroke-[3]" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/50"
                  >
                    <ChevronRight className="h-6 w-6 stroke-[3]" />
                  </button>

                  <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 focus:outline-none">
                    {images.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-300',
                          currentImageIndex === index ? 'w-6 bg-white shadow-sm' : 'w-1.5 bg-white/50'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-20">
              <ShoppingBag className="h-16 w-16 text-foreground" />
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xl transition-transform hover:scale-105 active:scale-95 shadow-sm z-50"
          >
            <X className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tight text-foreground leading-tight mb-2 pr-4">{product.name}</h2>
            
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                {product.category}
              </span>
              {images.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <div className="h-1 w-1 bg-muted-foreground rounded-full" /> {images.length} {images.length === 1 ? 'foto' : 'fotos'}
                </span>
              )}
            </div>

            <p className="text-xl font-black text-foreground mb-4">
              {Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>

            {product.description && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mt-auto">
            <div className="flex h-[56px] items-center gap-3 rounded-2xl bg-secondary/80 px-2 border border-border/50">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-background text-foreground shadow-sm transition-transform disabled:opacity-30 disabled:scale-100 active:scale-90"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4 stroke-[3]" />
              </button>
              <span className="w-6 text-center text-[17px] font-extrabold text-foreground">{quantity}</span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-background text-foreground shadow-sm transition-transform active:scale-90"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4 stroke-[3]" />
              </button>
            </div>

            <Button 
              onClick={handleAdd} 
              disabled={isClosed}
              className={cn(
                "h-[56px] flex-1 rounded-2xl text-[13px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]",
                isClosed 
                  ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none" 
                  : "shadow-primary/25 hover:shadow-primary/40"
              )}
            >
              {isClosed ? "Loja Fechada" : `Adicionar • ${(Number(product.price || 0) * quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
