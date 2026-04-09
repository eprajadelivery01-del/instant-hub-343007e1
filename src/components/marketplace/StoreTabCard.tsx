import { useNavigate } from "react-router-dom";
import { Company, Product } from "@/types/database";
import { Star, Clock, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreTabCardProps {
  company: Company & { products: Product[] };
}

export function StoreTabCard({ company }: StoreTabCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/marketplace/store/${company.id}`)}
      className={cn(
        "group relative h-[320px] w-full bg-[#1c1c1e] rounded-[40px] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 cursor-pointer border-2 active:scale-[0.98]",
        company.active 
          ? "border-success/50 shadow-[0_0_12px_rgba(34,197,94,0.5)]" 
          : "border-destructive/50 shadow-[0_0_12px_rgba(239,68,68,0.5)] grayscale-[0.6] opacity-70"
      )}
    >
      {/* Status Bolinha - Apenas a bolinha, sem ícone atrás */}
      <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
        <div className={cn(
          "h-3 w-3 rounded-full",
          company.active ? "bg-success animate-pulse" : "bg-destructive"
        )} />
      </div>





      {/* Minimal Header (Sem ícone, apenas nome e status lateral) */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3 overflow-hidden ml-6">
           <h3 className="text-white text-sm font-black truncate max-w-[140px] tracking-tight">{company.name}</h3>
        </div>
      </div>


      {/* Main Content (Miniature Store Preview) */}
      <div className="pt-14 p-4 h-full flex flex-col gap-3">
         {/* Store Brief Info */}
         <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-1 bg-yellow-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black">
                  <Star className="h-3 w-3 fill-current" />
                  <span>4.8</span>
               </div>
               <span className="text-[10px] font-bold text-white/40">30-45 min</span>
            </div>
         </div>

         {/* Products Mini Grid (The "Browser Preview" part) */}
         <div className="flex-1 grid grid-cols-2 gap-2 p-1 overflow-hidden">
            {(company.products || []).length > 0 ? (
              company.products.map((product) => (
                <div key={product.id} className="bg-white/5 rounded-[24px] overflow-hidden p-2 flex flex-col gap-2 group-hover:bg-white/10 transition-colors animate-in fade-in zoom-in duration-500">
                  <div className="aspect-square w-full rounded-[18px] overflow-hidden bg-black/20">
                    {product.image_urls && product.image_urls.length > 0 ? (
                      <img src={product.image_urls[0]} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : product.image_url ? (
                      <img src={product.image_url} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center opacity-10">
                        <ShoppingBag className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="px-1 overflow-hidden">
                    <p className="text-[9px] text-white/90 font-black truncate leading-none">{product.name}</p>
                    <p className="text-[8px] text-primary font-bold mt-1">R$ {product.price?.toFixed(2)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center opacity-20 py-10">
                 <ShoppingBag className="h-12 w-12 text-white mb-2" />
                 <p className="text-[10px] font-bold text-white">Sem produtos cadastrados</p>
              </div>
            )}
         </div>

         {/* Call to action text (Subtle) */}
         <div className="text-center pb-2">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] group-hover:text-primary transition-colors">Visitar Loja</p>
         </div>
      </div>

      {/* Bottom Subtle Overlay */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>

  );
}
