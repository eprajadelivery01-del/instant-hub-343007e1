import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Home, Search, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/marketplace', icon: Home, label: 'Início' },
  { path: '/marketplace/search', icon: Search, label: 'Buscar' },
  { path: '/marketplace/orders', icon: ClipboardList, label: 'Pedidos' },
  { path: '/marketplace/profile', icon: User, label: 'Perfil' },
];

export default function MarketplaceLayout({ children, hideNav, hideHeader }: { children: ReactNode; hideNav?: boolean; hideHeader?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { itemCount } = useCart();

  // Listen for order status changes and show toast notifications
  useOrderNotifications();

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col font-sans">
      {/* Content */}
      <main className={cn("flex-1 flex flex-col", !hideNav && "pb-20")}>
        <div className="flex-1">
          {children}
        </div>
        
        {/* Global Branding Footer */}
        <div className="w-full py-8 flex justify-center opacity-20 pointer-events-none select-none mt-auto">
          <p className="text-[10px] font-black tracking-[0.3em] text-muted-foreground uppercase">
            BONASOFT
          </p>
        </div>
      </main>

      {/* Floating Glass Nav - Premium Original style */}
      {!hideNav && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 glass-nav rounded-[28px] h-18 overflow-hidden px-2">
          <div className="flex items-center justify-around h-full py-2">
            {navItems.map(item => {
              const isHome = item.path === '/marketplace';
              const active = isHome
                ? location.pathname === '/marketplace' || location.pathname.startsWith('/marketplace/store')
                : location.pathname.startsWith(item.path);

              const handleClick = (e: React.MouseEvent) => {
                if (!user && (item.path === '/marketplace/orders' || item.path === '/marketplace/profile')) {
                  e.preventDefault();
                  navigate('/marketplace/login');
                }
              };

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleClick}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 min-w-[64px] relative transition-all duration-300 group',
                    active ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-2xl transition-all duration-500",
                    active ? "bg-primary/10 text-primary shadow-sm" : "group-hover:bg-slate-50"
                  )}>
                    <item.icon className={cn("h-5 w-5 transition-all duration-500", active ? "scale-110 rotate-0" : "scale-100 group-hover:scale-110")} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-[0.15em] leading-none transition-all duration-300",
                    active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 group-hover:opacity-40"
                  )}>
                    {item.label}
                  </span>
                  
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Floating cart button - Global Premium iFood style */}
      {itemCount > 0 && !location.pathname.includes('/cart') && !location.pathname.includes('/checkout') && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom duration-500">
           <Link
             to="/marketplace/cart"
             className="max-w-lg mx-auto w-full h-14 bg-primary rounded-2xl shadow-[0_12px_40px_rgba(249,115,22,0.4)] flex items-center justify-between px-6 text-white active:scale-[0.98] transition-transform"
           >
              <div className="flex items-center gap-4">
                 <div className="h-9 w-9 bg-white/20 rounded-xl flex items-center justify-center font-black text-sm">
                    {itemCount}
                 </div>
                 <div className="text-left">
                    <p className="text-[9px] font-black opacity-80 uppercase tracking-widest leading-none">Ver sacola</p>
                    <p className="text-sm font-black">Finalizar pedido</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <ShoppingBag className="h-5 w-5 opacity-50" />
              </div>
           </Link>
        </div>
      )}
    </div>
  );
}
