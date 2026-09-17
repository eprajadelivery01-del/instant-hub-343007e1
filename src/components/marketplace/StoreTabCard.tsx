import { useNavigate } from 'react-router-dom';
import { Company, Product } from '@/types/database';
import { ArrowRight, Clock3, ShoppingBag, Star, Store as StoreIcon } from 'lucide-react';
import { WhatsAppIcon } from '@/components/marketplace/WhatsAppOrderDialog';
import { cn } from '@/lib/utils';
import { MediaImage } from '@/components/shared/MediaImage';
import { getCompanyBannerImage, getCompanyLogoImage, getPrimaryProductImage } from '@/lib/media';
import { getPrepTimeLabel, getStoreStatusLabel, isStoreOpenNow } from '@/lib/storeHours';
import { buildWhatsAppLink, getWhatsAppOnlyStore } from '@/lib/whatsappStores';

interface StoreTabCardProps {
  company: Company & { products: Product[]; rating?: number | null; cover_url?: string | null; category?: string | null; prep_time_min?: number | null; prep_time_max?: number | null };
  estimate?: any;
}

export function StoreTabCard({ company }: StoreTabCardProps) {
  const navigate = useNavigate();
  const prepTimeLabel = getPrepTimeLabel(company);
  const bannerImage = getCompanyBannerImage(company);
  const logoImage = getCompanyLogoImage(company);
  const featuredProducts = (company.products || []).slice(0, 3);
  const rating = Number(company.rating || 5.0);
  const subtitle = company.category || company.description || 'Gastronomia de alto nível';
  const isOpen = isStoreOpenNow(company);
  const statusLabel = getStoreStatusLabel(company);
  const whatsappStore = getWhatsAppOnlyStore(company);
  const whatsappDisplayNumber = whatsappStore
    ? whatsappStore.displayPhone.replace(/^\+55\s*/, '')
    : null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/marketplace/store/${company.id}`)}
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden rounded-[32px] bg-card border border-border text-left transition-all hover:shadow-xl active:scale-[0.98]',
        !isOpen && 'opacity-70 grayscale'
      )}
    >
      {/* Banner - Full Width and Fixed Height, Starting at the very top */}
      <div className="relative h-52 w-full shrink-0 overflow-hidden">
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
            isOpen
              ? 'bg-primary text-primary-foreground border-primary/20' 
              : 'bg-black/60 text-white/70 border-white/10'
          )}>
            {statusLabel}
          </div>

          <div className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs font-bold text-white border border-white/10 backdrop-blur-md">
            <Star className="h-3.5 w-3.5 fill-current text-warning" />
            <span>{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Store Info Over Banner - Standardized */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-5">
          <div className="flex items-end gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-0 shadow-xl ring-2 ring-white/10">
              <MediaImage
                src={logoImage}
                alt={`Logo da loja ${company.name}`}
                className="h-full w-full object-cover bg-white"
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

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          <div className="premium-chip flex items-center justify-center gap-2 rounded-full px-3 py-2">
            <Clock3 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate font-semibold">{prepTimeLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <div key={product.id} className="premium-chip overflow-hidden rounded-[22px] p-2">
                <div className="mb-2 aspect-square overflow-hidden rounded-[16px] bg-secondary">
                  <MediaImage
                    src={getPrimaryProductImage(product)}
                    alt={product.name || 'Produto da loja'}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ShoppingBag className="h-5 w-5 opacity-50" />
                      </div>
                    }
                  />
                </div>
                <p className="truncate text-xs font-medium text-foreground">{product.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  R$ {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))
          ) : whatsappStore ? (
            <div className="premium-chip col-span-3 flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[24px] text-center">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                Pedir pelo WhatsApp
              </p>
              <p className="text-sm font-bold text-foreground">{whatsappDisplayNumber}</p>
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    buildWhatsAppLink(whatsappStore.phone, whatsappStore.defaultMessage),
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    window.open(
                      buildWhatsAppLink(whatsappStore.phone, whatsappStore.defaultMessage),
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }
                }}
                className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1fb857]"
              >
                <WhatsAppIcon className="h-4 w-4 fill-white" />
                Chamar no WhatsApp
              </span>
            </div>
          ) : (
            <div className="premium-chip col-span-3 flex min-h-[112px] flex-col items-center justify-center rounded-[24px] text-center text-muted-foreground">
              <ShoppingBag className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-xs text-muted-foreground">Cardápio em atualização</p>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Visitar loja</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">Cardápio, combos e promoções</p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </button>
  );
}
