import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogOut, MapPin, User, ChevronRight, CreditCard, HelpCircle, Bell } from 'lucide-react';

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

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
      setEditing(false);
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

  const menuItems = [
    { icon: MapPin, label: 'Endereços', onClick: () => navigate('/marketplace/addresses') },
    { icon: CreditCard, label: 'Formas de pagamento', onClick: () => {} },
    { icon: Bell, label: 'Notificações', onClick: () => {} },
    { icon: HelpCircle, label: 'Ajuda', onClick: () => {} },
  ];

  return (
    <MarketplaceLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Avatar section */}
        <div className="bg-card rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-lg">{profile?.full_name || 'Usuário'}</h2>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            {profile?.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="text-primary text-sm font-semibold"
          >
            Editar
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nome</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-11 rounded-xl bg-muted border-0" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-11 rounded-xl bg-muted border-0" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        )}

        {/* Menu items */}
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm divide-y divide-border">
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-muted/50 transition-colors active:bg-muted"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:bg-muted/50 transition-colors text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Sair da conta</span>
        </button>
      </div>
    </MarketplaceLayout>
  );
}
