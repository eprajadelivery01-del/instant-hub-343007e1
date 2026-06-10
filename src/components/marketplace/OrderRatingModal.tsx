import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEvaluation } from '@/hooks/useEvaluation';
import { Star, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  if (loading || !pendingReview) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed inset-x-4 top-4 z-[100] sm:max-w-md sm:mx-auto"
      >
        <div className="relative overflow-hidden rounded-[32px] bg-white p-6 shadow-2xl border border-black/5">
          <button 
            onClick={() => setPendingReview(null)}
            className="absolute right-4 top-4 h-8 w-8 flex items-center justify-center rounded-full bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center space-y-6 py-2">
            {/* Store Logo */}
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-muted">
                <img src={pendingReview.company_logo} alt={pendingReview.company_name} className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center border-2 border-white shadow-sm">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                {format(new Date(pendingReview.created_at), "eeee, 'às' HH:mm", { locale: ptBR })}
              </p>
              <h3 className="text-xl font-black leading-tight text-foreground px-4">
                {step === 'store' 
                  ? `O serviço da ${pendingReview.company_name} merece quantas estrelas?`
                  : `Como foi a entrega do(a) ${pendingReview.driver_name || 'Entregador'}?`
                }
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Avalie como foi pedir na loja e depois a entrega
              </p>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((val) => {
                const active = step === 'store' ? val <= storeRating : val <= driverRating;
                return (
                  <button 
                    key={val} 
                    disabled={submitting}
                    onClick={() => handleRating(val)}
                    className="group relative transition-transform active:scale-90"
                  >
                    <Star 
                      className={cn(
                        "h-10 w-10 transition-all duration-300",
                        active 
                          ? "fill-warning text-warning scale-110" 
                          : "text-muted-foreground/20 group-hover:text-muted-foreground/40"
                      )} 
                    />
                  </button>
                );
              })}
            </div>

            {/* Labels */}
            <div className="flex w-full justify-between px-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Não curti</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Excelente</span>
            </div>
          </div>

          {submitting && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
