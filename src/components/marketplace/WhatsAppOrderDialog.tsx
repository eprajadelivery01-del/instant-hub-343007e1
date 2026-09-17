import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { WhatsAppStoreConfig, buildWhatsAppLink } from '@/lib/whatsappStores';

/**
 * Ícone oficial e fiel do WhatsApp em vetor SVG de alta definição
 */
export function WhatsAppIcon({ className = "h-5 w-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fill="#25D366"
        d="M16 2C8.28 2 2 8.28 2 16c0 2.72.78 5.26 2.13 7.41L2.05 30l6.81-2.03C10.9 29.17 13.37 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2z"
      />
      <path
        fill="#FFFFFF"
        d="M22.95 19.34c-.38-.19-2.27-1.12-2.62-1.25-.35-.13-.61-.19-.86.19-.26.38-.99 1.25-1.21 1.5-.23.26-.45.29-.83.1-.38-.19-1.62-.6-3.08-1.9-1.14-1.02-1.91-2.27-2.13-2.66-.23-.38-.02-.59.17-.78.17-.17.38-.45.58-.67.19-.22.26-.38.38-.64.13-.26.06-.48-.03-.67-.1-.19-.86-2.08-1.18-2.85-.31-.75-.63-.65-.86-.66h-.73c-.26 0-.67.1-1.02.48-.35.38-1.34 1.31-1.34 3.2s1.38 3.71 1.57 3.96c.19.26 2.7 4.13 6.55 5.79.91.4 1.63.63 2.18.81.92.29 1.76.25 2.42.15.74-.11 2.27-.93 2.59-1.82.32-.89.32-1.66.22-1.82-.1-.17-.35-.26-.73-.45z"
      />
    </svg>
  );
}

interface WhatsAppOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WhatsAppStoreConfig | null;
}

export function WhatsAppOrderDialog({
  open,
  onOpenChange,
  config,
}: WhatsAppOrderDialogProps) {
  if (!config) return null;

  const whatsappUrl = buildWhatsAppLink(config.phone, config.defaultMessage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[32px] p-6 text-center border border-border shadow-2xl">
        <DialogHeader className="flex flex-col items-center gap-3">
          {/* Logo oficial do WhatsApp com background verde e sombra de destaque */}
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 ring-8 ring-[#25D366]/15 transition-transform duration-300 hover:scale-105">
            <WhatsAppIcon className="h-10 w-10 fill-white drop-shadow-sm" />
          </div>

          <DialogTitle className="text-xl font-black tracking-tight text-foreground">
            Pedidos pelo WhatsApp
          </DialogTitle>

          <DialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
            Esta loja ainda não possui produtos cadastrados no É Pra Já.
            <br />
            Os pedidos desta loja são realizados diretamente pelo WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 rounded-2xl bg-secondary/50 p-4 border border-border/50 flex flex-col items-center">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            WhatsApp de Atendimento
          </span>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <WhatsAppIcon className="h-5 w-5 fill-[#25D366]" />
            <span className="text-lg font-black text-foreground tracking-tight">
              {config.displayPhone}
            </span>
          </div>
          <span className="mt-1 block text-xs font-semibold text-primary">
            {config.name}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 mt-2">
          {/* Link <a> nativo com target="_blank" para abrir em nova aba/app sem ser bloqueado em iframes (Lovable preview) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm shadow-lg shadow-[#25D366]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer no-underline"
          >
            <WhatsAppIcon className="h-5 w-5 fill-white" />
            <span>Falar no WhatsApp</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-80 ml-auto" />
          </a>

          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 w-full rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
