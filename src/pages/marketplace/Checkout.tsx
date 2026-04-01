import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Address, Region } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { MapPin, CreditCard, Banknote, QrCode, Plus, AlertCircle } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, company, subtotal, clearCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [notes, setNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAddresses = async () => {
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setAddresses(data || []);
      if (data && data.length > 0) setSelectedAddress(data[0].id);
      setLoadingAddresses(false);
    };
    fetchAddresses();
  }, [user]);

  // Calculate delivery fee when address changes
  useEffect(() => {
    if (!selectedAddress) return;
    const addr = addresses.find(a => a.id === selectedAddress);
    if (!addr || !addr.latitude || !addr.longitude) {
      setDeliveryFee(null);
      setUnavailable(false);
      return;
    }

    const checkRegion = async () => {
      // Get all regions and check if point is inside any
      const { data: regions } = await supabase
        .from('regions')
        .select('*')
        .eq('active', true);

      if (!regions || regions.length === 0) {
        // No regions configured - set default fee
        setDeliveryFee(5);
        setRegionId(null);
        setUnavailable(false);
        return;
      }

      // Try to find matching region using point-in-polygon
      let found = false;
      for (const region of regions) {
        if (region.geometry && isPointInRegion(addr.latitude!, addr.longitude!, region.geometry)) {
          setDeliveryFee(region.delivery_fee);
          setRegionId(region.id);
          setUnavailable(false);
          found = true;
          break;
        }
      }

      if (!found) {
        setDeliveryFee(null);
        setRegionId(null);
        setUnavailable(true);
      }
    };
    checkRegion();
  }, [selectedAddress, addresses]);

  const isPointInRegion = (lat: number, lng: number, geometry: any): boolean => {
    try {
      const coords = geometry?.coordinates?.[0] || geometry?.geometry?.coordinates?.[0];
      if (!coords) return false;
      // Ray casting algorithm
      let inside = false;
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i][1], yi = coords[i][0];
        const xj = coords[j][1], yj = coords[j][0];
        const intersect = ((yi > lng) !== (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    } catch {
      return false;
    }
  };

  const total = subtotal + (deliveryFee || 0);

  const handleSubmit = async () => {
    if (!user || !company || items.length === 0) return;
    if (!selectedAddress) {
      toast.error('Selecione um endereço de entrega');
      return;
    }
    if (unavailable) {
      toast.error('Entrega não disponível para este endereço');
      return;
    }

    setLoading(true);
    try {
      const addr = addresses.find(a => a.id === selectedAddress);
      const deliveryAddress = addr ? `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city}` : '';

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          company_id: company.id,
          status: 'pending',
          total,
          delivery_fee: deliveryFee || 0,
          delivery_address: deliveryAddress,
          payment_method: paymentMethod,
          notes,
          region_id: regionId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        product_name: item.product.name,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create delivery request
      if (addr) {
        await supabase.from('deliveries').insert({
          order_id: order.id,
          pickup_address: company.address || company.name,
          delivery_address: deliveryAddress,
          pickup_latitude: company.latitude,
          pickup_longitude: company.longitude,
          delivery_latitude: addr.latitude,
          delivery_longitude: addr.longitude,
          status: 'pending',
          delivery_fee: deliveryFee || 0,
        });
      }

      clearCart();
      toast.success('Pedido realizado com sucesso!');
      navigate(`/marketplace/orders/${order.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/marketplace/login');
    return null;
  }

  if (items.length === 0) {
    navigate('/marketplace/cart');
    return null;
  }

  return (
    <MarketplaceLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Finalizar pedido</h1>

        {/* Address selection */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Endereço de entrega
            </h3>
            <Button size="sm" variant="outline" onClick={() => navigate('/marketplace/addresses')}>
              <Plus className="h-3 w-3 mr-1" /> Novo
            </Button>
          </div>

          {loadingAddresses ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : addresses.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
              <Button size="sm" className="mt-2" onClick={() => navigate('/marketplace/addresses')}>
                Adicionar endereço
              </Button>
            </div>
          ) : (
            <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
              {addresses.map(addr => (
                <div key={addr.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <RadioGroupItem value={addr.id} id={addr.id} className="mt-0.5" />
                  <label htmlFor={addr.id} className="text-sm cursor-pointer flex-1">
                    <p className="font-medium text-foreground">{addr.street}, {addr.number}</p>
                    <p className="text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                    {addr.complement && <p className="text-muted-foreground">{addr.complement}</p>}
                  </label>
                </div>
              ))}
            </RadioGroup>
          )}

          {unavailable && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Entrega não disponível para este endereço
            </div>
          )}
        </Card>

        {/* Payment method */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Forma de pagamento
          </h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <RadioGroupItem value="pix" id="pix" />
              <QrCode className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="pix" className="text-sm cursor-pointer">PIX</label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <RadioGroupItem value="money" id="money" />
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="money" className="text-sm cursor-pointer">Dinheiro</label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <RadioGroupItem value="card" id="card" />
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="card" className="text-sm cursor-pointer">Cartão (na entrega)</label>
            </div>
          </RadioGroup>
        </Card>

        {/* Notes */}
        <Card className="p-4 space-y-3">
          <Label>Observações</Label>
          <Textarea
            placeholder="Ex: sem cebola, troco para R$50..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </Card>

        {/* Order summary */}
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold text-foreground mb-2">Resumo</h3>
          {items.map(item => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}x {item.product.name}</span>
              <span>R$ {((item.product.price || 0) * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de entrega</span>
            <span>{deliveryFee !== null ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : '—'}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={loading || unavailable || !selectedAddress}
        >
          {loading ? 'Confirmando...' : 'Confirmar pedido'}
        </Button>
      </div>
    </MarketplaceLayout>
  );
}
