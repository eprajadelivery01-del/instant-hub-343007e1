import { Product } from '@/types/database';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingBag, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { MediaImage } from '@/components/shared/MediaImage';
import { getProductImageUrls } from '@/lib/media';
import { supabase } from '@/lib/supabase';

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
      import('sonner').then(({ toast }) => toast.error(`Escolha pelo menos ${missing.min_options} em ${missing.name}`));
      return;
    }

    const flatOptions = Object.values(selectedOptions).flat().map(id => options.find(o => o.id === id));
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
        className="max-h-[92vh] max-w-lg overflow-y-auto rounded-t-[32px] border-none bg-card p-0 shadow-2xl scrollbar-hide sm:rounded-[32px] sm:max-h-[85vh] [&>button]:hidden z-[100]"
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
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-tight text-foreground leading-tight mb-2 pr-4">{product.name}</h2>
            
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                {product.category}
              </span>
              <p className="text-xl font-black text-foreground">
                {Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

            {product.description && (
              <p className="text-[14px] leading-relaxed text-muted-foreground mb-6">
                {product.description}
              </p>
            )}
          </div>

          {/* Options Groups */}
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-secondary/30 p-4 rounded-2xl mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[15px] font-black text-foreground uppercase tracking-tight">{group.name}</h3>
                    {group.required && (
                      <span className="bg-foreground text-background text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Obrigatório</span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {group.max_options === 1 ? 'Escolha 1 opção' : `Escolha até ${group.max_options} opções`}
                  </p>
                </div>

                <div className="space-y-2">
                  {options.filter(o => o.group_id === group.id).map((opt) => {
                    const active = selectedOptions[group.id]?.includes(opt.id);
                    return (
                      <div 
                        key={opt.id} 
                        onClick={() => toggleOption(group.id, opt.id, group.max_options)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer active:scale-[0.98]",
                          active ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/20 hover:bg-muted/40"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-bold", active ? "text-primary" : "text-foreground")}>{opt.name}</span>
                          {opt.price > 0 && (
                            <span className="text-xs font-black text-primary/70">+ {opt.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          )}
                        </div>
                        <div className={cn(
                          "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                          active ? "bg-primary border-primary" : "border-muted-foreground/20"
                        )}>
                          {active && <Check className="h-3.5 w-3.5 text-white stroke-[4]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Observation Field */}
          <div className="mt-10 mb-6 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary">
                  <span className="text-[12px]">💬</span>
                </div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Alguma observação?</h3>
              </div>
              <span className={cn(
                "text-[10px] font-bold tracking-widest uppercase",
                note.length >= 140 ? "text-destructive" : "text-muted-foreground/60"
              )}>
                {note.length}/140
              </span>
            </div>
            
            <div className="relative">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 140))}
                placeholder="Ex: tirar a cebola, maionese à parte etc."
                className="w-full min-h-[100px] p-4 rounded-2xl bg-muted/20 border-2 border-transparent focus:border-primary/20 focus:bg-background transition-all outline-none text-sm font-medium resize-none placeholder:text-muted-foreground/40"
              />
            </div>

            <button className="text-[11px] font-black uppercase tracking-widest text-destructive/60 hover:text-destructive transition-colors">
              Denunciar item
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mt-auto sticky bottom-0 bg-card pt-4 pb-4">
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
              {isClosed ? "Loja Fechada" : `Adicionar • ${calculateTotalPrice().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
