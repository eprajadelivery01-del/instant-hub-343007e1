import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Minus, Plus, Star, Clock, Store as StoreIcon, Share2, Utensils } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProductDetailDialog } from '@/components/marketplace/ProductDetailDialog';


export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, addItem, updateQuantity, company: cartCompany, itemCount, subtotal } = useCart();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);


  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [compRes, prodRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        supabase.from('products').select('*').eq('company_id', id).eq('active', true).order('category'),
      ]);
      setCompany(compRes.data);
      setProducts(prodRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const categories = [...new Set(products.map(p => p.category))];

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  const getItemQty = (productId: string) => {
    return items.find(i => i.product.id === productId)?.quantity || 0;
  };

  const handleAdd = (product: Product) => {
    // Guest mode allowed now
    if (cartCompany && cartCompany.id !== company?.id) {
       addItem(product, company!);
       return;
    }
    addItem(product, company!);
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="animate-pulse">
           <div className="h-64 bg-muted w-full" />
           <div className="p-6 space-y-4">
              <div className="h-20 w-20 bg-muted rounded-2xl -mt-14 border-4 border-white mx-auto shadow-lg" />
              <div className="h-8 bg-muted w-1/2 mx-auto rounded-lg" />
              <div className="h-4 bg-muted w-1/3 mx-auto rounded-lg" />
           </div>
           <div className="px-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted w-full rounded-2xl" />)}
           </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!company) {
    return (
      <MarketplaceLayout>
        <div className="text-center py-24 px-6">
          <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
             <StoreIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-black mb-2">Loja não encontrada</h2>
          <Button onClick={() => navigate('/marketplace')} variant="link" className="font-bold">
             Voltar para o marketplace
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      {/* Header - iFood Store Style */}
      <div className="relative">
        {/* Banner with Nav */}
        <div className="h-44 relative overflow-hidden">
          {company.banner_url ? (
            <img src={company.banner_url} alt={company.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <StoreIcon className="h-16 w-16 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <button
              onClick={() => navigate('/marketplace')}
              className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20 transition-all hover:bg-white hover:text-primary"
            >
              <ArrowLeft className="h-5 w-5 text-white group-hover:text-primary" />
            </button>
            <button className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20 transition-all hover:bg-white hover:text-primary">
              <Share2 className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Store Profile Section */}
        <div className="px-6 pb-6 bg-white relative">
          <div className="flex flex-col items-center -mt-12 text-center">
             <div className="relative">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" className="h-24 w-24 rounded-[28px] object-cover border-4 border-white shadow-2xl" />
                ) : (
                  <div className="h-24 w-24 rounded-[28px] bg-white border-4 border-white shadow-2xl flex items-center justify-center">
                    <StoreIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className={cn(
                  "absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-colors",
                  company.active ? "bg-success" : "bg-destructive"
                )}>
                   <div className={cn(
                     "h-2 w-2 bg-white rounded-full",
                     company.active && "animate-pulse"
                   )} />
                </div>

             </div>
             
             <div className="mt-4 space-y-1">
                <h1 className="text-2xl font-black text-foreground tracking-tight">{company.name}</h1>
                <div className="flex items-center justify-center gap-4 text-sm font-bold text-muted-foreground/80">
                   <div className="flex items-center gap-1 text-warning">
                      <Star className="h-4 w-4 fill-current" />
                      <span>4.5</span>
                      <span className="text-muted-foreground font-medium">• 50+ avaliações</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>30-45 min</span>
                   </div>
                </div>
                {company.description && (
                   <p className="text-sm text-muted-foreground mt-2 px-6 italic font-medium opacity-70 leading-relaxed">
                     "{company.description}"
                   </p>
                )}
             </div>
             
             <div className="flex items-center gap-3 mt-6">
                <Badge variant="outline" className="h-9 px-4 rounded-xl border-dashed border-2 border-primary/30 text-primary font-bold">
                   🎟️ Cupons disponíveis
                </Badge>
                <Badge variant="outline" className="h-9 px-4 rounded-xl border-dashed border-2 border-success/30 text-success font-bold">
                   🚚 Entrega Grátis
                </Badge>
             </div>
          </div>
        </div>
      </div>

      {/* Category Navigation - iFood Sliding Scroll */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-40 bg-white border-b border-border transition-all shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide px-6">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-5 py-4 text-sm font-black whitespace-nowrap transition-all border-b-4',
                  activeCategory === cat
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product List - iFood Style Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-32">
        {categories.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground opacity-50">
             <Utensils className="h-16 w-16" />
             <p className="font-bold">Nenhum prato disponível no cardápio</p>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat} id={cat} className="mt-8">
              <h3 className="text-xl font-black text-foreground px-2 mb-4 tracking-tight">{cat}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.filter(p => p.category === cat).map(product => {
                  const qty = getItemQty(product.id);
                  return (
                    <div
                      key={product.id}
                      className="group bg-white rounded-[28px] border border-border/50 p-4 flex gap-4 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer active:scale-[0.98]"
                      onClick={() => setSelectedProduct(product)}
                    >

                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-black text-foreground text-[15px] leading-tight group-hover:text-primary transition-colors">{product.name}</h4>
                          {product.description && (
                            <p className="text-[12px] text-muted-foreground font-medium line-clamp-2 mt-2 leading-relaxed opacity-70 italic">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-0.5">Preço</span>
                             <p className="text-lg font-black text-foreground">
                                R$ {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </p>
                          </div>
                          
                          {qty > 0 && (
                            <div className="flex items-center bg-muted/50 rounded-2xl p-1 gap-2 border border-border">
                              <button
                                className="h-8 w-8 rounded-xl bg-white text-muted-foreground flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1); }}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="font-black text-sm w-6 text-center">{qty}</span>
                              <button
                                className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-transform"
                                onClick={(e) => { e.stopPropagation(); handleAdd(product); }}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                          
                          {qty === 0 && (
                             <div className="h-10 w-10 rounded-2xl bg-muted group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                                <Plus className="h-5 w-5" />
                             </div>
                          )}
                        </div>
                      </div>
                      
                      {(product.image_urls && product.image_urls.length > 0) ? (
                        <div className="h-28 w-28 rounded-2xl overflow-hidden shrink-0 shadow-lg group-hover:rotate-1 transition-transform">
                          <img
                            src={product.image_urls[0]}
                            alt={product.name || ''}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : product.image_url && (
                        <div className="h-28 w-28 rounded-2xl overflow-hidden shrink-0 shadow-lg group-hover:rotate-1 transition-transform">
                          <img
                            src={product.image_url}
                            alt={product.name || ''}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Cart - iFood Style */}
      {itemCount > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom duration-500">
           <button
             onClick={() => navigate('/marketplace/cart')}
             className="max-w-lg mx-auto w-full h-16 bg-primary rounded-2xl shadow-[0_12px_40px_rgba(249,115,22,0.4)] flex items-center justify-between px-6 text-white active:scale-[0.98] transition-transform"
           >
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center font-black">
                    {itemCount}
                 </div>
                 <div className="text-left">
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest leading-none">Ver carrinho</p>
                    <p className="text-sm font-black">Finalizar pedido</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black opacity-80 uppercase tracking-widest leading-none">Total</p>
                 <p className="text-lg font-black">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
           </button>
        </div>
      )}
      {/* Product Detail Modal */}
      <ProductDetailDialog
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(product, qty) => {
          for (let i = 0; i < qty; i++) {
            handleAdd(product);
          }
        }}
        initialQuantity={selectedProduct ? getItemQty(selectedProduct.id) : 1}
      />

    </MarketplaceLayout>

  );
}
