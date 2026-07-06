import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Coupon } from '@/types/database';
import { useAddress } from '@/contexts/AddressContext';
import { ArrowLeft, Ticket, Search, Clock, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Coupons() {
  const navigate = useNavigate();
  const { selectedAddress } = useAddress();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      // Fetch available coupons that are active and not expired
      const { data } = await supabase
        .from('coupons')
        .select('*, companies(name, logo_url, region_id)')
        .eq('active', true)
        .order('created_at', { ascending: false });

      // We do a soft filter for expiry since the policy handles most, but just to be safe
      let valid = (data || []).filter(c => !c.expires_at || new Date(c.expires_at) > new Date());
      
      // Filtrar por região se houver endereço selecionado
      const regionId = (selectedAddress as any)?.region_id;
      if (regionId) {
        valid = valid.filter((c: any) => 
          !c.company_id || 
          c.companies?.region_id === regionId
        );
      }

      setCoupons(valid);
      setLoading(false);
    };

    fetchCoupons();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!', { description: 'Cole esse código na tela de finalização do pedido.' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border transition-all pt-[env(safe-area-inset-top,0px)]">
        <div className="flex h-16 items-center px-6">
          <button onClick={() => navigate('/marketplace/profile')} className="mr-4">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground tracing-tight">Meus Cupons</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mt-0.5">Clube de Benefícios</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Banner Input */}
        <div className="mb-8">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-secondary border border-border">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Adicionar código do cupom" 
                className="w-full h-11 bg-transparent border-none focus:outline-none pl-10 pr-4 text-sm font-bold uppercase placeholder:normal-case placeholder:text-muted-foreground"
              />
            </div>
            <button 
              onClick={() => toast.info('Em breve seráá possível vincular cupons ocultos!')}
              className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider shrink-0 transition-transform active:scale-95"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* List */}
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground mb-4">Disponíveis para vocêê</h2>

          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 w-full rounded-3xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-8">
              <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center mb-6">
                <Ticket className="h-10 w-10 text-muted-foreground/50 opacity-40" />
              </div>
              <h3 className="text-xl font-black text-foreground">Nenhum cupom ativo</h3>
              <p className="text-sm font-medium text-muted-foreground mt-2">Aguarde nãovas promoções do É Pra Já para aproveitar descontos incríveis.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="relative overflow-hidden rounded-3xl bg-card border border-border/50 shadow-sm flex flex-col group">
                  {/* Decorative dashed separator logic if we wanted one, instead we use a modern approach */}
                  <div className="p-5 flex gap-4">
                    <div className="h-16 w-16 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center flex-col gap-0.5">
                      <Ticket className="h-6 w-6 text-primary" />
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest mt-1">É PRA JÁ</span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-lg font-black text-foreground leading-tight truncate">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}% de Desconto` 
                          : `R$ ${coupon.discount_value.toLocaleString('pt-BR', {minimumFractionDigits:2})} OFF`}
                      </h3>
                      <p className="text-[10px] font-bold text-primary uppercase mt-0.5">
                        {(coupon as any).companies?.name || 'É Pra Já Delivery'}
                      </p>
                      {coupon.description && (
                         <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate">{coupon.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-bold uppercase tracking-wider">
                          <span className="opacity-50">CÓDIGO:</span>
                          <span className="text-primary">{coupon.code}</span>
                        </div>
                        {coupon.expires_at && (
                           <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                             <Clock className="h-3 w-3" />
                             Expira: {new Date(coupon.expires_at).toLocaleDateString()}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer CTA */}
                  <div className="bg-secondary/30 border-t border-dashed border-border p-3 px-5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {coupon.min_order_value > 0 ? `Para pedidos acima de R$ ${coupon.min_order_value}` : 'Válido para qualquer valor'}
                    </span>
                    <button 
                      onClick={() => handleCopyCode(coupon.code)}
                      className="text-xs font-black text-primary hover:text-primary/80 transition-colors uppercase tracking-widest active:scale-95"
                    >
                      Copiar Código
                    </button>
                  </div>

                  {/* Cutout circles for realism */}
                  <div className="absolute top-[82px] -left-3 h-6 w-6 rounded-full bg-background border border-border/50" />
                  <div className="absolute top-[82px] -right-3 h-6 w-6 rounded-full bg-background border border-border/50" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
