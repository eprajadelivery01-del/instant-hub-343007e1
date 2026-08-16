import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Ticket, Copy, Check, Megaphone, Flame } from 'lucide-react';
import { toast } from 'sonner';

export function ActiveOfferHighlight() {
  const [latestNotif, setLatestNotif] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchLatestNotif = async () => {
      try {
        const { data, error } = await supabase
          .from('marketing_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setLatestNotif(data);
        }
      } catch (e) {
        // Silently fail if table empty
      }
    };

    fetchLatestNotif();

    // Listen to real-time inserts com canal único e tratamento de exceção
    let channel: any = null;
    try {
      const channelId = `home-active-offer-${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'marketing_notifications' },
          (payload) => {
            setLatestNotif(payload.new);
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[ActiveOfferHighlight] Realtime subscription bypassed:', e);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (!latestNotif) return null;

  const handleCopy = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (latestNotif.coupon_code) {
      navigator.clipboard.writeText(latestNotif.coupon_code);
      setCopied(true);
      toast.success(`Cupom ${latestNotif.coupon_code} copiado!`, {
        description: 'Cole na finalização do pedido para resgatar o desconto.'
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="w-full mx-auto my-2">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 p-4 sm:p-5 text-white shadow-xl shadow-orange-500/15 border border-white/20">
        {/* Glow & decorative circles */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-black/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 w-full">
          {/* Main info container */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1 w-full">
            {latestNotif.emoji ? (
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/25">
                <span className="leading-none">{latestNotif.emoji}</span>
              </div>
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-white/25 backdrop-blur-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-sm border border-white/10">
                  <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
                  Oferta em Destaque
                </span>
              </div>

              <h3 className="font-extrabold text-sm sm:text-base leading-snug mt-1.5 text-white break-words drop-shadow-sm">
                {latestNotif.title}
              </h3>

              {latestNotif.message && (
                <p className="text-xs sm:text-sm text-white/95 mt-1 leading-relaxed break-words line-clamp-3">
                  {latestNotif.message}
                </p>
              )}
            </div>
          </div>

          {/* Coupon action button */}
          {latestNotif.coupon_code && (
            <div className="w-full sm:w-auto shrink-0 flex items-center justify-start sm:justify-end pt-1 sm:pt-0">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full sm:w-auto px-4 py-2.5 bg-white text-orange-600 hover:bg-orange-50 active:bg-orange-100 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-black/10 transition-all active:scale-95 border border-white/50"
              >
                <Ticket className="w-4 h-4 text-orange-500" />
                <span className="font-mono tracking-wider font-black">{latestNotif.coupon_code}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-600 stroke-[3]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-orange-600" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

