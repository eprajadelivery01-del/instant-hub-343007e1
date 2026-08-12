import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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

  // Request permissions for mobile notifications
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for new marketing notifications com canal único
    const channelId = `use-marketing-notif-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelId)
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
          if (user) {
            try {
              supabase.channel('marketing-receipts').send({
                type: 'broadcast',
                event: 'notification_received',
                payload: {
                  user_email: user.email,
                  notification_title: newNotif.title
                }
              }).catch(() => {});
            } catch (e) {
              console.error("Failed to send receipt", e);
            }
          }
          
          // Show toast in-app
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const clearNotification = useCallback(() => {
    setActiveNotification(null);
  }, []);

  return {
    activeNotification,
    clearNotification
  };
}
