import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Ticket, Copy, Check } from "lucide-react";
import { useActiveCoupons } from "@/services/coupons";
import { useState } from "react";

export function StoreCouponsSheet({
  isOpen,
  onOpenChange,
  companyId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}) {
  const { data: coupons, isLoading } = useActiveCoupons(companyId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[1.5rem] p-6 sm:max-w-md mx-auto h-[80vh] flex flex-col gap-0 z-[100]">
        <SheetHeader className="pb-6 border-b text-left space-y-1">
          <SheetTitle className="flex items-center gap-2 text-xl font-black">
            <Ticket className="h-6 w-6 text-primary" />
            Cupons da Loja
          </SheetTitle>
          <SheetDescription>
            Aproveite os descontos disponíveis.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pt-6 space-y-4 scrollbar-hide pb-6">
          {isLoading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted/50" />
              ))}
            </div>
          ) : coupons && coupons.length > 0 ? (
            coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="relative overflow-hidden flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm"
              >
                <div className="flex justify-between items-start px-2">
                  <div>
                    <h3 className="font-black text-primary text-2xl tracking-tight">
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}% OFF`
                        : `R$ ${coupon.discount_value.toFixed(2).replace('.', ',')} OFF`}
                    </h3>
                    {coupon.description && (
                      <p className="text-sm font-medium text-muted-foreground mt-1 line-clamp-2">
                        {coupon.description}
                      </p>
                    )}
                    {coupon.min_order_value > 0 && (
                      <p className="text-xs font-semibold text-foreground/80 mt-2 bg-background/60 inline-block px-2 py-1 rounded-md border border-primary/10">
                        Pedido mínimo: R$ {coupon.min_order_value.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 px-2 z-10">
                  <div className="flex-1 border-2 border-dashed border-primary/30 bg-background py-2.5 px-3 rounded-xl flex items-center justify-between">
                    <span className="font-mono font-black tracking-widest text-foreground text-sm uppercase">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => handleCopy(coupon.code, coupon.id)}
                      className="text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-lg text-xs font-bold uppercase active:scale-95"
                    >
                      {copiedId === coupon.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Decorative cutouts for ticket look */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-r border-primary/20" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-l border-primary/20" />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
              <Ticket className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium text-sm">
                Nenhum cupom disponível no momento.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
