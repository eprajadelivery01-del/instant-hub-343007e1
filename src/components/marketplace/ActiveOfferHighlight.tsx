import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Ticket, Copy, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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

    // Listen to real-time inserts
    const channel = supabase
      .channel('home-active-offer-highlight')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketing_notifications' },
        (payload) => {
          setLatestNotif(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!latestNotif) return null;

  const handleCopy = () => {
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
    <div className="w-full mx-auto my-3 px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 p-4 text-white shadow-xl">
        {/* Glow backdrop */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3 min-w-0">
            {latestNotif.emoji ? (
              <span className="text-3xl shrink-0 leading-none">{latestNotif.emoji}</span>
            ) : (
              <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white">
                  Oferta em Destaque
                </span>
              </div>
              <h3 className="font-black text-base leading-tight mt-1 truncate text-white">
                {latestNotif.title}
              </h3>
              <p className="text-xs text-white/90 line-clamp-2 mt-0.5 leading-relaxed">
                {latestNotif.message}
              </p>
            </div>
          </div>

          {latestNotif.coupon_code && (
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end mt-2 sm:mt-0">
              <button
                onClick={handleCopy}
                className="w-full sm:w-auto px-4 py-2.5 bg-white text-orange-600 hover:bg-orange-50 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Ticket className="w-4 h-4" />
                <span className="font-mono tracking-wide">{latestNotif.coupon_code}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
