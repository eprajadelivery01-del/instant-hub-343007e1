import { useNavigate } from 'react-router-dom';
import { Company, Product } from '@/types/database';
import { ArrowRight, Clock3, ShoppingBag, Star, Store as StoreIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaImage } from '@/components/shared/MediaImage';
import { getCompanyBannerImage, getCompanyLogoImage, getPrimaryProductImage } from '@/lib/media';

interface StoreTabCardProps {
  company: Company & { products: Product[]; rating?: number | null; cover_url?: string | null; category?: string | null };
}

export function StoreTabCard({ company }: StoreTabCardProps) {
  const navigate = useNavigate();
  const bannerImage = getCompanyBannerImage(company);
  const logoImage = getCompanyLogoImage(company);
  const featuredProducts = (company.products || []).slice(0, 3);
  const rating = Number(company.rating || 4.8);
  const subtitle = company.category || company.description || 'Gastronomia de alto nível';

  return (
    <button
      type="button"
      onClick={() => navigate(`/marketplace/store/${company.id}`)}
      className={cn(
        'group relative w-full overflow-hidden rounded-[32px] bg-card border border-border text-left transition-all hover:shadow-xl active:scale-[0.98]',
        (!company.active || !company.is_open) && 'opacity-70 grayscale'
      )}
    >
      {/* Banner - Full Width and Fixed Height, Starting at the very top */}
      <div className="relative h-52 w-full overflow-hidden">
        <MediaImage
          src={bannerImage}
          alt={`Capa da loja ${company.name}`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
              <StoreIcon className="h-16 w-16 opacity-40" />
            </div>
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Badges - Uniform Positioning */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
          <div className={cn(
            'rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border shadow-sm',
            company.is_open 
              ? 'bg-primary text-primary-foreground border-primary/20' 
              : 'bg-black/60 text-white/70 border-white/10'
          )}>
            {company.is_open ? 'Aberta agora' : 'Fechada'}
          </div>

          <div className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs font-bold text-white border border-white/10 backdrop-blur-md">
            <Star className="h-3.5 w-3.5 fill-current text-warning" />
            <span>{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Store Info Over Banner - Standardized Original Layout */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-5">
          <div className="flex items-end gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-2 ring-white/10">
              <MediaImage
                src={logoImage}
                alt={`Logo da loja ${company.name}`}
                className="h-full w-full rounded-xl object-contain bg-white"
                fallback={<StoreIcon className="h-7 w-7 text-muted-foreground" />}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-black text-white leading-tight drop-shadow-lg">{company.name}</h3>
              <p className="mt-1 line-clamp-1 text-xs font-medium text-white/80 drop-shadow-lg">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5">
            <Clock3 className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">25-40 min</span>
          </div>
          <div className="rounded-full bg-muted/50 px-3 py-1.5 font-medium text-foreground">
            {company.delivery_fee ? `Entrega R$ ${company.delivery_fee.toFixed(2).replace('.', ',')}` : 'Entrega grátis'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <div key={product.id} className="group/item flex flex-col items-center rounded-[20px] bg-muted/30 p-2 transition-colors hover:bg-muted/50">
                <div className="mb-2 aspect-square w-full overflow-hidden rounded-[14px]">
                  <MediaImage
                    src={getPrimaryProductImage(product)}
                    alt={product.name || 'Produto'}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/item:scale-110"
                    fallback={<ShoppingBag className="h-5 w-5 opacity-50" />}
                  />
                </div>
                <p className="w-full truncate text-[10px] font-medium text-foreground text-center">{product.name}</p>
                <p className="mt-0.5 text-[10px] font-bold text-primary">
                  R$ {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-3 flex min-h-[100px] flex-col items-center justify-center rounded-[20px] bg-muted/30 text-center text-muted-foreground">
              <ShoppingBag className="mb-2 h-6 w-6 opacity-30" />
              <p className="text-[10px] font-medium">Cardápio em atualização</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visitar loja</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">Cardápio completo</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:translate-x-1">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </button>
  );
}
