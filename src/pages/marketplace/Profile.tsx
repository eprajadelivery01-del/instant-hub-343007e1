// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAddress } from '@/contexts/AddressContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SupportChat } from '@/components/chat/SupportChat';
import { cn } from '@/lib/utils';
import {
  LogOut, MapPin, ChevronRight, Camera, Loader2,
  Bike, FileText, ShieldCheck, Moon, Sun,
  Wallet, HelpCircle, X, Check, Phone,
  Package, Clock, CheckCircle2, XCircle, Truck, Ticket, Copy,
  Crown, Sparkles, ShoppingBag, Settings2, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Aguardando',  color: 'text-yellow-500 bg-yellow-500/10',  icon: Clock },
  confirmed:  { label: 'Confirmado',  color: 'text-blue-500 bg-blue-500/10',      icon: CheckCircle2 },
  preparing:  { label: 'Preparando',  color: 'text-orange-500 bg-orange-500/10',  icon: Package },
  ready:      { label: 'Pronto',      color: 'text-purple-500 bg-purple-500/10',  icon: CheckCircle2 },
  delivering: { label: 'A caminho',   color: 'text-primary bg-primary/10',        icon: Truck },
  delivered:  { label: 'Entregue',    color: 'text-green-500 bg-green-500/10',    icon: CheckCircle2 },
  completed:  { label: 'Concluído',   color: 'text-green-500 bg-green-500/10',    icon: CheckCircle2 },
  cancelled:  { label: 'Cancelado',   color: 'text-red-500 bg-red-500/10',        icon: XCircle },
};

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { selectedAddress } = useAddress();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [supportType, setSupportType] = useState<'support' | 'driver_application' | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showCoupons, setShowCoupons] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchOrders();
    fetchCoupons(false);
  }, [user]);

  const fetchCoupons = async (show = true) => {
    if (show && coupons.length > 0) { setShowCoupons(true); return; }
    if (show) setLoadingCoupons(true);
    try {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('active', true);
        
      let valid = (data || []).filter(c => !c.expires_at || new Date(c.expires_at) > new Date());
      
      // Busca manualmente as empresas para evitar o Erro 400 (Bad Request) causado pela falta de Foreign Key
      const companyIds = valid.map(c => c.company_id).filter(Boolean);
      if (companyIds.length > 0) {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('user_id, name, logo_url, region_id')
          .in('user_id', companyIds);
          
        valid = valid.map(c => ({
          ...c,
          companies: companiesData?.find(comp => comp.user_id === c.company_id) || null
        }));
      }
      
      if (selectedAddress?.region_id) {
        valid = valid.filter(c => 
          !c.company_id || 
          c.companies?.region_id === selectedAddress.region_id
        );
      }

      setCoupons(valid);
    } catch { /* silent */ }
    finally { 
      if (show) {
        setLoadingCoupons(false); 
        setShowCoupons(true); 
      }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!', { description: 'Cole na tela de finalização do pedido.' });
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, status, total, created_at,
          companies ( name, logo_url )
        `)
        .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(30);
      setOrders(data || []);
    } catch { /* silent */ }
    finally { setLoadingOrders(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Foto atualizada com sucesso!');
    } catch (err: any) { 
      console.error('Photo upload error:', err);
      toast.error('Falha no upload: ' + (err.message || 'Erro de permissão ou conexão')); 
    }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
      
      // Delay to ensure DB replication/trigger finish before refetching
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshProfile();
      
      toast.success('Perfil atualizado!');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  if (!user) { navigate('/marketplace/login'); return null; }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <MarketplaceLayout>
      <div className="min-h-screen pb-40 bg-background relative overflow-hidden">

        {/* Cinematic gradient backdrop */}
        <div className="absolute inset-x-0 top-0 h-[420px] pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/25 via-primary/5 to-transparent" />
          <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/30 blur-[120px]" />
          <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-orange-400/20 blur-[120px]" />
          <div className="absolute top-40 left-1/2 -translate-x-1/2 h-40 w-[120%] bg-gradient-to-b from-transparent to-background" />
        </div>

        {/* HERO — Identity card */}
        <div className="relative px-5 pt-10">
          <div className="relative rounded-[2.25rem] overflow-hidden border border-border/60 bg-card/70 backdrop-blur-2xl shadow-[0_20px_80px_-30px_hsl(var(--primary)/0.45)] p-6">
            {/* inner shine */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
            <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />

            <div className="relative flex items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary via-orange-400 to-yellow-300 blur-[6px] opacity-70" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative w-24 h-24 rounded-full bg-background p-[3px] active:scale-95 transition-transform"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Foto de perfil" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                        <span className="text-4xl font-black text-white">{initial}</span>
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-foreground text-background border-2 border-card flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.18em]">Membro</span>
                </div>
                <h1 className="text-2xl font-black text-foreground tracking-tight truncate">{displayName}</h1>
                <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">{user.email}</p>
              </div>
            </div>

            {/* Action row inside the card */}
            <div className="relative mt-5 flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 h-12 rounded-2xl bg-foreground text-background text-[13px] font-black hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Settings2 className="h-4 w-4" /> Editar Perfil
              </button>
              <button
                onClick={() => navigate('/marketplace/addresses')}
                className="h-12 px-4 rounded-2xl bg-muted/60 border border-border/60 flex items-center gap-2 text-foreground active:scale-[0.98] transition-all"
              >
                <MapPin className="h-4 w-4" />
                <span className="text-[12px] font-black truncate max-w-[100px]">
                  {selectedAddress?.label || 'Endereços'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative px-5 mt-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Pedidos', value: orders.length, icon: ShoppingBag, accent: 'text-foreground', tint: 'bg-card', onClick: () => navigate('/marketplace/orders') },
              { label: 'Cupons',  value: coupons.length, icon: Ticket, accent: 'text-primary', tint: 'bg-primary/8', onClick: () => fetchCoupons(true) },
              { label: 'Região',  value: 'MT', icon: MapPin, accent: 'text-foreground', tint: 'bg-card' },
            ].map((stat) => (
              <button
                key={stat.label}
                onClick={stat.onClick}
                disabled={!stat.onClick}
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-border/60 p-3.5 text-left transition-all",
                  stat.tint,
                  stat.onClick && "hover:-translate-y-0.5 active:scale-[0.97]"
                )}
              >
                <stat.icon className={cn("h-4 w-4 mb-3 opacity-70", stat.accent)} />
                <p className={cn("text-xl font-black leading-none tracking-tight", stat.accent)}>{stat.value}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/70 mt-1.5">{stat.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="relative px-5 mt-5 space-y-5">

          {/* VIP — cinematic dark card */}
          <button
            onClick={() => fetchCoupons(true)}
            disabled={loadingCoupons}
            className="w-full text-left relative overflow-hidden rounded-[2rem] p-6 bg-[#0b0b10] active:scale-[0.99] transition-transform shadow-[0_25px_60px_-20px_rgba(0,0,0,0.6)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.55),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,180,80,0.25),transparent_55%)]" />
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" />
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border border-white/5" />

            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40">
                  <Crown className="h-4 w-4 text-black" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">Clube</p>
                  <p className="text-sm font-black text-white tracking-wide">É Pra Já VIP</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                <span className="text-[9px] font-black text-white uppercase tracking-widest">{coupons.length} Ativos</span>
              </div>
            </div>

            <div className="relative mt-7">
              <p className="text-[28px] leading-[1.05] font-black text-white tracking-tight">
                Benefícios<br/>
                <span className="bg-gradient-to-r from-white via-orange-200 to-yellow-300 bg-clip-text text-transparent">exclusivos</span>
              </p>
              <p className="text-xs text-white/55 mt-2 font-medium max-w-[240px]">
                Cupons selecionados e descontos premium nos seus pedidos favoritos.
              </p>
            </div>

            <div className="relative mt-6 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-4 h-11 rounded-full bg-white text-black text-[12px] font-black">
                {loadingCoupons ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ver meus cupons <ChevronRight className="h-4 w-4" /></>}
              </div>
              <div className="flex -space-x-1">
                {[0,1,2].map(i => (
                  <Star key={i} className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
                ))}
              </div>
            </div>
          </button>

          {/* Settings list — minha conta */}
          <div className="rounded-[2rem] border border-border/60 bg-card/60 backdrop-blur-xl overflow-hidden">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Minha Conta</h2>
            </div>
            <div className="p-2">
              {[
                { icon: MapPin,    label: 'Endereços', subtitle: 'Locais de entrega', onClick: () => navigate('/marketplace/addresses') },
                { icon: Wallet,    label: 'Carteira',  subtitle: 'Saldo e transações', onClick: () => toast('Em breve!') },
                { icon: theme === 'dark' ? Moon : Sun, label: 'Aparência', subtitle: theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo', onClick: () => toggleTheme() },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-muted/60 transition-colors active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-muted to-secondary flex items-center justify-center shrink-0 border border-border/40">
                    <item.icon className="h-[18px] w-[18px] text-foreground/80" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-extrabold text-foreground tracking-tight">{item.label}</p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </button>
              ))}
            </div>
          </div>

          {/* Settings list — ajuda & legal */}
          <div className="rounded-[2rem] border border-border/60 bg-card/60 backdrop-blur-xl overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Ajuda & Legal</h2>
            </div>
            <div className="p-2">
              {[
                { icon: HelpCircle, label: 'Central de Ajuda', subtitle: 'Suporte e dúvidas',    onClick: () => setSupportType('support') },
                { icon: FileText,   label: 'Termos de Uso',   subtitle: 'Regras da plataforma',  onClick: () => navigate('/marketplace/terms') },
                { icon: ShieldCheck, label: 'Privacidade',    subtitle: 'Segurança dos dados',   onClick: () => navigate('/marketplace/privacy') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-muted/60 transition-colors active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-muted to-secondary flex items-center justify-center shrink-0 border border-border/40">
                    <item.icon className="h-[18px] w-[18px] text-foreground/80" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-extrabold text-foreground tracking-tight">{item.label}</p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </button>
              ))}
            </div>
          </div>

          {/* Driver CTA */}
          <button
            onClick={() => setSupportType('driver_application')}
            className="w-full relative overflow-hidden rounded-[2rem] p-5 text-white active:scale-[0.99] transition-transform"
            style={{ background: 'linear-gradient(135deg, #0f1115 0%, #1a1f2b 100%)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,hsl(var(--primary)/0.4),transparent_60%)]" />
            <div className="absolute right-4 top-4 opacity-10">
              <Bike className="h-24 w-24" />
            </div>
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/40 shrink-0">
                <Bike className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.25em]">Oportunidade</p>
                <p className="font-black text-base tracking-tight mt-0.5">Seja um entregador</p>
                <p className="text-[11px] text-white/55 font-medium mt-0.5">Ganhos extras com liberdade total</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                <ChevronRight className="h-4 w-4 text-white" />
              </div>
            </div>
          </button>

          {/* Danger zone */}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 h-13 py-4 rounded-2xl bg-card border border-border text-foreground font-extrabold text-[13px] hover:bg-muted active:scale-[0.98] transition-all"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full text-[10px] text-muted-foreground/50 hover:text-destructive transition-colors py-3 font-black uppercase tracking-[0.25em]">
                  Excluir minha conta
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-none p-8">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black">Excluir sua conta?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                    Esta ação é permanente e todos os seus dados de pedidos e cupons serão perdidos para sempre.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-3 mt-6">
                  <AlertDialogAction
                    onClick={async () => { await supabase.from('profiles').delete().eq('id', user.id); await signOut(); navigate('/marketplace/login'); }}
                    className="bg-destructive hover:bg-destructive/90 h-14 rounded-2xl text-white font-black"
                  >
                    Sim, excluir definitivamente
                  </AlertDialogAction>
                  <AlertDialogCancel className="h-14 rounded-2xl border-none bg-muted text-foreground font-black">
                    Manter minha conta
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Footer Branding */}
          <div className="py-10 flex flex-col items-center opacity-25">
            <p className="text-[10px] font-black tracking-[1em] text-foreground ml-3">BONASOFT</p>
          </div>
        </div>

        {/* hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      {/* Edit Profile Sheet */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" hideClose className="h-[75vh] rounded-t-[3rem] border-none p-0 shadow-2xl">
          <SheetTitle className="sr-only">Editar Meus Dados</SheetTitle>
          <div className="h-full flex flex-col bg-background">
            <div className="p-8 pb-6 flex items-center justify-between border-b border-border/50">
              <div>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Configurações</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">Editar Meus Dados</h3>
              </div>
              <button onClick={() => setEditing(false)} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <X className="h-6 w-6 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {[
                { label: 'Nome completo', value: fullName, onChange: setFullName, placeholder: 'Como quer ser chamado?' },
                { label: 'WhatsApp', value: phone, onChange: setPhone, placeholder: '(00) 00000-0000' },
              ].map(f => (
                <div key={f.label} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">{f.label}</label>
                  <input
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-6 py-4.5 rounded-2xl border border-border bg-muted/30 font-bold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>
              ))}
              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-14 rounded-2xl gradient-primary text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {saving ? 'Salvando Alterações...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Support Chat Sheet */}
      <Sheet open={supportType !== null} onOpenChange={open => !open && setSupportType(null)}>
        <SheetContent side="bottom" hideClose className="h-[85vh] rounded-t-[3rem] border-none p-0 overflow-hidden shadow-2xl z-[100]" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Chat de Suporte</SheetTitle>
          <div className="flex flex-col h-full bg-background relative">
            {supportType && (
              <SupportChat
                title={supportType === 'support' ? 'Central de Ajuda' : 'Cadastro de Entregador'}
                topic={supportType}
                onClose={() => setSupportType(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Coupons List Sheet */}
      <Sheet open={showCoupons} onOpenChange={setShowCoupons}>
        <SheetContent side="bottom" hideClose className="h-[85vh] rounded-t-[3rem] border-none p-0 shadow-2xl">
          <SheetTitle className="sr-only">Meus Cupons</SheetTitle>
          <div className="h-full flex flex-col bg-background">
            <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-border shrink-0">
              <div>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Clube É Pra Já</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">Cupons Disponíveis</h3>
              </div>
              <button onClick={() => setShowCoupons(false)} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <X className="h-6 w-6 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingCoupons ? (
                <div className="py-20 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="py-24 flex flex-col items-center gap-4 text-center">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center opacity-20">
                    <Ticket className="h-10 w-10 text-foreground" />
                  </div>
                  <p className="font-black text-lg text-foreground/40 tracking-tight">Nenhum cupom ativo no momento</p>
                  <p className="text-xs text-muted-foreground/60 max-w-[200px]">Fique de olho em nossas redes para novas promoções!</p>
                </div>
              ) : (
                coupons.map((coupon) => (
                  <div key={coupon.id} className="relative overflow-hidden rounded-[2rem] bg-card border border-border shadow-sm group">
                    <div className="p-5 flex gap-5 items-center">
                      <div className="w-16 h-16 shrink-0 rounded-2xl bg-primary/10 flex flex-col items-center justify-center gap-0.5 border border-primary/5">
                        <Ticket className="h-6 w-6 text-primary" />
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">VIP</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xl font-black text-foreground leading-tight tracking-tight">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}% OFF`
                            : `R$ ${Number(coupon.discount_value).toFixed(2).replace('.', ',')} OFF`}
                        </p>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wider mt-1">
                          {coupon.companies?.name || 'Válido em toda a plataforma'}
                        </p>
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted text-[10px] font-black uppercase tracking-widest text-primary border border-primary/10">
                            {coupon.code}
                          </span>
                          {coupon.expires_at && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase">
                              <Clock className="h-3 w-3" />
                              Expira {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 border-t border-dashed border-border px-6 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                        {coupon.min_order_value > 0
                          ? `Pedido mínimo R$ ${Number(coupon.min_order_value).toFixed(2).replace('.', ',')}`
                          : 'Sem valor mínimo'}
                      </span>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="flex items-center gap-1.5 text-xs font-black text-primary hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                      >
                        <Copy className="h-4 w-4" /> Copiar Código
                      </button>
                    </div>

                    {/* Ticket cutouts */}
                    <div className="absolute top-[88px] -left-3 h-6 w-6 rounded-full bg-background border border-border/50" />
                    <div className="absolute top-[88px] -right-3 h-6 w-6 rounded-full bg-background border border-border/50" />
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </MarketplaceLayout>
  );
}
