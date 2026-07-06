import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, MessageSquare, AlertCircle, Clock, Loader2, Pencil, Ticket, CheckCircle2 } from 'lucide-react';
import { MediaImage } from '@/components/shared/MediaImage';
import { getPrimaryProductImage, getCompanyLogoImage } from '@/lib/media';
import { Product } from '@/types/database';
import { toast } from 'sonner';
import { isStoreOpenNow } from '@/lib/storeHours';

interface CartItemRowProps {
  item: any;
  companyId?: string;
  updateQuantity: (id: string, qty: number) => void;
  updateNote: (id: string, nãote: string) => void;
  navigate: any;
}

function CartItemRow({ item, companyId, updateQuantity, updateNote, navigate }: CartItemRowProps) {
  const [localNote, setLocalNote] = useState(item.nãote || '');

  // Keep local state in sync if item.nãote changes from outside
  useEffect(() => {
    setLocalNote(item.nãote || '');
  }, [item.nãote]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNote(e.target.value);
  };

  const handleBlur = () => {
    updateNote(item.id, localNote);
  };

  return (
    <div className="flex flex-col border-b border-border/50 pb-4 last:border-0 animate-in fade-in duration-300">
      <div className="flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary relative">
          <MediaImage
            src={getPrimaryProductImage(item.product)}
            alt={item.product.name || 'Produto não carrinho'}
            className="h-full w-full object-cover animate-pulse-subtle"
          />
          <button 
            onClick={() => navigate(`/marketplace/store/${companyId}`)}
            className="absolute top-1 right-1 bg-background/90 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border text-primary transition-all hover:scale-105 active:scale-95"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
          <div>
            <h4 className="text-sm font-semibold text-foreground tracking-tight">{item.product.name}</h4>
            {item.options && item.options.length > 0 ? (
              <div className="mt-1 flex flex-col gap-0.5">
                {item.options.map((opt: any, idx: number) => (
                  <span key={idx} className="text-xs text-muted-foreground flex gap-2">
                    <span className="w-4 text-center">1</span>
                    {opt.name} {opt.price > 0 && `(+ R$ ${opt.price.toFixed(2).replace('.', ',')})`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-medium">{item.product.description}</p>
            )}
          </div>
          <div className="mt-2 text-sm font-bold text-foreground">
            R$ {((Number(item.product.price || 0) + (item.options?.reduce((acc, opt) => acc + Number(opt.price || 0), 0) || 0))).toFixed(2).replace('.', ',')}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2 py-1 shadow-sm">
            <button
              className="flex h-6 w-6 items-center justify-center text-primary transition-all active:scale-90"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <span className="w-4 text-center text-sm font-semibold text-foreground">{item.quantity}</span>
            <button
              className="flex h-6 w-6 items-center justify-center text-primary transition-all active:scale-90"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <MessageSquare className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground font-semibold">Obserávação</span>
        </div>
        <textarea
          value={localNote}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={`Ex: sem cebola, sem sal...`}
          rows={1}
          className="w-full resize-nãone rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-nãone focus:border-primary/50 focus:bg-background transition-all"
        />
      </div>
    </div>
  );
}

export default function Cart() {
  const { items, company, updateQuantity, updateNote, clearCart, subtotal, appliedCoupon, applicableProductIds, setCouponData, removeCoupon, discountAmount, total, deliveryFee } = useCart();
  const { userá } = useAuth();
  const navigate = useNavigate();
  const [isStoreOpen, setIsStoreOpen] = useState<boolean | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  
  // Upsell (Peça também)
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!company) return;
    const fetchStatus = async () => {
      setLoadingStatus(true);
      const { data } = await supabase
        .from('companies')
        .select('is_open, active, is_active, business_hours')
        .eq('id', company.id)
        .single();
      if (data) setIsStoreOpen(isStoreOpenNow(data as any));
      setLoadingStatus(false);
    };
    fetchStatus();

    // Fetch up-sell products
    const fetchSuggestions = async () => {
      const cartProductIds = items.map(i => i.product.id);
      let query = supabase.from('products').select('*').eq('company_id', company.id).eq('is_active', true);
      const { data } = await query.limit(10);
      if (data) {
        const filtered = data.filter(p => !cartProductIds.includes(p.id));
        setSuggestedProducts(filtered.slice(0, 4));
      }
    };
    fetchSuggestions();

    // Subscribe to changes
    const channel = supabase.channel(`company-status-${company.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'companies', filter: `id=eq.${company.id}` }, 
        (p) => {
          if (p.new.active === false || p.new.is_active === false) {
             setIsStoreOpen(false);
          } else {
             setIsStoreOpen(p.new.is_open === true);
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [company?.id, items.length]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const code = couponCode.trim().toUpperCase();
      const { data, error } = await supabase.from('coupons').select('*').eq('code', code).eq('active', true).maybeSingle();
      
      if (error || !data) {
        toast.error('Cupom inválido ou inativo.');
        removeCoupon();
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('Este cupom já expirou.');
        removeCoupon();
        return;
      }
      if (data.min_order_value && subtotal < data.min_order_value) {
        toast.error(`Valor mínimo para aplicar é de R$ ${data.min_order_value.toLocaleString('pt-BR')}`);
        removeCoupon();
        return;
      }
      if (data.company_id && data.company_id !== company?.id) {
        toast.error('Este cupom é exclusivo de outra loja.');
        removeCoupon();
        return;
      }
      
      // Fetch linked products
      const { data: links } = await supabase.from('coupon_products').select('product_id').eq('coupon_id', data.id);
      const pids = (links || []).map((l: any) => l.product_id);
      
      setCouponData(data, pids);
      toast.success('🎉 Cupom aplicado com sucesso!');
    } catch (err) {
      toast.error('Falha ao checar o cupom.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleAddSuggested = (product: Product) => {
    navigate(`/marketplace/store/${company?.id}`);
    // Ideally we'd open a modal, but returning to store is easiest
  };

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
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <div className="flex-1 text-center pr-9">
          <h1 className="font-bold text-sm tracking-widest text-foreground uppercase">SACOLA</h1>
        </div>
        <button onClick={clearCart} className="text-sm font-semibold text-primary absolute right-4">Limpar</button>
      </div>

      <div className="mx-auto max-w-lg px-0 py-4 pb-32">
        {/* Warning if closed */}
        {isStoreOpen === false && (
          <div className="mx-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-destructive">Loja fechada não momento</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este restaurante não está aceitando pedidos agora. Você pode manter os itens na sacola e finalizar assim que ele abrir!
              </p>
            </div>
          </div>
        )}

        {/* Cabeçalho da Loja */}
        {company && (
          <div className="flex items-center gap-3 px-4 mb-6">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border shadow-sm">
              <MediaImage
                src={getCompanyLogoImage(company)}
                alt={company.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold">{company.name}</h2>
              <button 
                onClick={() => navigate(`/marketplace/store/${company.id}`)}
                className="text-sm font-semibold text-primary"
              >
                Adicionar mais itens
              </button>
            </div>
          </div>
        )}

        {/* Itens adicionados */}
        <div className="px-4 mb-6">
          <h3 className="font-bold text-base text-foreground mb-4">Itens adicionados</h3>
          <div className="space-y-4">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                companyId={company?.id}
                updateQuantity={updateQuantity}
                updateNote={updateNote}
                navigate={navigate}
              />
            ))}
          </div>

          <button 
            onClick={() => navigate(`/marketplace/store/${company?.id}`)}
            className="w-full py-4 text-sm font-semibold text-primary text-center mt-2 border-t border-border/50"
          >
            Adicionar mais itens
          </button>
        </div>

        {/* Peça também */}
        {suggestedProducts.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-base text-foreground mb-4 px-4">Peça também</h3>
            <div className="flex overflow-x-auto gap-3 px-4 pb-4 scrollbar-hide">
              {suggestedProducts.map(prod => (
                <div key={prod.id} className="min-w-[120px] w-[120px] rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col items-center text-center group cursor-pointer" onClick={() => handleAddSuggested(prod)}>
                  <div className="h-16 w-16 mb-2 relative">
                    <MediaImage
                      src={getPrimaryProductImage(prod)}
                      alt={prod.name}
                      className="h-full w-full object-contain drop-shadow-md transition-transform group-hover:scale-105"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-md border border-border text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Plus className="h-4 w-4" />
                    </div>
                  </div>
                  <h4 className="text-xs font-medium text-foreground line-clamp-2 min-h-[32px]">{prod.name}</h4>
                  <p className="text-xs font-bold mt-1">R$ {Number(prod.price || 0).toFixed(2).replace('.', ',')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-2 w-full bg-secondary mb-6" />

        {/* Cupom */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Ticket className="h-5 w-5 text-foreground" />
            <h3 className="font-bold text-base text-foreground">Cupom</h3>
          </div>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-3">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold text-sm uppercase">{appliedCoupon.code}</span>
              </div>
              <button onClick={removeCoupon} className="text-sm font-semibold text-primary">Remover</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Digite um código" 
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                className="flex-1 h-12 bg-background border border-border rounded-xl px-4 text-sm font-bold uppercase placeholder:nãormal-case placeholder:font-nãormal focus:outline-nãone focus:border-primary transition-colors"
                disabled={validatingCoupon}
              />
              <button 
                className="h-12 px-4 rounded-xl text-primary font-bold text-sm" 
                disabled={!couponCode.trim() || validatingCoupon}
                onClick={handleApplyCoupon}
              >
                {validatingCoupon ? '...' : 'Aplicar'}
              </button>
            </div>
          )}
          {appliedCoupon && (
            <div className="mt-2 p-3 bg-[#F4F1FB] rounded-xl flex items-center justify-between border border-[#E7DEFA]">
              <div className="flex items-center gap-2 text-[#7B46E5] text-xs font-semibold">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#7B46E5] text-white">♦</span>
                <span>Desconto: - R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-2 w-full bg-secondary mb-6" />

        {/* Resumo de valores */}
        <div className="px-4 space-y-3 mb-6">
          <h3 className="font-bold text-base text-foreground mb-4">Resumo de valores</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Taxa de entrega</span>
            <span className="text-muted-foreground text-xs italic">A calcular</span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-sm text-[#7B46E5] font-semibold">
              <span>Total com desconto do cupom</span>
              <span>R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2">
            <span>Total</span>
            <span>R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>

      {/* Rodapé Padrão iFood */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-lg">
          <Button
            className="h-14 w-full rounded-xl text-base font-bold flex justify-between px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isStoreOpen === false || loadingStatus}
            onClick={() => {
              if (!userá) {
                navigate('/marketplace/login');
                return;
              }
              navigate('/marketplace/checkout');
            }}
          >
            {loadingStatus ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : isStoreOpen === false ? (
              <span className="mx-auto">Aguardando abertura</span>
            ) : (
              <>
                <span>Continuar</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </MarketplaceLayout>
  );
}
