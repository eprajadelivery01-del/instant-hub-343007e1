import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const isGenericCustomerName = (name?: string | null): boolean => {
  if (!name) return true;
  const s = name.trim().toLowerCase();
  return (
    s === '' ||
    s === 'cliente' ||
    s === 'cliente marketplace' ||
    s === 'consumidor' ||
    s === 'usuário' ||
    s === 'usuario' ||
    s === 'visitante' ||
    s === 'null' ||
    s === 'undefined'
  );
};

export function useRequirePhone() {
  const { user, profile, refreshProfile } = useAuth();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(() => {
    const numeric = profile?.phone?.replace(/\D/g, '') || '';
    return numeric.length >= 10 ? profile.phone : '';
  });
  const [nameInput, setNameInput] = useState(() => {
    const fromProfile = profile?.full_name?.trim() || '';
    if (!isGenericCustomerName(fromProfile)) return fromProfile;
    const fromMeta = (user?.user_metadata as any)?.full_name?.trim() || '';
    if (!isGenericCustomerName(fromMeta)) return fromMeta;
    return localStorage.getItem('@epraja_customer_name') || localStorage.getItem('epraja_customer_name') || '';
  });
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (profile?.phone) {
      const numeric = profile.phone.replace(/\D/g, '');
      if (numeric.length >= 10) {
        setPhoneInput(profile.phone);
      } else {
        setPhoneInput('');
      }
    } else {
      setPhoneInput('');
    }
  }, [profile?.phone]);

  useEffect(() => {
    if (profile?.full_name && !isGenericCustomerName(profile.full_name)) {
      setNameInput(profile.full_name.trim());
    }
  }, [profile?.full_name]);

  const checkPhoneAndProceed = (action: () => void) => {
    const numericPhone = profile?.phone?.replace(/\D/g, '') || phoneInput.replace(/\D/g, '');
    const currentName = nameInput.trim() || profile?.full_name?.trim() || '';
    const hasValidPhone = numericPhone.length >= 10;
    const hasValidName = currentName.length >= 2 && !isGenericCustomerName(currentName);

    if (!hasValidPhone || !hasValidName) {
      setPhoneInput(numericPhone.length >= 10 ? (profile?.phone || phoneInput) : '');
      setNameInput(hasValidName ? currentName : '');
      setPendingAction(() => action);
      setShowPhoneModal(true);
      return false;
    }
    action();
    return true;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const trimmedName = nameInput.trim();
    if (!trimmedName || isGenericCustomerName(trimmedName) || trimmedName.length < 2) {
      toast.error('Por favor, informe seu nome completo.');
      return;
    }

    const numericPhone = phoneInput.replace(/\D/g, '');
    if (numericPhone.length < 10) {
      toast.error('Por favor, informe um número de telefone válido com DDD.');
      return;
    }

    setIsSubmittingPhone(true);
    try {
      await Promise.allSettled([
        supabase
          .from('profiles')
          .upsert({
            id: user.id,
            user_id: user.id,
            phone: phoneInput,
            full_name: trimmedName,
            role: profile?.role || 'customer'
          }),
        supabase
          .from('customers')
          .update({ name: trimmedName, phone: phoneInput, updated_at: new Date().toISOString() })
          .or(`user_id.eq.${user.id},id.eq.${user.id}`),
        supabase
          .from('users')
          .update({ phone: phoneInput, updated_at: new Date().toISOString() })
          .eq('id', user.id)
      ]);

      try {
        localStorage.setItem('@epraja_customer_name', trimmedName);
        localStorage.setItem('epraja_customer_name', trimmedName);
        localStorage.setItem('@epraja_customer_phone', phoneInput);
        localStorage.setItem('epraja_customer_phone', phoneInput);
      } catch {}

      await refreshProfile();
      toast.success('Identificação salva com sucesso!');
      setShowPhoneModal(false);
      
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar os dados. Tente novamente.');
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
    nameInput,
    setNameInput,
    handlePhoneSubmit,
    isSubmittingPhone
  };
}
