import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Minus, Plus, Star, Clock, Store as StoreIcon, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, addItem, updateQuantity, company: cartCompany } = useCart();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [compRes, prodRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        supabase.from('products').select('*').eq('company_id', id).eq('active', true).order('category'),
      ]);
      setCompany(compRes.data);
      setProducts(prodRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const categories = [...new Set(products.map(p => p.category))];

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  const getItemQty = (productId: string) => {
    return items.find(i => i.product.id === productId)?.quantity || 0;
  };

  const handleAdd = (product: Product) => {
    if (!user) {
      toast.error('Faça login para adicionar itens');
      navigate('/marketplace/login');
      return;
    }
    if (cartCompany && cartCompany.id !== company?.id) {
      toast('Carrinho limpo! Itens de outra loja foram removidos.');
    }
    addItem(product, company!);
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <Skeleton className="h-56 w-full" />
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      </MarketplaceLayout>
    );
  }

  if (!company) {
    return (
      <MarketplaceLayout>
        <div className="text-center py-16 text-muted-foreground">Loja não encontrada</div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      {/* Hero banner */}
      <div className="relative">
        <div className="h-56 overflow-hidden">
          {company.banner_url ? (
            <img src={company.banner_url} alt={company.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <StoreIcon className="h-16 w-16 text-primary/30" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </div>

        {/* Nav buttons */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <button
            onClick={() => navigate('/marketplace')}
            className="h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-md"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <button className="h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-md">
            <Share2 className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Store info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-end gap-3">
            {company.logo_url && (
              <img src={company.logo_url} alt="" className="h-16 w-16 rounded-2xl object-cover border-2 border-white shadow-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold drop-shadow-lg">{company.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm opacity-90">
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-current text-yellow-400" />
                  4.5
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  30-45 min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {company.description && (
        <div className="px-4 py-3 bg-card border-b border-border">
          <p className="text-sm text-muted-foreground">{company.description}</p>
        </div>
      )}

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="sticky top-0 z-30 bg-card border-b border-border">
          <div className="flex overflow-x-auto scrollbar-hide px-4 gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeCategory === cat
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products by category */}
      <div className="max-w-lg mx-auto">
        {categories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">Nenhum produto disponível</p>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat} className="px-4 py-4">
              <h3 className="text-base font-bold text-foreground mb-3">{cat}</h3>
              <div className="space-y-2">
                {products.filter(p => p.category === cat).map(product => {
                  const qty = getItemQty(product.id);
                  return (
                    <div
                      key={product.id}
                      className="bg-card rounded-2xl p-3 flex gap-3 shadow-sm active:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{product.name}</h4>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-bold text-foreground">
                            R$ {(product.price || 0).toFixed(2).replace('.', ',')}
                          </p>
                          {qty === 0 ? (
                            <button
                              onClick={() => handleAdd(product)}
                              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                className="h-7 w-7 rounded-full border border-primary text-primary flex items-center justify-center active:scale-90 transition-transform"
                                onClick={() => updateQuantity(product.id, qty - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-bold text-sm w-6 text-center">{qty}</span>
                              <button
                                className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
                                onClick={() => handleAdd(product)}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name || ''}
                          className="h-24 w-24 rounded-xl object-cover flex-shrink-0"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </MarketplaceLayout>
  );
}
