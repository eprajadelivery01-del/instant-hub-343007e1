import { Product } from '@/types/database';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, X, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { MediaImage } from '@/components/shared/MediaImage';
import { getProductImageUrls } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProductDetailDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, options?: any[], note?: string) => void;
  initialQuantity?: number;
  isClosed?: boolean;
}

interface Group {
  id: string;
  name: string;
  min_options: number;
  max_options: number;
  required: boolean;
}

interface Option {
  id: string;
  group_id: string;
  name: string;
  price: number;
}

export function ProductDetailDialog({ product, isOpen, onClose, onAddToCart, initialQuantity = 0, isClosed }: ProductDetailDialogProps) {
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    setQuantity(initialQuantity || 1);
    setCurrentImageIndex(0);
    setSelectedOptions({});
    setNote('');
    
    if (product?.id && isOpen) {
      fetchOptions(product.id);
    }
  }, [initialQuantity, product?.id, isOpen]);

  const fetchOptions = async (productId: string) => {
    setLoadingOptions(true);
    try {
      const { data: groupsData } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', productId)
        .order('created_at');

      if (groupsData && groupsData.length > 0) {
        setGroups(groupsData);
        const { data: optionsData } = await supabase
          .from('product_options')
          .select('*')
          .in('group_id', groupsData.map(g => g.id))
          .eq('is_active', true)
          .order('created_at');
        
        setOptions(optionsData || []);
      } else {
        setGroups([]);
        setOptions([]);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  if (!product) return null;

  const images = getProductImageUrls(product);

  const toggleOption = (groupId: string, optionId: string, max: number) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) };
      }
      if (current.length < max) {
        return { ...prev, [groupId]: [...current, optionId] };
      }
      if (max === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      return prev;
    });
  };

  const calculateTotalPrice = () => {
    let total = Number(product.price || 0);
    Object.values(selectedOptions).flat().forEach(optId => {
      const opt = options.find(o => o.id === optId);
      if (opt) total += Number(opt.price || 0);
    });
    return total * quantity;
  };

  const handleAdd = () => {
    // Check required groups
    const missing = groups.find(g => g.required && (selectedOptions[g.id]?.length || 0) < g.min_options);
    if (missing) {
      toast.error(`Escolha pelo menãos ${missing.min_options} em ${missing.name}`);
      return;
    }

    const flatOptions = Object.values(selectedOptions).flat().map(id => options.find(o => o.id === id)).filter(Boolean);
    onAddToCart(product, quantity, flatOptions, note);
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
        className="max-h-[95vh] max-w-lg overflow-y-auto rounded-t-[32px] border-none bg-background p-0 shadow-2xl scrollbar-hide sm:rounded-[32px] sm:max-h-[90vh] [&>button]:hidden z-[100]"
      >
        <div className="relative w-full overflow-hidden">
          {/* Header Image */}
          <div className="relative aspect-[4/3] w-full bg-secondary/20">
            {images.length > 0 ? (
              <>
                <MediaImage
                  src={images[currentImageIndex]}
                  alt={product.name || 'Produto'}
                  className="h-full w-full object-cover"
                  fallback={<div className="flex h-full w-full items-center justify-center opacity-10">🍛</div>}
                />
                
                {images.length > 1 && (
                  <div className="absolute inset-y-0 flex w-full items-center justify-between px-4 pointer-events-none">
                    <button onClick={prevImage} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-all hover:bg-black/40">
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button onClick={nextImage} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-all hover:bg-black/40">
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-4xl">🍛</div>
            )}
            
            <button
              onClick={onClose}
              className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg transition-transform active:scale-90 z-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-6">
            <DialogTitle className="text-2xl font-bold text-foreground leading-tight">{product.name}</DialogTitle>
            <DialogDescription className="sr-only">{product.description || 'Escolha as opções e obserávações para adicionar à sacola.'}</DialogDescription>
            {product.description && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            )}
            <p className="mt-4 text-xl font-bold text-foreground">
              {Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>

            <div className="mt-6 flex flex-col gap-6">
              {/* Option Groups */}
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col">
                  <div className="bg-secondary/40 -mx-6 px-6 py-3 mb-2 border-y border-border/40">
                    <h3 className="text-sm font-bold text-foreground tracking-tight">{group.name}</h3>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {group.max_options === 1 ? 'Escolha 1 opção' : `Escolha até ${group.max_options} opções`}
                    </p>
                  </div>

                  <div className="divide-y divide-border/40">
                    {options.filter(o => o.group_id === group.id).map((opt) => {
                      const active = selectedOptions[group.id]?.includes(opt.id);
                      return (
                        <div 
                          key={opt.id} 
                          onClick={() => toggleOption(group.id, opt.id, group.max_options)}
                          className="flex items-center justify-between py-4 cursor-pointer active:opacity-70 transition-all"
                        >
                          <div className="flex flex-col pr-4">
                            <span className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>{opt.name}</span>
                            {opt.price > 0 && (
                              <span className="text-xs text-muted-foreground">+ {opt.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            )}
                          </div>
                          <div className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all",
                            active ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground/30"
                          )}>
                            {active ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Obserávation Section */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">Alguma observação?</span>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{note.length}/140</span>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 140))}
                  placeholder="Ex: tirar a cebola, maionese à parte etc."
                  className="w-full min-h-[80px] p-4 rounded-xl bg-secondary/30 border border-border/40 focus:border-primary/40 focus:outline-none text-sm font-medium resize-none placeholder:text-muted-foreground/40"
                />
              </div>

              <button className="text-sm font-bold text-destructive/80 text-left pt-2">
                Denunciar item
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-50 mt-auto flex items-center gap-4 bg-background px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t border-border/40">
          <div className="flex items-center gap-4 text-foreground">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50 disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-base font-bold min-w-[12px] text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50"
            >
              <Plus className="h-4 w-4 text-primary" />
            </button>
          </div>

          <Button
            className={cn(
              "flex-1 rounded-2xl h-14 bg-primary text-primary-foreground font-semibold flex items-center justify-between px-6 hover:bg-primary/90 transition-colors",
              isClosed && "opacity-50 cursor-not-allowed grayscale"
            )}
            onClick={handleAdd}
            disabled={isClosed}
          >
            <span className="text-[15px] font-bold">Adicionar</span>
            <span className="text-[15px] font-bold">
              {calculateTotalPrice().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
