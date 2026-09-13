import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, ExternalLink, X } from 'lucide-react';
import { WhatsAppStoreConfig, buildWhatsAppLink } from '@/lib/whatsappStores';

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
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[32px] p-6 text-center border border-border shadow-2xl">
        <DialogHeader className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/5">
            <MessageCircle className="h-8 w-8 fill-current" />
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

        <div className="my-2 rounded-2xl bg-secondary/50 p-4 border border-border/50">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            WhatsApp de Atendimento
          </span>
          <span className="mt-0.5 block text-lg font-black text-foreground tracking-tight">
            {config.displayPhone}
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-primary">
            {config.name}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 mt-2">
          <Button
            type="button"
            onClick={handleOpenWhatsApp}
            className="h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 gap-2 transition-transform active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4 fill-current" />
            Falar no WhatsApp
            <ExternalLink className="h-3.5 w-3.5 opacity-70 ml-auto" />
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
