import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Copy, Check, Ticket, Sparkles, X, Gift } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type MarketingNotifItem = {
  id: string;
  title: string;
  message: string;
  emoji?: string | null;
  image_url?: string | null;
  coupon_code?: string | null;
  created_at: string;
  status?: string;
};

interface ClientNotificationsPopoverProps {
  className?: string;
}

export function ClientNotificationsPopover({ className }: ClientNotificationsPopoverProps) {
  const [notifications, setNotifications] = useState<MarketingNotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[ClientNotificationsPopover] Erro ao buscar notificações:', error);
        return;
      }

      if (data) {
        setNotifications(data as MarketingNotifItem[]);

        // Check unread in localStorage
        const lastRead = localStorage.getItem('epraja_last_read_notif_time');
        if (!lastRead) {
          setUnreadCount(data.length);
        } else {
          const unread = data.filter((n) => new Date(n.created_at) > new Date(lastRead)).length;
          setUnreadCount(unread);
        }
      }
    } catch (e) {
      console.error('[ClientNotificationsPopover] Exception:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime listener para novas notificações com tratamento de erro e canal único por instância
    let channel: any = null;
    try {
      const channelId = `client-notif-popover-${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'marketing_notifications'
          },
          (payload) => {
            const newNotif = payload.new as MarketingNotifItem;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[ClientNotificationsPopover] Realtime subscription bypassed:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setUnreadCount(0);
      localStorage.setItem('epraja_last_read_notif_time', new Date().toISOString());
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Cupom ${code} copiado com sucesso!`, {
      description: 'Cole na tela de checkout para garantir seu desconto.'
    });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return '';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "premium-card relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:text-foreground active:scale-95",
            className
          )}
          title="Notificações e Cupons"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white shadow-md animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 border-l border-border bg-background">
        <div className="flex flex-col h-full pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] sm:pt-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-card/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-black tracking-tight text-foreground">
                  Central de Ofertas
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Cupons e notificações enviados para você
                </p>
              </div>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs">Carregando promoções...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-muted-foreground space-y-3">
                <div className="p-4 bg-muted/30 rounded-full">
                  <Bell className="w-8 h-8 opacity-40" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Nenhuma notificação por enquanto</h4>
                <p className="text-xs max-w-xs leading-relaxed">
                  Fique atento! Em breve enviaremos novos cupons de desconto e alertas exclusivos.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                >
                  {/* Image optional */}
                  {notif.image_url && (
                    <div className="w-full h-32 mb-3 rounded-xl overflow-hidden bg-muted relative">
                      <img
                        src={notif.image_url}
                        alt="Promoção"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Header Title */}
                  <div className="flex items-start gap-2.5 mb-2">
                    {notif.emoji && <span className="text-2xl shrink-0 leading-none">{notif.emoji}</span>}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground leading-snug">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(notif.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {notif.message}
                  </p>

                  {/* Coupon Box */}
                  {notif.coupon_code && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Ticket className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-mono font-black text-primary text-sm tracking-wider truncate">
                          {notif.coupon_code}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleCopyCoupon(notif.coupon_code!)}
                        className={cn(
                          'h-8 px-3 text-xs font-bold rounded-lg transition-all shrink-0',
                          copiedCode === notif.coupon_code
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-primary hover:bg-primary/90 text-white'
                        )}
                      >
                        {copiedCode === notif.coupon_code ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
