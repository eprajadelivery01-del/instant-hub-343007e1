import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
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
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Content */}
      <main className={cn("flex-1", !hideNav && "pb-16")}>
        {children}
      </main>

      {/* Bottom nav - iFood style */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
          <div className="max-w-lg mx-auto flex items-stretch justify-around">
            {navItems.map(item => {
              const isHome = item.path === '/marketplace';
              const active = isHome
                ? location.pathname === '/marketplace' || location.pathname.startsWith('/marketplace/store')
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 py-2 px-4 relative transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Floating cart button - iFood style */}
      {itemCount > 0 && !location.pathname.includes('/cart') && !location.pathname.includes('/checkout') && (
        <Link
          to="/marketplace/cart"
          className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-40 bg-primary text-primary-foreground rounded-xl py-3.5 px-5 flex items-center justify-between shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 rounded-lg p-1.5">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="font-semibold text-sm">Ver carrinho</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-primary-foreground/20 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
              {itemCount}
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
