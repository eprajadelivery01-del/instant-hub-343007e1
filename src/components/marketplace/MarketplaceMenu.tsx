import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Utensils, ShoppingBag, Pill, Beer, Dog, Store, Tag, ChefHat, Star, Ticket, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface MenuTileProps {
  icon: any;
  label: string;
  badge?: string;
  color: string;
  onClick: () => void;
  variant?: 'square' | 'wide';
}

function MenuTile({ icon: Icon, label, badge, color, onClick, variant = 'square' }: MenuTileProps) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 p-4 rounded-[32px] overflow-hidden group transition-all duration-300",
        "bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 active:scale-95",
        variant === 'wide' ? "h-24 flex-row justify-start px-6 gap-6 col-span-2" : "aspect-square"
      )}
    >
      <div className={cn(
        "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:rotate-12",
        color
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex flex-col items-center">
        <span className={cn(
          "text-[12px] font-black uppercase tracking-widest text-slate-700 transition-colors group-hover:text-primary",
          variant === 'wide' && "text-sm text-left items-start"
        )}>
          {label}
        </span>
        {badge && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-lg animate-bounce">
            {badge}
          </span>
        )}
      </div>
      
      {/* Decorative Glow */}
      <div className="absolute -bottom-4 -right-4 h-12 w-12 bg-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

interface MarketplaceMenuProps {
  children: React.ReactNode;
  onSelectCategory?: (category: string) => void;
  onOpenPartnership?: (type: 'merchant' | 'driver') => void;
}

export function MarketplaceMenu({ children, onSelectCategory, onOpenPartnership }: MarketplaceMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleCategoryClick = (category: string) => {
    setIsOpen(false);
    if (onSelectCategory) {
      onSelectCategory(category);
    } else {
      navigate('/marketplace');
    }
  };

  const handlePartnershipClick = (type: 'merchant' | 'driver') => {
    setIsOpen(false);
    onOpenPartnership?.(type);
  };

  const categories = [
    { icon: Utensils, label: "Restaurantes", color: "bg-sunset", value: "restaurante" },
    { icon: ShoppingBag, label: "Mercados", color: "bg-sunset", value: "mercado" },
    { icon: Pill, label: "Farmácias", color: "bg-sunset", value: "farmacia" },
    { icon: Beer, label: "Bebidas", color: "bg-sunset", value: "bebidas" },
    { icon: Dog, label: "Pet Shops", color: "bg-sunset", value: "pet" },
    { icon: Store, label: "Shopping", color: "bg-sunset", value: "shopping" },
  ];

  const highlights = [
    { icon: Tag, label: "Ofertas", badge: "Novo", color: "bg-sunset" },
    { icon: ChefHat, label: "Gourmet", color: "bg-sunset" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-[400px] p-0 border-r-0 rounded-r-[40px] overflow-hidden">
        <div className="h-full flex flex-col bg-[#fdfdfd]">
           <div className="px-8 pt-10 pb-6 flex items-center justify-between">
              <SheetHeader>
                <SheetTitle className="text-left flex flex-col items-start gap-1">

                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    Aproveite o <span className="text-primary">É Pra Já!</span>
                  </span>
                </SheetTitle>
              </SheetHeader>
           </div>

           <div className="flex-1 overflow-y-auto px-8 pb-32 space-y-10 scrollbar-hide">
              {/* Category Grid */}
              <div className="grid grid-cols-2 gap-4">
                  {categories.map((cat) => (
                    <MenuTile 
                      key={cat.label} 
                      {...cat} 
                      onClick={() => handleCategoryClick(cat.value)} 
                    />
                  ))}
                  <MenuTile 
                    icon={Ticket}
                    label="Cupons"
                    color="bg-sunset"
                    onClick={() => { setIsOpen(false); navigate('/marketplace'); }}
                    variant="wide"
                  />
              </div>

              {/* Highlights Section */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Experimente também</h4>
                    <div className="h-px flex-1 bg-slate-100 ml-4" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {highlights.map((item) => (
                      <button 
                        key={item.label}
                        onClick={() => { setIsOpen(false); navigate('/marketplace'); }}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group overflow-hidden"
                      >
                         <div className="h-10 w-10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <item.icon className="h-5 w-5" />
                         </div>
                         <span className="text-xs font-black uppercase tracking-wider text-slate-600">{item.label}</span>
                      </button>
                    ))}
                  </div>
              </div>

              {/* Ecosystem Call to action */}
              <div className="px-1">
                 <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-6 relative overflow-hidden group">
                    <div className="relative z-10 space-y-4">
                       <h5 className="text-white font-black text-lg leading-tight">Quer faturar com o É Pra Já?</h5>
                       <p className="text-white/60 text-[11px] font-medium leading-relaxed max-w-[180px]">
                          Cadastre sua loja ou seja um entregador parceiro hoje mesmo.
                       </p>
                       <button 
                         onClick={() => handlePartnershipClick('merchant')}
                         className="h-10 px-6 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                       >
                          Saiba Mais
                       </button>
                    </div>
                    <X className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                 </div>
              </div>
           </div>

           <div className="p-8 border-t border-slate-50 mt-auto bg-white">
            <div className="py-8 px-6 text-center border-t border-slate-50 mt-auto">
            </div>
           </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
