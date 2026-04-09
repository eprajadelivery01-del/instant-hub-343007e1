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
        rating: 4.0 + Math.random(),
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
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MarketplaceMenu onSelectCategory={setActiveCategory} onOpenPartnership={setPartnershipType}>
                <button className="h-10 w-10 flex items-center justify-center text-slate-400 p-2.5 rounded-[14px] border border-slate-100 bg-white hover:shadow-md active:scale-95 transition-all">
                   <PanelLeft className="h-5 w-5" />
                </button>
              </MarketplaceMenu>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none mb-1">Diamantino, MT</span>
                 <div className="flex items-center gap-1 group outline-none">
                    <span className="text-sm font-black text-slate-900 truncate max-w-[150px]">
                       {selectedAddress ? `${selectedAddress.street}, ${selectedAddress.number}` : 'Definir endereço'}
                    </span>
                    <ChevronDown className="h-3 w-3 text-primary animate-bounce-slow shrink-0" />
                 </div>
              </div>
            </div>
            <div onClick={() => navigate('/marketplace/profile')} className="h-12 w-12 rounded-[18px] bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-all p-1">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover rounded-[14px]" />
              ) : (
                <div className="h-full w-full bg-slate-50 rounded-[14px] flex items-center justify-center">
                   <User className="h-5 w-5 text-slate-300" />
                </div>
              )}
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="O que você quer comer hoje?"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 bg-slate-50/50 border-none shadow-none h-12 rounded-[16px] text-sm font-bold placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 pb-32">
        <div className="mb-10">
           <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Seleção Premium</h4>
           </div>
           <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
              {companies.filter(c => c.isPremium).map(c => (
                <button key={c.id} onClick={() => navigate(`/marketplace/store/${c.id}`)} className="flex flex-col gap-3 min-w-[200px] bg-white border border-slate-100 p-4 rounded-[32px] shadow-sm active:scale-95 transition-all group overflow-hidden relative">
                   <div className="flex items-center gap-3 relative z-10">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                         {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-contain" /> : <Store className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="text-xs font-black truncate text-slate-800">{c.name}</span>
                   </div>
                   <div className="h-24 w-full rounded-2xl overflow-hidden bg-slate-50 relative z-10">
                      {c.banner_url ? (
                        <img src={c.banner_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Store className="h-6 w-6 text-slate-200" /></div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                   </div>
                   <div className="flex items-center justify-between relative z-10 px-1">
                      <div className="flex items-center gap-1">
                         <Star className="h-3 w-3 text-warning fill-warning" />
                         <span className="text-[10px] font-bold text-slate-600">{c.rating.toFixed(1)}</span>
                      </div>
                      <div className="h-1 w-1 rounded-full bg-slate-200" />
                      <span className="text-[10px] font-bold text-slate-400">30-40 min</span>
                   </div>
                </button>
              ))}
           </div>
        </div>

        <div className="mb-10">
           <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2">
             {categories.map(cat => (
               <button
                 key={cat.value}
                 onClick={() => setActiveCategory(cat.value)}
                 className={cn(
                   "flex items-center gap-3 px-6 h-14 rounded-full transition-all duration-300 border font-bold text-sm whitespace-nowrap",
                   activeCategory === cat.value
                     ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/10 scale-105"
                     : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                 )}
               >
                 <cat.icon className={cn("h-5 w-5 transition-transform shrink-0", activeCategory === cat.value ? "scale-110" : "")} />
                 {cat.label}
               </button>
             ))}
           </div>
        </div>

        <div className="mb-12 rounded-[40px] overflow-hidden shadow-2xl shadow-black/5 border border-slate-100 h-60">
           <HeroMapSection />
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Destaques Locais</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-primary/50 mt-1">Excelência em cada entrega</p>
          </div>
          <div className="h-10 px-4 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
            {filtered.length} Lojas
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-[40px] border border-slate-50 p-4 aspect-[1/1.2] animate-pulse">
                <div className="h-12 w-12 bg-slate-50 rounded-2xl mb-4" />
                <div className="h-4 w-3/4 bg-slate-50 rounded-full mb-2" />
                <div className="h-3 w-1/2 bg-slate-50 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
            {filtered.map(company => (
              <StoreTabCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>

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
                          ? 'Acesse milhares de clientes.' 
                          : 'Seja seu próprio chefe.'}
                      </p>
                   </div>
                   <div className="bg-slate-50 p-8 rounded-[32px] space-y-4">
                      <Input placeholder="Seu nome" className="h-14 rounded-2xl bg-white border-none shadow-sm" />
                      <Button onClick={() => { toast.success('Interesse registrado!'); setPartnershipType(null); }} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs">
                         Enviar
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
