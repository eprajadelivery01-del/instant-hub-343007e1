import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type MarketingNotification = {
  id: string;
  title: string;
  message: string;
  emoji: string | null;
  image_url: string | null;
  coupon_code: string | null;
  created_at: string;
};

export function useMarketingNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeNotification, setActiveNotification] = useState<MarketingNotification | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for new marketing notifications
    const channel = supabase.channel('marketing-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketing_notifications'
        },
        (payload) => {
          const newNotif = payload.new as MarketingNotification;
          
          // Send broadcast receipt back to Admin Panel
          try {
            supabase.channel('marketing-receipts').send({
              type: 'broadcast',
              event: 'notification_received',
              payload: {
                user_email: user.email,
                notification_title: newNotif.title
              }
            });
          } catch (e) {
            console.error("Failed to send receipt", e);
          }
          
          // Show toast
          toast({
            title: `${newNotif.emoji || '🔔'} ${newNotif.title}`,
            description: "Clique aqui para ver a oferta!",
            action: (
              <button 
                onClick={() => setActiveNotification(newNotif)}
                className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs font-bold"
              >
                Abrir
              </button>
            ),
            duration: 8000
          });

          // Show Web Notification if enabled
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: newNotif.image_url || '/icon-192x192.png'
              });
            } catch (e) {
              console.warn("Failed to show web notification", e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const clearNotification = useCallback(() => {
    setActiveNotification(null);
  }, []);

  return {
    activeNotification,
    clearNotification
  };
}
