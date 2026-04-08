import { useNavigate } from "react-router-dom";
import { Company } from "@/types/database";
import { Store } from "lucide-react";

interface TopRatedCarouselProps {
  companies: (Company & { rating?: number })[];
}

export function TopRatedCarousel({ companies }: TopRatedCarouselProps) {
  const navigate = useNavigate();
  const top10 = companies.slice(0, 10);

  if (top10.length === 0) return null;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Queridinhos da Galera</h2>
          <p className="text-[11px] font-bold text-slate-400">Marcas favoritas</p>
        </div>
        <button 
          onClick={() => navigate('/marketplace/search')}
          className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
        >
          Ver mais
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto scrollbar-hide py-2 -mx-4 px-4">
        {top10.map((company) => (
          <button
            key={company.id}
            onClick={() => navigate(`/marketplace/store/${company.id}`)}
            className="flex flex-col items-center gap-3 min-w-[84px] group active:scale-95 transition-all"
          >
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-white shadow-xl shadow-black/5 border border-slate-100 flex items-center justify-center overflow-hidden p-1.5 ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-300">
                {company.logo_url ? (
                  <img 
                    src={company.logo_url} 
                    alt={company.name} 
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full rounded-full bg-slate-50 flex items-center justify-center">
                    <Store className="h-8 w-8 text-slate-300" />
                  </div>
                )}
              </div>
              
              {/* Badge for rating (optional but adds premium feel) */}
              <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg border-2 border-white">
                ★ {company.rating?.toFixed(1) || '4.5'}
              </div>
            </div>
            
            <span className="text-[11px] font-bold text-slate-600 text-center line-clamp-2 max-w-[80px] leading-tight group-hover:text-primary transition-colors">
              {company.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
