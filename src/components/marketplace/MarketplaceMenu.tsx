import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Utensils, ShoppingBag, Pill, Beer, Dog, Store, Tag, ChefHat, Star, Ticket, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface MenuCategoryProps {
  icon: any;
  label: string;
  badge?: string;
  color: string;
  onClick: () => void;
}

function MenuCategory({ icon: Icon, label, badge, color, onClick }: MenuCategoryProps) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3 px-1 group active:scale-95 transition-all">
      <div className="flex items-center gap-4">
        <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 border border-white/10 shrink-0 transform group-hover:rotate-6 transition-transform", color)}>
           <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex items-center gap-2">
           <span className="text-sm font-bold text-slate-700">{label}</span>
           {badge && (
             <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">{badge}</span>
           )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

interface MarketplaceMenuProps {
  children: React.ReactNode;
}

export function MarketplaceMenu({ children }: MarketplaceMenuProps) {
  const navigate = useNavigate();

  const categories = [
    { icon: Utensils, label: "Restaurantes", color: "bg-sunset" },
    { icon: ShoppingBag, label: "Mercados", color: "bg-sunset" },
    { icon: Pill, label: "Farmácias", color: "bg-sunset" },
    { icon: Beer, label: "Bebidas", color: "bg-sunset" },
    { icon: Dog, label: "Pet Shops", color: "bg-sunset" },
    { icon: Store, label: "Shopping", color: "bg-sunset" },
  ];

  const highlights = [
    { icon: Tag, label: "Promoções", badge: "Novo", color: "bg-sunset" },
    { icon: ChefHat, label: "Gourmet", color: "bg-sunset" },
    { icon: Star, label: "Super", color: "bg-sunset" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 border-r-0 rounded-r-[32px] overflow-hidden">
        <div className="h-full flex flex-col bg-white">
           <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <SheetHeader>
                <SheetTitle className="text-left text-xl font-black text-slate-900 tracking-tight">
                  Aproveite o <span className="text-primary">É Pra Já!</span>
                </SheetTitle>
              </SheetHeader>
           </div>

           <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide">
              {/* Main Categories */}
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">Categorias</h4>
                 <div className="divide-y divide-slate-50">
                    {categories.map((cat) => (
                      <MenuCategory 
                        key={cat.label} 
                        {...cat} 
                        onClick={() => navigate('/marketplace')} 
                      />
                    ))}
                 </div>
              </div>

              {/* Restaurant Highlights */}
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">Destaques em Restaurantes</h4>
                 <div className="divide-y divide-slate-50">
                    {highlights.map((item) => (
                      <MenuCategory 
                        key={item.label} 
                        {...item} 
                        onClick={() => navigate('/marketplace')} 
                      />
                    ))}
                 </div>
              </div>

              {/* Platform Highlights */}
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">Destaques do É Pra Já</h4>
                 <div className="divide-y divide-slate-50">
                    <MenuCategory 
                        icon={Ticket}
                        label="Cupons"
                        color="bg-sunset"
                        onClick={() => navigate('/marketplace')} 
                    />
                 </div>
              </div>
           </div>

           <div className="p-6 bg-slate-50 mt-auto">
              <div className="flex items-center gap-4 opacity-40">
                 <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">NexusPro App Framework • v4.2</span>
              </div>
           </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
