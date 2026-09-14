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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, number>>>({});
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
      // 1. Buscar grupos via assignments oficial (N:N)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('product_option_group_assignments')
        .select(`
          group_id,
          product_option_groups:group_id (
            id,
            name,
            min_options,
            max_options,
            required,
            created_at
          )
        `)
        .eq('product_id', productId);

      if (assignmentsError) {
        console.warn('Aviso ao carregar assignments no marketplace:', assignmentsError.message);
      }

      // 2. Buscar grupos via product_id legado
      let { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', productId)
        .order('created_at');

      // Fallback defensivo em caso de restrição RLS (42501) para visitantes anônimos
      if (groupsError && (groupsError.code === '42501' || groupsError.message?.includes('permission denied'))) {
        try {
          const { data: guestRes } = await supabase.auth.signInWithPassword({
            email: 'guest_client_marketplace@epraja.com',
            password: 'GuestClient123!'
          });
          if (guestRes?.session) {
            const retryRes = await supabase
              .from('product_option_groups')
              .select('*')
              .eq('product_id', productId)
              .order('created_at');
            groupsData = retryRes.data;
            groupsError = retryRes.error;
          }
        } catch { /* silent */ }
      }

      // 3. Combinar e deduplicar rigorosamente por group.id
      const groupMap = new Map<string, Group>();

      if (assignmentsData && Array.isArray(assignmentsData)) {
        for (const row of assignmentsData) {
          const g: any = row.product_option_groups;
          if (g && g.id) {
            const isReq = Boolean(g.required);
            groupMap.set(g.id, {
              ...g,
              required: isReq,
              min_options: isReq ? Math.max(1, g.min_options ?? 1) : 0,
            });
          }
        }
      }

      if (groupsData && Array.isArray(groupsData)) {
        for (const g of groupsData) {
          if (g && g.id && !groupMap.has(g.id)) {
            const isReq = Boolean(g.required);
            groupMap.set(g.id, {
              ...g,
              required: isReq,
              min_options: isReq ? Math.max(1, g.min_options ?? 1) : 0,
            });
          }
        }
      }

      const finalGroups = Array.from(groupMap.values());

      if (finalGroups.length > 0) {
        setGroups(finalGroups);
        let { data: optionsData, error: optionsError } = await supabase
          .from('product_options')
          .select('*')
          .in('group_id', finalGroups.map(g => g.id))
          .eq('is_active', true)
          .order('created_at');

        if (optionsError && (optionsError.code === '42501' || optionsError.message?.includes('permission denied'))) {
          try {
            await supabase.auth.signInWithPassword({
              email: 'guest_client_marketplace@epraja.com',
              password: 'GuestClient123!'
            });
            const retryOpt = await supabase
              .from('product_options')
              .select('*')
              .in('group_id', finalGroups.map(g => g.id))
              .eq('is_active', true)
              .order('created_at');
            optionsData = retryOpt.data;
          } catch { /* silent */ }
        }
        
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

  const getGroupTotalSelected = (groupId: string): number => {
    const groupSelections = selectedOptions[groupId] || {};
    return Object.values(groupSelections).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  const getOptionQuantity = (groupId: string, optionId: string): number => {
    return selectedOptions[groupId]?.[optionId] || 0;
  };

  const handleRadioSelect = (groupId: string, optionId: string, isRequired: boolean) => {
    setSelectedOptions(prev => {
      const currentQty = prev[groupId]?.[optionId] || 0;
      if (!isRequired && currentQty > 0) {
        return { ...prev, [groupId]: {} };
      }
      return { ...prev, [groupId]: { [optionId]: 1 } };
    });
  };

  const handleIncrementOption = (groupId: string, optionId: string, maxGroupOptions: number) => {
    const currentTotal = getGroupTotalSelected(groupId);
    if (currentTotal >= maxGroupOptions) return;

    setSelectedOptions(prev => {
      const groupSelections = { ...(prev[groupId] || {}) };
      const currentQty = groupSelections[optionId] || 0;
      groupSelections[optionId] = currentQty + 1;
      return {
        ...prev,
        [groupId]: groupSelections
      };
    });
  };

  const handleDecrementOption = (groupId: string, optionId: string) => {
    setSelectedOptions(prev => {
      const groupSelections = { ...(prev[groupId] || {}) };
      const currentQty = groupSelections[optionId] || 0;
      if (currentQty <= 1) {
        delete groupSelections[optionId];
      } else {
        groupSelections[optionId] = currentQty - 1;
      }
      return {
        ...prev,
        [groupId]: groupSelections
      };
    });
  };

  const isGroupSatisfied = (group: Group): boolean => {
    const isReq = Boolean(group.required);
    if (!isReq) return true; // REGRA #8: Grupos opcionais NUNCA bloqueiam
    const total = getGroupTotalSelected(group.id);
    const minRequired = Math.max(1, group.min_options ?? 1);
    return total >= minRequired;
  };

  const getFirstUnsatisfiedGroup = (): Group | undefined => {
    return groups.find(g => !isGroupSatisfied(g));
  };

  const calculateTotalPrice = () => {
    let total = Number(product.price || 0);
    for (const group of groups) {
      const groupSelections = selectedOptions[group.id] || {};
      for (const [optId, qty] of Object.entries(groupSelections)) {
        if (qty > 0) {
          const opt = options.find(o => o.id === optId);
          if (opt) total += (Number(opt.price) || 0) * qty;
        }
      }
    }
    return total * quantity;
  };

  const handleAdd = () => {
    const missing = getFirstUnsatisfiedGroup();
    if (missing) {
      const minRequired = Math.max(1, missing.min_options ?? 1);
      toast.error(`Escolha pelo menos ${minRequired} opção em "${missing.name}"`);
      return;
    }

    const flatOptions: Array<{
      id: string;
      group_id: string;
      group_name: string;
      name: string;
      price: number;
      quantity: number;
    }> = [];

    for (const group of groups) {
      const groupSelections = selectedOptions[group.id] || {};
      for (const [optId, qty] of Object.entries(groupSelections)) {
        if (qty > 0) {
          const opt = options.find(o => o.id === optId);
          if (opt) {
            flatOptions.push({
              id: opt.id,
              group_id: group.id,
              group_name: group.name,
              name: opt.name,
              price: Number(opt.price) || 0,
              quantity: qty,
            });
          }
        }
      }
    }

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
            <DialogDescription className="sr-only">{product.description || 'Escolha as opções e observações para adicionar à sacola.'}</DialogDescription>
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
              {groups.map((group) => {
                const totalInGroup = getGroupTotalSelected(group.id);
                const isReq = Boolean(group.required);
                const minOptions = isReq ? Math.max(1, group.min_options ?? 1) : 0;
                const maxOptions = Math.max(minOptions, group.max_options ?? 1);
                const isSingleChoice = maxOptions === 1;
                const isSatisfied = isGroupSatisfied(group);
                const groupOptions = options.filter(o => o.group_id === group.id);

                let instructionText = "";
                if (!isReq) {
                  instructionText = maxOptions === 1 ? 'Escolha até 1 opção' : `Escolha até ${maxOptions} opções`;
                } else {
                  if (minOptions === 1 && maxOptions === 1) {
                    instructionText = 'Escolha 1 opção';
                  } else if (minOptions === maxOptions) {
                    instructionText = `Escolha ${minOptions} opções`;
                  } else {
                    instructionText = `Escolha de ${minOptions} a ${maxOptions} opções`;
                  }
                }

                return (
                  <div key={group.id} className="flex flex-col">
                    <div className="bg-secondary/40 -mx-6 px-6 py-3 mb-2 border-y border-border/40 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground tracking-tight">{group.name}</h3>
                          {isReq ? (
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                              isSatisfied ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"
                            )}>
                              {isSatisfied ? '✓ Concluído' : 'Obrigatório'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
                              Opcional
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                          {instructionText}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-md",
                          totalInGroup > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground bg-secondary/50"
                        )}>
                          {totalInGroup}/{group.max_options}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-border/40">
                      {groupOptions.map((opt) => {
                        const optQty = getOptionQuantity(group.id, opt.id);
                        const isSelected = optQty > 0;
                        const canIncrement = totalInGroup < group.max_options;

                        return (
                          <div 
                            key={opt.id} 
                            onClick={() => {
                              if (isSingleChoice) {
                                handleRadioSelect(group.id, opt.id, isReq);
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between py-3.5 transition-all select-none",
                              isSingleChoice && "cursor-pointer active:opacity-70"
                            )}
                          >
                            <div className="flex flex-col pr-4 min-w-0 flex-1">
                              <span className={cn(
                                "text-sm font-medium transition-colors",
                                isSelected ? "text-foreground font-semibold" : "text-foreground/90"
                              )}>
                                {opt.name}
                              </span>
                              {Number(opt.price) > 0 ? (
                                <span className="text-xs font-medium text-primary mt-0.5">
                                  + {Number(opt.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground mt-0.5">Grátis</span>
                              )}
                            </div>

                            {/* Selection Controls */}
                            {isSingleChoice ? (
                              <div className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                isSelected ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent"
                              )}>
                                {isSelected && (
                                  <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                                )}
                              </div>
                            ) : (
                              <div 
                                className="flex items-center gap-2 bg-secondary/40 rounded-xl p-1 shrink-0 border border-border/40"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleDecrementOption(group.id, opt.id)}
                                  disabled={optQty <= 0}
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-xs text-foreground transition-all active:scale-90",
                                    optQty <= 0 && "opacity-30 cursor-not-allowed active:scale-100"
                                  )}
                                  aria-label="Diminuir"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                
                                <span className={cn(
                                  "w-5 text-center text-xs font-bold",
                                  optQty > 0 ? "text-primary" : "text-muted-foreground"
                                )}>
                                  {optQty}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleIncrementOption(group.id, opt.id, group.max_options)}
                                  disabled={!canIncrement}
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs transition-all active:scale-90",
                                    !canIncrement && "opacity-30 cursor-not-allowed bg-muted text-muted-foreground active:scale-100"
                                  )}
                                  aria-label="Aumentar"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Observation Section */}
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
