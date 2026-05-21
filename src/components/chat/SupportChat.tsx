import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail, Clock, ArrowRight } from 'lucide-react';

interface SupportChatProps {
  topic: string;
  title: string;
  companyId?: string | null;
}

export function SupportChat({ topic, title }: SupportChatProps) {
  const whatsappNumber = '5566999426656';
  
  const getMessage = () => {
    if (topic === 'driver_application') {
      return 'Olá! Gostaria de saber como me cadastrar para ser um entregador parceiro da É Pra Já.';
    }
    return 'Olá! Preciso de ajuda com a plataforma É Pra Já.';
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(getMessage())}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="px-6 pt-12 pb-6 gradient-primary text-white rounded-b-[2.5rem] shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="text-white/80 text-sm font-medium">Atendimento rápido e humano</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 mt-4">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-lg font-black text-foreground mb-2">Atendimento via WhatsApp</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Para garantir que você seja atendido o mais rápido possível, nosso suporte é feito diretamente pelo WhatsApp oficial.
          </p>
          
          <Button 
            onClick={handleWhatsApp}
            className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black text-base shadow-lg shadow-green-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
          >
            <MessageCircle className="h-6 w-6" />
            Abrir WhatsApp
            <ArrowRight className="h-5 w-5 ml-auto opacity-70" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-3xl p-5 flex flex-col items-center text-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Horário</p>
              <p className="text-sm font-black text-foreground mt-0.5">08h às 23h</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-5 flex flex-col items-center text-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</p>
              <p className="text-[11px] font-black text-foreground mt-0.5">suporte@epraja.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
