import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Address } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { MapPin, CreditCard, Banknote, QrCode, Plus, AlertCircle, ArrowLeft, Ticket, CheckCircle2, Loader2 } from 'lucide-react';
import { useOrderLock } from '@/hooks/useOrderLock';
import { calculateDeliveryFee } from '@/utils/freight';
import { recordAuditLog, newRequestId } from '@/lib/auditLog';

function mapServerError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid or inactive coupon')) return 'Cupom inválido ou inativo.';
  if (m.includes('coupon expired')) return 'Este cupom já expirou.';
  if (m.includes('coupon minimum') || m.includes('below coupon')) return 'Pedido abaixo do mínimo do cupom.';
  if (m.includes('coupon belongs to another')) return 'Este cupom é exclusivo de outra loja.';
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
  const { user, profile } = useAuth();
  const { items, company, notes: itemNotes, subtotal, clearCart } = useCart();
  const { isLocked, acquireLock, releaseLock, generateIdempotencyKey, resetIdempotencyKey } = useOrderLock();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('money');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');

  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadingFee, setLoadingFee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>([]);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchAddresses = async () => {
      const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setAddresses(data || []);
      if (data && data.length > 0) setSelectedAddress(data[0].id);
      setLoadingAddresses(false);
    };
    fetchAddresses();
  }, [user]);

  useEffect(() => {
    if (!selectedAddress) return;
    const addr = addresses.find(a => a.id === selectedAddress);
    if (!addr || !addr.latitude || !addr.longitude) {
      setDeliveryFee(null);
      setRegionId(null);
      setRegionName(null);
      setUnavailable(false);
      return;
    }

    const checkRegion = async () => {
      setLoadingFee(true);
      setUnavailable(false);
      try {
        // Se a loja tem taxa fixa configurada, usa ela mas ainda tenta identificar a região
        if (company?.delivery_fee !== null && company?.delivery_fee !== undefined) {
          setDeliveryFee(company.delivery_fee);
          const result = await calculateDeliveryFee(addr.latitude!, addr.longitude!, supabase);
          if (result.regionId) {
            setRegionId(result.regionId);
            setRegionName(result.regionName);
          }
          return;
        }

        // Cálculo automático baseado nas regiões do mapa
        const result = await calculateDeliveryFee(addr.latitude!, addr.longitude!, supabase);

        if (result.isOutOfRange) {
          setDeliveryFee(null);
          setRegionId(null);
          setRegionName(null);
          setUnavailable(true);
          toast.warning('Este endereço está fora da área de entrega.');
        } else if (result.fee !== null) {
          setDeliveryFee(result.fee);
          setRegionId(result.regionId);
          setRegionName(result.regionName);
        } else {
          // Nenhuma região cadastrada ainda — sem bloqueio
          setDeliveryFee(0);
          setRegionId(null);
          setRegionName(null);
        }
      } finally {
        setLoadingFee(false);
      }
    };

    checkRegion();
  }, [selectedAddress, addresses]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const code = couponCode.trim().toUpperCase();
      const { data, error } = await supabase.from('coupons').select('*').eq('code', code).eq('active', true).maybeSingle();
      
      if (error || !data) {
        toast.error('Cupom inválido ou inativo.');
        setAppliedCoupon(null);
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('Este cupom já expirou.');
        setAppliedCoupon(null);
        return;
      }
      if (data.min_order_value && subtotal < data.min_order_value) {
        toast.error(`Valor mínimo para aplicar é de R$ ${data.min_order_value.toLocaleString('pt-BR')}`);
        setAppliedCoupon(null);
        return;
      }
      if (data.company_id && data.company_id !== company?.id) {
        toast.error('Este cupom é exclusivo de outra loja.');
        setAppliedCoupon(null);
        return;
      }
      
      // Fetch linked products
      const { data: links } = await supabase.from('coupon_products').select('product_id').eq('coupon_id', data.id);
      const pids = (links || []).map((l: any) => l.product_id);
      
      setApplicableProductIds(pids);
      setAppliedCoupon(data);
      toast.success('🎉 Cupom aplicado com sucesso!');
    } catch (err) {
      toast.error('Falha ao checar o cupom.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    
    const isSpecific = applicableProductIds.length > 0;
    const eligibleItems = isSpecific 
      ? items.filter(item => applicableProductIds.includes(item.product.id))
      : items;
    
    const eligibleSubtotal = eligibleItems.reduce(
      (acc, item) => acc + ((item.product.price || 0) * item.quantity),
      0,
    );
    
    if (eligibleSubtotal === 0) return 0;

    if (appliedCoupon.discount_type === 'percentage') {
      const discount = (eligibleSubtotal * (appliedCoupon.discount_value / 100));
      return Math.min(discount, appliedCoupon.max_discount_value || Infinity);
    }
    
    return Math.min(eligibleSubtotal, appliedCoupon.discount_value);
  }, [appliedCoupon, applicableProductIds, items]);

  const total = Math.max(0, subtotal - discountAmount) + (deliveryFee || 0);

  const handleSubmit = async () => {
    if (!user || !company || items.length === 0) return;
    if (!selectedAddress) { toast.error('Selecione um endereço'); return; }
    if (unavailable) { toast.error('Entrega não disponível'); return; }
    if (loading || isLocked) return;
    if (!acquireLock()) return;
    setLoading(true);
    const requestId = newRequestId();
    try {
      const orderNotes = Object.values(itemNotes)
        .map((note) => note.trim())
        .filter(Boolean)
        .join(' • ') || null;

      // Idempotency key baseado em (user, loja, endereço, cupom, itens).
      // Não inclui total — o servidor é a autoridade de preço.
      const ik = generateIdempotencyKey(
        user.id,
        items,
        `${company.id}|${selectedAddress}|${appliedCoupon?.code ?? ''}|${paymentMethod}`,
      );

      // Cálculo de total agora é autoridade do servidor (edge function).
      // Cliente envia apenas refs (items, address, coupon code) — total é apenas
      // dica de UX e jamais é gravado direto em orders.
      const requestBody = {
        items: items.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          notes: itemNotes[it.product.id] || null,
        })),
        company_id: company.id,
        address_id: selectedAddress,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code ?? null,
        notes: orderNotes,
        needs_change: paymentMethod === 'money' && needsChange,
        change_for: changeFor ? Number(changeFor) : null,
        idempotency_key: ik,
      };

      void recordAuditLog({
        request_id: requestId,
        event: 'orders.insert.attempt',
        user_id: user.id,
        payload: requestBody,
      });

      const { data, error: fnError } = await supabase.functions.invoke('create-order', {
        body: requestBody,
      });

      if (fnError || !data?.order_id) {
        const rawMsg =
          (data as any)?.error || (fnError as any)?.context?.error || fnError?.message || 'Erro ao criar pedido';
        const friendly = mapServerError(String(rawMsg));
        void recordAuditLog({
          request_id: requestId,
          event: 'orders.insert.error',
          user_id: user.id,
          error_message: rawMsg,
          payload: requestBody,
          context: { friendly },
        });
        throw new Error(friendly);
      }

      void recordAuditLog({
        request_id: requestId,
        event: 'orders.insert.success',
        user_id: user.id,
        context: { order_id: data.order_id, idempotent: !!data.idempotent },
      });

      clearCart();
      resetIdempotencyKey();
      if (data.idempotent) {
        toast.info('Esse pedido já foi criado. Abrimos os detalhes para você.');
      } else {
        toast.success('Pedido realizado!');
      }
      navigate(`/marketplace/orders/${data.order_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar pedido');
    } finally { setLoading(false); releaseLock(); }
  };

  if (!user) { navigate('/marketplace/login'); return null; }
  if (items.length === 0) { navigate('/marketplace/cart'); return null; }

  return (
    <MarketplaceLayout hideNav>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-lg px-4 py-3">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-semibold text-foreground">Finalizar pedido</h1>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-32">
        {/* Endereço */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Endereço
            </h3>
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => navigate('/marketplace/addresses')}>
              <Plus className="h-3 w-3 mr-1" /> Novo
            </Button>
          </div>
          {loadingAddresses ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : addresses.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
              <Button size="sm" className="mt-2 rounded-lg" onClick={() => navigate('/marketplace/addresses')}>Adicionar</Button>
            </div>
          ) : (
            <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
              {addresses.map(addr => (
                <div key={addr.id} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/20 transition-colors">
                  <RadioGroupItem value={addr.id} id={addr.id} className="mt-0.5" />
                  <label htmlFor={addr.id} className="text-sm cursor-pointer flex-1">
                    <p className="font-medium text-foreground">{addr.street}, {addr.number}</p>
                    <p className="text-xs text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                  </label>
                </div>
              ))}
            </RadioGroup>
          )}
          {unavailable && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Entrega não disponível</p>
                <p className="text-xs opacity-80">Este endereço está fora da área de atendimento.</p>
              </div>
            </div>
          )}
          {loadingFee && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 text-primary text-sm">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>Calculando frete da região...</span>
            </div>
          )}
          {regionName && !loadingFee && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 text-primary text-xs font-semibold">
              <MapPin className="h-3.5 w-3.5" />
              {regionName}
            </div>
          )}
        </div>

        {/* Pagamento */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Pagamento
          </h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-1">
            {[
              { value: 'money', icon: Banknote, label: 'Dinheiro' },
              { value: 'pix', icon: QrCode, label: 'PIX' },
              { value: 'card', icon: CreditCard, label: 'Cartão (na entrega)' },
            ].map(m => (
              <div key={m.value} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/20 transition-colors">
                <RadioGroupItem value={m.value} id={m.value} />
                <m.icon className="h-4 w-4 text-muted-foreground" />
                <label htmlFor={m.value} className="text-sm cursor-pointer">{m.label}</label>
              </div>
            ))}
          </RadioGroup>
          {paymentMethod === 'money' && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="needs-change"
                  type="checkbox"
                  checked={needsChange}
                  onChange={(e) => setNeedsChange(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <label htmlFor="needs-change" className="text-sm cursor-pointer">
                  Preciso de troco
                </label>
              </div>
              {needsChange && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Troco para quanto?</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={total}
                    step="0.01"
                    placeholder={`Ex: ${(Math.ceil(total / 10) * 10).toFixed(2)}`}
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                  {changeFor && Number(changeFor) > total && (
                    <p className="text-xs text-muted-foreground">
                      Troco de R$ {(Number(changeFor) - total).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>


        {/* Cupom */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" /> Cupom de Desconto
          </h3>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-3">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold text-sm uppercase">{appliedCoupon.code}</span>
              </div>
              <button onClick={() => setAppliedCoupon(null)} className="text-xs font-semibold text-muted-foreground underline">Remover</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Insira o código" 
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                className="flex-1 h-11 bg-background border border-border rounded-xl px-4 text-sm font-bold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-primary transition-colors"
                disabled={validatingCoupon}
              />
              <Button 
                variant="secondary" 
                className="h-11 rounded-xl text-primary font-bold" 
                disabled={!couponCode.trim() || validatingCoupon}
                onClick={handleApplyCoupon}
              >
                {validatingCoupon ? '...' : 'Aplicar'}
              </Button>
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-2">Resumo</h3>
          {items.map(item => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}x {item.product.name}</span>
              <span className="text-foreground">R$ {((item.product.price || 0) * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entrega</span>
              <span>
                {loadingFee ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
                ) : deliveryFee !== null ? (
                  `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`
                ) : unavailable ? (
                  <span className="text-destructive text-xs font-semibold">Fora da área</span>
                ) : '—'}
              </span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-primary font-medium">
                <span>Desconto ({appliedCoupon.code})</span>
                <span>- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-lg p-4 safe-area-bottom">
        <div className="mx-auto max-w-lg">
          <Button className="h-12 w-full rounded-xl font-semibold" onClick={handleSubmit} disabled={loading || unavailable || !selectedAddress}>
            {loading ? 'Confirmando...' : `Confirmar • R$ ${total.toFixed(2).replace('.', ',')}`}
          </Button>
        </div>
      </div>
    </MarketplaceLayout>
  );
}
