import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Star, Clock, Store as StoreIcon, Share2, Utensils, Search, Info, Ticket } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  const getItemQty = (productId: string) => {
    return items.find(i => i.product.id === productId)?.quantity || 0;
  };

  const handleAdd = (product: Product) => {
    addItem(product, company!);
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="animate-pulse bg-white min-h-screen">
           <div className="h-64 bg-slate-100 w-full" />
           <div className="p-8 -mt-16 space-y-6">
              <div className="h-28 w-28 bg-white rounded-[32px] mx-auto shadow-xl" />
              <div className="h-8 bg-slate-100 w-48 mx-auto rounded-xl" />
              <div className="h-4 bg-slate-100 w-32 mx-auto rounded-lg" />
           </div>
           <div className="px-6 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-50 w-full rounded-[28px]" />)}
           </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!company) {
    return (
      <MarketplaceLayout>
        <div className="text-center py-32 px-6">
          <div className="h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
             <StoreIcon className="h-12 w-12 text-slate-300" />
          </div>
          <h2 className="text-2xl font-black mb-3">Loja não encontrada</h2>
          <Button onClick={() => navigate('/marketplace')} variant="link" className="font-bold text-primary">
             Voltar para o marketplace
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout hideNav={false}>
      {/* Sticky Top Bar (Hidden until scroll) */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-[100] h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center px-6 transition-all duration-300",
        isScrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}>
        <button onClick={() => navigate('/marketplace')} className="mr-4">
          <ArrowLeft className="h-6 w-6 text-slate-900" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-slate-900 truncate">{company.name}</h2>
          <div className="flex items-center gap-2 text-[10px] font-black text-success uppercase tracking-widest">
            <div className="h-2 w-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <span>Aberto</span>
          </div>
        </div>
        <button className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-slate-50">
          <Share2 className="h-5 w-5 text-slate-900" />
        </button>
      </div>

      {/* Header - Premium Immersive Style */}
      <div className="relative group">
        {/* Banner */}
        <div className="h-56 relative overflow-hidden transition-all duration-700 group-hover:h-64">
          {company.banner_url ? (
            <img src={company.banner_url} alt="" className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-1000" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
              <StoreIcon className="h-20 w-20 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          
          {/* Top Actions */}
          <div className="absolute top-6 left-6 right-6 flex justify-between z-20">
            <button
              onClick={() => navigate('/marketplace')}
              className="h-11 w-11 rounded-2xl bg-black/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/20 transition-all hover:bg-white hover:text-slate-900 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-3">
              <button className="h-11 w-11 rounded-2xl bg-black/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/20 transition-all hover:bg-white hover:text-slate-900 text-white">
                <Search className="h-5 w-5" />
              </button>
              <button className="h-11 w-11 rounded-2xl bg-black/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/20 transition-all hover:bg-white hover:text-slate-900 text-white">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Store Profile Section */}
        <div className="px-8 pb-8 bg-white relative rounded-t-[40px] -mt-10 z-10 border-b border-slate-50">
          <div className="flex flex-col items-center">
             <div className="relative -mt-14 mb-6">
                <div className="p-1 bg-white rounded-[36px] shadow-2xl">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="" className="h-28 w-28 rounded-[32px] object-cover border-2 border-slate-50 shadow-inner" />
                  ) : (
                    <div className="h-28 w-28 rounded-[32px] bg-slate-50 flex items-center justify-center border-2 border-slate-100">
                      <StoreIcon className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className={cn(
                  "absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all duration-500",
                  company.active ? "bg-success" : "bg-destructive"
                )}>
                   <div className={cn(
                     "h-2 w-2 bg-white rounded-full",
                     company.active && "animate-pulse"
                   )} />
                </div>
             </div>
             
             <div className="space-y-4 text-center max-w-lg">
                <div className="space-y-1">
                   <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{company.name}</h1>
                   <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest pt-2">
                      <span className="text-primary">{company.city || 'Diamantino'}</span>
                      <span>•</span>
                      <span>{company.category || 'Gastronomia'}</span>
                   </div>
                </div>

                <div className="flex items-center justify-center gap-8 py-2">
                   <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1 text-warning">
                         <Star className="h-4 w-4 fill-current" />
                         <span className="text-lg font-black text-slate-900">4.8</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Avaliações</span>
                   </div>
                   <div className="h-8 w-px bg-slate-100" />
                   <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1 text-primary">
                         <Clock className="h-4 w-4" />
                         <span className="text-lg font-black text-slate-900">30-45</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Minutos</span>
                   </div>
                   <div className="h-8 w-px bg-slate-100" />
                   <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1 text-success">
                         <Info className="h-4 w-4" />
                         <span className="text-lg font-black text-slate-900">Info</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Detalhes</span>
                   </div>
                </div>

                {company.description && (
                   <p className="text-[13px] text-slate-500 font-medium leading-relaxed italic border-t border-slate-50 pt-4 px-4">
                     "{company.description}"
                   </p>
                )}
             </div>
             
             <div className="flex items-center gap-3 mt-8">
                <div className="h-10 px-5 rounded-2xl bg-orange-50 text-primary border border-orange-100 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all">
                   <Ticket className="h-4 w-4" />
                   Cupons
                </div>
                <div className="h-10 px-5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all">
                   <Clock className="h-4 w-4" />
                   Grátis
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Store Search Bar */}
      <div className="px-8 pb-4 bg-white">
         <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Buscar no cardápio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            />
         </div>
      </div>

      {/* Category Navigation - Frosted Glass Sticky */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-slate-100/50 shadow-sm transition-all duration-500">
          <div className="flex overflow-x-auto scrollbar-hide px-8 py-2">
            <div className="flex gap-2 min-w-full">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    const element = document.getElementById(cat);
                    if (element) {
                      const yOffset = -80;
                      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({top: y, behavior: 'smooth'});
                    }
                  }}
                  className={cn(
                    'px-6 py-3 text-xs font-black whitespace-nowrap transition-all rounded-2xl flex items-center gap-2',
                    activeCategory === cat
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <Utensils className={cn("h-3 w-3 transition-transform", activeCategory === cat && "scale-110")} />
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product List - Premium Floating Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-40 bg-[#fdfdfd]">
        {categories.length === 0 ? (
          <div className="py-32 flex flex-col items-center gap-6 text-slate-300">
             <div className="h-24 w-24 rounded-[32px] bg-slate-50 flex items-center justify-center">
                <Utensils className="h-12 w-12" />
             </div>
             <p className="font-black text-lg tracking-tight">Nenhum prato por enquanto</p>
          </div>
        ) : (
          categories.map(cat => {
            const catProducts = filteredProducts.filter(p => p.category === cat);
            if (catProducts.length === 0 && searchQuery) return null;
            
            return (
              <div key={cat} id={cat} className="pt-10 first:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between mb-6 px-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{cat}</h3>
                  <div className="h-px flex-1 bg-slate-100 ml-6 opacity-50" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catProducts.map(product => {
                    const qty = getItemQty(product.id);
                    return (
                      <div
                        key={product.id}
                        className="group relative bg-white rounded-[32px] border border-slate-100 p-5 flex gap-5 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500 cursor-pointer active:scale-[0.98]"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <h4 className="font-black text-slate-900 text-[17px] leading-tight mb-2 tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="text-[12px] text-slate-400 font-medium line-clamp-2 leading-relaxed opacity-80">
                                {product.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-end justify-between mt-4">
                            <div className="flex flex-col">
                               <p className="text-xl font-black text-slate-900 tracking-tight">
                                  <span className="text-sm font-bold opacity-30 mr-1">R$</span>
                                  {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </p>
                            </div>
                            
                            <div className="relative">
                              {qty > 0 ? (
                                <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-3 border border-slate-200 animate-in zoom-in duration-300">
                                  <button
                                    className="h-9 w-9 rounded-xl bg-white text-slate-400 flex items-center justify-center shadow-sm active:scale-90 transition-transform hover:text-primary"
                                    onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1); }}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="font-black text-sm w-4 text-center text-slate-900">{qty}</span>
                                  <button
                                    className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-transform"
                                    onClick={(e) => { e.stopPropagation(); handleAdd(product); }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleAdd(product); }}
                                  className="h-10 w-10 rounded-2xl bg-white text-slate-200 border border-slate-100 flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-90"
                                >
                                  <Plus className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative h-28 w-28 shrink-0">
                          <div className="h-full w-full rounded-[24px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.1)] group-hover:-translate-y-1 transition-transform duration-500">
                            {(product.image_urls && product.image_urls.length > 0) ? (
                              <img
                                src={product.image_urls[0]}
                                alt=""
                                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            ) : product.image_url ? (
                              <img
                                src={product.image_url}
                                alt=""
                                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            ) : (
                              <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-200">
                                <Utensils className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-x-2 -bottom-2 h-4 bg-black/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

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
