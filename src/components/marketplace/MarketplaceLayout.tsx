import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Home, ShoppingCart, ClipboardList, User, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/marketplace', icon: Home, label: 'Início' },
  { path: '/marketplace/cart', icon: ShoppingCart, label: 'Carrinho' },
  { path: '/marketplace/orders', icon: ClipboardList, label: 'Pedidos' },
  { path: '/marketplace/profile', icon: User, label: 'Perfil' },
];

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="font-bold text-lg text-foreground">É Pra Já</h1>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          {navItems.map(item => {
            const active = location.pathname === item.path || 
              (item.path !== '/marketplace' && location.pathname.startsWith(item.path));
            const isHome = item.path === '/marketplace';
            const homeActive = isHome && (location.pathname === '/marketplace' || location.pathname.startsWith('/marketplace/store'));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors relative',
                  (active || homeActive) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label === 'Carrinho' && itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {itemCount}
                  </Badge>
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
