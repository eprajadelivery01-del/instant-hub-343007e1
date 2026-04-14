import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';
import { useCart } from '@/contexts/CartContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Star, Clock, Store as StoreIcon, Share2, Utensils, Search, Info, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductDetailDialog } from '@/components/marketplace/ProductDetailDialog';
import { MediaImage } from '@/components/shared/MediaImage';
import { getCompanyBannerImage, getCompanyLogoImage, getPrimaryProductImage } from '@/lib/media';

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, addItem, updateQuantity } = useCart();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchStore = async () => {
      const [companyResponse, productResponse] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        supabase.from('products').select('*').eq('company_id', id).eq('active', true).order('category'),
      ]);

      setCompany(companyResponse.data);
      setProducts(productResponse.data || []);
      setLoading(false);
    };

    fetchStore();
  }, [id]);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products]);
  const filteredProducts = useMemo(
    () => products.filter((product) =>
      (product.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [products, searchQuery]
  );

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const getItemQty = (productId: string) => items.find((item) => item.product.id === productId)?.quantity || 0;

  const handleAdd = (product: Product) => {
    if (company) addItem(product, company);
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen animate-pulse bg-background">
          <div className="h-64 w-full bg-secondary" />
          <div className="-mt-16 space-y-6 p-8">
            <div className="mx-auto h-28 w-28 rounded-[32px] bg-card shadow-xl" />
            <div className="mx-auto h-8 w-48 rounded-xl bg-secondary" />
            <div className="mx-auto h-4 w-32 rounded-lg bg-secondary" />
          </div>
          <div className="space-y-4 px-6">
            {[1, 2, 3].map((item) => <div key={item} className="h-32 w-full rounded-[28px] bg-card" />)}
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!company) {
    return (
      <MarketplaceLayout>
        <div className="px-6 py-32 text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
            <StoreIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <h2 className="mb-3 text-2xl font-black text-foreground">Loja não encontrada</h2>
          <Button onClick={() => navigate('/marketplace')} variant="link" className="font-bold text-primary">
            Voltar para o marketplace
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  const companyBanner = getCompanyBannerImage(company);
  const companyLogo = getCompanyLogoImage(company);
  const storeCategory = (company as any).category || categories[0] || 'Gastronomia';

  return (
    <MarketplaceLayout hideNav={false}>
      <div className={cn(
        'fixed left-0 right-0 top-0 z-[100] flex h-16 items-center border-b border-border/60 bg-background/90 px-6 backdrop-blur-xl transition-all duration-300',
        isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      )}>
        <button onClick={() => navigate('/marketplace')} className="mr-4">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-black text-foreground">{company.name}</h2>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-success">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>{company.active ? 'Aberto' : 'Fechado'}</span>
          </div>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
          <Share2 className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="relative group">
        <div className="relative h-56 overflow-hidden transition-all duration-700 group-hover:h-64">
          <MediaImage
            src={companyBanner}
            alt={`Capa da loja ${company.name}`}
            className="h-full w-full scale-105 object-cover transition-transform duration-1000 group-hover:scale-110"
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-secondary">
                <StoreIcon className="h-20 w-20 text-muted-foreground/20" />
              </div>
            }
          />
          <div className="hero-image-overlay absolute inset-0" />

          <div className="absolute left-6 right-6 top-6 z-20 flex justify-between">
            <button
              onClick={() => navigate('/marketplace')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/15 text-primary-foreground backdrop-blur-xl transition-all hover:bg-background/25"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-3">
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/15 text-primary-foreground backdrop-blur-xl transition-all hover:bg-background/25">
                <Search className="h-5 w-5" />
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/15 text-primary-foreground backdrop-blur-xl transition-all hover:bg-background/25">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-10 rounded-t-[40px] border-b border-border bg-card px-8 pb-8">
          <div className="flex flex-col items-center">
            <div className="relative -mt-14 mb-6">
              <div className="rounded-[36px] bg-card p-1 shadow-2xl">
                <MediaImage
                  src={companyLogo}
                  alt={`Logo da loja ${company.name}`}
                  className="h-28 w-28 rounded-[32px] border-2 border-background object-cover"
                  fallback={
                    <div className="flex h-28 w-28 items-center justify-center rounded-[32px] border-2 border-border bg-secondary">
                      <StoreIcon className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  }
                />
              </div>

              <div className={cn(
                'absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-card shadow-lg',
                company.active ? 'bg-success' : 'bg-destructive'
              )}>
                <div className={cn('h-2 w-2 rounded-full bg-primary-foreground', company.active && 'animate-pulse')} />
              </div>
            </div>

            <div className="max-w-lg space-y-4 text-center">
              <div className="space-y-1">
                <h1 className="text-3xl font-black leading-none tracking-tight text-foreground">{company.name}</h1>
                <div className="flex items-center justify-center gap-1.5 pt-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <span className="text-primary">{company.city || 'Diamantino'}</span>
                  <span>•</span>
                  <span>{storeCategory}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-8 py-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-warning">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-lg font-black text-foreground">4.8</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-muted-foreground">Avaliações</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-primary">
                    <Clock className="h-4 w-4" />
                    <span className="text-lg font-black text-foreground">30-45</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-muted-foreground">Minutos</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-success">
                    <Info className="h-4 w-4" />
                    <span className="text-lg font-black text-foreground">Info</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-muted-foreground">Detalhes</span>
                </div>
              </div>

              {company.description && (
                <p className="border-t border-border px-4 pt-4 text-[13px] font-medium italic leading-relaxed text-muted-foreground">
                  "{company.description}"
                </p>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex h-10 items-center gap-2 rounded-2xl bg-primary/10 px-5 text-[11px] font-black uppercase tracking-wider text-primary">
                <Ticket className="h-4 w-4" />
                Cupons
              </div>
              <div className="flex h-10 items-center gap-2 rounded-2xl bg-success/10 px-5 text-[11px] font-black uppercase tracking-wider text-success">
                <Clock className="h-4 w-4" />
                Grátis
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card px-8 pb-4">
        <div className="premium-card relative overflow-hidden rounded-[24px] px-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar no cardápio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-[20px] border-0 bg-transparent pl-12 pr-4 text-xs font-bold focus:outline-none"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="sticky top-0 z-40 border-b border-border/60 bg-background/85 shadow-sm backdrop-blur-2xl transition-all duration-500">
          <div className="flex overflow-x-auto px-8 py-2 scrollbar-hide">
            <div className="flex min-w-full gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category);
                    const element = document.getElementById(category);
                    if (element) {
                      const yOffset = -80;
                      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-2xl px-6 py-3 text-xs font-black transition-all',
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Utensils className={cn('h-3 w-3 transition-transform', activeCategory === category && 'scale-110')} />
                  {category.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 pb-40">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-32 text-muted-foreground">
            <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-secondary">
              <Utensils className="h-12 w-12" />
            </div>
            <p className="text-lg font-black tracking-tight">Nenhum prato por enquanto</p>
          </div>
        ) : (
          categories.map((category) => {
            const categoryProducts = filteredProducts.filter((product) => product.category === category);
            if (categoryProducts.length === 0 && searchQuery) return null;

            return (
              <div key={category} id={category} className="animate-in fade-in slide-in-from-bottom-4 duration-700 first:pt-8 pt-10">
                <div className="mb-6 flex items-center justify-between px-2">
                  <h3 className="text-2xl font-black tracking-tight text-foreground">{category}</h3>
                  <div className="ml-6 h-px flex-1 bg-border opacity-50" />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {categoryProducts.map((product) => {
                    const qty = getItemQty(product.id);
                    return (
                      <div
                        key={product.id}
                        className="premium-card premium-card-interactive group relative flex cursor-pointer gap-5 rounded-[32px] p-5 active:scale-[0.98]"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                          <div>
                            <h4 className="mb-2 line-clamp-2 text-[17px] font-black leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="line-clamp-2 text-[12px] font-medium leading-relaxed text-muted-foreground opacity-80">
                                {product.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 flex items-end justify-between">
                            <p className="text-xl font-black tracking-tight text-foreground">
                              <span className="mr-1 text-sm font-bold opacity-30">R$</span>
                              {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>

                            <div className="relative">
                              {qty > 0 ? (
                                <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary p-1 animate-in zoom-in duration-300">
                                  <button
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-sm transition-transform hover:text-primary active:scale-90"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateQuantity(product.id, qty - 1);
                                    }}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-4 text-center text-sm font-black text-foreground">{qty}</span>
                                  <button
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-transform active:scale-90"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAdd(product);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAdd(product);
                                  }}
                                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-90"
                                >
                                  <Plus className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="relative h-28 w-28 shrink-0">
                          <div className="h-full w-full overflow-hidden rounded-[24px] bg-secondary shadow-premium transition-transform duration-500 group-hover:-translate-y-1">
                            <MediaImage
                              src={getPrimaryProductImage(product)}
                              alt={product.name || 'Produto da loja'}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                              fallback={
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                                  <Utensils className="h-8 w-8" />
                                </div>
                              }
                            />
                          </div>
                          <div className="pointer-events-none absolute inset-x-2 -bottom-2 h-4 rounded-full bg-foreground/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
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
        onAddToCart={(product, quantity) => {
          for (let index = 0; index < quantity; index += 1) {
            handleAdd(product);
          }
        }}
        initialQuantity={selectedProduct ? getItemQty(selectedProduct.id) : 1}
      />
    </MarketplaceLayout>
  );
}
