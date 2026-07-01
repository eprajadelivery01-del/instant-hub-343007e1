import React from "react";
import { X, Copy, Check, Ticket, Gift } from "lucide-react";
import { MarketingNotification } from "@/hooks/useMarketingNotifications";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface MarketingNotificationPopupProps {
  notification: MarketingNotification | null;
  onClose: () => void;
}

export function MarketingNotificationPopup({ notification, onClose }: MarketingNotificationPopupProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!notification) return null;

  const handleCopy = () => {
    if (notification.coupon_code) {
      navigator.clipboard.writeText(notification.coupon_code);
      setCopied(true);
      toast({
        title: "Cupom Copiado!",
        description: "Agora é só colar no fechamento do seu pedido.",
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-background w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 z-10 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image Header */}
          {notification.image_url ? (
            <div className="w-full h-48 bg-muted relative">
              <img 
                src={notification.image_url} 
                alt="Oferta" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>
          ) : (
            <div className="w-full h-32 bg-primary/10 flex items-center justify-center relative">
              <div className="text-6xl">{notification.emoji || "🎁"}</div>
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-50" />
            </div>
          )}

          {/* Content */}
          <div className="p-6 pt-2 text-center">
            {notification.image_url && notification.emoji && (
              <div className="text-4xl mb-3 -mt-6 relative z-10 drop-shadow-md">{notification.emoji}</div>
            )}
            
            <h3 className="text-xl font-extrabold tracking-tight mb-2 text-foreground">
              {notification.title}
            </h3>
            
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {notification.message}
            </p>

            {notification.coupon_code && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-primary/10 rotate-12">
                  <Ticket className="w-16 h-16" />
                </div>
                
                <p className="text-xs font-semibold text-primary uppercase mb-1 flex items-center justify-center gap-1">
                  <Gift className="w-3 h-3" /> Seu Cupom
                </p>
                <div className="text-2xl font-black text-foreground tracking-wider mb-3 font-mono">
                  {notification.coupon_code}
                </div>
                
                <Button 
                  onClick={handleCopy} 
                  variant={copied ? "default" : "secondary"}
                  className="w-full font-bold shadow-sm"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copiar Código</>
                  )}
                </Button>
              </div>
            )}

            <Button onClick={onClose} variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
              Entendi, obrigado!
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
