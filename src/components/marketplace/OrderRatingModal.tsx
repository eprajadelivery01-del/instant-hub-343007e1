import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEvaluation } from '@/hooks/useEvaluation';
import { Star, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MediaImage } from '@/components/shared/MediaImage';

interface PendingReview {
  id: string;
  created_at: string;
  company_id: string;
  company_name: string;
  company_logo: string;
  driver_id?: string;
  driver_name?: string;
}

export function OrderRatingModal() {
  const { user } = useAuth();
  const { submitRating, checkHasRated } = useEvaluation();
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [step, setStep] = useState<'store' | 'driver'>('store');
  const [storeRating, setStoreRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkForPendingReview();

    const channel = supabase.channel(`order_ratings_listener_${user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
      }, (payload) => {
        const order = payload.new as any;
        if (order.customer_id !== user.id && order.user_id !== user.id) return;
        
        if (payload.new.status === 'delivered' || payload.new.status === 'completed') {
          checkForPendingReview();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkForPendingReview = async () => {
    try {
      // 1. Get last delivered order
      const { data: lastOrder } = await supabase
        .from('orders')
        .select(`
          id, created_at, company_id, 
          companies ( name, logo_url ),
          deliveries ( driver_id, delivery_drivers ( id, full_name ) )
        `)
        .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
        .in('status', ['delivered', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastOrder) {
        setLoading(false);
        return;
      }

      // 2. Check if already rated
      const rated = await checkHasRated(lastOrder.id);
      if (rated) {
        setLoading(false);
        return;
      }

      // 3. Prepare review data
      // Handle array or object returns safely
      const companyRaw = Array.isArray(lastOrder.companies) ? lastOrder.companies[0] : lastOrder.companies;
      const company = companyRaw as any;
      
      const deliveryRaw = Array.isArray(lastOrder.deliveries) ? lastOrder.deliveries[0] : lastOrder.deliveries;
      const delivery = deliveryRaw as any;
      
      let logoUrl = '';
      if (company && typeof company.logo_url === 'string' && company.logo_url !== 'null') {
        try {
          const parsed = JSON.parse(company.logo_url);
          logoUrl = parsed?.logo || parsed?.logo_url || company.logo_url;
        } catch {
          logoUrl = company.logo_url;
        }
      } else if (company?.logo_url && company.logo_url !== 'null') {
        logoUrl = company.logo_url;
      }

      setPendingReview({
        id: lastOrder.id,
        created_at: lastOrder.created_at,
        company_id: lastOrder.company_id,
        company_name: company?.name || 'Restaurante',
        company_logo: logoUrl,
        driver_id: delivery?.driver_id,
        driver_name: delivery?.delivery_drivers?.full_name,
      });
    } catch (error) {
      console.error('Error checking for review:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = (val: number) => {
    if (step === 'store') {
      setStoreRating(val);
      // Short delay before next step for better UX
      setTimeout(() => {
        if (pendingReview?.driver_id) {
          setStep('driver');
        } else {
          finishReview(val, 0);
        }
      }, 400);
    } else {
      setDriverRating(val);
      setTimeout(() => finishReview(storeRating, val), 400);
    }
  };

  const finishReview = async (sRating: number, dRating: number) => {
    if (!pendingReview || !user) return;
    setSubmitting(true);
    try {
      await submitRating({
        orderId: pendingReview.id,
        userId: user.id,
        companyId: pendingReview.company_id,
        driverId: pendingReview.driver_id,
        orderRating: sRating,
        driverRating: dRating || 5, // Fallback if no driver
        comment: '',
      });
      setPendingReview(null);
    } catch {
      // error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const modalContent = (
    <AnimatePresence>
      {pendingReview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-0 pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setPendingReview(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-background p-8 shadow-2xl border border-border/50 z-10"
          >
          {/* Fancy Background Gradient */}
          <div className="absolute inset-x-0 -top-24 -z-10 h-48 bg-primary/10 blur-[80px]" />

          <button 
            onClick={() => setPendingReview(null)}
            className="absolute right-4 top-4 h-8 w-8 flex items-center justify-center rounded-full bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors z-20"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center space-y-6 py-2 relative z-10">
            {/* Store Logo */}
            <div className="relative mt-2">
              <div className="h-24 w-24 rounded-[28px] border-4 border-background shadow-xl overflow-hidden bg-secondary">
                <MediaImage 
                  src={pendingReview.company_logo} 
                  alt={pendingReview.company_name} 
                  className="h-full w-full object-cover" 
                  fallback={<div className="flex h-full w-full items-center justify-center text-2xl">🍔</div>}
                />
              </div>
              <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary flex items-center justify-center border-4 border-background shadow-sm">
                <Star className="h-3.5 w-3.5 text-primary-foreground fill-current" />
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
                {format(new Date(pendingReview.created_at), "eeee, 'às' HH:mm", { locale: ptBR })}
              </p>
              <h3 className="text-2xl font-black leading-tight text-foreground px-2">
                {step === 'store' 
                  ? `Como foi a sua experiência com a ${pendingReview.company_name}?`
                  : `Como foi a entrega feita por ${pendingReview.driver_name || 'Entregador'}?`
                }
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                {step === 'store' 
                  ? 'Avalie a qualidade do pedido e o estabelecimento' 
                  : 'Avalie o tempo e a cordialidade do entregador'}
              </p>
            </div>

            {/* Stars */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 w-full pt-4 pb-2">
              {[1, 2, 3, 4, 5].map((val) => {
                const active = step === 'store' ? val <= storeRating : val <= driverRating;
                return (
                  <button 
                    key={val} 
                    disabled={submitting}
                    onClick={() => handleRating(val)}
                    className="group relative transition-transform active:scale-90 p-1 sm:p-2"
                  >
                    <Star 
                      className={cn(
                        "h-12 w-12 transition-all duration-300",
                        active 
                          ? "fill-warning text-warning scale-110 drop-shadow-md" 
                          : "text-muted-foreground/20 fill-muted-foreground/10 group-hover:text-muted-foreground/40 group-hover:fill-muted-foreground/20"
                      )} 
                    />
                  </button>
                );
              })}
            </div>

            {/* Labels */}
            <div className="flex w-full justify-between px-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Péssimo</span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-warning">Perfeito</span>
            </div>
          </div>

          {submitting && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col gap-3 items-center justify-center z-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-bold text-foreground">Enviando avaliação...</p>
            </div>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}
