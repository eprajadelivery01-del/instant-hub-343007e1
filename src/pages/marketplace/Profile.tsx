import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  LogOut, MapPin, User, ChevronRight, CreditCard, 
  HelpCircle, Bell, MessageCircle, FileText, Gem, 
  Link2, Store, Wallet, Trash2, AlertTriangle, X, Camera, Loader2,
  Heart, Handshake, Bike, Shield, Ticket, Clock, Settings
} from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [partnershipType, setPartnershipType] = useState<'merchant' | 'driver' | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Enviando foto...');

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Foto atualizada!', { id: toastId });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar foto: ' + (error.message || 'Erro desconhecido'), { id: toastId });
    } finally {
      setUploading(false);
    }
  };

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

  const menuSections = [
    {
      items: [
        { icon: MessageCircle, label: 'Conversas', onClick: () => toast.info('Chat indisponível no momento.') },
        { icon: Bell, label: 'Notificações', onClick: () => toast.info('Nenhuma notificação por enquanto.') },
        { icon: FileText, label: 'Dados da conta', onClick: () => setEditing(true) },
      ]
    },
    {
      items: [
        { icon: Gem, label: 'Clube É Pra Já', onClick: () => toast.info('O Clube É Pra Já está em fase de testes.') },
        { icon: Ticket, label: 'Cupons', onClick: () => navigate('/marketplace') },
      ]
    },
    {
      items: [
        { icon: Heart, label: 'Favoritos', onClick: () => navigate('/marketplace') },
        { icon: Handshake, label: 'Doações', onClick: () => toast.info('Módulo de doações em breve.') },
        { icon: MapPin, label: 'Endereços', onClick: () => navigate('/marketplace/addresses') },
        { icon: Bike, label: 'Seja um entregador', onClick: () => setPartnershipType('driver') },
      ]
    },
    {
      items: [
        { icon: HelpCircle, label: 'Ajuda', onClick: () => toast.info('Central de ajuda disponível em breve.') },
        { icon: Settings, label: 'Configurações', onClick: () => toast.info('Módulo de configurações em breve.') },
        { icon: Shield, label: 'Segurança', onClick: () => toast.info('Acesse segurança no site oficial.') },
        { icon: Link2, label: 'Contas conectadas', onClick: () => toast.info('Acesse em breve.') },
        { icon: Store, label: 'Sugerir restaurantes', onClick: () => toast.info('Obrigado pela indicação!') },
      ]
    }
  ];

  return (
    <MarketplaceLayout>
      <div className="bg-white min-h-screen pb-24">
        {/* Header - Large Avatar & Name */}
        <div className="px-6 pt-12 pb-8 flex items-center gap-6">
      <div className="max-w-7xl mx-auto bg-dashboard min-h-screen">
        <div className="px-6 pt-12 pb-8">
          <div className="flex items-center gap-6 mb-8 group">
            <div className="relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-28 w-28 rounded-[38px] bg-white shadow-2xl flex items-center justify-center overflow-hidden shrink-0 relative border-4 border-white ring-1 ring-slate-100",
                  "hover:scale-105 active:scale-95 transition-all duration-500",
                  uploading && "opacity-50"
                )}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-4xl font-black text-primary/30">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   {uploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <Camera className="h-8 w-8 text-white" />}
                </div>
              </button>
            </div>
            
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1 block">Membro Premium</span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
                {profile?.full_name || 'Usuário'}
              </h2>
              <button className="px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                Ver perfil público
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 grid-rows-6 gap-3 h-[700px]">
            <div className="col-span-4 row-span-2 bg-white rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all border border-orange-100 shadow-sm">
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="text-primary font-black italic text-xl">é pra já</span>
                     <span className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest">CLUBE</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 w-[60%] leading-tight">Economia real em cada pedido.</h3>
               </div>
               <button className="w-fit px-6 h-10 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest relative z-10 shadow-lg shadow-black/10">
                  Assinar agora
               </button>
               <Gem className="absolute -right-4 -bottom-4 h-40 w-40 text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            </div>

            <div className="col-span-2 row-span-2 bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between group cursor-pointer active:scale-[0.98] transition-all">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                   <Wallet className="h-6 w-6" />
                </div>
                <div>
                   <h4 className="font-black text-slate-900 mb-1">Pagamentos</h4>
                   <p className="text-[10px] font-bold text-slate-400">Gerencie cartões e créditos</p>
                </div>
            </div>

            <div className="col-span-2 row-span-1 bg-white rounded-[32px] px-6 py-4 shadow-sm border border-slate-100 flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Bell className="h-5 w-5" />
                   </div>
                   <span className="font-bold text-slate-700">Avisos</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>

            <div className="col-span-2 row-span-1 bg-white rounded-[32px] px-6 py-4 shadow-sm border border-slate-100 flex items-center gap-3 group cursor-pointer active:scale-[0.98] transition-all">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                   <HelpCircle className="h-5 w-5" />
                </div>
                <span className="font-bold text-slate-700">Suporte</span>
            </div>

            <div className="col-span-4 row-span-1 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-[32px] p-1 flex items-stretch shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer">
               <div className="bg-white/10 w-full rounded-[28px] p-5 flex items-center justify-between backdrop-blur-md">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                         <Gem className="h-5 w-5" />
                      </div>
                      <div className="text-white">
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Seus Pontos</p>
                         <h5 className="text-xl font-black">2.450 Pontos</h5>
                      </div>
                   </div>
                   <ChevronRight className="h-5 w-5 text-white/40" />
               </div>
            </div>

            <div className="col-span-2 row-span-1 bg-slate-50 border border-border/50 rounded-[32px] p-5 flex items-center gap-3 group cursor-pointer active:scale-[0.98] transition-all">
                <Settings className="h-4 w-4 text-slate-400 group-hover:rotate-90 transition-transform duration-500" />
                <span className="text-sm font-black text-slate-700">Ajustes</span>
            </div>

            <div className="col-span-2 row-span-1 bg-slate-50 border border-border/50 rounded-[32px] p-5 flex items-center gap-3 group cursor-pointer active:scale-[0.98] transition-all" onClick={() => setEditing(true)}>
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-black text-slate-700">Minha Conta</span>
            </div>
          </div>
          
          <div className="mt-8 space-y-4">
             <Button 
                onClick={() => signOut()} 
                variant="ghost" 
                className="w-full h-16 rounded-[24px] bg-red-50/50 hover:bg-red-50 text-red-500 font-bold border border-red-100 flex items-center justify-center gap-2 group"
             >
                <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                SAIR DA CONTA
             </Button>

             <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-red-400">
                    Encerrar cadastro permanentemente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[40px] border-none shadow-2xl">
                  <AlertDialogHeader>
                    <div className="mx-auto h-20 w-20 bg-red-50 rounded-[32px] flex items-center justify-center mb-4">
                       <Trash2 className="h-10 w-10 text-red-400" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black text-center text-slate-900">Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-sm font-medium text-slate-500 px-4">
                      A exclusão da conta é permanente e removerá todos os seus dados, pedidos e preferências. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-col gap-3">
                    <AlertDialogAction 
                      onClick={async () => {
                        await supabase.from('profiles').delete().eq('id', user.id);
                        await signOut();
                        navigate('/marketplace/login');
                      }}
                      className="bg-red-500 hover:bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
                    >
                      Excluir Tudo
                    </AlertDialogAction>
                    <AlertDialogCancel className="h-14 rounded-2xl border-slate-100 font-black uppercase tracking-widest text-xs">Ainda não</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </div>

        <Sheet open={editing} onOpenChange={setEditing}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-[40px] border-none shadow-2xl p-0 overflow-hidden">
            <div className="p-8 space-y-8 h-full bg-white">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Dados da conta</h3>
                 <button onClick={() => setEditing(false)} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center"><X className="h-5 w-5" /></button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-16 rounded-[24px] bg-slate-50 border-none px-6 text-lg font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telefone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-16 rounded-[24px] bg-slate-50 border-none px-6 text-lg font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full h-16 rounded-[24px] font-black text-sm uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                  {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </Button>
              </div>
            </div>
                      </button>
                   </AlertDialogTrigger>
                   <AlertDialogContent className="rounded-[32px] p-8 border-0 shadow-2xl">
                     <AlertDialogHeader>
                       <AlertDialogTitle className="text-xl font-black text-slate-900">Tem certeza absoluta?</AlertDialogTitle>
                       <AlertDialogDescription className="text-slate-500 font-medium">
                         Esta ação é definitiva. Ao confirmar, sua conta será encerrada e você perderá acesso ao É Pra Já imediatamente.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter className="gap-3 mt-6">
                       <AlertDialogCancel className="h-14 rounded-2xl border-slate-100 font-bold text-slate-500">Cancelar</AlertDialogCancel>
                       <AlertDialogAction 
                         onClick={async () => {
                           toast.loading("Excluindo conta...");
                           // In a real scenario, this would call a Supabase Edge Function to delete auth.user
                           const { error } = await supabase.from('profiles').delete().eq('id', user.id);
                           await signOut();
                           toast.dismiss();
                           toast.success("Conta excluída com sucesso");
                           navigate('/marketplace/login');
                         }}
                         className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-black text-xs tracking-widest"
                       >
                         CONFIRMAR EXCLUSÃO
                       </AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partnership Sheets - Same as Home for consistency */}
      <AlertDialog open={!!partnershipType} onOpenChange={(open) => !open && setPartnershipType(null)}>
        <AlertDialogContent className="h-[80vh] sm:max-w-md rounded-t-[40px] border-t-0 p-0 overflow-hidden bottom-0 fixed animate-in slide-in-from-bottom duration-500">
          <div className="h-full flex flex-col bg-[#fdfdfd]">
             <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Expansão É Pra Já</p>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight">
                     Seja um {partnershipType === 'merchant' ? 'Parceiro' : 'Entregador'}
                   </h2>
                </div>
                <button onClick={() => setPartnershipType(null)} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><X className="h-5 w-5"/></button>
             </div>

             <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-8 scrollbar-hide">
                <div className={cn(
                  "p-6 rounded-[32px] relative overflow-hidden",
                  partnershipType === 'merchant' ? "bg-slate-900 text-white" : "bg-sunset text-white"
                )}>
                   <h4 className="text-lg font-black mb-1 relative z-10">
                     {partnershipType === 'merchant' ? 'Sua loja em todo lugar' : 'Liberdade para ganhar'}
                   </h4>
                   <p className="text-[11px] opacity-80 leading-relaxed relative z-10">
                     {partnershipType === 'merchant' 
                       ? 'Acesse milhares de clientes e aumente seu faturamento com nossas ferramentas.' 
                       : 'Seja seu próprio chefe. Entregue no seu ritmo e ganhe por cada rota.'}
                   </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-[32px] space-y-4">
                   <div className="space-y-3">
                      <Input placeholder="Seu nome" className="h-12 rounded-2xl bg-white border-transparent shadow-sm" />
                      <Input placeholder={partnershipType === 'merchant' ? "Nome da sua Loja" : "Seu WhatsApp"} className="h-12 rounded-2xl bg-white border-transparent shadow-sm" />
                      <Button 
                        onClick={() => {
                          toast.success('Recebemos seu interesse! Entraremos em contato em breve.');
                          setPartnershipType(null);
                        }}
                        className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-sunset text-white hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]"
                      >
                         Enviar interesse
                      </Button>
                   </div>
                </div>
             </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </MarketplaceLayout>
  );
}
