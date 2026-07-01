import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SmartAppBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [appLink, setAppLink] = useState('');
  const [osName, setOsName] = useState('');

  useEffect(() => {
    // Check if dismissed
    if (localStorage.getItem('eprajaAppBannerClosed') === 'true') {
      return;
    }

    // Check if we are already inside the native app (Capacitor)
    const isCapacitor = !!(window as any).Capacitor;
    if (isCapacitor) {
      return;
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    if (/android/i.test(userAgent)) {
      setOsName('Android');
      setAppLink('https://play.google.com/store/apps/details?id=com.epraja&hl=pt_BR');
      setIsVisible(true);
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setOsName('iOS');
      setAppLink('https://apps.apple.com/br/app/é-pra-já-delivery/id6775949358');
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const handleClose = () => {
    localStorage.setItem('eprajaAppBannerClosed', 'true');
    setIsVisible(false);
  };

  return (
    <div className="bg-primary/5 border-b border-primary/10 px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 w-full shrink-0">
      <button 
        onClick={handleClose} 
        className="p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-full transition-colors shrink-0"
        aria-label="Fechar banner"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shrink-0 shadow-sm overflow-hidden">
           <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[13px] leading-tight truncate text-foreground">É Pra Já Delivery</span>
          <span className="text-[11px] text-muted-foreground truncate font-medium">Acesse mais rápido pelo app</span>
        </div>
      </div>

      <Button size="sm" asChild className="rounded-full px-5 h-8 font-bold shrink-0 text-xs shadow-sm">
        <a href={appLink} target="_blank" rel="noopener noreferrer">
          Baixar
        </a>
      </Button>
    </div>
  );
}
