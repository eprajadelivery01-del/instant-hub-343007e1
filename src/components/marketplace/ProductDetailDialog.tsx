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
        className="max-h-[92vh] overflow-y-auto rounded-[32px] border-none bg-card p-0 shadow-2xl scrollbar-hide sm:max-w-xl sm:rounded-[40px]"
      >
        <div className="relative aspect-video flex-shrink-0 bg-secondary sm:aspect-square sm:h-80">
          {images.length > 0 ? (
            <>
              <MediaImage
                src={images[currentImageIndex]}
                alt={product.name || 'Produto'}
                className="h-full w-full object-cover transition-opacity duration-500"
                fallback={<div className="flex h-full w-full items-center justify-center opacity-10"><ShoppingBag className="h-20 w-20 text-foreground" /></div>}
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/20 text-primary-foreground backdrop-blur-md transition-all hover:bg-background/35"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/20 text-primary-foreground backdrop-blur-md transition-all hover:bg-background/35"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>

                  <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 focus:outline-none">
                    {images.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-300',
                          currentImageIndex === index ? 'w-6 bg-primary' : 'w-1.5 bg-primary-foreground/50'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-10">
              <ShoppingBag className="h-20 w-20 text-foreground" />
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-primary-foreground backdrop-blur-md transition-all hover:bg-background/35"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-8">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black tracking-tight text-foreground">{product.name}</h2>
              <span className="whitespace-nowrap text-xl font-black text-primary">
                R$ {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {product.category}
              </span>
              {images.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                  ● {images.length} {images.length === 1 ? 'foto' : 'fotos'}
                </span>
              )}
            </div>
            {product.description && (
              <p className="pt-2 text-sm font-medium italic leading-relaxed text-muted-foreground opacity-80">
                "{product.description}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-secondary p-1">
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-sm transition-transform disabled:opacity-30 active:scale-90"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="w-8 text-center text-lg font-black">{quantity}</span>
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-sm transition-transform active:scale-90"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <Button onClick={handleAdd} className="h-14 flex-1 rounded-2xl text-xs font-black uppercase tracking-widest">
              Adicionar • R$ {(Number(product.price || 0) * quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
