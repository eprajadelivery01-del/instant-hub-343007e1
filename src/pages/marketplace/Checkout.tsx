import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Address } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { MapPin, CreditCard, Banknote, QrCode, Plus, AlertCircle, ArrowLeft, Ticket, CheckCircle2 } from 'lucide-react';
import { useOrderLock } from '@/hooks/useOrderLock';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, company, subtotal, clearCart } = useCart();
  const { isLocked, acquireLock, releaseLock, generateIdempotencyKey } = useOrderLock();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [notes, setNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
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
    if (!addr || !addr.latitude || !addr.longitude) { setDeliveryFee(null); setUnavailable(false); return; }

    const checkRegion = async () => {
      setUnavailable(false);
      if (company?.delivery_fee !== null && company?.delivery_fee !== undefined) {
        setDeliveryFee(company.delivery_fee);
        const { data: regions } = await supabase.from('regions').select('id, geometry').eq('active', true);
        if (regions) {
          const found = regions.find(r => r.geometry && isPointInRegion(addr.latitude!, addr.longitude!, r.geometry));
          if (found) setRegionId(found.id);
        }
        return;
      }
      const { data: regions } = await supabase.from('regions').select('*').eq('active', true);
      if (!regions || regions.length === 0) { setDeliveryFee(5); setRegionId(null); return; }
      let found = false;
      for (const region of regions) {
        if (region.geometry && isPointInRegion(addr.latitude!, addr.longitude!, region.geometry)) {
          setDeliveryFee(region.delivery_fee); setRegionId(region.id); found = true; break;
        }
      }
      if (!found) { setDeliveryFee(7.51); setRegionId(null); }
    };
    checkRegion();
  }, [selectedAddress, addresses]);

  const isPointInRegion = (lat: number, lng: number, geometry: any): boolean => {
    try {
      const coords = geometry?.coordinates?.[0] || geometry?.geometry?.coordinates?.[0];
      if (!coords) return false;
      let inside = false;
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i][1], yi = coords[i][0];
        const xj = coords[j][1], yj = coords[j][0];
        const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    } catch { return false; }
  };

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
      
      setAppliedCoupon(data);
      toast.success('🎉 Cupom aplicado com sucesso!');
    } catch (err) {
      toast.error('Falha ao checar o cupom.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const discountAmount = appliedCoupon 
    ? (appliedCoupon.discount_type === 'percentage' 
       ? Math.min((subtotal * (appliedCoupon.discount_value / 100)), appliedCoupon.max_discount_value || Infinity)
       : appliedCoupon.discount_value)
    : 0;

  const total = Math.max(0, subtotal - discountAmount) + (deliveryFee || 0);

  const handleSubmit = async () => {
    if (!user || !company || items.length === 0) return;
    if (!selectedAddress) { toast.error('Selecione um endereço'); return; }
    if (unavailable) { toast.error('Entrega não disponível'); return; }
    if (loading || isLocked) return;
    if (!acquireLock()) return;
    setLoading(true);
    try {
      const addr = addresses.find(a => a.id === selectedAddress);
      const deliveryAddress = addr ? `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city}` : '';
      const ik = generateIdempotencyKey(user.id, items, total);
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        customer_id: user.id, company_id: company.id, status: 'pending', total,
        delivery_fee: deliveryFee || 0, delivery_address: deliveryAddress,
        payment_method: paymentMethod, notes, region_id: regionId, idempotency_key: ik
      }).select().single();
      if (orderError) {
        if (orderError.code === '23505') { toast.info('Pedido já processado'); navigate('/marketplace/orders'); return; }
        throw orderError;
      }
      const orderItems = items.map(item => ({
        order_id: order.id, product_id: item.product.id, quantity: item.quantity,
        price: item.product.price, unit_price: item.product.price, product_name: item.product.name,
      }));
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;
        
        if (appliedCoupon) {
          await supabase.from('user_coupons').insert({
            user_id: user.id,
            coupon_id: appliedCoupon.id,
            order_id: order.id,
            used_at: new Date().toISOString()
          });
        }
        
        if (addr) {
          await supabase.from('deliveries').insert({
            order_id: order.id, company_id: company.id,
          pickup_address: company.address || company.name, delivery_address: deliveryAddress,
          pickup_latitude: company.latitude, pickup_longitude: company.longitude,
          delivery_latitude: addr.latitude, delivery_longitude: addr.longitude,
          status: 'pending', value: total, price: deliveryFee || 0,
        });
      }
      clearCart(); toast.success('Pedido realizado!'); navigate(`/marketplace/orders/${order.id}`);
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
              <AlertCircle className="h-4 w-4 shrink-0" /> Entrega não disponível
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
              { value: 'pix', icon: QrCode, label: 'PIX' },
              { value: 'money', icon: Banknote, label: 'Dinheiro' },
              { value: 'card', icon: CreditCard, label: 'Cartão (na entrega)' },
            ].map(m => (
              <div key={m.value} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/20 transition-colors">
                <RadioGroupItem value={m.value} id={m.value} />
                <m.icon className="h-4 w-4 text-muted-foreground" />
                <label htmlFor={m.value} className="text-sm cursor-pointer">{m.label}</label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Observações */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <Label className="text-sm font-medium">Observações</Label>
          <Textarea placeholder="Ex: sem cebola, troco para R$50..." value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl min-h-[80px]" />
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
              <span>{deliveryFee !== null ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : '—'}</span>
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
