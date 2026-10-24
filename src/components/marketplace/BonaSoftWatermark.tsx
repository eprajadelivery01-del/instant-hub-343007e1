import React from 'react';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

export const BONASOFT_WHATSAPP_PHONE = '5566992734632';
export const BONASOFT_DEFAULT_MESSAGE =
  'Olá! Conheci a BonaSoft através do aplicativo É Pra Já e gostaria de conhecer melhor os serviços de desenvolvimento de aplicativos e sistemas. Podemos conversar?';

/**
 * Retorna a URL oficial do WhatsApp com a mensagem formatada.
 */
export function getBonaSoftWhatsAppUrl(): string {
  const encoded = encodeURIComponent(BONASOFT_DEFAULT_MESSAGE).replace(/!/g, '%21');
  return `https://wa.me/${BONASOFT_WHATSAPP_PHONE}?text=${encoded}`;
}

/**
 * Manipulador de clique universal compatível com Web, Android (Capacitor/WebView) e iOS (Capacitor/WKWebView).
 * No Capacitor, window.location.href aciona o Bridge.launchIntent nativo, abrindo o WhatsApp do aparelho.
 */
export function openBonaSoftWhatsApp(e?: React.SyntheticEvent) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const phone = BONASOFT_WHATSAPP_PHONE;
  const encoded = encodeURIComponent(BONASOFT_DEFAULT_MESSAGE).replace(/!/g, '%21');
  const webUrl = `https://wa.me/${phone}?text=${encoded}`;

  try {
    const isNative =
      typeof window !== 'undefined' &&
      (Capacitor.isNativePlatform() || /Capacitor|Cordova/i.test(navigator.userAgent));

    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isNative || isMobile) {
      // No app nativo (Android/iOS) ou celular:
      // window.location.href aciona o Bridge.launchIntent do Capacitor,
      // disparando o Intent nativo do Android / openURL do iOS sem bloqueio de popups.
      window.location.href = webUrl;
      return;
    }

    // No desktop: abre em nova aba
    const win = window.open(webUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = webUrl;
    }
  } catch {
    window.location.href = webUrl;
  }
}

interface BonaSoftWatermarkProps {
  className?: string;
  containerClassName?: string;
}

/**
 * Marca d'água oficial da BonaSoft com tipografia padrão idêntica à do aplicativo mobile
 * e toque/clique que encaminha diretamente para o WhatsApp comercial.
 */
export function BonaSoftWatermark({ className, containerClassName }: BonaSoftWatermarkProps) {
  const whatsappUrl = getBonaSoftWhatsAppUrl();

  return (
    <div className={cn('text-center', containerClassName)}>
      <a
        href={whatsappUrl}
        onClick={openBonaSoftWhatsApp}
        role="button"
        tabIndex={0}
        title="BonaSoft - Desenvolvimento de Aplicativos e Sistemas"
        aria-label="Falar com a BonaSoft no WhatsApp"
        className={cn(
          'inline-flex items-center justify-center py-3 px-5 -my-2 -mx-3 cursor-pointer select-none',
          'text-[11px] font-black uppercase tracking-[0.6em] text-muted-foreground/30',
          'hover:text-muted-foreground/80 active:text-foreground active:scale-95 transition-all duration-200 ml-2',
          className
        )}
      >
        BONASOFT
      </a>
    </div>
  );
}
