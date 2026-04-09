// v3.0.2 - Restauracao de Marca e Localizacao Profissional
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { 
  LogOut, MapPin, User, ChevronRight, Gem, 
  Bell, HelpCircle, Wallet, Trash2, X, Camera, Loader2,
  Sparkles, Star, Gift, Shield, Ticket, Share2, 
  MessageCircle, Settings, Phone, Mail, Award, Heart, Bike
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
    } catch (error: any) {
      toast.error('Falha no upload', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ 
      full_name: fullName, 
      phone: phone 
    }).eq('id', user.id);
    
    if (!error) {
      toast.success('Perfil atualizado com sucesso!');
      await refreshProfile();
      setEditing(false);
    } else {
      toast.error('Erro ao salvar alterações');
    }
    setSaving(false);
  };

  if (!user) {
    navigate('/marketplace/login');
    return null;
  }

  return (
    <MarketplaceLayout>
      <div className="max-w-7xl mx-auto bg-[#fafafa] min-h-screen pb-40">
        <div className="px-6 pt-16 pb-12">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6 group">
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              <button 
                disabled={uploading} 
                onClick={() => fileInputRef.current?.click()} 
                className="h-32 w-32 rounded-[40px] bg-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 relative border-4 border-white ring-1 ring-slate-100 ring-inset hover:scale-105 transition-all duration-500"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-4xl font-black text-primary/20">{profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}</div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   {uploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <Camera className="h-8 w-8 text-white" />}
                </div>
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                 <Sparkles className="h-3 w-3 text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Membro É Pra Já</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">{profile?.full_name?.split(' ')[0] || 'Seja bem-vindo'}</h2>
              <p className="text-slate-400 font-bold text-sm">{user.email}</p>
            </div>
          </div>
        </div>
          
        <div className="px-6 grid grid-cols-4 auto-rows-[120px] gap-4 mb-12">
          
          <div className="col-span-4 lg:col-span-2 row-span-2 bg-slate-900 rounded-[40px] p-8 flex flex-col justify-between border border-white/5 relative overflow-hidden group shadow-2xl">
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                   <div className="h-10 w-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Gem className="h-5 w-5" />
                   </div>
                   <span className="text-white/40 font-black text-[10px] uppercase tracking-[0.3em]">Clube É Pra Já</span>
                </div>
                <h3 className="text-3xl font-black text-white leading-tight tracking-tighter">Economize agora com cupons exclusivos.</h3>
             </div>
             <div className="relative z-10">
                <button className="h-12 px-8 rounded-2xl bg-white text-slate-900 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-xl active:scale-95">Ver Benefícios</button>
             </div>
             <Gem className="absolute -right-6 -bottom-6 h-48 w-48 text-white/[0.02] -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
          </div>

          <div className="col-span-2 row-span-1 bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between group cursor-pointer active:scale-95 transition-all">
              <div className="flex items-center justify-between">
                 <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500"><Star className="h-5 w-5 fill-current" /></div>
                 <span className="text-[10px] font-black text-slate-300">Resgatar Pontos</span>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-slate-400">Nível de Fidelidade</p>
                 <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[45%] bg-primary rounded-full shadow-lg shadow-primary/20" />
                 </div>
              </div>
          </div>

          <div className="col-span-1 row-span-1 bg-white rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 group cursor-pointer active:scale-95 transition-all p-4">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 transition-transform group-hover:scale-110"><Wallet className="h-5 w-5" /></div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Saldo</span>
          </div>

          <div 
             onClick={() => navigate('/marketplace/addresses')}
             className="col-span-1 row-span-1 bg-white rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 group cursor-pointer active:scale-95 transition-all p-4"
          >
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 transition-transform group-hover:scale-110"><MapPin className="h-5 w-5" /></div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Endereços</span>
          </div>

          <div className="col-span-2 row-span-1 bg-white rounded-[40px] px-8 shadow-sm border border-slate-100 flex items-center justify-between group cursor-pointer active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-[20px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors"><Bell className="h-6 w-6" /></div>
                 <div className="flex flex-col">
                    <span className="font-black text-sm text-slate-800">Notificações</span>
                    <span className="text-[10px] font-bold text-slate-400">Nenhuma novidade</span>
                 </div>
              </div>
          </div>

          <div 
             onClick={() => setEditing(true)}
             className="col-span-2 row-span-1 bg-white rounded-[40px] px-8 shadow-sm border border-slate-100 flex items-center justify-between group cursor-pointer active:scale-95 transition-all"
          >
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-[20px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors"><Settings className="h-6 w-6" /></div>
                 <div className="flex flex-col">
                    <span className="font-black text-sm text-slate-800">Meus Dados</span>
                    <span className="text-[10px] font-bold text-slate-400">Informações pessoais</span>
                 </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-200" />
          </div>

          <div className="col-span-1 row-span-1 bg-white rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 group cursor-pointer active:scale-95 transition-all p-4">
              <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors"><HelpCircle className="h-5 w-5" /></div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Ajuda</span>
          </div>

          <div className="col-span-1 row-span-1 bg-white rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 group cursor-pointer active:scale-95 transition-all p-4">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 transition-transform group-hover:scale-110"><Heart className="h-5 w-5 fill-current" /></div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Favoritos</span>
          </div>

          <div className="col-span-2 row-span-1 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-[40px] px-8 flex items-center justify-between group cursor-pointer active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-[20px] bg-indigo-500 flex items-center justify-center text-white"><Ticket className="h-6 w-6" /></div>
                 <div className="flex flex-col">
                    <span className="font-black text-sm text-indigo-900">Cupons</span>
                    <span className="text-[10px] font-bold text-indigo-400">8 disponíveis</span>
                 </div>
              </div>
          </div>

          <div className="col-span-4 row-span-1 bg-white border border-slate-100 rounded-[40px] px-8 flex items-center justify-between group cursor-pointer active:scale-95 transition-all relative overflow-hidden">
             <div className="flex items-center gap-6 relative z-10">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white"><Bike className="h-6 w-6" /></div>
                <div>
                  <h4 className="font-black text-slate-900">Seja um Entregador</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trabalhe conosco</p>
                </div>
             </div>
             <div className="h-10 px-6 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center relative z-10 transition-transform group-hover:scale-105 shadow-lg">Saiba Mais</div>
             <Bike className="absolute -right-4 -top-2 h-24 w-24 text-slate-50 -rotate-12" />
          </div>
        </div>
          
        <div className="px-6 space-y-4">
           <Button onClick={() => signOut()} variant="ghost" className="w-full h-20 rounded-[32px] bg-red-50 hover:bg-red-100 text-red-500 font-black border border-red-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
              <LogOut className="h-6 w-6" /> SAIR DA CONTA
           </Button>

           <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-red-400 transition-colors py-4">Excluir minha conta</button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[40px] border-none shadow-2xl p-8">
                <div className="text-center">
                    <Trash2 className="h-16 w-16 text-red-400 mx-auto mb-6" />
                    <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">Deseja excluir sua conta?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-bold text-slate-400 mt-2">Esta ação é permanente e não pode ser desfeita.</AlertDialogDescription>
                  <AlertDialogFooter className="flex-col sm:flex-col gap-4 mt-10">
                    <AlertDialogAction onClick={async () => { await supabase.from('profiles').delete().eq('id', user.id); await signOut(); navigate('/marketplace/login'); }} className="bg-red-500 h-16 rounded-[24px] font-black uppercase tracking-widest text-xs">Sim, excluir conta</AlertDialogAction>
                    <AlertDialogCancel className="h-16 rounded-[24px] border-slate-100 font-black uppercase tracking-widest text-xs">Cancelar</AlertDialogCancel>
                  </AlertDialogFooter>
                </div>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-[40px] border-none shadow-2xl p-0 overflow-hidden">
          <div className="h-full flex flex-col bg-white">
            <div className="p-10 pb-6 flex items-center justify-between border-b border-slate-50">
               <div>
                  <span className="text-[10px] font-black uppercase text-primary">Perfil do Usuário</span>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Editar Meus Dados</h3>
               </div>
               <button onClick={() => setEditing(false)} className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><X className="h-6 w-6" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-10 pt-10 pb-32 space-y-10 scrollbar-hide">
              <div className="space-y-8 bg-slate-50 p-8 rounded-[32px]">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black text-slate-400 uppercase ml-2">Nome Completo</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-16 rounded-2xl bg-white border-transparent px-6 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-slate-400 uppercase ml-2">WhatsApp</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-16 rounded-2xl bg-white border-transparent px-6 font-bold" />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full h-16 rounded-2xl font-black bg-primary text-white shadow-lg mt-4">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MarketplaceLayout>
  );
}
