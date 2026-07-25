import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Check, X } from 'lucide-react';

export function NotificationBanner() {
  const [permissionState, setPermissionState] = useState<string>('granted');
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }

    setPermissionState(Notification.permission);

    // Check localStorage if dismissed in this session
    const isDismissed = sessionStorage.getItem('epraja_notif_banner_dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);

      if (result === 'granted') {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('É Pra Já - Notificações Ativadas! 🎉', {
            body: 'Você receberá alertas de cupons exclusivos e ofertas em primeira mão.',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png'
          });
        }
      }
    } catch (e) {
      console.error('Erro ao solicitar permissão de notificação:', e);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('epraja_notif_banner_dismissed', 'true');
  };

  if (dismissed || permissionState === 'granted' || permissionState === 'unsupported') {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white p-3.5 shadow-md relative animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full shrink-0">
            <BellRing className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">
              Não perca cupons de desconto e alertas de entregas! 🎟️
            </p>
            <p className="text-xs text-white/90">
              Ative as notificações para receber códigos promocionais em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleRequestPermission}
            className="flex-1 sm:flex-none px-4 py-2 bg-white text-orange-600 font-bold text-xs rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-1.5 shadow"
          >
            <Bell className="w-3.5 h-3.5" />
            Ativar Notificações
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
