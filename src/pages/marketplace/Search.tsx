import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import MarketplaceLayout from "@/components/marketplace/MarketplaceLayout";
import { Input } from "@/components/ui/input";
import { StoreTabCard } from "@/components/marketplace/StoreTabCard";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";

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
          rating: c.rating || 4.5 + Math.random() * 0.5,
          isPremium: false
        })).sort((a, b) => {
          const aOpen = a.is_open === true;
          const bOpen = b.is_open === true;
          if (aOpen && !bOpen) return -1;
          if (!aOpen && bOpen) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
        setResults(processed);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 500);

    // Realtime subscription for search
    const channel = supabase
      .channel('search-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        // Just invalidate/refetch if needed, but here we wait for next search or keysteoke
      })
      .subscribe();

    return () => {
      clearTimeout(delayDebounceFn);
      supabase.removeChannel(channel);
    };
  }, [search]);

  return (
    <MarketplaceLayout hideNav={false}>
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <div className="relative w-full mx-auto">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar lojas ou pratos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-10 bg-card border-border h-12 rounded-xl text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-secondary flex items-center justify-center">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="w-full mx-auto px-4 pt-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Buscando...</p>
          </div>
        ) : search.length > 0 && results.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-4">
            <div className="h-20 w-20 bg-secondary rounded-full flex items-center justify-center mb-4">
              <SearchIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum resultado</h3>
            <p className="text-sm text-muted-foreground">Não encontramos nada para "{search}"</p>
          </div>
        ) : search.length === 0 ? (
          <div className="space-y-6 py-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3 px-1">Sugestões</p>
              <div className="flex flex-wrap gap-2">
                {['Hambúrguer', 'Pizza', 'Saudável', 'Japonesa', 'Bebidas', 'Doces'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearch(tag)}
                    className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-medium text-foreground hover:border-primary/30 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <h3 className="text-lg font-bold mb-1">Cansou de procurar?</h3>
              <p className="text-sm opacity-80 mb-4">Explore os queridinhos na página inicial.</p>
              <button
                onClick={() => navigate('/marketplace')}
                className="h-9 px-4 rounded-lg bg-primary-foreground text-primary text-xs font-semibold"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((company) => (
              <StoreTabCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
