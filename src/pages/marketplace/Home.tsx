import React, { useEffect, useState } from 'react';
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
import { Search, MapPin, Star, Clock, ChevronDown, Store, Utensils, Coffee, Pizza, Cake, Sandwich, User, PanelLeft, X } from 'lucide-react';
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
  const [partnershipType, setPartnershipType] = useState<'merchant' | 'driver' | null>(null);
  const { addresses, selectedAddress, setSelectedAddressId } = useAddress();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase
        .from('companies')
        .select('*, products(*)');

      
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
           <div className="flex items-center gap-4">
              <MarketplaceMenu 
                onSelectCategory={(cat) => setActiveCategory(cat)}
                onOpenPartnership={(type) => setPartnershipType(type)}
              >
                <button className="h-10 w-10 flex items-center justify-center text-slate-400 p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md active:scale-95 transition-all">
                   <PanelLeft className="h-5 w-5" />
                </button>
              </MarketplaceMenu>

              <div className="flex items-center gap-1 group cursor-pointer" onClick={() => navigate('/marketplace')}>
                 <span className="text-3xl font-black tracking-tighter bg-sunset bg-clip-text text-transparent transform group-hover:scale-105 transition-transform">É Pra Já</span>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div 
                onClick={() => navigate('/marketplace/profile')}
                className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-all"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
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
          <div className="flex flex-col items-center py-20 text-center animate-in fade-in slide-in-from-bottom duration-700">
            <div className="relative mb-8">
               <div className="h-40 w-40 bg-sunset/10 rounded-full flex items-center justify-center">
                 <Store className="h-20 w-20 text-primary/40 animate-pulse" />
               </div>
               <div className="absolute -bottom-2 -right-2 h-12 w-12 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                  <Star className="h-6 w-6 text-warning" />
               </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">O É Pra Já está chegando!</h3>
            <p className="text-muted-foreground max-w-[320px] text-sm font-medium leading-relaxed mb-8">
               Estamos preparando as melhores experiências em <span className="text-primary font-bold">{activeCategory || 'sua região'}</span>. Por enquanto, não há lojas nesta categoria.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
               <div className="p-6 rounded-[32px] bg-slate-900 text-white text-left relative overflow-hidden group">
                  <h4 className="font-black text-lg mb-1 relative z-10">Tem uma loja?</h4>
                  <p className="text-[10px] text-white/60 mb-4 relative z-10">Multiplique suas vendas com nossa tecnologia.</p>
                  <Button 
                    onClick={() => setPartnershipType('merchant')}
                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-slate-900 hover:bg-slate-100 transition-colors relative z-10 shadow-sm"
                  >
                     Quero ser parceiro
                  </Button>
                  <Utensils className="absolute -bottom-2 -right-2 h-16 w-16 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform" />
               </div>
               
               <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-black/5 text-left relative overflow-hidden group">
                  <h4 className="font-black text-lg mb-1 text-slate-800 relative z-10">Quer entregar?</h4>
                  <p className="text-[10px] text-slate-400 mb-4 relative z-10">Faça seu próprio horário e ganhe por entrega.</p>
                  <Button 
                    onClick={() => setPartnershipType('driver')}
                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-sunset text-white hover:bg-orange-600 transition-colors relative z-10 shadow-lg shadow-orange-500/10"
                  >
                     Cadastrar agora
                  </Button>
               </div>
            </div>

            <Button 
              onClick={() => { setSearch(''); setActiveCategory(''); }} 
              variant="ghost" 
              className="mt-8 font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              Explorar outras categorias
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

      {/* Partnership Sheets */}
      <Sheet open={!!partnershipType} onOpenChange={(open) => !open && setPartnershipType(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-[40px] border-t-0 p-0 overflow-hidden">
          <div className="h-full flex flex-col bg-[#fdfdfd]">
             <div className="p-8 pb-4 flex items-center justify-between">
                <SheetHeader>
                  <SheetTitle className="text-left flex flex-col items-start gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Expansão É Pra Já</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      Seja um {partnershipType === 'merchant' ? 'Parceiro' : 'Entregador'}
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <button onClick={() => setPartnershipType(null)} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><X className="h-5 w-5"/></button>
             </div>

             <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-10 scrollbar-hide">
                <div className="space-y-6">
                   <div className={cn(
                     "p-8 rounded-[32px] relative overflow-hidden",
                     partnershipType === 'merchant' ? "bg-slate-900 text-white" : "bg-sunset text-white"
                   )}>
                      <h4 className="text-xl font-black mb-2 relative z-10">
                        {partnershipType === 'merchant' ? 'Sua loja em todo lugar' : 'Trabalhe com liberdade'}
                      </h4>
                      <p className="text-sm opacity-80 leading-relaxed relative z-10">
                        {partnershipType === 'merchant' 
                          ? 'Acesse milhares de clientes e aumente seu faturamento com nossas ferramentas de gestão e marketplace.' 
                          : 'Seja seu próprio chefe. Entregue no seu ritmo e ganhe por cada rota finalizada na sua região.'}
                      </p>
                      <X className="absolute -bottom-6 -right-6 h-32 w-32 text-white/5 -rotate-12" />
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                         <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Star className="h-5 w-5" />
                         </div>
                         <div className="flex-1">
                            <p className="text-[10px] font-black uppercase text-slate-400">Vantagem #1</p>
                            <p className="text-sm font-bold text-slate-700">Visibilidade máxima no Marketplace</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                         <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <Clock className="h-5 w-5" />
                         </div>
                         <div className="flex-1">
                            <p className="text-[10px] font-black uppercase text-slate-400">Vantagem #2</p>
                            <p className="text-sm font-bold text-slate-700">Pagamentos rápidos e seguros</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[32px] space-y-6">
                   <div className="text-center">
                      <h5 className="font-black text-slate-900 underline decoration-primary/30 underline-offset-4">Ficou interessado?</h5>
                      <p className="text-xs font-medium text-slate-500 mt-2">Deixe seus dados e entraremos em contato</p>
                   </div>
                   <div className="space-y-3">
                      <Input placeholder="Seu nome" className="h-14 rounded-2xl bg-white border-transparent shadow-sm" />
                      <Input placeholder={partnershipType === 'merchant' ? "Nome da sua Loja" : "Seu WhatsApp"} className="h-14 rounded-2xl bg-white border-transparent shadow-sm" />
                      <Button 
                        onClick={() => {
                          toast.success('Recebemos seu interesse! Entraremos em contato em breve.');
                          setPartnershipType(null);
                        }}
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-sunset text-white hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]"
                      >
                         Enviar interesse
                      </Button>
                   </div>
                </div>
             </div>
          </div>
        </SheetContent>
      </Sheet>
    </MarketplaceLayout>
  );
}
