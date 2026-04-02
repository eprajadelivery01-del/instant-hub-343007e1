import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company } from '@/types/database';
import { useAddress } from '@/contexts/AddressContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
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
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MarketplaceLayout>
      {/* Header - iFood style */}
      <div className="bg-primary px-4 pt-4 pb-6">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Address selector */}
          <Sheet open={addressSheetOpen} onOpenChange={setAddressSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 text-primary-foreground w-full">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[10px] font-medium opacity-80 uppercase tracking-wide">Entregar em</p>
                  <p className="text-sm font-bold truncate flex items-center gap-1">
                    {selectedAddress
                      ? `${selectedAddress.street}, ${selectedAddress.number}`
                      : 'Selecione um endereço'}
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                  </p>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
              <SheetHeader>
                <SheetTitle>Endereço de entrega</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 overflow-y-auto max-h-[50vh]">
                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">Nenhum endereço cadastrado</p>
                    <Button onClick={() => { setAddressSheetOpen(false); navigate('/marketplace/addresses'); }}>
                      Adicionar endereço
                    </Button>
                  </div>
                ) : (
                  <>
                    {addresses.map(addr => (
                      <button
                        key={addr.id}
                        onClick={() => { setSelectedAddressId(addr.id); setAddressSheetOpen(false); }}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          selectedAddress?.id === addr.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            selectedAddress?.id === addr.id ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          <div>
                            {addr.label && (
                              <span className="text-xs font-bold text-primary uppercase">{addr.label}</span>
                            )}
                            <p className="font-medium text-foreground text-sm">{addr.street}, {addr.number}</p>
                            <p className="text-xs text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => { setAddressSheetOpen(false); navigate('/marketplace/addresses'); }}
                    >
                      Gerenciar endereços
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lojas e produtos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-card border-0 shadow-lg shadow-black/10 h-11 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-2">
        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-4">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex flex-col items-center gap-1.5 min-w-[64px] transition-all ${
                activeCategory === cat.value
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${
                activeCategory === cat.value
                  ? 'bg-primary/10 ring-2 ring-primary'
                  : 'bg-card shadow-sm'
              }`}>
                <cat.icon className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-medium whitespace-nowrap">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Section title */}
        <div className="flex items-center justify-between mt-2 mb-3">
          <h2 className="text-lg font-bold text-foreground">Lojas próximas</h2>
          <span className="text-xs text-muted-foreground">{filtered.length} lojas</span>
        </div>

        {/* Store list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm">
                <Skeleton className="h-36 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Store className="h-10 w-10" />
            </div>
            <p className="text-base font-semibold text-foreground">Nenhuma loja encontrada</p>
            <p className="text-sm mt-1">Tente buscar por outro nome</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filtered.map(company => (
              <Link key={company.id} to={`/marketplace/store/${company.id}`}>
                <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.99]">
                  <div className="h-36 relative overflow-hidden">
                    {company.banner_url ? (
                      <img src={company.banner_url} alt={company.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <Store className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-md">
                        ENTREGA GRÁTIS
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex gap-3">
                    <div className="flex-shrink-0">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border border-border" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center border border-border">
                          <Store className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm">{company.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 text-warning font-semibold">
                          <Star className="h-3 w-3 fill-current" /> 4.5
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> 30-45 min
                        </span>
                        {company.city && (
                          <>
                            <span>•</span>
                            <span className="truncate">{company.city}</span>
                          </>
                        )}
                      </div>
                      {company.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{company.description}</p>
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
