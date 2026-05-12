import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Company, Product } from '@/types/database';
import { useAddress } from '@/contexts/AddressContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StoreTabCard } from '@/components/marketplace/StoreTabCard';
import { MarketplaceMenu } from '@/components/marketplace/MarketplaceMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaImage } from '@/components/shared/MediaImage';
import { Search, Star, ChevronDown, Store, Utensils, Coffee, Pizza, Cake, Sandwich, Pill, ShoppingCart, User, PanelLeft, X, Dog, Beer } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getAvatarImage, getCompanyBannerImage, getCompanyLogoImage } from '@/lib/media';

const categories = [
  { icon: Utensils, label: 'Todos', value: '' },
  { icon: Pizza, label: 'Pizza', value: 'pizza' },
  { icon: Sandwich, label: 'Lanches', value: 'lanches' },
  { icon: ShoppingCart, label: 'Mercado', value: 'mercado' },
  { icon: Pill, label: 'Farmácia', value: 'farmacia' },
  { icon: Beer, label: 'Bebidas', value: 'bebidas' },
  { icon: Cake, label: 'Doces', value: 'doces' },
  { icon: Dog, label: 'Pet Shop', value: 'pet' },
  { icon: Store, label: 'Shopping', value: 'shopping' },
];

const PROFESSIONAL_NAMES: Record<string, string> = {
  'Sushi Master': 'Harumi Sushi',
  'Ice Cream Heaven': 'Gelateria Central',
  'Sweet Dreams': 'Doceria Sonho Meu',
  'Pizza Hut Fake': 'Pizzaria Bella Massa',
  'Burger King Fake': 'Burguer do Chef',
  'Taco Bell Fake': 'Cantina Mexicana',
  'Steak House': 'Grelhados & Cia',
  'Veggie Delight': 'Horta & Sabor',
  'Fruit Fresh': 'Frutaria Tropical',
  'Pasta Palace': 'Cantina Di Roma',
  'Lanchonete Teste': 'Lanchonete da Praça',
};

type MarketplaceCompany = Company & { products: Product[]; rating: number; isPremium?: boolean };

