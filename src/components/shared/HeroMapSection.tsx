import { useState, useEffect } from "react";
import { UnifiedMap } from "./UnifiedMap";
import { useRegions } from "@/services/regions";
import { X, Map as MapIcon, Maximize2, Navigation, ShoppingBag, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroMapSection() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: regions } = useRegions();

  return (
    <div className="relative w-full h-[220px] rounded-[32px] overflow-hidden shadow-2xl border-4 border-white mb-6 group cursor-pointer" onClick={() => setIsOpen(true)}>
      <div className="absolute inset-0 pointer-events-none z-10">
        <UnifiedMap regions={regions || []} />
      </div>

      {/* Overlay info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-20 flex flex-col justify-end p-6">
        <div className="flex items-center justify-between">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                 <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-90">Sincronizado em tempo real</span>
              </div>
              <h3 className="text-white text-xl font-black tracking-tight leading-none">Explorar Redondezas</h3>
              <p className="text-white/70 text-xs font-bold mt-1">Veja lojas e entregadores ao vivo</p>
           </div>
           
           <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Maximize2 className="h-5 w-5" />
           </div>
        </div>
      </div>

      {/* Interactive Full-screen Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          
          <div className="absolute inset-4 md:inset-10 bg-background rounded-[40px] shadow-2xl overflow-hidden border border-border flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between bg-card text-card-foreground">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <MapIcon className="h-6 w-6" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black tracking-tight">Mapa de Serviços</h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Mapa Pró-Já e Marketplace</p>
                 </div>
              </div>
              
              <button 
                onClick={() => setIsOpen(false)}
                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 relative">
              <UnifiedMap regions={regions || []} interactive />
              
              {/* Floating Legend */}
              <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-80 bg-background/80 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/20">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Legenda do Mapa</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center text-success"><ShoppingBag className="h-4 w-4" /></div>
                      <span className="text-xs font-bold">Lojas Abertas</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary"><Navigation className="h-4 w-4" /></div>
                      <span className="text-xs font-bold">Entregadores</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center"><div className="w-4 h-4 bg-[#F59E0B]/20 border border-[#F59E0B]" /></div>
                      <span className="text-xs font-bold">Áreas de Entrega</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center text-info"><Info className="h-4 w-4" /></div>
                      <span className="text-xs font-bold">Sua Localidade</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border-t border-border flex justify-center">
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">NexusPro Ecosystem • Interactive Hero Map</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
