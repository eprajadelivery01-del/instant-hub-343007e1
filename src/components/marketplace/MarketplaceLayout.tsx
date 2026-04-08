import { ReactNode } from 'react';
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
      <main className={cn("flex-1", !hideNav && "pb-20")}>
        {children}
      </main>

      {/* Bottom nav - Premium iFood style */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border/50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.03)] h-16">
          <div className="max-w-7xl mx-auto flex items-stretch justify-around h-full">
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
                    'flex flex-col items-center justify-center gap-1.5 py-1 px-6 relative transition-all duration-300 group',
                    active ? 'text-[#ea1d2c]' : 'text-muted-foreground/60 hover:text-foreground'
                  )}
                >
                  <div className={cn(
                    "p-1 rounded-xl transition-all duration-300",
                    active ? "bg-red-50 text-[#ea1d2c]" : "group-hover:bg-muted"
                  )}>
                    <item.icon className={cn("h-5 w-5 transition-transform", active ? "scale-110" : "group-hover:scale-105")} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest leading-none",
                    active ? "opacity-100" : "opacity-60"
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
             className="max-w-lg mx-auto w-full h-14 bg-[#ea1d2c] rounded-2xl shadow-[0_12px_40px_rgba(234,29,44,0.4)] flex items-center justify-between px-6 text-white active:scale-[0.98] transition-transform"
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
