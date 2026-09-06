import React from 'react';
import { X, Smartphone, User, Loader2 } from 'lucide-react';

interface RequirePhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneInput: string;
  setPhoneInput: (val: string) => void;
  nameInput?: string;
  setNameInput?: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function RequirePhoneModal({
  isOpen,
  onClose,
  phoneInput,
  setPhoneInput,
  nameInput,
  setNameInput,
  onSubmit,
  isSubmitting
}: RequirePhoneModalProps) {
  if (!isOpen) return null;

  const needsName = setNameInput !== undefined;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div 
        className="bg-background rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            {needsName ? <User className="h-8 w-8" /> : <Smartphone className="h-8 w-8" />}
          </div>
          <h2 className="text-xl font-black text-foreground mb-2 tracking-tight">
            Identificação para Entrega
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Informe seu nome completo e WhatsApp para que a loja e o entregador possam identificar e entregar seu pedido com segurança.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {needsName && (
            <div>
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block mb-2 px-1">
                Seu Nome Completo
              </label>
              <input
                type="text"
                autoFocus
                required
                value={nameInput || ''}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full bg-muted border border-border rounded-2xl px-4 py-4 text-center font-bold text-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block mb-2 px-1">
              Telefone WhatsApp com DDD
            </label>
            <input
              type="tel"
              autoFocus={!needsName}
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full bg-muted border border-border rounded-2xl px-4 py-4 text-center font-bold text-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || phoneInput.replace(/\D/g, '').length < 10 || (needsName && (!nameInput || nameInput.trim().length < 2))}
            className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Confirmar e Continuar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
