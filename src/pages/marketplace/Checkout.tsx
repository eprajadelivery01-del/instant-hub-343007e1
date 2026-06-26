// VERSION: 2026-05-21-CHECKOUT-MODAL
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Address } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { MapPin, Banknote, AlertCircle, ArrowLeft, Loader2, FileText, Smartphone, Bike, Ticket } from 'lucide-react';
import { useOrderLock } from '@/hooks/useOrderLock';
import { calculateDeliveryFee } from '@/utils/freight';

function mapServerError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('address not found')) return 'Endereço inválido para este usuário.';
  if (m.includes('out of range') || m.includes('out of region') || m.includes('delivery unavailable'))
    return 'Entrega indisponível para este endereço.';
  if (m.includes('product') && m.includes('unavailable')) return 'Um dos itens não está mais disponível.';
  if (m.includes('product') && m.includes('not found')) return 'Um produto do carrinho não existe mais.';
  if (m.includes('does not belong to the company')) return 'Há itens de outra loja no carrinho.';
  if (m.includes('company not found')) return 'Loja indisponível no momento.';
  if (m.includes('failed to provision customer')) return 'Não foi possível vincular seu cadastro. Tente novamente.';
  if (m.includes('invalid session') || m.includes('missing authorization')) return 'Sessão expirada. Faça login novamente.';
  return msg || 'Erro ao criar pedido.';
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, company, clearCart, appliedCoupon, discountAmount, subtotal } = useCart();
  const { isLocked, acquireLock, releaseLock, generateIdempotencyKey, resetIdempotencyKey } = useOrderLock();
  
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  
  const [paymentMethod, setPaymentMethod] = useState('money');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  
  const [cpf, setCpf] = useState('');

  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadingFee, setLoadingFee] = useState(false);
  const [loading, setLoading] = useState(false);
  // shared queryKey with the route data prefetcher
  const { data: addresses = [], isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as Address[];
    },
  });
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [fulfillmentMode, setFulfillmentMode] = useState<'delivery' | 'pickup'>('delivery');

  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses[0].id);
    }
  }, [addresses, selectedAddress]);

  useEffect(() => {
    if (!selectedAddress) return;
    const addr = addresses.find(a => a.id === selectedAddress);
    if (!addr) {
      setDeliveryFee(null);
      setUnavailable(false);
      return;
    }

    const checkRegion = async () => {
      if (!company?.id) return;
      setLoadingFee(true);
      setUnavailable(false);
      try {
        const { data: dbCompany } = await supabase.from('companies').select('delivery_fee, delivery_regions_pricing').eq('id', company.id).single();
        
        let pricingArray: any[] = [];
        if (dbCompany?.delivery_regions_pricing) {
           if (typeof dbCompany.delivery_regions_pricing === 'string') {
             try { pricingArray = JSON.parse(dbCompany.delivery_regions_pricing); } catch(e) {}
           } else if (Array.isArray(dbCompany.delivery_regions_pricing)) {
             pricingArray = dbCompany.delivery_regions_pricing;
           }
        }

        // Usar o preço por região se o endereço tiver region_id
        const addrAny = addr as any;
        if (addrAny.region_id && pricingArray.length > 0) {
           const regionPricing = pricingArray.find((p: any) => p.region_id === addrAny.region_id);
           if (regionPricing && regionPricing.customer_price !== undefined && regionPricing.customer_price !== "") {
             setDeliveryFee(Number(regionPricing.customer_price));
             return;
           } else {
             // Se não encontrou o preço para a região, talvez o lojista não entregue nela
             setDeliveryFee(null);
             setUnavailable(true);
             toast.warning('O lojista não configurou taxa para sua região.');
             return;
           }
        }

        // Se o endereço NÃO tiver region_id, mas tiver lat/long E a loja tiver preços por região, calcula via polígono
        if (addr.latitude && addr.longitude && pricingArray.length > 0) {
          const result = await calculateDeliveryFee(addr.latitude, addr.longitude, supabase, pricingArray);

          if (result.isOutOfRange) {
            setDeliveryFee(null);
            setUnavailable(true);
            toast.warning('Este endereço está fora da área de entrega do lojista.');
            return;
          } else if (result.fee !== null) {
            setDeliveryFee(result.fee);
            return;
          }
        }

        // Fallback antigo: Se não usar regiões, usa a taxa fixa
        if (dbCompany?.delivery_fee !== null && dbCompany?.delivery_fee !== undefined && pricingArray.length === 0) {
          setDeliveryFee(dbCompany.delivery_fee);
          return;
        }

        // Último caso: Tem lat/long mas não tem pricingArray nem taxa fixa (ou fallback da lógica antiga sem pricing)
        if (addr.latitude && addr.longitude) {
           const result = await calculateDeliveryFee(addr.latitude, addr.longitude, supabase, pricingArray);
           if (result.isOutOfRange) {
             setDeliveryFee(null);
             setUnavailable(true);
             toast.warning('Este endereço está fora da área de entrega.');
           } else if (result.fee !== null) {
             setDeliveryFee(result.fee);
           } else {
             setDeliveryFee(0);
           }
        } else {
          // Sem lat/lng e sem region_id
          setDeliveryFee(null);
          setUnavailable(true);
          toast.warning('Endereço inválido. Edite e selecione sua região.');
        }
      } finally {
        setLoadingFee(false);
      }
    };

    checkRegion();
  }, [selectedAddress, addresses, company?.delivery_fee]);

  // Recalculate total manually because cartTotal might not update instantly when we are at Checkout
  const finalTotal = Math.max(0, subtotal - discountAmount) + (fulfillmentMode === 'pickup' ? 0 : (deliveryFee || 0));

  const handleOpenReview = () => {
    if (fulfillmentMode === 'delivery') {
      if (!selectedAddress) { toast.error('Selecione um endereço'); return; }
      if (unavailable) { toast.error('Entrega não disponível'); return; }
      if (loadingFee) { toast.error('Calculando frete, aguarde'); return; }
    }
    setShowReviewModal(true);
  };

  const handleSubmit = async () => {
    if (!user || !company || items.length === 0) return;
    if (loading || isLocked) return;
    
    setLoading(true);
    try {
      const { data: storeStatus } = await supabase.from('companies').select('is_open').eq('id', company.id).single();
      if (!storeStatus?.is_open) {
        toast.error('Este restaurante ainda não abriu ou já fechou.', {
          description: 'Verifique o horário de funcionamento na página da loja.'
        });
        setLoading(false);
        setShowReviewModal(false);
        return;
      }

      if (!acquireLock()) {
        setLoading(false);
        return;
      }

      const orderNotes = cpf ? `CPF na nota: ${cpf}` : null;

      const ik = generateIdempotencyKey(
        user.id,
        items,
        `${company.id}|${selectedAddress}|${appliedCoupon?.code ?? ''}|${paymentMethod}`,
      );

      const requestBody = {
        items: items.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          notes: it.note || null,
          options: it.options || [],
        })),
        company_id: company.id,
        address_id: fulfillmentMode === 'pickup' ? null : selectedAddress,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code ?? null,
        notes: fulfillmentMode === 'pickup' ? `[RETIRADA NO LOCAL] ${orderNotes || ''}`.trim() : orderNotes,
        needs_change: paymentMethod === 'money' && needsChange,
        change_for: changeFor ? Number(changeFor) : null,
        idempotency_key: ik,
      };

      const { data, error: functionError } = await supabase.rpc('create_order_v3', {
        p_items: requestBody.items,
        p_company_id: requestBody.company_id,
        p_address_id: requestBody.address_id,
        p_payment_method: requestBody.payment_method,
        p_coupon_code: requestBody.coupon_code,
        p_notes: requestBody.notes,
        p_needs_change: requestBody.needs_change,
        p_change_for: requestBody.change_for,
        p_idempotency_key: requestBody.idempotency_key,
        p_delivery_fee: fulfillmentMode === 'pickup' ? 0 : (deliveryFee || 0)
      });

      if (functionError) {
        throw new Error(mapServerError(functionError.message || 'Erro ao processar pedido'));
      }

      const orderId = data?.order_id || data;
      if (!orderId) throw new Error('Falha ao obter ID do pedido.');



      clearCart();
      resetIdempotencyKey();
      toast.success('Pedido realizado!');
      setShowReviewModal(false);
      navigate(`/marketplace/orders/${orderId}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar pedido');
    } finally { setLoading(false); releaseLock(); }
  };

  if (!user) { navigate('/marketplace/login'); return null; }
  if (items.length === 0) { navigate('/marketplace/cart'); return null; }

  const selAddrObj = addresses.find(a => a.id === selectedAddress);

  return (
    <MarketplaceLayout hideNav>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <div className="flex-1 text-center pr-9">
          <h1 className="font-bold text-sm tracking-widest text-foreground uppercase">SACOLA</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-0 py-4 pb-40">
        {/* Fulfillment Mode Toggle */}
        <div className="px-4 mb-6">
          <div className="bg-muted p-1 rounded-xl flex items-center">
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${fulfillmentMode === 'delivery' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setFulfillmentMode('delivery')}
            >
              Entrega
            </button>
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${fulfillmentMode === 'pickup' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setFulfillmentMode('pickup')}
            >
              Retirada
            </button>
          </div>
        </div>

        {fulfillmentMode === 'delivery' && (
          <>
            {/* Endereço estilo iFood */}
            <div className="px-4 mb-6">
              <h3 className="text-base font-bold text-foreground mb-3">Entregar no endereço</h3>
              {loadingAddresses ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : addresses.length === 0 ? (
                <div className="text-center py-4 border border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
                  <Button size="sm" className="mt-2 rounded-lg" onClick={() => navigate('/marketplace/addresses')}>Adicionar</Button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3 bg-background">
                  <div className="flex gap-3 min-w-0">
                    <MapPin className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{selAddrObj?.street}, {selAddrObj?.number}</p>
                      <p className="text-sm text-muted-foreground truncate">{selAddrObj?.neighborhood} - {selAddrObj?.complement || 'Casa'}</p>
                    </div>
                  </div>
                  <button className="text-sm font-semibold text-primary shrink-0" onClick={() => navigate('/marketplace/addresses')}>
                    Trocar
                  </button>
                </div>
              )}
            </div>

            {/* Opções de entrega */}
            <div className="px-4 mb-8">
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-1">
                Opções de entrega <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </h3>
              <div className="border border-[#111111] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">Padrão</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Hoje, 30 - 45min</p>
                </div>
                <div className="flex items-center gap-3">
                  {loadingFee ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : deliveryFee === 0 ? (
                    <span className="text-[#00A868] font-bold text-sm">Grátis</span>
                  ) : deliveryFee !== null ? (
                    <span className="font-bold text-sm">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                  ) : unavailable ? (
                    <span className="text-destructive font-bold text-xs">Indisponível</span>
                  ) : null}
                  <div className="h-5 w-5 rounded-full border-4 border-primary/20 flex items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="h-2 w-full bg-secondary mb-6" />

        {/* Formas de Pagamento restritas */}
        <div className="px-4 mb-6">
          <h3 className="text-base font-bold text-foreground mb-4">Pagamento na entrega</h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
            {[
              { value: 'money', icon: Banknote, label: 'Dinheiro', desc: 'Solicite troco se precisar' },
              { value: 'card', icon: Smartphone, label: 'Máquina', desc: 'Cartão de crédito, débito ou PIX na máquina' },
            ].map(m => (
              <div key={m.value} className="flex items-center gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <RadioGroupItem value={m.value} id={m.value} />
                <div className="flex gap-3 flex-1 items-center">
                  <m.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <label htmlFor={m.value} className="text-sm font-semibold cursor-pointer">{m.label}</label>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>

          {paymentMethod === 'money' && (
            <div className="mt-4 rounded-xl border border-border p-4 bg-muted/20 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  id="needs-change"
                  type="checkbox"
                  checked={needsChange}
                  onChange={(e) => setNeedsChange(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded"
                />
                <label htmlFor="needs-change" className="text-sm font-semibold cursor-pointer">
                  Preciso de troco
                </label>
              </div>
              {needsChange && (
                <div className="pl-7 space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Troco para quanto?</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={finalTotal}
                    step="0.01"
                    placeholder={`Ex: ${(Math.ceil(finalTotal / 10) * 10).toFixed(2)}`}
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
                  />
                  {changeFor && Number(changeFor) > finalTotal && (
                    <p className="text-xs font-bold text-primary mt-1">
                      Troco de R$ {(Number(changeFor) - finalTotal).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-2 w-full bg-secondary mb-6" />

        {/* CPF na nota */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-foreground" />
              <div>
                <h3 className="font-bold text-sm text-foreground">CPF na nota</h3>
                <p className="text-xs text-muted-foreground">Opcional</p>
              </div>
            </div>
            {!cpf ? (
              <button className="text-sm font-semibold text-primary" onClick={() => setCpf('000.000.000-00')}>Adicionar</button>
            ) : (
              <button className="text-sm font-semibold text-destructive" onClick={() => setCpf('')}>Remover</button>
            )}
          </div>
          {cpf && (
            <div className="mt-3">
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full h-12 bg-background border border-border rounded-xl px-4 text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer Checkout */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="mx-auto max-w-lg space-y-2">
          {deliveryFee === 0 ? (
            <p className="text-[13px] text-muted-foreground font-medium mb-2 px-1">
              Total com <span className="text-foreground font-bold">entrega grátis</span>
            </p>
          ) : (
             <p className="text-[13px] text-muted-foreground font-medium mb-2 px-1">
              Total a pagar
             </p>
          )}
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-xl text-foreground">
                R$ {finalTotal.toFixed(2).replace('.', ',')}
                <span className="text-xs text-muted-foreground font-medium ml-1">/ {items.reduce((a, b) => a + b.quantity, 0)} item{items.length > 1 ? 's' : ''}</span>
              </p>
            </div>
            <Button 
              className="h-14 w-[60%] rounded-xl text-base font-bold bg-[#EA1D2C] hover:bg-[#D11825] text-white" 
              onClick={handleOpenReview} 
              disabled={unavailable || !selectedAddress || loadingFee}
            >
              Revisar pedido
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet Modal - Revise o seu pedido */}
      <Sheet open={showReviewModal} onOpenChange={setShowReviewModal}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-[32px] px-0 pb-0 pt-6">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-6" />
          <SheetHeader className="px-6 mb-6">
            <SheetTitle className="text-center text-xl font-bold">Revise o seu pedido</SheetTitle>
          </SheetHeader>

          <div className="px-6 space-y-6">
            <div className="flex items-start gap-4">
              <Bike className="h-6 w-6 text-foreground mt-0.5" />
              <div>
                <p className="font-bold text-[15px]">Entrega hoje</p>
                <p className="text-sm text-muted-foreground">Hoje, 30 - 45 min</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-foreground mt-0.5" />
              <div>
                {fulfillmentMode === 'pickup' ? (
                  <>
                    <p className="font-bold text-[15px]">Retirada na Loja</p>
                    <p className="text-sm text-muted-foreground">{company?.address || 'Endereço da loja'}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[15px]">{selAddrObj?.street}, {selAddrObj?.number}</p>
                    <p className="text-sm text-muted-foreground">{selAddrObj?.complement || 'Casa'}</p>
                  </>
                )}
              </div>
            </div>

            {appliedCoupon && (
              <div className="flex items-start gap-4">
                <Ticket className="h-6 w-6 text-foreground mt-0.5" />
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[15px]">Cupom aplicado</p>
                    <p className="text-sm text-primary uppercase">{appliedCoupon.code}</p>
                  </div>
                  <span className="font-bold text-primary">- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 pb-2 border-b border-border/50">
              <Banknote className="h-6 w-6 text-[#00A868] mt-0.5" />
              <div className="flex-1 flex justify-between items-start">
                <div>
                  <p className="font-bold text-[15px] flex items-center gap-1">Pagamento na entrega <span className="text-[#EA1D2C]">*</span></p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethod === 'money' ? `Dinheiro${needsChange && changeFor ? ` - Troco para R$ ${Number(changeFor).toFixed(2).replace('.', ',')}` : ''}` : 'Máquina (Cartão/PIX)'}
                  </p>
                </div>
                <span className="font-bold text-base mt-0.5">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4 pb-8 space-y-3 bg-background">
            <Button 
              className="w-full h-14 rounded-xl text-base font-bold bg-[#EA1D2C] hover:bg-[#D11825] text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Fazer pedido'}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-14 rounded-xl text-[15px] font-semibold text-[#EA1D2C] hover:bg-transparent hover:text-[#D11825]"
              onClick={() => setShowReviewModal(false)}
            >
              Alterar pedido
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MarketplaceLayout>
  );
}