export default function Home() {
  const [companies, setCompanies] = useState<MarketplaceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [partnershipType, setPartnershipType] = useState<'merchant' | 'driver' | null>(null);
  const { selectedAddress } = useAddress();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const fetchCompanies = async () => {
    try {
      const { data } = await supabase.from('companies').select('*, products(*)');
      const processed = (data || []).map((company, index) => {
        let name = company.name;
        if (PROFESSIONAL_NAMES[name]) {
          name = PROFESSIONAL_NAMES[name];
        } else if (name.includes('Fake')) {
          name = name.replace('Fake', '').trim();
        }

        return {
          ...company,
          name,
          active: company.active ?? company.is_active ?? false,
          products: (company.products || []).slice(0, 4),
          rating: company.rating && company.rating > 0 ? company.rating : 4.5 + Math.random() * 0.5,
        };
      }).sort((a, b) => {
        const aOpen = a.is_open === true && (a.active === true || a.is_active === true);
        const bOpen = b.is_open === true && (b.active === true || b.is_active === true);
        
        if (aOpen && !bOpen) return -1;
        if (!aOpen && bOpen) return 1;
        
        // If both have same open status, sort by rating
        return (b.rating || 0) - (a.rating || 0);
      }).map((company, index) => ({
        ...company,
        isPremium: index < 5,
      }));

      setCompanies(processed as MarketplaceCompany[]);
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching companies:", err);
      toast.error("Erro ao carregar lojas");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();

    const channel = supabase
      .channel("companies-realtime-v3")
      .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, (payload) => {
        console.log("Realtime update received (V3):", payload);
        fetchCompanies();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return companies.filter((company) =>
      company.name.toLowerCase().includes(search.toLowerCase()) &&
      (activeCategory === '' || (company.description?.toLowerCase().includes(activeCategory.toLowerCase())) || (company.category?.toLowerCase().includes(activeCategory.toLowerCase())))
    );
  }, [companies, search, activeCategory]);

  const featuredCompanies = useMemo(() => 
    companies.filter((company) => 
      company.isPremium && 
      (activeCategory === '' || (company.description?.toLowerCase().includes(activeCategory.toLowerCase())) || (company.category?.toLowerCase().includes(activeCategory.toLowerCase())))
    ).slice(0, 5), 
  [companies, activeCategory]);

  return (
    <MarketplaceLayout>
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-4 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-4 md:hidden">
            <div className="flex min-w-0 items-center gap-4">
              <MarketplaceMenu onSelectCategory={setActiveCategory} onOpenPartnership={setPartnershipType}>
                <button className="premium-card flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:text-foreground">
                  <PanelLeft className="h-5 w-5" />
                </button>
              </MarketplaceMenu>

              <div className="min-w-0">
                <span className="mb-0.5 block text-xs font-bold text-primary">É Pra Já</span>
                <button onClick={() => navigate('/marketplace/addresses')} className="group flex items-center gap-1 outline-none">
                  <span className="max-w-[200px] truncate text-sm font-semibold text-foreground">
                    {selectedAddress ? `${selectedAddress.street}, ${selectedAddress.number}` : 'Definir endereço'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-y-0.5" />
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate('/marketplace/profile')}
              className="premium-card flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
            >
              <MediaImage
                src={getAvatarImage(profile)}
                alt="Foto do perfil"
                className="h-full w-full object-cover"
                fallback={<User className="h-6 w-6 text-muted-foreground/50" />}
              />
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             {/* Show Address Selector on Desktop too, but styled better */}
             <div className="hidden md:flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ChevronDown className="h-5 w-5" />
                </div>
                <button onClick={() => navigate('/marketplace/addresses')} className="text-left group outline-none">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none mb-1">Entregar em:</span>
                  <span className="block max-w-[300px] truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {selectedAddress ? `${selectedAddress.street}, ${selectedAddress.number}` : 'Definir endereço'}
                  </span>
                </button>
             </div>

             <div className="premium-card relative rounded-[26px] p-1 flex-1 md:max-w-xl">
               <Search className="absolute left-5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
               <Input
                 placeholder="O que você deseja pedir hoje?"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="h-14 rounded-[22px] border-0 bg-transparent pl-12 text-sm font-bold placeholder:text-muted-foreground focus-visible:ring-0"
               />
             </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-4 pb-32 pt-6 sm:px-6">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 px-1">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Destaques</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">Perto de você</h2>
            </div>
          </div>

          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:overflow-visible">
            {featuredCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => navigate(`/marketplace/store/${company.id}`)}
                className={cn(
                  "premium-card premium-card-interactive group flex min-w-[252px] flex-col gap-3 overflow-hidden rounded-[30px] p-4 text-left md:min-w-0",
                  (!company.active || !company.is_open) && "opacity-50 grayscale"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="premium-chip flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl p-2">
                    <MediaImage
                      src={getCompanyLogoImage(company)}
                      alt={`Logo da loja ${company.name}`}
                      className="h-full w-full object-cover"
                      fallback={<Store className="h-5 w-5 text-muted-foreground" />}
                    />
                  </div>
                  <span className="truncate text-sm font-semibold text-foreground">{company.name}</span>
                </div>

                <div className="relative h-28 w-full overflow-hidden rounded-[24px] bg-secondary">
                  <MediaImage
                    src={getCompanyBannerImage(company)}
                    alt={`Capa da loja ${company.name}`}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    fallback={<div className="flex h-full w-full items-center justify-center text-muted-foreground/40"><Store className="h-8 w-8" /></div>}
                  />
                  <div className="hero-image-overlay absolute inset-0" />
                </div>

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1 text-xs font-semibold text-warning">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{company.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">30-45 min</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setActiveCategory(category.value)}
                className={cn(
                  'flex h-12 items-center gap-2 whitespace-nowrap rounded-xl border px-5 text-xs font-semibold transition-all',
                  activeCategory === category.value
                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'premium-card text-muted-foreground hover:border-primary/20'
                )}
              >
                <category.icon className="h-4 w-4 shrink-0" />
                {category.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4 px-1">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Lojas</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">As melhores da cidade</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              {filtered.length}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="premium-card rounded-[32px] p-4">
                  <Skeleton className="h-52 rounded-[28px]" />
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <Skeleton className="h-24 rounded-[22px]" />
                    <Skeleton className="h-24 rounded-[22px]" />
                    <Skeleton className="h-24 rounded-[22px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((company) => (
                <StoreTabCard key={company.id} company={company} />
              ))}
            </div>
          ) : (
            <div className="premium-card flex flex-col items-center rounded-[32px] px-6 py-14 text-center">
              <Store className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhuma loja encontrada</h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">Ajuste a busca ou troque a categoria para ver mais opções.</p>
            </div>
          )}
        </section>
      </div>

      <Sheet open={!!partnershipType} onOpenChange={(open) => !open && setPartnershipType(null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-hidden rounded-t-[40px] border-none p-0">
          <div className="flex h-full flex-col bg-card">
            <div className="flex items-center justify-between border-b border-border px-8 pb-4 pt-8">
              <SheetHeader>
                <SheetTitle className="text-left flex flex-col items-start gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Parceria É Pra Já</span>
                  <span className="text-2xl font-black tracking-tighter text-foreground">
                    Seja um {partnershipType === 'merchant' ? 'Parceiro' : 'Entregador'}
                  </span>
                </SheetTitle>
              </SheetHeader>
              <button onClick={() => setPartnershipType(null)} className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-8 py-8 scrollbar-hide">
              <div className={cn(
                'rounded-[32px] p-8 text-primary-foreground',
                partnershipType === 'merchant' ? 'bg-foreground' : 'bg-primary'
              )}>
                <h4 className="text-xl font-black leading-tight">
                  {partnershipType === 'merchant' ? 'Cresça o seu negócio' : 'Trabalhe com autonomia'}
                </h4>
                <p className="mt-2 max-w-xs text-xs leading-relaxed opacity-80">
                  {partnershipType === 'merchant'
                    ? 'Venda mais em Diamantino com uma vitrine premium e experiência superior.'
                    : 'Tenha liberdade para rodar quando quiser e ganhar por entrega realizada.'}
                </p>
              </div>

              <div className="premium-card space-y-5 rounded-[32px] p-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="ml-2 text-[10px] font-black uppercase text-muted-foreground">Nome Completo</Label>
                    <Input placeholder="Seu nome" className="h-14 rounded-2xl border-border/70 bg-background px-6 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="ml-2 text-[10px] font-black uppercase text-muted-foreground">Seu WhatsApp</Label>
                    <Input placeholder="(00) 00000-0000" className="h-14 rounded-2xl border-border/70 bg-background px-6 font-bold" />
                  </div>
                </div>

                <Button
                  onClick={() => {
                    toast.success('Interesse registrado com sucesso!');
                    setPartnershipType(null);
                  }}
                  className="h-14 w-full rounded-2xl text-xs font-black uppercase tracking-widest"
                >
                  Enviar interesse
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MarketplaceLayout>
  );
}
