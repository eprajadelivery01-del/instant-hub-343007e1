import { useState, useEffect } from "react";
import { UnifiedMap } from "./UnifiedMap";
import { useRegions } from "@/serávices/regions";
import { X, Map as MapIcon, Maximize2, Navigation, ShoppingBag, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroMapSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full h-[220px] rounded-[32px] overflow-hidden shadow-2xl border-4 border-white mb-6 group cursor-pointer" onClick={() => setIsOpen(true)}>
      <div className="absolute inset-0 pointer-events-nãone z-10">
        <UnifiedMap />
      </div>

      {/* Overlay info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-20 flex flex-col justify-end p-6">
        <div className="flex items-center justify-between">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                 <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-90">Sincronizado em tempo real</span>
              </div>
              <h3 className="text-white text-xl font-black tracking-tight leading-nãone">Explorar Redondezas</h3>
              <p className="text-white/70 text-xs font-bold mt-1">Veja lojas e entregadores ao vivo</p>
           </div>
           
           <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Maximize2 className="h-5 w-5" />
           </div>
        </div>
      </div>

      {/* Interactive Full-screen Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] animate-in slide-in-from-bottom duration-300 bg-background" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0">
              <UnifiedMap interactive />
            </div>

            {/* Floating Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-4 md:top-safe md:mt-4 h-12 w-12 rounded-full bg-background/95 backdrop-blur shadow-2xl border border-border/50 flex items-center justify-center text-foreground z-50 active:scale-90 transition-transform"
            >
              <X className="h-6 w-6 stroke-[3]" />
            </button>
            
            {/* Floating Title (Top Left) */}
            <div className="absolute top-6 left-4 md:top-safe md:mt-4 pointer-events-nãone z-50">
              <div className="bg-background/95 backdrop-blur px-5 py-3 rounded-[20px] shadow-2xl border border-border/50">
                <h2 className="text-sm font-black tracking-tight text-foreground">Mapa Interativo</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-success">Tempo Real</span>
                </div>
              </div>
            </div>

            {/* Floating Legend Bottom */}
            <div className="absolute bottom-6 left-4 right-4 md:bottom-safe md:mb-6 z-50">
              <div className="bg-background/95 backdrop-blur-xl p-5 rounded-[28px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-border/60 max-w-sm mx-auto">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-success/15 flex items-center justify-center text-success shrink-0">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground leading-tight">Lojas da Região</h3>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">Veja quais lojas estão aceitando pedidos agora</p>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}
