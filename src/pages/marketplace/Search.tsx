import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Company } from "@/types/database";
import MarketplaceLayout from "@/components/marketplace/MarketplaceLayout";
import { Input } from "@/components/ui/input";
import { StoreTabCard } from "@/components/marketplace/StoreTabCard";
import { Search as SearchIcon, X, SlidersHorizontal, Loader2 } from "lucide-react";

export default function Search() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (search.length > 2) {
        setLoading(true);
        const { data } = await supabase
          .from("companies")
          .select("*, products(*)")
          .ilike("name", `%${search}%`)
          .eq("active", true);
        
        const processed = (data || []).map((c) => ({
          ...c,
          products: (c.products || []).slice(0, 4),
          rating: 4.0 + Math.random(),
          isPremium: false
        }));
        
        setResults(processed);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return (
    <MarketplaceLayout hideNav={false}>
      <div className="bg-white sticky top-0 z-50 px-6 py-4 border-b border-slate-100">
        <div className="relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
          <Input
            autoFocus
            placeholder="Buscar lojas ou pratos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 pr-12 bg-slate-50 border-none shadow-none h-14 rounded-2xl text-base placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-24">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Buscando as melhores opções...</p>
          </div>
        ) : search.length > 0 && results.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center px-6">
            <div className="h-40 w-40 bg-slate-50 rounded-full flex items-center justify-center mb-8">
              <SearchIcon className="h-20 w-20 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Nenhum resultado</h3>
            <p className="text-sm text-slate-500 max-w-[280px]">Não encontramos nada para "{search}". Tente buscar por outros termos.</p>
          </div>
        ) : search.length === 0 ? (
          <div className="space-y-8 py-4">
             <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 mb-4 px-2">Sugestões de busca</h4>
                <div className="flex flex-wrap gap-2">
                   {['Hambúrguer', 'Pizza', 'Saudável', 'Japonesa', 'Bebidas', 'Doces'].map(tag => (
                     <button 
                       key={tag} 
                       onClick={() => setSearch(tag)}
                       className="px-5 py-2.5 rounded-2xl bg-white border border-slate-100 text-xs font-black text-slate-600 hover:border-primary/30 hover:text-primary transition-all shadow-sm"
                     >
                       {tag}
                     </button>
                   ))}
                </div>
             </div>
             
             <div className="p-8 rounded-[40px] bg-sunset text-white relative overflow-hidden group shadow-2xl shadow-orange-500/20">
                <div className="relative z-10">
                   <h3 className="text-2xl font-black mb-1">Cansou de procurar?</h3>
                   <p className="text-white/80 text-sm font-medium mb-6">Explore os queridinhos da galera na página inicial.</p>
                   <button 
                     onClick={() => navigate('/marketplace')}
                     className="h-11 px-6 rounded-xl bg-white text-primary text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                   >
                      Voltar ao Início
                   </button>
                </div>
                <SlidersHorizontal className="absolute -bottom-6 -right-6 h-32 w-32 text-white/10 rotate-12" />
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {results.map((company) => (
              <StoreTabCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
