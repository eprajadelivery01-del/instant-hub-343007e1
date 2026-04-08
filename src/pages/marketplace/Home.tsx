import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company } from '@/types/database';
import { useAddress } from '@/contexts/AddressContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { HeroMapSection } from '@/components/shared/HeroMapSection';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Star, Clock, ChevronDown, Store, Utensils, Coffee, Pizza, Cake, Sandwich } from 'lucide-react';
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const { addresses, selectedAddress, setSelectedAddressId } = useAddress();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('name');
      setCompanies(data || []);
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
      {/* Header - Premium iFood Style */}
      <div className="bg-primary sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          {/* Address selector */}
          <div className="flex items-center justify-between">
            <Sheet open={addressSheetOpen} onOpenChange={setAddressSheetOpen}>
              <SheetTrigger asChild>
                <button className="flex items-center gap-2 text-white group outline-none">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold opacity-80 uppercase tracking-widest text-white/90">Entregar em</span>
                      <ChevronDown className="h-3 w-3 opacity-70 group-hover:translate-y-0.5 transition-transform" />
                    </div>
                    <p className="text-sm font-black truncate max-w-[200px]">
                      {selectedAddress
                        ? `${selectedAddress.street}, ${selectedAddress.number}`
                        : user ? 'Escolha um endereço' : 'Adicione um endereço'}
                    </p>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[32px] max-h-[85vh] p-0 overflow-hidden border-t-0 shadow-2xl">
                <div className="p-6 pb-2 border-b border-border bg-card">
                  <SheetHeader>
                    <SheetTitle className="text-left text-xl font-black">Onde você quer receber seu pedido?</SheetTitle>
                  </SheetHeader>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] bg-background">
                  {!user ? (
                    <div className="text-center py-10">
                      <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Acesse sua conta</h3>
                      <p className="text-sm text-muted-foreground mb-6">Para ver seus endereços salvos e aproveitar ofertas exclusivas.</p>
                      <Button onClick={() => navigate('/marketplace/login')} className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90">
                        Fazer login ou cadastrar
                      </Button>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-10">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-sm text-muted-foreground mb-6">Você ainda não tem endereços cadastrados.</p>
                      <Button onClick={() => { setAddressSheetOpen(false); navigate('/marketplace/addresses'); }} className="w-full h-12 rounded-2xl font-bold bg-primary">
                        Cadastrar novo endereço
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map(addr => (
                        <button
                          key={addr.id}
                          onClick={() => { setSelectedAddressId(addr.id); setAddressSheetOpen(false); }}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                            selectedAddress?.id === addr.id
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-muted/30 hover:bg-muted/50'
                          }`}
                        >
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            selectedAddress?.id === addr.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-card text-muted-foreground'
                          }`}>
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-foreground truncate">{addr.street}, {addr.number}</p>
                            <p className="text-xs text-muted-foreground truncate">{addr.neighborhood}, {addr.city}</p>
                          </div>
                        </button>
                      ))}
                      <Button
                        variant="ghost"
                        className="w-full h-12 rounded-2xl font-bold text-primary hover:bg-primary/5 mt-2"
                        onClick={() => { setAddressSheetOpen(false); navigate('/marketplace/addresses'); }}
                      >
                        Gerenciar endereços
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {!user && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/marketplace/login')}
                className="text-white hover:bg-white/10 font-bold px-4 h-9 rounded-xl border border-white/20"
              >
                Entrar
              </Button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Buscar lojas ou pratos"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 bg-white border-0 shadow-2xl shadow-black/10 h-12 rounded-2xl text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Promotional Banners Carousel (Mock) */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide py-6 -mx-4 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`min-w-[85%] md:min-w-[400px] h-44 rounded-[28px] overflow-hidden shadow-xl shadow-black/5 relative group cursor-pointer active:scale-[0.98] transition-transform ${
              i === 1 ? 'bg-gradient-to-br from-orange-500 to-red-600' :
              i === 2 ? 'bg-gradient-to-br from-blue-600 to-indigo-700' :
              'bg-gradient-to-br from-emerald-500 to-teal-600'
            }`}>
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              <div className="absolute inset-0 p-6 flex flex-col justify-center gap-1">
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-full w-fit uppercase tracking-wider">Oferta do dia</span>
                <h3 className="text-white text-2xl font-black leading-tight max-w-[70%]">
                  {i === 1 ? 'Pratos com frete grátis!' : 
                   i === 2 ? 'Cupom de R$ 10 no primeiro pedido' : 
                   'Os melhores hambúrgueres da cidade'}
                </h3>
                <p className="text-white/80 text-sm font-bold">Confira as lojas participantes</p>
              </div>
              <div className="absolute bottom-0 right-0 p-4 opacity-20">
                <Store className="h-24 w-24 text-white rotate-12" />
              </div>
            </div>
          ))}
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

        {/* Featured Section */}
        <div className="flex items-center justify-between mt-6 mb-4">
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            Lojas {activeCategory ? `de ${activeCategory}` : 'próximas'}
          </h2>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-xl text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {filtered.length} resultados
          </div>
        </div>

        {/* Store list - Premium Vertical Redesign */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-border">
                <Skeleton className="h-44 w-full" />
                <div className="p-5 flex gap-4">
                  <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            {filtered.map(company => (
              <Link key={company.id} to={`/marketplace/store/${company.id}`} className="group outline-none">
                <div className="bg-white rounded-[32px] overflow-hidden border border-border/50 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-400">
                  <div className="h-40 relative overflow-hidden">
                    {company.banner_url ? (
                      <img 
                        src={company.banner_url} 
                        alt={company.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        loading="lazy" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
                        <Store className="h-16 w-16 text-muted-foreground/10" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                       <span className="bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg shadow-primary/30 uppercase tracking-widest flex items-center gap-1.5">
                         🚀 Entrega Rápida
                       </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  
                  <div className="p-5 flex gap-4">
                    <div className="relative -mt-10 flex-shrink-0">
                      {company.logo_url ? (
                        <div className="p-1 bg-white rounded-2xl shadow-xl shadow-black/5 ring-1 ring-border">
                          <img src={company.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-white shadow-xl shadow-black/5 border border-border flex items-center justify-center">
                          <Store className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-black text-foreground text-base truncate group-hover:text-primary transition-colors">{company.name}</h3>
                        <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 px-2.5 py-1 rounded-xl">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-[11px] font-black">4.5</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold text-muted-foreground/70">
                        <span className="text-foreground/80">{activeCategory || 'Restaurante'}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> 30-45 min
                        </span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-success font-black flex items-center gap-1.5">
                           Frete Grátis
                        </span>
                      </div>
                      
                      {company.description && (
                        <p className="text-[12px] text-muted-foreground mt-2 line-clamp-1 italic font-medium opacity-60">" {company.description} "</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
