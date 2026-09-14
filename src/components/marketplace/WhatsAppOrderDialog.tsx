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
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.678.15-.2.301-.778.978-.954 1.179-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.424-1.496-.895-.798-1.5-1.784-1.675-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.2-.301.301-.502.101-.2.05-.376-.025-.526-.075-.15-.678-1.634-.929-2.239-.245-.589-.494-.509-.678-.518-.176-.009-.376-.01-.577-.01-.2 0-.527.075-.803.376s-1.054 1.029-1.054 2.509c0 1.48 1.079 2.909 1.23 3.11.15.201 2.124 3.243 5.145 4.548.719.311 1.28.497 1.718.636.723.23 1.38.198 1.9.12.58-.087 1.78-.727 2.03-1.429.251-.702.251-1.304.176-1.429-.076-.125-.276-.2-.577-.351zM12.04 2c-5.503 0-9.98 4.477-9.98 9.98 0 1.758.459 3.473 1.332 4.985L2 22.25l5.437-1.328c1.463.798 3.11 1.218 4.603 1.218 5.503 0 9.98-4.477 9.98-9.98 0-5.503-4.477-9.98-9.98-9.98zm0 18.293c-1.489 0-2.951-.4-4.23-1.159l-.304-.18-3.142.768.784-3.064-.198-.315c-.832-1.324-1.272-2.866-1.272-4.444 0-4.577 3.725-8.302 8.302-8.302 4.577 0 8.302 3.725 8.302 8.302 0 4.577-3.725 8.302-8.302 8.302z" />
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

  const handleOpenWhatsApp = () => {
    try {
      const newWin = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        window.location.href = whatsappUrl;
      }
    } catch {
      window.location.href = whatsappUrl;
    }
  };

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
          <Button
            type="button"
            onClick={handleOpenWhatsApp}
            className="h-12 w-full rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm shadow-lg shadow-[#25D366]/25 gap-2 transition-all active:scale-[0.98]"
          >
            <WhatsAppIcon className="h-5 w-5 fill-white" />
            Falar no WhatsApp
            <ExternalLink className="h-3.5 w-3.5 opacity-80 ml-auto" />
          </Button>

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
