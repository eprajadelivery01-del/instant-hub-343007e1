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
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 animate-in slide-in-from-bottom duration-500">
          <Link
            to="/marketplace/cart"
            className="mx-auto flex h-14 w-full max-w-lg items-center justify-between rounded-[22px] bg-primary px-6 text-primary-foreground shadow-lg active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15 text-sm font-black">
                {itemCount}
              </div>

              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-80 leading-none">Ver sacola</p>
                <p className="text-sm font-black">Finalizar pedido</p>
              </div>
            </div>

            <ShoppingBag className="h-5 w-5 opacity-70" />
          </Link>
        </div>
      )}
    </div>
  );
}
