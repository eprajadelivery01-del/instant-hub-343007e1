import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function Addresses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState({
    street: '', number: '', neighborhood: '', city: '',
    complement: '', reference: '', latitude: '', longitude: '', label: '',
  });
  const [showMap, setShowMap] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>('Casa');

  const fetchAddresses = async () => {
    if (!user) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAddresses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAddresses(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ street: '', number: '', neighborhood: '', city: '', complement: '', reference: '', latitude: '', longitude: '', label: 'Casa' });
    setSelectedLabel('Casa');
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditing(addr);
    setForm({
      street: addr.street, number: addr.number, neighborhood: addr.neighborhood,
      city: addr.city, complement: addr.complement || '', reference: addr.reference || '',
      latitude: addr.latitude?.toString() || '', longitude: addr.longitude?.toString() || '',
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
    if (!user || !form.street || !form.number || !form.neighborhood || !form.city) {
      toast.error('Preencha os campos obrigatórios'); return;
    }

    let lat = form.latitude ? parseFloat(form.latitude) : null;
    let lng = form.longitude ? parseFloat(form.longitude) : null;

    // Geocoding automático se coordenadas não foram informadas
    if (!lat || !lng) {
      setGeocoding(true);
      const fullAddress = `${form.street}, ${form.number}, ${form.neighborhood}, ${form.city}`;
      const coords = await geocodeAddress(fullAddress);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        toast.success('Localização detectada automaticamente 📍');
      } else {
        toast.warning('Não foi possível detectar a localização. Frete será calculado ao selecionar o endereço.');
      }
      setGeocoding(false);
    }

    const payload = {
      user_id: user.id, street: form.street, number: form.number,
      neighborhood: form.neighborhood, city: form.city,
      complement: form.complement || null, reference: form.reference || null,
      latitude: lat,
      longitude: lng,
      label: form.label || null,
    };
    if (editing) {
      const { error } = await supabase.from('addresses').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Endereço atualizado');
    } else {
      const { error } = await supabase.from('addresses').insert(payload);
      if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
      toast.success('Endereço adicionado');
    }
    setShowForm(false);
    fetchAddresses();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('addresses').delete().eq('id', id);
    toast.success('Endereço removido');
    fetchAddresses();
  };

  return (
    <>
      <MarketplaceLayout>
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
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
              {addresses.map(addr => (
                <div key={addr.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      {addr.label && <Badge variant="secondary" className="mb-1.5 text-xs">{addr.label}</Badge>}
                      <p className="font-medium text-sm text-foreground">{addr.street}, {addr.number}</p>
                      <p className="text-xs text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                      {addr.complement && <p className="text-xs text-muted-foreground mt-0.5">{addr.complement}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(addr)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(addr.id)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-destructive/60 hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 scrollbar-thin">
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
                <Button type="button" variant="outline" className="w-full h-10 rounded-xl border-primary/20 text-primary" onClick={() => setShowMap(true)}>
                  <MapIcon className="h-4 w-4 mr-2" /> Selecionar no Mapa
                </Button>
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Bairro *</Label>
                    <Input value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cidade *</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-10 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Complemento</Label>
                  <Input placeholder="Apto, Bloco, etc" value={form.complement} onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Referência</Label>
                  <Input placeholder="Próximo ao..." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="h-10 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Latitude</Label>
                    <Input type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Longitude</Label>
                    <Input type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} className="h-10 rounded-lg" />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-lg">Cancelar</Button>
                <Button onClick={handleSave} disabled={geocoding} className="rounded-lg">
                  {geocoding ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Localizando...</>
                  ) : (
                    editing ? 'Salvar' : 'Adicionar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MarketplaceLayout>
      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Escolher no mapa</DialogTitle>
            <DialogDescription>Arraste o pin no mapa para escolher as coordenadas do endereço de entrega.</DialogDescription>
          </DialogHeader>
          <LocationPicker
            initialCoords={form.latitude && form.longitude ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) } : undefined}
            onConfirm={(data) => {
              setForm(f => ({
                ...f,
                street: data.address.street || f.street,
                neighborhood: data.address.neighborhood || f.neighborhood,
                city: data.address.city || f.city,
                latitude: data.lat.toString(),
                longitude: data.lng.toString(),
              }));
              setShowMap(false);
              toast.success('Localização atualizada');
            }}
            onCancel={() => setShowMap(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
