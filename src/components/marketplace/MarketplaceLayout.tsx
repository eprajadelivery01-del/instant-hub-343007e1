import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Home, Search, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchOrderCount = async () => {
      try {
        let { count, error } = await supabase
          .from('customer_orders_view')
          .select('*', { count: 'exact', head: true });

        if (error && /relation .* does not exist|customer_orders_view/i.test(error.message)) {
          const fb = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`);
          count = fb.count;
        }

        setOrderCount(count || 0);
      } catch (error) {
        console.error('[MarketplaceLayout] Erro ao buscar contagem de pedidos:', error);
      }
    };

    fetchOrderCount();

    const channel = supabase
      .channel(`layout-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrderCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Portal target — renderizamos a barra fora do app-shell para
  // que nenhum wrapper com transform/filter/animation a "prenda".
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('marketplace-fixed-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'marketplace-fixed-root';
      document.body.appendChild(el);
    }
    setPortalEl(el);
  }, []);

  const showCartFab =
    itemCount > 0 &&
    !location.pathname.includes('/cart') &&
    !location.pathname.includes('/checkout');

  const fixedUi = (
    <>
      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-[80] w-full border-t border-border bg-background marketplace-bottom-nav">
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
                  className="group flex flex-1 flex-col items-center justify-center gap-1 h-full relative"
                >
                  <div className="relative">
                    <item.icon className={cn(
                      'h-[22px] w-[22px] transition-all duration-200',
                      active ? 'text-foreground stroke-[2.5px]' : 'text-muted-foreground stroke-[1.5px]'
                    )} />
                    {item.path === '/marketplace/orders' && orderCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 flex h-[14px] min-w-[14px] px-1 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground shadow-sm">
                        {orderCount > 99 ? '99+' : orderCount}
                      </span>
                    )}
                  </div>
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

      {showCartFab && (
        <div className="fixed inset-x-0 z-[40] w-full px-4 pointer-events-none flex justify-center marketplace-cart-fab">
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
    </>
  );

  return (
    <div className="app-shell min-h-screen flex flex-col font-sans text-foreground">
      <main className={cn(
        'flex flex-1 flex-col transition-all duration-300', 
        !hideNav && (showCartFab ? 'pb-marketplace-nav-with-cart' : 'pb-marketplace-nav')
      )}>
        <div className="flex-1">{children}</div>

        <div className="mt-auto flex w-full justify-center py-8 opacity-20 pointer-events-none select-none">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">BONASOFT</p>
        </div>
      </main>

      {portalEl && createPortal(fixedUi, portalEl)}
    </div>
  );
}
