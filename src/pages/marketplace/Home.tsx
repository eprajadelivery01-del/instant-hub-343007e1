import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';
import { useAddress } from '@/contexts/AddressContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { HeroMapSection } from '@/components/shared/HeroMapSection';
import { Input } from '@/components/ui/input';
import { StoreTabCard } from '@/components/marketplace/StoreTabCard';
import { MarketplaceMenu } from '@/components/marketplace/MarketplaceMenu';
import { TopRatedCarousel } from '@/components/marketplace/TopRatedCarousel';
import { Search, MapPin, Star, Clock, ChevronDown, Store, Utensils, Coffee, Pizza, Cake, Sandwich, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const categories = [
  { icon: Utensils, label: 'Todos', value: '' },
  { icon: Pizza, label: 'Pizza', value: 'pizza' },
  { icon: Sandwich, label: 'Lanches', value: 'lanches' },
  { icon: Coffee, label: 'Bebidas', value: 'bebidas' },
  { icon: Cake, label: 'Doces', value: 'doces' },
];

export default function Home() {
  const [companies, setCompanies] = useState<(Company & { products: Product[], rating: number, isPremium?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const { addresses, selectedAddress, setSelectedAddressId } = useAddress();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
      const { data } = await supabase
        .from('companies')
        .select('*, products(*)')
        .eq('active', true);
      
      // Process data: add mock ratings and premium status
      const processed = (data || []).map((c, index) => ({
        ...c,
        products: (c.products || []).slice(0, 4),
        rating: 4.0 + Math.random(), // Mock rating 4.0 - 5.0
        isPremium: index < 5 // First 5 are premium for demo
      })).sort((a, b) => b.rating - a.rating); // Sort by rating
      
      setCompanies(processed as any);
      setLoading(false);
    };
    fetchCompanies();
  }, []);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) &&
    (activeCategory === '' || (c.description?.toLowerCase().includes(activeCategory.toLowerCase())))
  );

  return (
    <MarketplaceLayout>
      {/* minimalist Header - Google Style */}
      <div className="bg-white border-b border-border/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-1 group cursor-pointer" onClick={() => navigate('/marketplace')}>
              <span className="text-3xl font-black tracking-tighter bg-sunset bg-clip-text text-transparent transform group-hover:scale-110 transition-transform">É Pra Já</span>
           </div>
           
           <div className="flex items-center gap-4">
              <MarketplaceMenu>
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-all">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
              </MarketplaceMenu>
           </div>
        </div>
        
        {/* Address selector - Google Subheader style */}
        <div className="px-6 pb-4">
          <button onClick={() => setAddressSheetOpen(true)} className="flex items-center gap-2 group outline-none">
             <MapPin className="h-4 w-4 text-primary" />
             <span className="text-[13px] font-bold text-foreground/80 truncate max-w-[200px]">
                {selectedAddress ? `${selectedAddress.street}, ${selectedAddress.number}` : 'Definir endereço'}
             </span>
             <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {/* Search bar - Google Home style */}
        <div className="relative group mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
          <Input
            placeholder="Buscar lojas ou pratos"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 bg-white border border-border/50 shadow-xl shadow-black/5 h-14 rounded-full text-base placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/20"
          />
        </div>

        {/* Premium Merchants Widgets (Google News Widgets style) */}
        <div className="mb-8">
           <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Promovidos</h4>
           </div>
           <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {companies.filter(c => c.isPremium).map(c => (
                <button key={c.id} onClick={() => navigate(`/marketplace/store/${c.id}`)} className="flex flex-col gap-2 min-w-[140px] bg-white border border-border/40 p-3 rounded-3xl shadow-sm active:scale-95 transition-all">
                   <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center p-1 overflow-hidden shrink-0">
                         {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-contain" /> : <Store className="h-3 w-3 text-primary" />}
                      </div>
                      <span className="text-[11px] font-black truncate text-slate-800">{c.name}</span>
                   </div>
                   <div className="h-16 w-full rounded-2xl overflow-hidden bg-slate-50 relative">
                      {c.banner_url ? (
                        <img src={c.banner_url} className="w-full h-full object-cover opacity-60" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Store className="h-4 w-4 text-slate-200" /></div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
                   </div>
                </button>
              ))}
           </div>
        </div>

        {/* Top Rated Carousel - Queridinhos da Galera */}
        <div className="mb-0">
          <TopRatedCarousel companies={companies} />
        </div>

        {/* Interactive Map Hero */}
        <HeroMapSection />

        {/* Categories Circle Slider */}
        <div className="flex gap-5 overflow-x-auto scrollbar-hide py-4 mb-4">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className="flex flex-col items-center gap-2 group outline-none"
            >
              <div className={cn(
                "h-[72px] w-[72px] rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-black/5 border-2",
                activeCategory === cat.value
                  ? "bg-primary border-primary text-white scale-110 shadow-primary/30"
                  : "bg-white border-transparent text-muted-foreground group-hover:bg-muted/50 group-hover:scale-105"
              )}>
                <cat.icon className={cn("h-8 w-8 transition-transform", activeCategory === cat.value ? "scale-110" : "group-hover:rotate-12")} />
              </div>
              <span className={cn(
                "text-[12px] font-black whitespace-nowrap transition-colors",
                activeCategory === cat.value ? "text-primary" : "text-muted-foreground"
              )}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Discovery Feed Sorting Info */}
        <div className="flex items-center justify-between mt-8 mb-6">
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
               Melhores Lojas
            </h2>
            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50 mt-1">Baseado em avaliações reais</p>
          </div>
          <div className="flex items-center gap-1 px-4 py-1.5 bg-sunset rounded-xl text-[11px] font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20">
            {filtered.length} Resultados
          </div>
        </div>

        {/* Store list - Browser Tab Grid Redesign */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#1c1c1e] rounded-[40px] overflow-hidden aspect-[1/1.2] animate-pulse">
                <div className="h-14 bg-white/5 border-b border-white/10" />
                <div className="p-4 grid grid-cols-2 gap-2">
                   <div className="aspect-square bg-white/5 rounded-[24px]" />
                   <div className="aspect-square bg-white/5 rounded-[24px]" />
                   <div className="aspect-square bg-white/5 rounded-[24px]" />
                   <div className="aspect-square bg-white/5 rounded-[24px]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-32 text-center">
            <div className="h-32 w-32 bg-muted/50 rounded-full flex items-center justify-center mb-6">
              <Store className="h-16 w-16 text-muted-foreground/20" />
            </div>
            <h3 className="text-xl font-black mb-1">Nenhuma loja encontrada</h3>
            <p className="text-muted-foreground max-w-[250px]">Não encontramos nada para "{activeCategory || search}".</p>
            <Button onClick={() => { setSearch(''); setActiveCategory(''); }} variant="link" className="mt-4 font-bold text-primary">
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 pb-24">
            {filtered.map(company => (
              <StoreTabCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
