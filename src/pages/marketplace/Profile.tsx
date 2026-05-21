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
  Package, Clock, CheckCircle2, XCircle, Truck, Ticket, Copy
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
      <div className="min-h-screen pb-40 bg-background/50">
        
        {/* Profile Header (Social Style) */}
        <div className="relative pt-8 px-6 flex flex-col items-center text-center">
          <div className="relative group mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-32 h-32 rounded-[2.5rem] bg-background p-1 shadow-2xl overflow-hidden active:scale-95 transition-all relative z-10"
            >
              <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-muted">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Foto de perfil" />
                ) : (
                  <div className="w-full h-full gradient-primary flex items-center justify-center">
                    <span className="text-5xl font-black text-white">{initial}</span>
                  </div>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-[2.5rem]">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 w-10 h-10 rounded-2xl bg-foreground text-background border-4 border-background flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-30"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">{displayName}</h1>
          <p className="text-sm font-medium text-muted-foreground/60 mb-6">{user.email}</p>

          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 h-12 rounded-2xl bg-foreground text-background text-sm font-black hover:opacity-90 active:scale-95 transition-all shadow-lg"
            >
              Editar Perfil
            </button>
            <button
              onClick={() => navigate('/marketplace/addresses')}
              className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm"
            >
              <MapPin className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* User Stats Bar */}
        <div className="px-6 mt-10">
          <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-[2.5rem] p-2 flex items-center justify-between shadow-sm">
            {[
              { label: 'Pedidos', value: orders.length, color: 'text-foreground' },
              { label: 'Cupons',  value: coupons.length, color: 'text-primary', onClick: () => fetchCoupons(true) },
              { label: 'Região',  value: 'MT', color: 'text-foreground' }
            ].map((stat, i) => (
              <button 
                key={stat.label}
                onClick={stat.onClick}
                disabled={!stat.onClick}
                className={cn(
                  "flex-1 flex flex-col items-center py-3",
                  i < 2 && "border-r border-border/30"
                )}
              >
                <span className={cn("text-xl font-black leading-none", stat.color)}>{stat.value}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">{stat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-6 mt-8 space-y-8">
          
          {/* Clube Promo Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary to-orange-600 p-8 shadow-xl shadow-primary/10 group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="relative z-10 flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-white" />
                </div>
                <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Clube VIP É Pra Já</p>
              </div>
              <div>
                <p className="text-xl font-black text-white leading-tight">Você tem cupons<br/>exclusivos disponíveis</p>
                <p className="text-xs text-white/60 mt-2 font-medium">Economize agora no seu próximo pedido</p>
              </div>
              <button
                onClick={() => fetchCoupons(true)}
                disabled={loadingCoupons}
                className="w-full h-12 rounded-2xl bg-white text-primary text-sm font-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loadingCoupons ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ver Meus Cupons'}
              </button>
            </div>
            <span className="absolute -right-6 -bottom-8 text-[140px] opacity-20 group-hover:scale-110 transition-transform duration-700 leading-none grayscale brightness-200">🔥</span>
          </div>

          {/* Settings Groups */}
          <div className="space-y-10">
            {/* Group: Minha Conta */}
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-4 ml-4">Minha Conta</h2>
              <div className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden shadow-sm">
                {[
                  { icon: MapPin,    label: 'Endereços', subtitle: 'Gerenciar locais de entrega', onClick: () => navigate('/marketplace/addresses') },
                  { icon: Wallet,    label: 'Carteira',  subtitle: 'Saldo e transações',           onClick: () => toast('Em breve!') },
                  { icon: theme === 'dark' ? Moon : Sun, label: 'Aparência', subtitle: theme === 'dark' ? 'Modo Escuro Ativo' : 'Modo Claro Ativo', onClick: () => toggleTheme() },
                ].map((item, i, arr) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={cn(
                      'w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-muted/40 transition-colors',
                      i < arr.length - 1 && 'border-b border-border/40'
                    )}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">{item.label}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-0.5">{item.subtitle}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/20" />
                  </button>
                ))}
              </div>
            </div>

            {/* Group: Suporte & Legal */}
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-4 ml-4">Ajuda & Legal</h2>
              <div className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden shadow-sm">
                {[
                  { icon: HelpCircle, label: 'Central de Ajuda', subtitle: 'Suporte e dúvidas',    onClick: () => setSupportType('support') },
                  { icon: FileText,   label: 'Termos de Uso',   subtitle: 'Regras da plataforma',  onClick: () => navigate('/marketplace/terms') },
                  { icon: ShieldCheck, label: 'Privacidade',    subtitle: 'Segurança dos dados',   onClick: () => navigate('/marketplace/privacy') },
                ].map((item, i, arr) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={cn(
                      'w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-muted/40 transition-colors',
                      i < arr.length - 1 && 'border-b border-border/40'
                    )}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">{item.label}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-0.5">{item.subtitle}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/20" />
                  </button>
                ))}
              </div>
            </div>

            {/* Partner CTA */}
            <button
              onClick={() => setSupportType('driver_application')}
              className="w-full relative overflow-hidden flex items-center gap-5 p-7 rounded-[2.8rem] bg-foreground text-background hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-foreground/10"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent pointer-events-none" />
              <div className="w-14 h-14 rounded-[1.4rem] bg-background/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-background/20">
                <Bike className="h-7 w-7 text-background" />
              </div>
              <div className="text-left relative z-10 flex-1">
                <p className="font-black text-lg leading-tight">Seja um Entregador</p>
                <p className="text-[10px] opacity-60 font-black uppercase tracking-[0.2em] mt-1.5">Ganhos extras e liberdade</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center">
                <ChevronRight className="h-5 w-5 text-background opacity-60" />
              </div>
            </button>

            {/* Danger Zone */}
            <div className="space-y-3">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl border border-border text-muted-foreground font-black text-sm hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
              >
                <LogOut className="h-4 w-4" /> Sair da conta
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full text-xs text-muted-foreground/30 hover:text-destructive transition-colors py-2 font-bold uppercase tracking-widest">
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
          </div>

          {/* Footer Branding */}
          <div className="py-12 flex flex-col items-center opacity-20">
            <p className="text-[11px] font-black tracking-[0.8em] text-foreground ml-3">BONASOFT</p>
          </div>
        </div>
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
        <SheetContent side="bottom" hideClose className="h-[85vh] rounded-t-[3rem] border-none p-0 overflow-hidden shadow-2xl z-[100]">
          <SheetTitle className="sr-only">Chat de Suporte</SheetTitle>
          <div className="flex flex-col h-full bg-background relative">
            <div className="absolute right-6 top-6 z-50">
              <button onClick={() => setSupportType(null)} className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center border shadow-sm">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            {supportType && (
              <SupportChat
                title={supportType === 'support' ? 'Central de Ajuda' : 'Cadastro de Entregador'}
                topic={supportType}
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
