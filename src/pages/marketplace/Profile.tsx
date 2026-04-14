import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SupportChat } from '@/components/chat/SupportChat';
import {
  LogOut, MapPin, User, ChevronRight, Gem,
  Bell, HelpCircle, Wallet, Trash2, X, Camera, Loader2,
  Star, Heart, Bike, Ticket, Settings, Moon, Sun
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [supportType, setSupportType] = useState<'support' | 'driver_application' | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const toastId = toast.loading('Processando imagem...');
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast.success('Foto atualizada com sucesso!', { id: toastId });
    } catch {
      toast.error('Falha no upload', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
    if (!error) {
      toast.success('Perfil atualizado!');
      await refreshProfile();
      setEditing(false);
    } else {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  if (!user) { navigate('/marketplace/login'); return null; }

  const menuItems = [
    { icon: Wallet, label: 'Saldo', subtitle: 'Carteira digital', onClick: () => toast('Sua carteira está vazia.', { description: 'Recargas estarão disponíveis em breve.' }) },
    { icon: MapPin, label: 'Endereços', subtitle: 'Gerenciar locais', onClick: () => navigate('/marketplace/addresses'), chevron: true },
    { icon: Bell, label: 'Notificações', subtitle: 'Nenhuma novidade', onClick: () => toast.info('Todas as novidades do app aparecerão aqui.') },
    { icon: Settings, label: 'Meus Dados', subtitle: 'Informações pessoais', onClick: () => setEditing(true), chevron: true },
    { icon: HelpCircle, label: 'Ajuda', subtitle: 'Suporte e dúvidas', onClick: () => setSupportType('support') },
    { icon: Heart, label: 'Favoritos', subtitle: 'Suas lojas favoritas', onClick: () => toast.info('Suas lojas do coração ficarão guardadas aqui.') },
    { icon: Ticket, label: 'Cupons', subtitle: '8 disponíveis', onClick: () => toast.success('Você ganhou 8 cupons! Fila de resgate em desenvolvimento.'), highlight: true },
  ];

  return (
    <MarketplaceLayout>
      <div className="mx-auto max-w-lg min-h-screen pb-32">
        {/* Header */}
        <div className="px-6 pt-12 pb-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5 group">
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              <button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-24 w-24 rounded-full bg-card border-4 border-background shadow-lg flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground/40">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  {uploading ? <Loader2 className="h-6 w-6 text-background animate-spin" /> : <Camera className="h-6 w-6 text-background" />}
                </div>
              </button>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {profile?.full_name?.split(' ')[0] || 'Bem-vindo'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Clube card */}
        <div className="px-5 mb-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-6 shadow-lg shadow-primary/30">
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-lg leading-none select-none">🍔</span>
                </div>
                <span className="text-xs font-bold text-white/90">Clube É Pra Já</span>
              </div>
              <p className="text-lg font-bold text-white leading-snug mb-4">
                Economize com cupons no seu lanche favorito
              </p>
              <button className="h-10 px-5 rounded-xl bg-white text-primary text-xs font-bold hover:opacity-90 shadow-sm transition-all active:scale-[0.98]">
                Ver benefícios
              </button>
            </div>
            <span className="absolute -right-4 -bottom-4 text-[130px] opacity-10 select-none">🍔</span>
          </div>
        </div>

        {/* Fidelidade */}
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Star className="h-4 w-4 text-primary fill-current" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nível de Fidelidade</p>
                <p className="text-xs text-muted-foreground">Resgate pontos</p>
              </div>
            </div>
            <div className="w-20">
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full w-[45%] bg-primary rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Dark mode toggle */}
        <div className="px-5 mb-2">
          <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
                {theme === 'dark' ? <Moon className="h-4 w-4 text-foreground" /> : <Sun className="h-4 w-4 text-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Modo escuro</p>
                <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Ativado' : 'Desativado'}</p>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>
        </div>

        {/* Menu list */}
        <div className="px-5 py-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors active:scale-[0.99]',
                'hover:bg-secondary/60'
              )}
            >
              <div className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                item.highlight ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              {item.chevron && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
            </button>
          ))}
        </div>

        {/* Entregador banner */}
        <div className="px-5 mb-4">
          <button onClick={() => setSupportType('driver_application')} className="w-full flex items-center justify-between rounded-2xl bg-card border border-border p-4 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-foreground flex items-center justify-center">
                <Bike className="h-4 w-4 text-background" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Seja um Entregador</p>
                <p className="text-xs text-muted-foreground">Trabalhe conosco</p>
              </div>
            </div>
            <span className="text-xs font-medium text-primary">Saiba mais</span>
          </button>
        </div>

        {/* Actions */}
        <div className="px-5 space-y-3">
          <Button
            onClick={() => signOut()}
            variant="outline"
            className="w-full h-12 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 font-medium"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair da conta
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full text-xs text-muted-foreground/50 hover:text-destructive transition-colors py-2">
                Excluir minha conta
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <div className="flex justify-center mb-3">
                  <Trash2 className="h-12 w-12 text-destructive/60" />
                </div>
                <AlertDialogTitle className="text-center text-lg">Excluir conta?</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-sm">
                  Esta ação é permanente e não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-2 mt-4">
                <AlertDialogAction
                  onClick={async () => { await supabase.from('profiles').delete().eq('id', user.id); await signOut(); navigate('/marketplace/login'); }}
                  className="bg-destructive hover:bg-destructive/90 h-11 rounded-xl"
                >
                  Sim, excluir conta
                </AlertDialogAction>
                <AlertDialogCancel className="h-11 rounded-xl">Cancelar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Edit sheet */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl border-none p-0">
          <div className="h-full flex flex-col bg-background">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
              <div>
                <p className="text-xs text-primary font-medium">Perfil</p>
                <h3 className="text-xl font-bold text-foreground">Editar Dados</h3>
              </div>
              <button onClick={() => setEditing(false)} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4 bg-card rounded-2xl p-5 border border-border">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground ml-1">Nome Completo</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground ml-1">WhatsApp</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-medium">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Support Chat Sheet */}
      <Sheet open={supportType !== null} onOpenChange={(open) => !open && setSupportType(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-none p-0 overflow-hidden">
          <div className="flex flex-col h-full bg-background relative">
            <div className="absolute right-4 top-4 z-10 bg-background/80 rounded-full p-1 border">
              <button onClick={() => setSupportType(null)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            {supportType && (
              <SupportChat 
                title={supportType === 'support' ? "Ajuda e Suporte" : "Seja um Entregador"} 
                topic={supportType} 
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MarketplaceLayout>
  );
}
