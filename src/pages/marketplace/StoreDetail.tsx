import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Minus, Plus, ShoppingCart, Store as StoreIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, addItem, updateQuantity, removeItem, company: cartCompany } = useCart();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getItemQty = (productId: string) => {
    const item = items.find(i => i.product.id === productId);
    return item?.quantity || 0;
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
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
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
      <div className="space-y-6">
        {/* Back + Banner */}
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')} className="absolute top-2 left-2 z-10 bg-card/80 backdrop-blur-sm rounded-full shadow">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-40 rounded-xl overflow-hidden bg-muted">
            {company.banner_url ? (
              <img src={company.banner_url} alt={company.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent">
                <StoreIcon className="h-12 w-12 text-accent-foreground/30" />
              </div>
            )}
          </div>
        </div>

        {/* Store info */}
        <div className="flex items-center gap-4">
          {company.logo_url && (
            <img src={company.logo_url} alt="" className="h-16 w-16 rounded-2xl border-2 border-border object-cover shadow-md" />
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">{company.name}</h2>
            {company.description && <p className="text-sm text-muted-foreground mt-1">{company.description}</p>}
          </div>
        </div>

        {/* Products by category */}
        {categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum produto disponível</p>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat}>
              <h3 className="text-lg font-semibold text-foreground mb-3">{cat}</h3>
              <div className="space-y-3">
                {products.filter(p => p.category === cat).map(product => {
                  const qty = getItemQty(product.id);
                  return (
                    <Card key={product.id} className="p-4 flex gap-4">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name || ''} className="h-20 w-20 rounded-xl object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground">{product.name}</h4>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                        )}
                        <p className="text-primary font-bold mt-2">
                          R$ {(product.price || 0).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end justify-end">
                        {qty === 0 ? (
                          <Button size="sm" onClick={() => handleAdd(product)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(product.id, qty - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-medium w-6 text-center">{qty}</span>
                            <Button size="icon" className="h-8 w-8" onClick={() => handleAdd(product)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
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
