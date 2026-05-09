// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SupportChat } from '@/components/chat/SupportChat';
import { cn } from '@/lib/utils';
import {
  LogOut, MapPin, ChevronRight, Camera, Loader2,
  Bike, Ticket, FileText, ShieldCheck, Moon, Sun,
  Wallet, HelpCircle, X, Check, Phone, Package, Heart, User
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [supportType, setSupportType] = useState<'support' | 'driver_application' | null>(null);
  const [stats, setStats] = useState({ orders: 0, favorites: 0, coupons: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites'>('orders');

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const [ordersRes, favRes, couponRes] = await Promise.allSettled([
        supabase.from('orders').select('id', { count: 'exact', head: true }).or(`customer_id.eq.${user.id},user_id.eq.${user.id}`),
        supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('customer_coupons').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setStats({
        orders: ordersRes.status === 'fulfilled' ? (ordersRes.value.count || 0) : 0,
        favorites: favRes.status === 'fulfilled' ? (favRes.value.count || 0) : 0,
        coupons: couponRes.status === 'fulfilled' ? (couponRes.value.count || 0) : 0,
      });

      const { data: recent } = await supabase
        .from('orders')
        .select('id, status, total, created_at')
        .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(9);
      setRecentOrders(recent || []);
    } catch { /* silent */ }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-avatar-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshProfile();
      toast.success('Foto atualizada!');
    } catch { toast.error('Falha no upload'); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
      await refreshProfile();
      toast.success('Perfil atualizado!');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  if (!user) { navigate('/marketplace/login'); return null; }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
  const firstName = displayName.split(' ')[0];
  const initial = displayName.charAt(0).toUpperCase();

  const statusDot: Record<string, string> = {
    delivered: 'bg-green-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
    delivering: 'bg-primary',
    preparing: 'bg-orange-400',
    confirmed: 'bg-blue-500',
    pending: 'bg-yellow-400',
  };

  return (
    <MarketplaceLayout>
      <div className="min-h-screen pb-32">

        {/* ── HEADER SECTION ── */}
        <div className="px-5 pt-10 pb-6 flex flex-col items-center text-center">

          {/* Avatar with upload */}
          <div className="relative mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-24 h-24 rounded-full bg-muted border-4 border-background shadow-xl overflow-hidden hover:scale-105 transition-transform"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Foto" />
              ) : (
                <div className="w-full h-full gradient-primary flex items-center justify-center">
                  <span className="text-3xl font-black text-white">{initial}</span>
                </div>
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-foreground border-2 border-background flex items-center justify-center shadow-md"
            >
              {uploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-background" />
                : <Camera className="h-3.5 w-3.5 text-background" />
              }
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {/* Name */}
          <h1 className="text-xl font-black text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          {profile?.phone && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Phone className="h-3 w-3" /> {profile.phone}
            </p>
          )}

          {/* Edit button */}
          <button
            onClick={() => setEditing(true)}
            className="mt-4 px-6 py-2 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-all flex items-center gap-1.5"
          >
            Editar Dados
          </button>
        </div>

        <div className="px-5 space-y-4">

          {/* ── STATS ROW ── */}
          <div className="grid grid-cols-3 gap-0 border border-border rounded-2xl overflow-hidden bg-card">
            {[
              { count: stats.orders, label: 'Pedidos' },
              { count: stats.favorites, label: 'Favoritos' },
              { count: stats.coupons, label: 'Cupons' },
            ].map((s, i) => (
              <div key={s.label} className={cn("flex flex-col items-center justify-center py-4", i < 2 && "border-r border-border")}>
                <span className="text-xl font-black text-foreground">{s.count}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── CLUBE CARD ── */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-5 shadow-lg shadow-primary/30">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1">Clube É Pra Já</p>
                <p className="text-sm font-black text-white leading-snug">Economize com cupons<br/>no seu lanche favorito</p>
              </div>
              <button className="shrink-0 h-9 px-4 rounded-xl bg-white text-primary text-xs font-black hover:opacity-90 transition-all">
                Ver benefícios
              </button>
            </div>
            <span className="absolute -right-3 -bottom-5 text-[100px] opacity-10 select-none leading-none">🍔</span>
          </div>

          {/* ── RECENT ORDERS TABS ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('orders')}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 -mb-px', activeTab === 'orders' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground')}
              >
                <Package className="h-3.5 w-3.5" /> Pedidos
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 -mb-px', activeTab === 'favorites' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground')}
              >
                <Heart className="h-3.5 w-3.5" /> Favoritos
              </button>
            </div>

            {activeTab === 'orders' && (
              recentOrders.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 p-2">
                  {recentOrders.map(order => (
                    <button
                      key={order.id}
                      onClick={() => navigate(`/marketplace/orders/${order.id}`)}
                      className="aspect-square rounded-xl bg-muted relative overflow-hidden hover:scale-95 transition-transform flex flex-col items-center justify-center gap-1 p-2"
                    >
                      <Package className="h-5 w-5 text-muted-foreground/40" />
                      <div className={cn('w-2 h-2 rounded-full', statusDot[order.status] || 'bg-muted-foreground/30')} />
                      <span className="text-[8px] font-bold text-muted-foreground">
                        R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground/40">
                  <Package className="h-10 w-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pedido ainda</p>
                </div>
              )
            )}

            {activeTab === 'favorites' && (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground/40">
                <Heart className="h-10 w-10" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum favorito ainda</p>
              </div>
            )}
          </div>

          {/* ── MENU ACTIONS ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {[
              { icon: MapPin, label: 'Endereços', subtitle: 'Gerenciar locais salvos', onClick: () => navigate('/marketplace/addresses'), chevron: true },
              { icon: Wallet, label: 'Carteira', subtitle: 'Saldo e recargas', onClick: () => toast('Em breve!') },
              { icon: theme === 'dark' ? Moon : Sun, label: 'Aparência', subtitle: theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo', onClick: () => toggleTheme() },
              { icon: HelpCircle, label: 'Ajuda', subtitle: 'Suporte e dúvidas', onClick: () => setSupportType('support') },
              { icon: FileText, label: 'Termos de Uso', subtitle: 'Regras da plataforma', onClick: () => navigate('/marketplace/terms'), chevron: true },
              { icon: ShieldCheck, label: 'Privacidade', subtitle: 'Seus dados protegidos', onClick: () => navigate('/marketplace/privacy'), chevron: true },
            ].map((item, i, arr) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={cn('w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors', i < arr.length - 1 && 'border-b border-border/50')}
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                {item.chevron && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
              </button>
            ))}
          </div>

          {/* Entregador banner */}
          <button
            onClick={() => setSupportType('driver_application')}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-foreground text-background hover:opacity-90 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Bike className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-black text-sm">Seja um Entregador</p>
              <p className="text-[11px] opacity-60 font-medium">Trabalhe conosco e ganhe mais</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
          </button>

          {/* Logout */}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-border text-muted-foreground font-bold text-sm hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>

          {/* Delete account */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full text-xs text-muted-foreground/40 hover:text-destructive transition-colors py-2 pb-6">
                Excluir minha conta
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-2">
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

      {/* ── EDIT SHEET ── */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" hideClose className="h-[75vh] rounded-t-3xl border-none p-0">
          <div className="h-full flex flex-col bg-background">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
              <div>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Meu Perfil</p>
                <h3 className="text-xl font-black text-foreground">Editar Dados</h3>
              </div>
              <button onClick={() => setEditing(false)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {[
                { label: 'Nome completo', value: fullName, onChange: setFullName, placeholder: 'Seu nome' },
                { label: 'WhatsApp', value: phone, onChange: setPhone, placeholder: '(00) 00000-0000' },
              ].map(f => (
                <div key={f.label} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{f.label}</label>
                  <input
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3.5 rounded-2xl border border-border bg-muted/30 font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>
              ))}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── SUPPORT SHEET ── */}
      <Sheet open={supportType !== null} onOpenChange={open => !open && setSupportType(null)}>
        <SheetContent side="bottom" hideClose className="h-[80vh] rounded-t-3xl border-none p-0 overflow-hidden">
          <div className="flex flex-col h-full bg-background relative">
            <div className="absolute right-4 top-4 z-10">
              <button onClick={() => setSupportType(null)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {supportType && (
              <SupportChat
                title={supportType === 'support' ? 'Ajuda e Suporte' : 'Seja um Entregador'}
                topic={supportType}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MarketplaceLayout>
  );
}
