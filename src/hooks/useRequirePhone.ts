import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useRequirePhone() {
  const { profile, refreshProfile } = useAuth();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(profile?.phone || '');
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkPhoneAndProceed = (action: () => void) => {
    const numericPhone = profile?.phone?.replace(/\D/g, '') || '';
    if (!profile?.phone || numericPhone.length < 10) {
      setPhoneInput(profile?.phone || '');
      setPendingAction(() => action);
      setShowPhoneModal(true);
      return false;
    }
    action();
    return true;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    const numericPhone = phoneInput.replace(/\D/g, '');
    if (numericPhone.length < 10) {
      toast.error('Por favor, informe um número de telefone válido com DDD.');
      return;
    }

    setIsSubmittingPhone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: phoneInput })
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshProfile();
      toast.success('Telefone salvo com sucesso!');
      setShowPhoneModal(false);
      
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar o telefone. Tente novamente.');
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  return {
    checkPhoneAndProceed,
    showPhoneModal,
    setShowPhoneModal,
    phoneInput,
    setPhoneInput,
    handlePhoneSubmit,
    isSubmittingPhone
  };
}
