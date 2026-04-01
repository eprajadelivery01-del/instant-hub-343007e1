import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogOut, MapPin, User } from 'lucide-react';

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', user.id);
    if (error) {
      toast.error('Erro ao salvar');
    } else {
      toast.success('Perfil atualizado');
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/marketplace/login');
  };

  if (!user) {
    navigate('/marketplace/login');
    return null;
  }

  return (
    <MarketplaceLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
              <User className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">{profile?.full_name || 'Usuário'}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate('/marketplace/addresses')}>
          <MapPin className="h-4 w-4 mr-2" />
          Meus endereços
        </Button>

        <Button variant="outline" className="w-full text-destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </MarketplaceLayout>
  );
}
