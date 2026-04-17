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

export default function MarketplaceLayout({ children, hideNav }: { children: ReactNode; hideNav?: boolean; hideHeader?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { itemCount } = useCart();

  useOrderNotifications();

  return (
    <div className="app-shell min-h-screen flex flex-col font-sans text-foreground">
      <main className={cn('flex flex-1 flex-col', !hideNav && 'pb-24')}>
        <div className="flex-1">{children}</div>

        <div className="mt-auto flex w-full justify-center py-8 opacity-20 pointer-events-none select-none">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">BONASOFT</p>
        </div>
      </main>

      {!hideNav && (
        <nav className="sticky bottom-0 z-50 w-full border-t border-border bg-background pb-safe mt-auto">
          <div className="flex h-16 items-center justify-around px-2">
            {navItems.map((item) => {
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
                  className="group flex flex-1 flex-col items-center justify-center gap-1 h-full"
                >
                  <item.icon className={cn(
                    'h-[22px] w-[22px] transition-all duration-200',
                    active ? 'text-foreground stroke-[2.5px]' : 'text-muted-foreground stroke-[1.5px]'
                  )} />

                  <span className={cn(
                    'text-[10px] transition-all duration-200',
                    active ? 'text-foreground font-bold' : 'text-muted-foreground font-medium'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {itemCount > 0 && !location.pathname.includes('/cart') && !location.pathname.includes('/checkout') && (
        <div className="sticky bottom-[80px] z-[60] w-full px-4 border-none pointer-events-none mb-4 flex justify-center animate-in slide-in-from-bottom duration-500">
          <Link
            to="/marketplace/cart"
            className="pointer-events-auto flex h-16 w-full max-w-sm items-center justify-between rounded-full bg-primary pl-2 pr-6 text-primary-foreground shadow-[0_12px_30px_-5px_rgba(234,88,12,0.5)] active:scale-[0.97] transition-all hover:shadow-[0_15px_35px_-5px_rgba(234,88,12,0.6)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-lg font-black shadow-inner">
                {itemCount}
              </div>
              <div className="flex flex-col justify-center text-left">
                <p className="text-[14px] font-black leading-tight tracking-tight">Ver Sacola</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-0.5">Finalizar pedido</p>
              </div>
            </div>

            <ShoppingBag className="h-6 w-6 opacity-90 stroke-[2.5]" />
          </Link>
        </div>
      )}
    </div>
  );
}
