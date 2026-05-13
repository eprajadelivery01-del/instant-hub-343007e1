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
  }, [user]);

  const fetchCoupons = async () => {
    if (coupons.length > 0) { setShowCoupons(true); return; }
    setLoadingCoupons(true);
    try {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      const valid = (data || []).filter(c => !c.expires_at || new Date(c.expires_at) > new Date());
      setCoupons(valid);
    } catch { /* silent */ }
    finally { setLoadingCoupons(false); setShowCoupons(true); }
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
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <MarketplaceLayout>
      <div className="min-h-screen pb-32">

        {/* â”€â”€ AVATAR + NOME â”€â”€ */}
        <div className="px-5 pt-10 pb-6 flex flex-col items-center text-center">
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
            <input ref={fileInputRef} type="file" capture="environment" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          <h1 className="text-xl font-black text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          {profile?.phone && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {profile.phone}
            </p>
          )}

          <button
            onClick={() => setEditing(true)}
            className="mt-4 px-6 py-2 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-all"
          >
            Editar Dados
          </button>
        </div>

        <div className="px-5 space-y-4">

          {/* â”€â”€ CLUBE â”€â”€ */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-5 shadow-lg shadow-primary/30">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1">Clube Ã‰ Pra Já</p>
                <p className="text-sm font-black text-white leading-snug">Economize com cupons<br/>no seu lanche favorito</p>
              </div>
              <button
                onClick={fetchCoupons}
                disabled={loadingCoupons}
                className="shrink-0 h-9 px-4 rounded-xl bg-white text-primary text-xs font-black hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-70"
              >
                {loadingCoupons ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
                Ver benefícios
              </button>
            </div>
            <span className="absolute -right-3 -bottom-5 text-[100px] opacity-10 select-none leading-none">ðŸ”</span>
          </div>

          {/* â”€â”€ HISTÃ“RICO DE PEDIDOS â”€â”€ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Histórico de Pedidos</h2>
              {orders.length > 0 && (
                <button
                  onClick={() => navigate('/marketplace/orders')}
                  className="text-[11px] font-bold text-primary"
                >
                  Ver todos
                </button>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {loadingOrders ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground/40">
                  <Package className="h-10 w-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pedido ainda</p>
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black"
                  >
                    Explorar lojas
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {orders.map((order) => {
                    const s = STATUS_MAP[order.status] || STATUS_MAP.pending;
                    const StatusIcon = s.icon;

                    let logoSrc = '';
                    if (order.companies?.logo_url) {
                      try {
                        const parsed = JSON.parse(order.companies.logo_url);
                        logoSrc = parsed.logo || parsed.cover || '';
                      } catch {
                        logoSrc = order.companies.logo_url;
                      }
                    }

                    return (
                      <button
                        key={order.id}
                        onClick={() => navigate(`/marketplace/orders/${order.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors"
                      >
                        {/* Store logo or icon */}
                        <div className="w-11 h-11 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border/50">
                          {logoSrc ? (
                            <img src={logoSrc} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {order.companies?.name || 'Pedido'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {order.created_at
                              ? format(new Date(order.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })
                              : 'â€”'}
                          </p>
                        </div>

                        {/* Right: status + value */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-black text-foreground">
                            R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}
                          </span>
                          <span className={cn('flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full', s.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {s.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* â”€â”€ MENU â”€â”€ */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {[
              { icon: MapPin,    label: 'Endereços', subtitle: 'Gerenciar locais salvos',      onClick: () => navigate('/marketplace/addresses'), chevron: true },
              { icon: Wallet,    label: 'Carteira',  subtitle: 'Saldo e recargas',              onClick: () => toast('Em breve!') },
              { icon: theme === 'dark' ? Moon : Sun, label: 'Aparência', subtitle: theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo', onClick: () => toggleTheme() },
              { icon: HelpCircle, label: 'Ajuda',   subtitle: 'Suporte e dúvidas',             onClick: () => setSupportType('support') },
              { icon: FileText,  label: 'Termos de Uso', subtitle: 'Regras da plataforma',    onClick: () => navigate('/marketplace/terms'), chevron: true },
              { icon: ShieldCheck, label: 'Privacidade', subtitle: 'Seus dados protegidos',   onClick: () => navigate('/marketplace/privacy'), chevron: true },
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

          {/* â”€â”€ ENTREGADOR â”€â”€ */}
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

          {/* â”€â”€ SAIR â”€â”€ */}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-border text-muted-foreground font-bold text-sm hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full text-xs text-muted-foreground/40 hover:text-destructive transition-colors py-2 pb-4">
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

      {/* â”€â”€ EDITAR SHEET â”€â”€ */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" hideClose className="h-[70vh] rounded-t-3xl border-none p-0">
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
                className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* â”€â”€ SUPORTE SHEET â”€â”€ */}
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
      {/* â”€â”€ CUPONS SHEET â”€â”€ */}
      <Sheet open={showCoupons} onOpenChange={setShowCoupons}>
        <SheetContent side="bottom" hideClose className="h-[85vh] rounded-t-3xl border-none p-0">
          <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-border shrink-0">
              <div>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Clube Ã‰ Pra Já</p>
                <h3 className="text-xl font-black text-foreground">Cupons Disponíveis</h3>
              </div>
              <button onClick={() => setShowCoupons(false)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingCoupons ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center text-muted-foreground/40">
                  <Ticket className="h-12 w-12" />
                  <p className="font-black text-sm uppercase tracking-widest">Nenhum cupom ativo</p>
                  <p className="text-xs text-muted-foreground">Aguarde novas promoções!</p>
                </div>
              ) : (
                coupons.map((coupon) => (
                  <div key={coupon.id} className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm">
                    <div className="p-4 flex gap-4 items-center">
                      {/* Icon */}
                      <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 flex flex-col items-center justify-center gap-0.5">
                        <Ticket className="h-5 w-5 text-primary" />
                        <span className="text-[7px] font-black text-primary uppercase tracking-widest">Ã‰ PRA JÃ</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-foreground leading-tight">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}% de Desconto`
                            : `R$ ${Number(coupon.discount_value).toFixed(2).replace('.', ',')} OFF`}
                        </p>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{coupon.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-muted-foreground">Código:</span>
                            <span className="text-primary">{coupon.code}</span>
                          </span>
                          {coupon.expires_at && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                              <Clock className="h-3 w-3" />
                              Expira: {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-muted/40 border-t border-dashed border-border px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {coupon.min_order_value > 0
                          ? `Pedidos acima de R$ ${Number(coupon.min_order_value).toFixed(2).replace('.', ',')}`
                          : 'Válido para qualquer valor'}
                      </span>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="flex items-center gap-1 text-xs font-black text-primary active:scale-95 transition-transform uppercase tracking-widest"
                      >
                        <Copy className="h-3 w-3" /> Copiar
                      </button>
                    </div>

                    {/* Ticket cutouts */}
                    <div className="absolute top-[74px] -left-2.5 h-5 w-5 rounded-full bg-background border border-border/50" />
                    <div className="absolute top-[74px] -right-2.5 h-5 w-5 rounded-full bg-background border border-border/50" />
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

