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
  Bell, HelpCircle, Wallet, Trash2, X, Camera, Loader2 
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
    const toastId = toast.loading('Enviando...');
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      await supabase.storage.from('avatars').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshProfile();
      toast.success('Pronto!', { id: toastId });
    } catch (error: any) {
      toast.error('Erro', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
    if (!error) {
      toast.success('Salvo');
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  if (!user) {
    navigate('/marketplace/login');
    return null;
  }

  return (
    <MarketplaceLayout>
      <div className="max-w-7xl mx-auto bg-dashboard min-h-screen pb-32">
        <div className="px-6 pt-12 pb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              <button 
                disabled={uploading} 
                onClick={() => fileInputRef.current?.click()} 
                className="h-28 w-28 rounded-[38px] bg-white shadow-2xl flex items-center justify-center overflow-hidden shrink-0 relative border-4 border-white"
              >
                {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : <div className="text-4xl font-black text-primary/30">U</div>}
                {uploading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>}
              </button>
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1 block">Membro Premium</span>
              <h2 className="text-3xl font-black text-slate-900 leading-none mb-2">{profile?.full_name || 'Usuário'}</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-4 grid-rows-4 gap-3 h-[400px] mb-8">
            <div className="col-span-4 row-span-2 bg-white rounded-[32px] p-6 flex flex-col justify-between border border-orange-100 relative overflow-hidden group">
               <div className="relative z-10">
                  <span className="text-primary font-black italic text-xl">é pra já</span>
                  <h3 className="text-2xl font-black text-slate-900">Assine o Clube</h3>
               </div>
               <Gem className="absolute -right-4 -bottom-4 h-40 w-40 text-primary/5 -rotate-12" />
            </div>
            <div className="col-span-2 row-span-2 bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between group active:scale-95 transition-all" onClick={() => setEditing(true)}>
                <User className="h-6 w-6 text-slate-400" />
                <span className="font-black text-slate-900">Perfil</span>
            </div>
            <div className="col-span-2 row-span-1 bg-white rounded-[32px] px-6 py-4 border border-slate-100 flex items-center gap-3">
                <Bell className="h-5 w-5 text-slate-400" /><span className="font-bold">Avisos</span>
            </div>
            <div className="col-span-2 row-span-1 bg-white rounded-[32px] px-6 py-4 border border-slate-100 flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-slate-400" /><span className="font-bold">Ajuda</span>
            </div>
          </div>
          
          <div className="space-y-4">
             <Button onClick={() => signOut()} variant="ghost" className="w-full h-16 rounded-[24px] bg-red-50 text-red-500 font-bold active:scale-95 transition-all">SAIR DA CONTA</Button>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-[10px] font-black uppercase text-slate-300">Excluir conta</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[40px] border-none shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black text-center text-slate-900">Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-sm font-medium text-slate-500">Esta ação é permanente.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col gap-3">
                    <AlertDialogAction onClick={async () => { await supabase.from('profiles').delete().eq('id', user.id); await signOut(); navigate('/marketplace/login'); }} className="bg-red-500 h-14 rounded-2xl font-black text-xs uppercase shadow-xl shadow-red-500/20">Confirmar exclusão</AlertDialogAction>
                    <AlertDialogCancel className="h-14 rounded-2xl border-slate-100 font-black text-xs uppercase">Ainda não</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </div>

        <Sheet open={editing} onOpenChange={setEditing}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-[40px] border-none shadow-2xl p-0 overflow-hidden">
            <div className="h-full flex flex-col bg-white">
              <div className="p-8 pb-4 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900">Dados da conta</h3>
                 <button onClick={() => setEditing(false)} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 px-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase">Nome Completo</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-16 rounded-[24px] bg-slate-50 border-none px-6 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-16 rounded-[24px] bg-slate-50 border-none px-6 font-bold" />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full h-16 rounded-[24px] font-black bg-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">SALVAR ALTERAÇÕES</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MarketplaceLayout>
  );
}
