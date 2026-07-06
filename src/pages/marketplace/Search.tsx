import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import MarketplaceLayout from "@/components/marketplace/MarketplaceLayout";
import { Input } from "@/components/ui/input";
import { StoreTabCard } from "@/components/marketplace/StoreTabCard";
import { Search as SearchIcon, X, Loader2, Plus, Store } from "lucide-react";
import { getPrimaryProductImage } from "@/lib/media";
import { MediaImage } from "@/components/shared/MediaImage";
import { useCart } from "@/contexts/CartContext";
import { ProductDetailDialog } from "@/components/marketplace/ProductDetailDialog";
import { Product, Company } from "@/types/database";
import { isStoreOpenNow } from "@/lib/storeHours";
import { SafeAreaHeader } from "@/components/shared/SafeAreaHeader";

export default function Search() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductCompany, setSelectedProductCompany] = useState<Company | null>(null);
  const { items, addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (search.length > 2) {
        setLoading(true);
        // Busca empresas com nãome correspondente OU produtos com nãome/descricao correspondente
        // Para simplificar e garantir que pegue os produtos, vamos buscar todas as lojas ativas
        // e filtrar os produtos não frontend, similar à Home.
        const { data } = await supabase
          .from("companies")
          .select("*, products(*)")
          .eq("active", true)
          .eq("is_active", true); // Handle potential dual boolean flags

        // Se houver dados, combinamos as flags de active
        let activeCompanies = data || [];
        // Fallback for missing is_active/active consistency
        if (activeCompanies.length === 0) {
           const { data: fallbackData } = await supabase
             .from("companies")
             .select("*, products(*)")
             .eq("active", true);
           activeCompanies = fallbackData || [];
        }

        const processed = activeCompanies.map((c) => ({
          ...c,
          products: (c.products || []),
          rating: c.rating || 4.5 + Math.random() * 0.5,
          isPremium: false,
          is_open: isStoreOpenNow(c as any),
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

  const filteredProducts = React.useMemo(() => {
    if (!search || results.length === 0) return [];
    
    const allProducts: (Product & { company: Company })[] = [];
    results.forEach(c => {
      (c.products || []).forEach((p: Product) => {
        if (p.active !== false && p.is_active !== false) {
          allProducts.push({ ...p, company: c });
        }
      });
    });

    return allProducts.filter(p => {
      return (
        (p.name && p.name.toLowerCase().includes(search.toLowerCase())) || 
        (p.description && p.description.toLowerCase().includes(search.toLowerCase())) || 
        (p.company.name && p.company.name.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [results, search]);

  const getItemQty = (productId: string) => items.find((item) => item.product.id === productId)?.quantity || 0;

  return (
    <MarketplaceLayout hideNav={false}>
      <SafeAreaHeader variant="sticky" extraTopRem={0.75} className="z-50 bg-background/95 backdrop-blur-lg px-4 pb-3 border-b border-border">
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
      </SafeAreaHeader>

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
                {['Mercado', 'Farmácia', 'Restaurante', 'Petiscaria', 'Bebidas', 'Shopping'].map(tag => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const qty = getItemQty(product.id);
              return (
                <div
                  key={product.id}
                  className="group flex cursor-pointer gap-4 bg-background p-4 rounded-[32px] border border-border/50 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
                  onClick={() => { setSelectedProduct(product); setSelectedProductCompany(product.company); }}
                >
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-wider line-clamp-1">{product.company.name}</p>
                      <h4 className="mb-1 text-[15px] font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-muted-foreground/80">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[15px] font-extrabold text-foreground">
                        {Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>

                      {qty > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1">
                          <span className="text-[11px] font-bold text-primary">{qty} no carrinho</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative h-24 w-24 shrink-0">
                    <div className="h-full w-full overflow-hidden rounded-xl bg-secondary/30">
                      <MediaImage
                        src={getPrimaryProductImage(product)}
                        alt={product.name || 'Produto'}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        fallback={
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30 text-2xl">
                            🍛
                          </div>
                        }
                      />
                    </div>
                    {qty === 0 && product.company.is_open && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedProduct(product);
                          setSelectedProductCompany(product.company);
                        }}
                        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border shadow-lg text-primary hover:scale-110 transition-transform"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ProductDetailDialog
        product={selectedProduct}
        isOpen={!!selectedProduct && !!selectedProductCompany}
        onClose={() => { setSelectedProduct(null); setSelectedProductCompany(null); }}
        isClosed={selectedProductCompany ? !selectedProductCompany.is_open : false}
        onAddToCart={(product, quantity, options, note) => {
          if (selectedProductCompany) addItem(product, selectedProductCompany as Company, options, quantity, note);
        }}
        initialQuantity={selectedProduct ? getItemQty(selectedProduct.id) : 1}
      />
    </MarketplaceLayout>
  );
}
