import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';
import { useCart } from '@/contexts/CartContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Star, Clock, Store as StoreIcon, Share2, Utensils, Search, Info, Ticket, AlertCircle } from 'lucide-react';
import { cn, isStoreOpenBySchedule } from '@/lib/utils';
import { ProductDetailDialog } from '@/components/marketplace/ProductDetailDialog';
import { MediaImage } from '@/components/shared/MediaImage';
import { getCompanyBannerImage, getCompanyLogoImage, getPrimaryProductImage } from '@/lib/media';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDeliveryFee } from '@/utils/freight';
import { Address } from '@/types/database';

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, addItem, updateQuantity } = useCart();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const [dynamicDeliveryFee, setDynamicDeliveryFee] = useState<number | null>(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);
  const [calculatingFee, setCalculatingFee] = useState(false);

  const categoryDisplayNames: Record<string, string> = {
    'sorvetes': 'Sorvetes e Picolés',
    'alcoolicas': 'Bebidas Alcoólicas',
    'destilados': 'Destilados',
    'Destilados': 'Destilados',
    'porcoes': 'Porções',
    'perfumaria': 'Perfumaria',
    'padaria': 'Padaria',
    'Hamburguer': 'Hambúrguer Artesanal',
    'hamburguer_artesanal': 'Hambúrguer Artesanal',
    'Assados': 'Assados',
    'Acompanhamentos': 'Acompanhamentos',
    'Marmita': 'Marmita',
    'Mercado': 'Mercado',
    'Farmácia': 'Farmácia',
    'Bebidas': 'Bebidas',
    'Doces': 'Doces',
    'Pet Shop': 'Pet Shop',
    'Shopping': 'Shopping',
    'Outros': 'Outros',
    'Pizza': 'Pizza',
    'Lanches': 'Lanches',
    'Destaques': '🌟 Destaques'
  };

  const formatCategoryName = (cat: string) => categoryDisplayNames[cat] || cat;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchStore = async () => {
      const [companyResponse, productResponse] = await Promise.all([
        supabase.from('companies').select('id, name, description, category, rating, is_open, active, is_active, delivery_fee, delivery_regions_pricing, show_in_marketplace, city, state, banner_url, cover_url, logo_url, business_hours, prep_time_min, prep_time_max, created_at, user_id').eq('id', id).single(),
        supabase.from('products').select('*').eq('company_id', id).eq('active', true).order('category').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      ]);

      if (companyResponse.data) {
        const companyData = companyResponse.data;
        setCompany({
          ...companyData,
          // is_open do banco é a fonte da verdade — o lojista abriu/fechou manualmente.
          // O horário de funcionamento é apenas informativo.
          is_open: companyData.is_open === true
        } as Company);
      }
      setProducts(productResponse.data || []);
      setLoading(false);
    };

    fetchStore();
  }, [id]);

  useEffect(() => {
    if (!user || !company) return;

    const checkDeliveryFee = async () => {
      setCalculatingFee(true);
      try {
        // 1. Busca endereços do usuário
        const { data: addresses } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (addresses && addresses.length > 0) {
          const addr = addresses[0]; // Pega o mais recente
          if (addr.latitude && addr.longitude) {
            // CALCULO OBRIGATÓRIO PELA REGIÃO (ADMIN PANEL MAP)
            const result = await calculateDeliveryFee(addr.latitude, addr.longitude, supabase, (company as any).delivery_regions_pricing);
            
            if (result.fee !== null) {
              // Se achou uma região no mapa, ESSE VALOR É A LEI
              setDynamicDeliveryFee(result.fee);
              setIsOutOfRange(false);
            } else if (result.isOutOfRange) {
              // Se o mapa diz que tá fora, tá fora
              setDynamicDeliveryFee(null);
              setIsOutOfRange(true);
            } else {
              // Fallback apenas se não houver regiões cadastradas no mapa
              setDynamicDeliveryFee(company.delivery_fee);
              setIsOutOfRange(false);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao calcular frete:', err);
      } finally {
        setCalculatingFee(false);
      }
    };

    checkDeliveryFee();
  }, [user, company]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((product) => product.category))];
    const hasFeatured = products.some(p => p.is_featured);
    return hasFeatured ? ['Destaques', ...cats] : cats;
  }, [products]);
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

  const formatBusinessHours = (hours: string | null) => {
    if (!hours) return null;
    if (hours.startsWith('[')) {
      try {
        const parsed = JSON.parse(hours);
        const today = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][new Date().getDay()];
        const schedule = parsed.find((d: any) => d.day === today);
        if (schedule) {
          if (!schedule.active) return 'Fechado hoje';
          return `${schedule.start} às ${schedule.end}`;
        }
      } catch (e) { return hours; }
    }
    return hours;
  };

  const formattedHours = formatBusinessHours(company.business_hours);

  return (
    <MarketplaceLayout hideNav={false}>
      <div className={cn(
        'fixed left-0 right-0 top-0 z-[100] flex h-16 items-center border-b border-border/60 bg-background/90 px-6 backdrop-blur-xl transition-all duration-300 md:hidden',
        isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      )}>
        <button onClick={() => navigate('/marketplace')} className="mr-4">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-black text-foreground">{company.name}</h2>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <div className={cn("h-2 w-2 rounded-full shadow-sm", company.is_open ? "bg-success animate-pulse" : "bg-destructive")} />
            <span className={company.is_open ? "text-success" : "text-destructive"}>
              {company.is_open ? 'Aberto' : 'Fechado no momento'}
            </span>
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
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/15 text-primary-foreground backdrop-blur-xl transition-all hover:bg-background/25 md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-3 ml-auto">
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/15 text-primary-foreground backdrop-blur-xl transition-all hover:bg-background/25">
                <Search className="h-5 w-5" />
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/15 text-primary-foreground backdrop-blur-xl transition-all hover:bg-background/25">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-12 rounded-t-[32px] border-none bg-background px-6 pt-6 pb-6 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex items-start justify-between">
            <div className="flex flex-col pr-4">
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{company.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-muted-foreground">
                <span className="text-primary">{company.city || 'Diamantino'}</span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>{storeCategory}</span>
                {company.business_hours && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formattedHours}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="relative shrink-0">
              <div className="rounded-[24px] bg-background p-0 shadow-xl border border-border/50 overflow-hidden">
                <MediaImage
                  src={companyLogo}
                  alt={`Logo da loja ${company.name}`}
                  className="h-16 w-16 object-cover"
                  fallback={
                    <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-secondary">
                      <StoreIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  }
                />
              </div>
              <div className={cn(
                'absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-background shadow-sm',
                company.active ? 'bg-success' : 'bg-destructive'
              )}>
                <div className={cn('h-1.5 w-1.5 rounded-full bg-white')} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <div className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 px-3 py-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500">{Number(company.rating || 5.0).toFixed(1)}</span>
              <span className="text-[10px] text-amber-600/70 dark:text-amber-500/70 font-medium">({(company as any).rating_count || 0})</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">{(company as any).prep_time_min ?? 30}-{(company as any).prep_time_max ?? 45} min</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Ver mais</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary border border-primary/20">
              <Ticket className="h-3.5 w-3.5" />
              Cupons disponíveis
            </div>
            {isOutOfRange ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[10px] font-bold text-destructive border border-destructive/20">
                <AlertCircle className="h-3 w-3" />
                Fora da área de entrega
              </div>
            ) : calculatingFee ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground animate-pulse">
                <Clock className="h-3 w-3" />
                Calculando entrega...
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground">
                <StoreIcon className="h-3 w-3" />
                {dynamicDeliveryFee !== null 
                  ? `Entrega ${dynamicDeliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` 
                  : (company.delivery_fee ? `Entrega ${company.delivery_fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Calcular entrega')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-background px-6 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-secondary/50 px-1 border border-border/50">
          <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar no cardápio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-2xl border-0 bg-transparent pl-12 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/60 transition-all duration-500">
          <div className="flex overflow-x-auto px-6 scrollbar-hide">
            <div className="flex min-w-full gap-6">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category);
                    const element = document.getElementById(category);
                    if (element) {
                      const yOffset = -50;
                      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    'whitespace-nowrap py-4 text-sm font-semibold transition-all relative',
                    activeCategory === category
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {formatCategoryName(category)}
                  {activeCategory === category && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] rounded-t-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 pb-40">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/50">
              <Utensils className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-base font-bold tracking-tight">Nenhum prato por enquanto</p>
          </div>
        ) : (
          <>
            {!company.is_open && (
              <div className="mt-8 mb-2 animate-in fade-in slide-in-from-top-4 duration-700 px-2">
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center mb-1">
                    <Clock className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="text-lg font-black text-destructive uppercase tracking-tight">Loja Fechada</h3>
                  <p className="max-w-xs text-sm text-destructive/70 font-medium">
                    {formattedHours ? `Esta loja atende das: ${formattedHours}` : 'Esta loja não está aceitando pedidos agora.'}
                  </p>
                </div>
              </div>
            )}
            {categories.map((category) => {
            const categoryProducts = category === 'Destaques' 
              ? filteredProducts.filter(p => p.is_featured)
              : filteredProducts.filter((product) => product.category === category);
            if (categoryProducts.length === 0 && searchQuery) return null;

            return (
              <div key={category} id={category} className="animate-in fade-in slide-in-from-bottom-4 duration-700 first:pt-6 pt-10">
                <div className="mb-4 px-2">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">{formatCategoryName(category)}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {categoryProducts.map((product) => {
                    const qty = getItemQty(product.id);
                    return (
                        <div
                        key={product.id}
                        className="group flex cursor-pointer gap-4 bg-background p-4 hover:bg-secondary/20 transition-all active:scale-[0.99]"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                          <div>
                            <h4 className="mb-1 text-[15px] font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="line-clamp-2 text-[13px] font-medium leading-snug text-muted-foreground/80">
                                {product.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-[15px] font-extrabold text-foreground">
                              {Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>

                            {qty > 0 && (
                              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1">
                                <span className="text-[11px] font-bold text-primary">{qty} no carrinho</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="relative h-24 w-24 shrink-0">
                          <div className="h-full w-full overflow-hidden rounded-xl bg-secondary/30">
                            <MediaImage
                              src={getPrimaryProductImage(product)}
                              alt={product.name || 'Produto'}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              fallback={
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground/30 text-2xl">
                                  🍛
                                </div>
                              }
                            />
                          </div>
                          {qty === 0 && company.is_open && (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedProduct(product);
                              }}
                              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border shadow-lg text-primary hover:scale-110 transition-transform"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </>
        )}
      </div>

      <ProductDetailDialog
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isClosed={!company.is_open}
        onAddToCart={(product, quantity, options, note) => {
          if (company) addItem(product, company, options, quantity, note);
        }}
        initialQuantity={selectedProduct ? getItemQty(selectedProduct.id) : 1}
      />
    </MarketplaceLayout>
  );
}
