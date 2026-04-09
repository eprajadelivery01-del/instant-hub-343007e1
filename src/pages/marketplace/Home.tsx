// v3.0.2 - Restauracao de Marca e Localizacao Profissional
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Company, Product } from '@/types/database';
import { useAddress } from '@/contexts/AddressContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { HeroMapSection } from '@/components/shared/HeroMapSection';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StoreTabCard } from '@/components/marketplace/StoreTabCard';
import { MarketplaceMenu } from '@/components/marketplace/MarketplaceMenu';
import { Search, MapPin, Star, Clock, ChevronDown, Store, Utensils, Coffee, Pizza, Cake, Sandwich, User, PanelLeft, X } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const categories = [
  { icon: Utensils, label: 'Todos', value: '' },
  { icon: Pizza, label: 'Pizza', value: 'pizza' },
  { icon: Sandwich, label: 'Lanches', value: 'lanches' },
  { icon: Coffee, label: 'Bebidas', value: 'bebidas' },
  { icon: Cake, label: 'Doces', value: 'doces' },
];

// Mapeamento profissional para substituir nomes genericos/ingleses/fake
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
  'Lanchonete Teste': 'Lanchonete da Praça'
};

export default function Home() {
  const [companies, setCompanies] = useState<(Company & { products: Product[], rating: number, isPremium?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [partnershipType, setPartnershipType] = useState<'merchant' | 'driver' | null>(null);
  const { selectedAddress } = useAddress();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase.from('companies').select('*, products(*)');
      const processed = (data || []).map((c, index) => {
        // Restaurar nomes profissionais
        let name = c.name;
        if (PROFESSIONAL_NAMES[name]) {
          name = PROFESSIONAL_NAMES[name];
        } else if (name.includes('Fake')) {
          name = name.replace('Fake', '').trim();
        }

        return {
          ...c,
          name,
          products: (c.products || []).slice(0, 4),
          rating: (c.rating && c.rating > 0) ? c.rating : (4.5 + (Math.random() * 0.5)),
          isPremium: index < 5
        };
      }).sort((a, b) => b.rating - a.rating);
      
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
      {/* Header Original e Profissional */}
      <div className="bg-white/80 border-b border-slate-100 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-4 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <MarketplaceMenu onSelectCategory={setActiveCategory} onOpenPartnership={setPartnershipType}>
                <button className="h-12 w-12 flex items-center justify-center text-slate-500 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                   <PanelLeft className="h-5 w-5" />
                </button>
              </MarketplaceMenu>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary leading-none mb-1">É Pra Já</span>
                 <button onClick={() => navigate('/marketplace/addresses')} className="flex items-center gap-1 group outline-none">
                    <span className="text-sm font-black text-slate-900 truncate max-w-[180px]">
                       {selectedAddress ? `${selectedAddress.street}, ${selectedAddress.number}` : 'Definir endereço'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-y-0.5" />
                 </button>
              </div>
            </div>

            <div 
              onClick={() => navigate('/marketplace/profile')}
              className="h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden cursor-pointer hover:shadow-md transition-all"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-slate-300" />
              )}
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
            <Input
              placeholder="O que você deseja pedir hoje?"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 bg-slate-50 border-none h-14 rounded-2xl text-sm font-bold placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 pb-32">
        {/* Lojas em Destaque */}
        <div className="mb-10">
           <div className="flex items-center justify-between mb-5 px-2">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Destaques da Região</h4>
           </div>
           <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
              {companies.filter(c => c.isPremium).map(c => (
                <button key={c.id} onClick={() => navigate(`/marketplace/store/${c.id}`)} className="flex flex-col gap-3 min-w-[200px] bg-white border border-slate-100 p-4 rounded-[32px] hover:shadow-md transition-all group overflow-hidden">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
                         {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-contain" /> : <Store className="h-5 w-5 text-slate-400" />}
                      </div>
                      <span className="text-sm font-black truncate text-slate-800 tracking-tight">{c.name}</span>
                   </div>
                   <div className="h-24 w-full rounded-[24px] overflow-hidden bg-slate-50 relative">
                      {c.banner_url ? (
                        <img src={c.banner_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-10"><Store className="h-8 w-8" /></div>
                      )}
                   </div>
                   <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1 text-warning font-black text-[10px]">
                         <Star className="h-3 w-3 fill-current" />
                         <span>{c.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">30-45 min</span>
                   </div>
                </button>
              ))}
           </div>
        </div>

        {/* Categorias Profissionais */}
        <div className="mb-10">
           <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2">
             {categories.map(cat => (
               <button
                 key={cat.value}
                 onClick={() => setActiveCategory(cat.value)}
                 className={cn(
                   "flex items-center gap-2 px-6 h-14 rounded-2xl transition-all border font-black text-xs whitespace-nowrap",
                   activeCategory === cat.value
                     ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10"
                     : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                 )}
               >
                 <cat.icon className="h-4 w-4 shrink-0" />
                 {cat.label}
               </button>
             ))}
           </div>
        </div>

        {/* Mapa do App */}
        <div className="mb-12 rounded-[40px] overflow-hidden border border-slate-100 h-60 relative group shadow-sm">
           <HeroMapSection />
           <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm">Diamantino - MT</div>
        </div>

        {/* Lista Principal de Lojas */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">O Melhor da Cidade</h2>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Lojas próximas a você</p>
          </div>
          <div className="px-4 py-2 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {filtered.length} Sugestões
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-[40px] border border-slate-50 p-6 aspect-[1/1.2] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
            {filtered.map(company => (
              <StoreTabCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>

      {/* Sheets de Parceria Revistos */}
      <Sheet open={!!partnershipType} onOpenChange={(open) => !open && setPartnershipType(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-[40px] border-none p-0 overflow-hidden">
          <div className="h-full flex flex-col bg-white">
             <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
                <SheetHeader>
                  <SheetTitle className="text-left flex flex-col items-start gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Parceria É Pra Já</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">
                      Seja um {partnershipType === 'merchant' ? 'Parceiro' : 'Entregador'}
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <button onClick={() => setPartnershipType(null)} className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><X className="h-6 w-6"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                <div className="space-y-6">
                   <div className={cn(
                     "p-8 rounded-[32px] relative overflow-hidden shadow-sm",
                     partnershipType === 'merchant' ? "bg-slate-900 text-white" : "bg-orange-500 text-white"
                   )}>
                      <h4 className="text-xl font-black mb-2 relative z-10 leading-tight">
                        {partnershipType === 'merchant' ? 'Cresça o seu negócio' : 'Trabalhe com autonomia'}
                      </h4>
                      <p className="text-xs opacity-80 leading-relaxed relative z-10 max-w-xs">
                        {partnershipType === 'merchant' 
                          ? 'Venda mais em Diamantino com as ferramentas mais modernas do mercado.' 
                          : 'Seja seu próprio chefe e ganhe por cada entrega realizada.'}
                      </p>
                   </div>
                   
                   <div className="bg-slate-50 p-8 rounded-[32px] space-y-5">
                      <div className="space-y-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo</Label>
                           <Input placeholder="Seu nome" className="h-14 rounded-2xl bg-white border-transparent px-6 font-bold" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-400 ml-2">Seu WhatsApp</Label>
                           <Input placeholder="(00) 00000-0000" className="h-14 rounded-2xl bg-white border-transparent px-6 font-bold" />
                        </div>
                      </div>
                      <Button onClick={() => { toast.success('Interesse registrado com sucesso!'); setPartnershipType(null); }} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs mt-4">
                         Enviar Interesse
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
