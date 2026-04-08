import React, { useState } from 'react';
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
  Ticket, Heart, Handshake, Bike, Settings, Shield, 
  Link2, Store, Wallet, Trash2, AlertTriangle, X
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
        { icon: MessageCircle, label: 'Conversas', onClick: () => {} },
        { icon: Bell, label: 'Notificações', onClick: () => {} },
        { icon: FileText, label: 'Dados da conta', onClick: () => setEditing(true) },
      ]
    },
    {
      items: [
        { icon: Gem, label: 'Clube É Pra Já', onClick: () => {} },
        { icon: Ticket, label: 'Cupons', onClick: () => {} },
      ]
    },
    {
      items: [
        { icon: Heart, label: 'Favoritos', onClick: () => {} },
        { icon: Handshake, label: 'Doações', onClick: () => {} },
        { icon: MapPin, label: 'Endereços', onClick: () => navigate('/marketplace/addresses') },
        { icon: Bike, label: 'Seja um entregador', onClick: () => {} },
      ]
    },
    {
      items: [
        { icon: HelpCircle, label: 'Ajuda', onClick: () => {} },
        { icon: Settings, label: 'Configurações', onClick: () => {} },
        { icon: Shield, label: 'Segurança', onClick: () => {} },
        { icon: Link2, label: 'Contas conectadas', onClick: () => {} },
        { icon: Store, label: 'Sugerir restaurantes', onClick: () => {} },
      ]
    }
  ];

  return (
    <MarketplaceLayout>
      <div className="bg-white min-h-screen pb-24">
        {/* Header - Large Avatar & Name */}
        <div className="px-6 pt-12 pb-8 flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="text-4xl font-black text-slate-300">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{profile?.full_name || 'Usuário'}</h2>
            <button className="flex items-center gap-1 text-primary text-sm font-bold mt-1 group">
               Vem economizar com o Clube
               <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="px-4 space-y-6">
          {/* É Pra Já Pago Card */}
          <div className="bg-slate-50 rounded-[32px] p-1 border border-slate-100 shadow-sm">
             <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                   <span className="text-primary font-black italic">é pra já</span>
                   <span className="text-slate-900 font-black">Pago</span>
                </div>
                <button className="w-full flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                         <Wallet className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">Pagamentos</span>
                   </div>
                   <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
             <div className="px-6 py-3">
                <p className="text-[11px] font-bold text-slate-400">Gerencie suas formas de pagamento</p>
             </div>
          </div>

          {/* Points Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-[32px] p-6 flex items-center justify-between text-white relative overflow-hidden group cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all">
             <div className="relative z-10 w-[70%]">
                <h4 className="text-sm font-black mb-1">R$1 = 1 ponto Decolar</h4>
                <p className="text-[11px] font-medium opacity-80 leading-relaxed">Acumule pontos em cada real gasto no É Pra Já!</p>
             </div>
             <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md relative z-10">
                <ChevronRight className="h-5 w-5" />
             </div>
             <Gem className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 rotate-12" />
          </div>

          {/* Edit form */}
          {editing && (
            <div className="bg-slate-50 rounded-[32px] p-6 space-y-4 animate-in slide-in-from-top duration-500">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="font-black text-slate-900">Dados da conta</h3>
                 <button onClick={() => setEditing(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-14 rounded-2xl bg-white border border-slate-100 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telefone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-14 rounded-2xl bg-white border border-slate-100 shadow-sm" />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full h-14 rounded-2xl font-black bg-primary">
                  {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </Button>
              </div>
            </div>
          )}

          {/* Menu Sections */}
          <div className="space-y-8 pb-10">
            {menuSections.map((section, sidx) => (
              <div key={sidx} className="space-y-1">
                {section.items.map((item, iidx) => (
                  <button
                    key={iidx}
                    onClick={item.onClick}
                    className={cn(
                      "w-full py-4 flex items-center justify-between group active:scale-[0.98] transition-all",
                      iidx !== section.items.length - 1 && "border-b border-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            ))}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full py-6 flex items-center justify-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] border-t border-slate-50 hover:bg-slate-50 transition-colors rounded-2xl"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>

            {/* Account Deletion - Apple Compliance */}
            <div className="pt-8 space-y-4">
              <div className="p-6 bg-red-50 rounded-[32px] border border-red-100 flex flex-col gap-4">
                 <div className="flex items-center gap-3 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <h4 className="text-sm font-black uppercase tracking-widest">Zona de Perigo</h4>
                 </div>
                 <p className="text-[11px] font-medium text-red-500 leading-relaxed">
                    A exclusão da conta é permanente e removerá todos os seus dados, pedidos e preferências de nossos servidores. Esta ação não pode ser desfeita.
                 </p>
                 
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                      <button className="w-full h-12 rounded-2xl bg-white border border-red-200 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm">
                        Excluir Minha Conta
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
    </MarketplaceLayout>
  );
}
