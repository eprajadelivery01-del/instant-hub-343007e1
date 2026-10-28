import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowUpRight, Ticket, Copy, Check, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { isCustomerNotification, type MarketingNotifItem } from '@/components/marketplace/ClientNotificationsPopover';
import acaiCampaign from '@/assets/offers/acai-campaign.jpg';

export function ActiveOfferHighlight() {
  const [latestNotif, setLatestNotif] = useState<MarketingNotifItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestNotif = async () => {
      try {
        const { data } = await supabase
          .from('marketing_notifications')
          .select('*')
          .in('target_audience', ['customers', 'all'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (data && data.length > 0) {
          const valid = data.find((d: any) => isCustomerNotification(d));
          if (valid) {
            setLatestNotif(valid);
          }
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
            const raw = payload.new as any;
            if (!raw || !isCustomerNotification(raw)) return;
            setLatestNotif(raw);
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

  const handleCopy = async () => {
    if (!latestNotif.coupon_code) return;
    try {
      await navigator.clipboard.writeText(latestNotif.coupon_code);
      setCopied(true);
      toast.success(`Cupom ${latestNotif.coupon_code} copiado!`, {
        description: 'Cole na finalização do pedido para resgatar o desconto.'
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Não foi possível copiar. Use o código exibido na oferta.');
    }
  };

  const isAcaiCampaign = /a[cç]a[ií]/i.test(`${latestNotif.title} ${latestNotif.message}`);
  const suppliedImage = latestNotif.image_url && latestNotif.image_url !== failedImage
    ? latestNotif.image_url : null;
  const campaignImage = suppliedImage || (isAcaiCampaign ? acaiCampaign : null);

  return (
    <section aria-label="Oferta em destaque" className="w-full">
      <div className="relative isolate min-h-[236px] overflow-hidden rounded-lg bg-offer text-offer-foreground sm:min-h-[300px] lg:min-h-[340px]">
        {campaignImage && (
          <>
            <img
              src={campaignImage}
              alt={suppliedImage ? 'Imagem da campanha em destaque' : ''}
              width={1536}
              height={1024}
              fetchPriority="high"
              decoding="async"
              onError={() => setFailedImage(campaignImage)}
              className="absolute inset-0 -z-20 h-full w-full object-cover object-right"
            />
            <div className="offer-readability pointer-events-none absolute inset-0 -z-10" />
          </>
        )}
        <div className={`relative flex min-h-[236px] flex-col items-start justify-center px-5 py-6 sm:min-h-[300px] sm:px-9 sm:py-8 lg:min-h-[340px] ${campaignImage ? 'w-[66%] sm:w-[58%]' : 'w-full sm:w-3/4'}`}>
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-normal text-offer-muted sm:mb-4 sm:text-xs">
            <Flame className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
            Oferta em destaque
          </p>
          <h2 className="w-full break-words font-sans text-2xl font-extrabold leading-[1.08] [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
            {latestNotif.title}
          </h2>
          {latestNotif.message && (
            <p className="mt-3 w-full break-words text-xs font-medium leading-relaxed text-offer-muted sm:text-base">
              {latestNotif.message}
            </p>
          )}
          {latestNotif.coupon_code ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopy}
              aria-label={`Copiar cupom ${latestNotif.coupon_code}`}
              className="mt-5 h-auto min-h-10 max-w-full flex-wrap rounded-full bg-offer-action px-4 py-2.5 text-xs font-bold text-offer-action-foreground hover:bg-offer-action/90 sm:text-sm"
            >
              <Ticket aria-hidden="true" />
              <span className="min-w-0 break-all font-mono whitespace-normal">{latestNotif.coupon_code}</span>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
          ) : (
            <Button
              asChild
              variant="secondary"
              className="mt-5 rounded-full bg-offer-action px-4 text-xs font-bold text-offer-action-foreground hover:bg-offer-action/90 sm:px-5 sm:text-sm"
            >
              <a href="#lojas-em-destaque">Ver lojas <ArrowUpRight aria-hidden="true" /></a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

