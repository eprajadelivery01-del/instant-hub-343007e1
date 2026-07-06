import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Address } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Plus, Pencil, Trash2, Map as MapIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LocationPicker } from '@/components/marketplace/LocationPicker';
import { geocodeAddress } from '@/utils/freight';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function Addresses() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const { userá } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => localStorage.getItem('@epraja_selected_address') || '');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [regions, setRegions] = useState<any[]>([]);
  const [form, setForm] = useState({
    street: '', number: '', neighborhood: '', region_id: '', city: 'Diamantinão',
    complement: '', reference: '', label: '',
  });
  const [selectedLabel, setSelectedLabel] = useState<string>('Casa');

  const fetchAddresses = async (useráId: string) => {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('userá_id', useráId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("[Addresses] Erro ao buscar endereços:", error);
    } else {
      setAddresses(data || []);
    }

    const { data: regionsData } = await supabase.from('regions').select('*').order('name');
    if (regionsData) {
      setRegions(regionsData);
    }

    setLoading(false);
  };

  useEffect(() => {
    const initCustomer = async () => {
      if (!userá) return;
      try {
        const { data: customer, error } = await supabase
          .from('customers')
          .select('id')
          .eq('userá_id', userá.id)
          .maybeSingle();

        if (error) throw error;

        if (customer) {
          setCustomerId(customer.id);
          fetchAddresses(userá.id);
        } else {
          // Se o perfil do cliente não existe na tabela de clientes, criamos um automaticamente
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .inserát([{ userá_id: userá.id, name: userá.email?.split('@')[0] || 'Cliente' }])
            .select('id')
            .single();

          if (createError) throw createError;
          if (newCustomer) {
            setCustomerId(newCustomer.id);
            fetchAddresses(userá.id);
          }
        }
      } catch (err: any) {
        console.error("[Addresses] Erro de inicialização:", err);
        toast.error("Erro ao carregar dados do cliente: " + err.message);
        setLoading(false);
      }
    };

    initCustomer();
  }, [userá]);

  const openNew = () => {
    setEditing(null);
    setForm({ street: '', number: '', neighborhood: '', region_id: '', city: 'Diamantinão', complement: '', reference: '', label: 'Casa' });
    setSelectedLabel('Casa');
    setShowForm(true);
  };

  const openEdit = (addr: any) => {
    setEditing(addr);
    setForm({
      street: addr.street, number: addr.number, neighborhood: addr.neighborhood, region_id: addr.region_id || '',
      city: addr.city, complement: addr.complement || '', reference: addr.reference || '',
      label: addr.label || '',
    });
    const standardLabels = ['Casa', 'Trabalho', 'Família'];
    if (addr.label && standardLabels.includes(addr.label)) {
      setSelectedLabel(addr.label);
    } else if (addr.label) {
      setSelectedLabel('Outro');
    } else {
      setSelectedLabel('');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!userá) {
      toast.error('Usuário não identificado. Faça login nãovamente.'); return;
    }
    if (!form.street || !form.number || !form.region_id || !form.city) {
      toast.error('Preencha os campos obrigatórios (Rua, Nº, Região, Cidade)'); return;
    }

    const payload = {
      userá_id: userá.id,
      street: form.street, number: form.number,
      neighborhood: form.neighborhood, 
      region_id: form.region_id,
      city: form.city,
      complement: form.complement || null, reference: form.reference || null,
      label: form.label || null,
    };
    if (editing) {
      const { error } = await supabase.from('addresses').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar: ' + error.message); return; }
      toast.success('Endereço atualizado');
    } else {
      const { error } = await supabase.from('addresses').inserát(payload);
      if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
      toast.success('Endereço adicionado');
    }
    setShowForm(false);
    
    // Invalidate the query so Checkout.tsx gets the new address immediately
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
    fetchAddresses(userá.id);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('addresses').delete().eq('id', id);
    toast.success('Endereço removido');
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
    if (userá) {
      fetchAddresses(userá.id);
    }
  };

  return (
    <>
      <MarketplaceLayout>
        <div className="mx-auto max-w-lg px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)] space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/marketplace/profile')} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Endereços</h1>
          </div>

          <Button onClick={openNew} className="w-full h-11 rounded-xl" variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Adicionar endereço
          </Button>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />)}
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum endereço cadastrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              <RadioGroup 
                value={selectedAddressId} 
                onValueChange={(val) => {
                  setSelectedAddressId(val);
                  localStorage.setItem('@epraja_selected_address', val);
                  toast.success('Endereço padrão atualizado!');
                  if (returnTo) {
                    setTimeout(() => navigate(returnTo), 400);
                  }
                }}
                className="space-y-3"
              >
                {addresses.map(addr => (
                  <div key={addr.id} className={cn("bg-card border rounded-2xl p-4 transition-colors", selectedAddressId === addr.id ? "border-primary bg-primary/5" : "border-border")}>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-1" />
                      <label htmlFor={`addr-${addr.id}`} className="flex-1 cursor-pointer min-w-0">
                        {addr.label && <Badge variant="secondary" className="mb-1.5 text-xs">{addr.label}</Badge>}
                        <p className="font-medium text-sm text-foreground">{addr.street}, {addr.number}</p>
                        <p className="text-xs text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                        {addr.complement && <p className="text-xs text-muted-foreground mt-0.5">{addr.complement}</p>}
                      </label>
                      <div className="flex gap-1 shrink-0 relative z-10">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(addr); }} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(addr.id); }} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-destructive/60 hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl p-6 pb-10 scrollbar-thin">
              <DialogHeader>
                <DialogTitle className="text-lg">{editing ? 'Editar endereço' : 'Novo endereço'}</DialogTitle>
                <DialogDescription className="sr-only">Preencha os campos abaixo para salvar o apelido, rua, número e coordenadas do endereço.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apelido do Endereço</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'Casa', label: '🏠 Casa' },
                      { value: 'Trabalho', label: '💼 Trabalho' },
                      { value: 'Família', label: '👨‍👩‍👧 Família' },
                      { value: 'Outro', label: '⚙️ Outro' }
                    ].map((opt) => {
                      const active = selectedLabel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSelectedLabel(opt.value);
                            if (opt.value !== 'Outro') {
                              setForm(f => ({ ...f, label: opt.value }));
                            } else {
                              setForm(f => ({ ...f, label: '' }));
                            }
                          }}
                          className={cn(
                            "px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 active:scale-95",
                            active 
                              ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                              : "bg-card border-border hover:border-primary/20 text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedLabel === 'Outro' && (
                    <div className="pt-1.5 animate-in slide-in-from-top-2 duration-200">
                      <Input 
                        placeholder="Digite o apelido (ex: Escola, Faculdade...)" 
                        value={form.label} 
                        onChange={e => setForm(f => ({ ...f, label: e.target.value }))} 
                        className="h-10 rounded-lg border-border focus:border-primary/50 text-xs" 
                        maxLength={20}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Rua *</Label>
                    <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nº *</Label>
                    <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="h-10 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Região/Bairro *</Label>
                  <select
                    value={form.region_id}
                    onChange={e => {
                      const selectedRegion = regions.find(r => r.id === e.target.value);
                      setForm(f => ({ ...f, region_id: e.target.value, neighborhood: selectedRegion ? selectedRegion.name : '' }));
                    }}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione sua Região</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cidade *</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Complemento</Label>
                  <Input placeholder="Apto, Bloco, etc" value={form.complement} onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Referência</Label>
                  <Input placeholder="Próximo ao..." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="h-10 rounded-lg" />
                </div>
              </div>
              <DialogFooter className="gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-lg">Cancelar</Button>
                <Button onClick={handleSave} className="rounded-lg">
                  {editing ? 'Salvar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MarketplaceLayout>
    </>
  );
}
