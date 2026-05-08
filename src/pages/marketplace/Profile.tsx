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
  LogOut, MapPin, User, ChevronRight, Camera, Loader2,
  Bike, Ticket, FileText, ShieldCheck, Moon, Sun,
  Wallet, Settings, HelpCircle, Edit3, Grid3X3,
  Package, Heart, Star, Pencil, X, Check, Phone
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
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [supportType, setSupportType] = useState<'support' | 'driver_application' | null>(null);
  const [stats, setStats] = useState({ orders: 0, favorites: 0, coupons: 0 });
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'coupons'>('orders');
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetchProfileExtras();
  }, [user]);

  const fetchProfileExtras = async () => {
    // Try to load extra profile data (bio, cover)
    try {
      const { data } = await supabase.from('profiles').select('bio, cover_url').eq('id', user.id).maybeSingle();
      if (data) {
        setBio(data.bio || '');
        setCoverUrl(data.cover_url || '');
      }
    } catch {
      // columns might not exist yet, ignore
    }
  };

  const fetchStats = async () => {
    try {
      const [ordersRes, favRes, couponRes] = await Promise.allSettled([
        supabase.from('orders').select('id', { count: 'exact', head: true }).or(`customer_id.eq.${user.id},user_id.eq.${user.id}`),
        supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('customer_coupons').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.count || 0) : 0;
      const favorites = favRes.status === 'fulfilled' ? (favRes.value.count || 0) : 0;
      const coupons = couponRes.status === 'fulfilled' ? (couponRes.value.count || 0) : 0;

      setStats({ orders, favorites, coupons });

      // Fetch recent orders for grid
      const { data: recent } = await supabase
        .from('orders')
        .select('id, status, total, created_at')
        .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(9);

      setRecentOrders(recent || []);
    } catch {
      // silent
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-avatar-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshProfile();
      toast.success('Foto de perfil atualizada!');
    } catch {
      toast.error('Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-cover-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ cover_url: publicUrl } as any).eq('id', user.id);
      setCoverUrl(publicUrl);
      toast.success('Foto de capa atualizada!');
    } catch {
      toast.error('Falha no upload da capa');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName, phone, bio } as any).eq('id', user.id);
      await refreshProfile();
      toast.success('Perfil atualizado!');
      setEditing(false);
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!user) { navigate('/marketplace/login'); return null; }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    preparing: 'bg-orange-500',
    ready: 'bg-purple-500',
    delivering: 'bg-primary',
    delivered: 'bg-green-500',
    cancelled: 'bg-red-500',
  };

  return (
    <MarketplaceLayout>
      <div className="min-h-screen pb-28">
        {/* === COVER PHOTO === */}
        <div className="relative h-48 bg-gradient-to-br from-primary via-orange-500 to-amber-400">
          {coverUrl ? (
            <img src={coverUrl} className="w-full h-full object-cover" alt="Capa" />
          ) : (
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-8 w-32 h-32 rounded-full border-4 border-white/30" />
              <div className="absolute bottom-2 right-12 w-20 h-20 rounded-full border-4 border-white/20" />
            </div>
          )}
          {/* Cover upload btn */}
          <label className="absolute bottom-3 right-3 cursor-pointer flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/20 hover:bg-black/60 transition-all">
            {uploadingCover ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            Editar capa
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
        </div>

        {/* === AVATAR OVERLAPPING COVER === */}
        <div className="relative px-5">
          <div className="flex items-end justify-between -mt-16 mb-4">
            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="block w-32 h-32 rounded-full bg-background border-4 border-background shadow-xl overflow-hidden hover:scale-105 transition-transform"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full gradient-primary flex items-center justify-center">
                    <span className="text-4xl font-black text-white">{initial}</span>
                  </div>
                )}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-foreground border-2 border-background flex items-center justify-center shadow-lg"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin text-background" /> : <Camera className="h-4 w-4 text-background" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>

            {/* Edit Profile button */}
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border font-bold text-sm text-foreground hover:bg-muted transition-all mt-16"
            >
              <Edit3 className="h-4 w-4" />
              Editar Perfil
            </button>
          </div>

          {/* === NAME & BIO === */}
          <div className="mb-5">
            <h1 className="text-xl font-black text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {bio && <p className="text-sm text-foreground mt-2 leading-relaxed">{bio}</p>}
            {profile?.phone && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {profile.phone}
              </p>
            )}
          </div>

          {/* === STATS ROW (Instagram style) === */}
          <div className="grid grid-cols-3 gap-0 border border-border rounded-2xl overflow-hidden mb-6 bg-card">
            {[
              { count: stats.orders, label: 'Pedidos', icon: Package, tab: 'orders' as const },
              { count: stats.favorites, label: 'Favoritos', icon: Heart, tab: 'favorites' as const },
              { count: stats.coupons, label: 'Cupons', icon: Ticket, tab: 'coupons' as const },
            ].map((stat, i) => (
              <button
                key={stat.label}
                onClick={() => setActiveTab(stat.tab)}
                className={cn(
                  'flex flex-col items-center justify-center py-4 transition-all relative',
                  i < 2 && 'border-r border-border',
                  activeTab === stat.tab ? 'bg-primary/5' : 'hover:bg-muted/50'
                )}
              >
                <span className="text-xl font-black text-foreground">{stat.count}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</span>
                {activeTab === stat.tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* === CLUBE CARD === */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-5 shadow-lg shadow-primary/30 mb-6">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Clube É Pra Já</p>
                <p className="text-base font-black text-white leading-snug">Economize com cupons<br/>no seu lanche favorito</p>
              </div>
              <button className="shrink-0 h-10 px-5 rounded-xl bg-white text-primary text-xs font-black hover:opacity-90 shadow-sm transition-all">
                Ver benefícios
              </button>
            </div>
            <span className="absolute -right-4 -bottom-6 text-[120px] opacity-10 select-none">🍔</span>
          </div>

          {/* === CONTENT GRID (Posts/Orders) === */}
          <div className="mb-6">
            {/* Tab nav */}
            <div className="flex items-center justify-around border-b border-border mb-4">
              <button
                onClick={() => setActiveTab('orders')}
                className={cn('flex items-center gap-1.5 py-3 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all -mb-px', activeTab === 'orders' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground')}
              >
                <Grid3X3 className="h-4 w-4" /> Pedidos
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={cn('flex items-center gap-1.5 py-3 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all -mb-px', activeTab === 'favorites' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground')}
              >
                <Heart className="h-4 w-4" /> Favoritos
              </button>
            </div>

            {activeTab === 'orders' && (
              recentOrders.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/marketplace/orders/${order.id}`)}
                      className="aspect-square rounded-xl bg-muted relative overflow-hidden cursor-pointer hover:scale-[0.98] transition-transform flex flex-col items-center justify-center gap-1 p-2"
                    >
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                      <div className={cn('w-2 h-2 rounded-full', statusColors[order.status] || 'bg-muted-foreground')} />
                      <span className="text-[9px] font-bold text-muted-foreground text-center leading-tight">
                        R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground/40">
                  <Package className="h-12 w-12" />
                  <p className="text-xs font-black uppercase tracking-widest">Nenhum pedido ainda</p>
                </div>
              )
            )}

            {activeTab === 'favorites' && (
              <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground/40">
                <Heart className="h-12 w-12" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhum favorito ainda</p>
              </div>
            )}
          </div>

          {/* === QUICK ACTIONS === */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
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
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-foreground text-background mb-6 hover:opacity-90 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Bike className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-black text-sm">Seja um Entregador</p>
              <p className="text-[11px] opacity-60 font-medium">Trabalhe conosco e ganhe mais</p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 opacity-40" />
          </button>

          {/* Logout + Delete */}
          <div className="space-y-3 pb-8">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-border text-muted-foreground font-bold text-sm hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full text-xs text-muted-foreground/40 hover:text-destructive transition-colors py-2">
                  Excluir minha conta
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
      </div>

      {/* === EDIT SHEET === */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" hideClose className="h-[80vh] rounded-t-3xl border-none p-0">
          <div className="h-full flex flex-col bg-background">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
              <div>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Editar</p>
                <h3 className="text-xl font-black text-foreground">Meu Perfil</h3>
              </div>
              <button onClick={() => setEditing(false)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-border bg-muted/30 font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                    placeholder="Seu nome"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-border bg-muted/30 font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  maxLength={150}
                  className="w-full px-4 py-3.5 rounded-2xl border border-border bg-muted/30 font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none text-sm"
                  placeholder="Fale um pouco sobre você..."
                />
                <p className="text-[10px] text-right text-muted-foreground">{bio.length}/150</p>
              </div>

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

      {/* === SUPPORT SHEET === */}
      <Sheet open={supportType !== null} onOpenChange={(open) => !open && setSupportType(null)}>
        <SheetContent side="bottom" hideClose className="h-[80vh] rounded-t-3xl border-none p-0 overflow-hidden">
          <div className="flex flex-col h-full bg-background relative">
            <div className="absolute right-4 top-4 z-10">
              <button onClick={() => setSupportType(null)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border">
                <X className="h-4 w-4 text-muted-foreground" />
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
