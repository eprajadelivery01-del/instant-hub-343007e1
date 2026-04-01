import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Address } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

export default function Addresses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState({
    street: '', number: '', neighborhood: '', city: '',
    complement: '', reference: '', latitude: '', longitude: '', label: '',
  });

  const fetchAddresses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setAddresses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAddresses(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ street: '', number: '', neighborhood: '', city: '', complement: '', reference: '', latitude: '', longitude: '', label: '' });
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
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !form.street || !form.number || !form.neighborhood || !form.city) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const payload = {
      user_id: user.id,
      street: form.street,
      number: form.number,
      neighborhood: form.neighborhood,
      city: form.city,
      complement: form.complement || null,
      reference: form.reference || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      label: form.label || null,
    };

    if (editing) {
      const { error } = await supabase.from('addresses').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Endereço atualizado');
    } else {
      const { error } = await supabase.from('addresses').insert(payload);
      if (error) {
        // Table might not exist yet - inform user
        toast.error('Erro ao salvar endereço: ' + error.message);
        return;
      }
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
    <MarketplaceLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Endereços</h1>
        </div>

        <Button onClick={openNew} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar endereço
        </Button>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : addresses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4" />
            <p>Nenhum endereço cadastrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <Card key={addr.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    {addr.label && <Badge variant="secondary" className="mb-1">{addr.label}</Badge>}
                    <p className="font-medium text-foreground">{addr.street}, {addr.number}</p>
                    <p className="text-sm text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                    {addr.complement && <p className="text-sm text-muted-foreground">{addr.complement}</p>}
                    {addr.reference && <p className="text-xs text-muted-foreground">Ref: {addr.reference}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(addr)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(addr.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar endereço' : 'Novo endereço'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Apelido (opcional)</Label>
                <Input placeholder="Ex: Casa, Trabalho" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label>Rua *</Label>
                  <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Número *</Label>
                  <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Bairro *</Label>
                  <Input value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Cidade *</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Complemento</Label>
                <Input placeholder="Apto, Bloco, etc" value={form.complement} onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Referência</Label>
                <Input placeholder="Próximo ao..." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Latitude</Label>
                  <Input type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Longitude</Label>
                  <Input type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? 'Salvar' : 'Adicionar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MarketplaceLayout>
  );
}

// Need Badge import
import { Badge } from '@/components/ui/badge';
