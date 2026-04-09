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
import { StoreTabCard } from '@/components/marketplace/StoreTabCard';
import { MarketplaceMenu } from '@/components/marketplace/MarketplaceMenu';
import { Search, MapPin, Star, Clock, ChevronDown, Store, Utensils, Coffee, Pizza, Cake, Sandwich, User, PanelLeft, X, Sparkles } from 'lucide-react';
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
      const processed = (data || []).map((c, index) => ({
        ...c,
        products: (c.products || []).slice(0, 4),
        rating: 4.5 + (Math.random() * 0.5),
        isPremium: index < 5
      })).sort((a, b) => b.rating - a.rating);
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
      {/* Premium V3 Immersive Header */}
      <div className="bg-white/80 border-b border-slate-100 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-4 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <MarketplaceMenu onSelectCategory={setActiveCategory} onOpenPartnership={setPartnershipType}>
                <button className="h-12 w-12 flex items-center justify-center text-slate-500 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-primary/20 active:scale-95 transition-all">
                   <PanelLeft className="h-5 w-5" />
                </button>
              </MarketplaceMenu>
              <div className="flex flex-col">
                 <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70 leading-none">Diamantino Excellence</span>
                 </div>
                 <button onClick={() => navigate('/marketplace/addresses')} className="flex items-center gap-1 group outline-none">
                    <span className="text-sm font-black text-slate-900 truncate max-w-[180px]">
                       {selectedAddress ? `${selectedAddress.street}, ${selectedAddress.number}` : 'Definir endereço'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-primary group-hover:translate-y-0.5 transition-transform shrink-0" />
                 </button>
              </div>
            </div>

            <div 
              onClick={() => navigate('/marketplace/profile')}
              className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-premium flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-all p-1"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover rounded-xl" />
              ) : (
                <div className="h-full w-full bg-slate-50 rounded-xl flex items-center justify-center">
                   <User className="h-6 w-6 text-slate-300" />
                </div>
              )}
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Encontre os melhores sabores..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 bg-slate-50 border-transparent shadow-none h-14 rounded-2xl text-sm font-bold placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/5 focus-visible:border-primary/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 pb-32">
        {/* Premium Merchants Slider */}
        <div className="mb-12">
           <div className="flex items-center justify-between mb-5 px-2">
              <div className="flex flex-col">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300">Seleção Diamante</h4>
                <div className="h-1 w-8 bg-primary/20 rounded-full mt-1.5" />
              </div>
           </div>
           <div className="flex gap-5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4">
              {companies.filter(c => c.isPremium).map(c => (
                <button key={c.id} onClick={() => navigate(`/marketplace/store/${c.id}`)} className="flex flex-col gap-4 min-w-[220px] bg-white border border-slate-100 p-5 rounded-[40px] shadow-sm hover:shadow-premium hover:-translate-y-1 active:scale-95 transition-all group overflow-hidden relative">
                   <div className="flex items-center gap-3 relative z-10">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center p-2 overflow-hidden shrink-0">
                         {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-contain" /> : <Store className="h-5 w-5 text-primary" />}
                      </div>
                      <span className="text-sm font-black truncate text-slate-800 tracking-tight">{c.name}</span>
                   </div>
                   <div className="h-28 w-full rounded-[32px] overflow-hidden bg-slate-50 relative z-10">
                      {c.banner_url ? (
                        <img src={c.banner_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20"><Store className="h-8 w-8" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
                   </div>
                   <div className="flex items-center justify-between relative z-10 px-1">
                      <div className="flex items-center gap-1.5 bg-warning/10 px-2 py-1 rounded-full text-warning font-black text-[10px]">
                         <Star className="h-3 w-3 fill-current" />
                         <span>{c.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 py-1">30-45 MIN</span>
                   </div>
                </button>
              ))}
           </div>
        </div>

        {/* Categories Bento Slider */}
        <div className="mb-12">
           <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1">
             {categories.map(cat => (
               <button
                 key={cat.value}
                 onClick={() => setActiveCategory(cat.value)}
                 className={cn(
                   "flex items-center gap-3 px-8 h-16 rounded-[24px] transition-all duration-300 border font-black text-sm whitespace-nowrap",
                   activeCategory === cat.value
                     ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105"
                     : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                 )}
               >
                 <cat.icon className={cn("h-5 w-5 transition-transform shrink-0", activeCategory === cat.value ? "scale-110" : "")} />
                 {cat.label}
               </button>
             ))}
           </div>
        </div>

        {/* Immersive Map Hero */}
        <div className="mb-14 rounded-[48px] overflow-hidden shadow-2xl shadow-black/5 border border-slate-100 h-64 relative group">
           <HeroMapSection />
           <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-[48px]" />
        </div>

        {/* Global Discovery Feed */}
        <div className="flex items-center justify-between mb-10 px-2">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">O Melhor da Região</h2>
            <p className="text-[11px] uppercase tracking-[0.4em] font-black text-primary/60 mt-2">Curadoria É Pra Já</p>
          </div>
          <div className="h-12 px-5 flex items-center justify-center bg-white border border-slate-100 rounded-3xl text-[11px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
            {filtered.length} Lojas
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-[48px] border border-slate-50 p-6 aspect-[1/1.3] animate-pulse">
                <div className="h-14 w-14 bg-slate-100 rounded-3xl mb-5" />
                <div className="h-5 w-3/4 bg-slate-100 rounded-full mb-3" />
                <div className="h-4 w-1/2 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {filtered.map(company => (
              <StoreTabCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>

      {/* Sheets & Dialogs */}
      <Sheet open={!!partnershipType} onOpenChange={(open) => !open && setPartnershipType(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-[48px] border-t-0 p-0 overflow-hidden">
          <div className="h-full flex flex-col bg-[#fdfdfd]">
             <div className="p-8 pb-4 flex items-center justify-between">
                <SheetHeader>
                  <SheetTitle className="text-left flex flex-col items-start gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">Expansão de Ecossistema</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">
                      Seja um {partnershipType === 'merchant' ? 'Parceiro' : 'Entregador'}
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <button onClick={() => setPartnershipType(null)} className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"><X className="h-6 w-6"/></button>
             </div>
             <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-10 scrollbar-hide">
                <div className="space-y-8">
                   <div className={cn(
                     "p-10 rounded-[40px] relative overflow-hidden shadow-xl",
                     partnershipType === 'merchant' ? "bg-slate-900 text-white" : "bg-sunset text-white"
                   )}>
                      <h4 className="text-2xl font-black mb-3 relative z-10 leading-tight">
                        {partnershipType === 'merchant' ? 'Venda mais em Diamantino' : 'Trabalhe com autonomia'}
                      </h4>
                      <p className="text-sm opacity-80 leading-relaxed relative z-10 max-w-sm">
                        {partnershipType === 'merchant' 
                          ? 'Acesse milhares de novos clientes na sua região com as ferramentas de venda e entrega mais modernas do Mato Grosso.' 
                          : 'Seja seu próprio chefe. Ganhe por entrega feita e trabalhe nos horários que você escolher.'}
                      </p>
                      <X className="absolute -bottom-10 -right-10 h-48 w-48 text-white/5 -rotate-12" />
                   </div>
                   <div className="bg-white p-10 rounded-[40px] border border-slate-100 space-y-5 shadow-sm">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-2">Dados de Contato</Label>
                        <Input placeholder="Seu Nome Completo" className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold" />
                        <Input placeholder={partnershipType === 'merchant' ? "Nome Fantasia da Loja" : "Seu WhatsApp (00) 00000-0000"} className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold" />
                      </div>
                      <Button onClick={() => { toast.success('Interesse registrado com sucesso!'); setPartnershipType(null); }} className="w-full h-16 rounded-[24px] bg-primary text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4">
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
