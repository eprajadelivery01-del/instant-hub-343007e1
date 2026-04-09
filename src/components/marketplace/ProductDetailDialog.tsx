import { Product } from "@/types/database";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingBag, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

  if (!product) return null;

  const images = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls 
    : product.image_url ? [product.image_url] : [];

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
      <DialogContent className="sm:max-w-xl p-0 overflow-y-auto max-h-[92vh] bg-white rounded-[32px] sm:rounded-[40px] border-none shadow-2xl scrollbar-hide">
        <div className="relative aspect-video sm:aspect-square sm:h-80 bg-slate-100 flex-shrink-0">
           {images.length > 0 ? (
             <>
               <img 
                 src={images[currentImageIndex]} 
                 alt={product.name || ""} 
                 className="w-full h-full object-cover transition-opacity duration-500"
               />
               
               {images.length > 1 && (
                 <>
                   <button 
                     onClick={prevImage}
                     className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-primary transition-all shadow-lg"
                   >
                     <ChevronLeft className="h-6 w-6" />
                   </button>
                   <button 
                     onClick={nextImage}
                     className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-primary transition-all shadow-lg"
                   >
                     <ChevronRight className="h-6 w-6" />
                   </button>
                   
                   {/* Thumbnail dots */}
                   <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5 focus:outline-none">
                      {images.map((_, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            currentImageIndex === i ? "w-6 bg-primary" : "w-1.5 bg-white/50"
                          )} 
                        />
                      ))}
                   </div>
                 </>
               )}
             </>
           ) : (
             <div className="w-full h-full flex items-center justify-center opacity-10">
                <ShoppingBag className="h-20 w-20 text-slate-800" />
             </div>
           )}
           
           <button 
             onClick={onClose}
             className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-primary transition-all"
           >
              <X className="h-5 w-5" />
           </button>
        </div>

        <div className="p-8 space-y-6">
           <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">{product.name}</h2>
                 <span className="text-xl font-black text-primary whitespace-nowrap">
                   R$ {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-slate-100 px-3 py-1 rounded-full">
                    {product.category}
                 </span>
                 {images.length > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                       ● {images.length} {images.length === 1 ? "foto" : "fotos"}
                    </span>
                 )}
              </div>
              {product.description && (
                 <p className="text-sm text-muted-foreground leading-relaxed font-medium opacity-80 pt-2 italic">
                    "{product.description}"
                 </p>
              )}
           </div>

           <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-4 border border-slate-100">
                <button
                  type="button"
                  className="h-12 w-12 rounded-xl bg-white text-muted-foreground flex items-center justify-center shadow-sm disabled:opacity-30 active:scale-90 transition-transform"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="font-black text-lg w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  className="h-12 w-12 rounded-xl bg-white text-muted-foreground flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <Button
                onClick={handleAdd}
                className="flex-1 h-14 rounded-2xl bg-primary hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all"
              >
                Adicionar • R$ {(Number(product.price || 0) * quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Button>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
