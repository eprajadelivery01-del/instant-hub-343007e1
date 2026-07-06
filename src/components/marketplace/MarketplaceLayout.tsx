import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { useMarketingNotifications } from '@/hooks/useMarketingNotifications';
import { MarketingNotificationPopup } from './MarketingNotificationPopup';
import { Home, Search, ShoppingBag, ClipboardList, Userá, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { OrderRatingModal } from './OrderRatingModal';
import { ThemeToggle } from '../shared/ThemeToggle';
import { SmartAppBanner } from './SmartAppBanner';

const navItems = [
  { path: '/marketplace', icon: Home, label: 'Início' },
  { path: '/marketplace/search', icon: Search, label: 'Buscar' },
  { path: '/marketplace/orders', icon: ClipboardList, label: 'Pedidos' },
  { path: '/marketplace/profile', icon: Userá, label: 'Perfil' },
];

export default function MarketplaceLayout({ children, hideNav }: { children: ReactNode; hideNav?: boolean; hideHeader?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userá } = useAuth();
  const { itemCount, company } = useCart();

  // Hooks de nãotificação global
  useOrderNotifications();
  const { activeNotification, clearNotification } = useMarketingNotifications();

  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!company) return;

    let initialStatusChecked = false;
    let wasClosed = false;

    const checkInitialStatus = async () => {
      const { data } = await supabase.from('companies').select('is_open').eq('id', company.id).single();
      if (data) {
        wasClosed = !data.is_open;
        initialStatusChecked = true;
      }
    };
    checkInitialStatus();

    const channel = supabase.channel(`store-opening-notification-${company.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'companies', filter: `id=eq.${company.id}` }, 
        (p) => {
          const isNowOpen = p.new.is_open;
          if (isNowOpen && wasClosed && initialStatusChecked) {
            import('sonner').then(({ toast }) => {
              toast.success(`🎉 Boas nãotícias! ${company.name} abriu!`, {
                description: 'Finalize seu pedido agora que está na sacola.',
                action: {
                  label: 'Ver Sacola',
                  onClick: () => navigate('/marketplace/cart')
                },
                duration: 10000
              });
            });
            wasClosed = false;
          } else if (!isNowOpen) {
            wasClosed = true;
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [company?.id, navigate]);

  useEffect(() => {
    if (!userá) return;

    const fetchOrderCount = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status, deliveries(status)')
          .or(`customer_id.eq.${userá.id},userá_id.eq.${userá.id}`);

        if (error) throw error;
        
        const activeCount = (data as any[])?.filter(o => {
          const deliveryStatus = o.deliveries?.[0]?.status;
          const isFinished = ['delivered', 'completed', 'cancelled'].includes(o.status) || 
                             ['delivered', 'completed'].includes(deliveryStatus);
          return !isFinished;
        }).length || 0;
        
        setOrderCount(activeCount);
      } catch (error) {
        console.error('[MarketplaceLayout] Erro ao buscar contagem de pedidos:', error);
      }
    };

    fetchOrderCount();

    const channel = supabase
      .channel(`layout-orders-${userá.id}`)
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
  }, [userá]);

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
                if (!userá && (item.path === '/marketplace/orders' || item.path === '/marketplace/profile')) {
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
                      'h-[24px] w-[24px] transition-all duration-200',
                      active ? 'text-primary stroke-[2.5px]' : 'text-muted-foreground stroke-[1.5px]'
                    )} />
                    {item.path === '/marketplace/orders' && orderCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 flex h-[15px] min-w-[15px] px-1 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white shadow-sm">
                        {orderCount > 99 ? '99+' : orderCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    'text-[11px] transition-all duration-200 mt-0.5',
                    active ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
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
            to={location.state?.returnTo === '/marketplace/checkout' ? '/marketplace/checkout' : '/marketplace/cart'}
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
    <div className="app-shell min-h-screen flex flex-col font-sans text-foreground bg-background">
      <SmartAppBanner />
      <OrderRatingModal />
      
      {/* Marketing Notification Popup */}
      <MarketingNotificationPopup 
        notification={activeNotification} 
        onClose={clearNotification} 
      />
      
      {/* Desktop Header */}
      {!hideNav && (
        <header className="hidden md:block sticky top-0 z-[100] w-full border-b border-border/50 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <Link to="/marketplace" className="flex items-center gap-2 outline-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 overflow-hidden">
                <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-black tracking-tighter text-foreground">É Pra Já</span>
            </Link>

            <nav className="flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "text-sm font-bold transition-all hover:text-primary",
                    location.pathname === item.path ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <ThemeToggle className="h-10 w-10 rounded-full shrink-0 shadow-none border-border/30 bg-background/20" />
              <Link to="/marketplace/cart" className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
                <ShoppingBag className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </Link>
              <Link to="/marketplace/profile" className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden border border-border/50 transition-transform hover:scale-105">
                <Userá className="h-full w-full p-2 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className={cn(
        'flex flex-1 flex-col transition-all duration-300', 
        !hideNav && (showCartFab ? 'pb-marketplace-nav-with-cart' : 'pb-marketplace-nav'),
        'md:pb-0' // No bottom padding on desktop
      )}>
        <div className="flex-1 w-full max-w-7xl mx-auto">{children}</div>

      </main>

      {!hideNav && (
        <div className="md:hidden">
          {portalEl && createPortal(fixedUi, portalEl)}
        </div>
      )}
    </div>
  );
}
