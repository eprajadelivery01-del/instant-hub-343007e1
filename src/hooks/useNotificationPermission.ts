import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook fino de UI — apenas LÊ o estado de permissão de notificação e permite
 * solicitá-la. Não registra listeners, não cria canais, não grava tokens e não
 * altera o sistema de envio existente (ver useOrderNotifications.ts).
 *
 * Plataforma nativa (Android/iOS): a fonte de verdade é o plugin já usado pelo
 * projeto para push — @capacitor-firebase/messaging.
 * Web: Notification API do navegador.
 */

export type NativePermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown';

const PREF_KEY = 'epj_order_notif';

function readPreference(): boolean {
  try {
    // Ausência de preferência = ligado por padrão quando a permissão já existe.
    const raw = localStorage.getItem(PREF_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

function writePreference(value: boolean) {
  try {
    localStorage.setItem(PREF_KEY, value ? 'true' : 'false');
  } catch {}
}

async function readNativePermission(): Promise<NativePermissionState> {
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const result = await FirebaseMessaging.checkPermissions();
    const receive = String(result?.receive ?? 'prompt');
    if (receive === 'granted') return 'granted';
    if (receive === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unknown';
  }
}

function readWebPermission(): NativePermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  const perm = Notification.permission;
  if (perm === 'granted') return 'granted';
  if (perm === 'denied') return 'denied';
  return 'prompt';
}

export function useNotificationPermission() {
  const isNative = Capacitor.isNativePlatform();
  const [permission, setPermission] = useState<NativePermissionState>(() =>
    isNative ? 'unknown' : readWebPermission()
  );
  const [preference, setPreference] = useState<boolean>(() => readPreference());
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // Leitura assíncrona e NÃO bloqueante: a tela renderiza antes disso.
    if (isNative) {
      void readNativePermission().then((state) => {
        if (mounted.current) setPermission(state);
      });
    } else {
      setPermission(readWebPermission());
    }
    return () => {
      mounted.current = false;
    };
  }, [isNative]);

  const effectiveEnabled = preference && permission === 'granted';

  /** Liga: pede permissão pelo caminho correto da plataforma. */
  const enable = useCallback(async () => {
    setLoading(true);
    try {
      let next: NativePermissionState = permission;
      if (isNative) {
        if (permission !== 'granted') {
          try {
            const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
            const res = await FirebaseMessaging.requestPermissions();
            next = res?.receive === 'granted' ? 'granted' : 'denied';
          } catch {
            next = await readNativePermission();
          }
        }
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const res = await Notification.requestPermission();
          next = res === 'granted' ? 'granted' : 'denied';
        } else {
          next = readWebPermission();
        }
      } else {
        next = 'unsupported';
      }

      if (!mounted.current) return next;
      setPermission(next);
      if (next === 'granted') {
        writePreference(true);
        setPreference(true);
      } else {
        // Permissão não concedida → chave permanece OFF, sem popup de erro.
        writePreference(false);
        setPreference(false);
      }
      return next;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [isNative, permission]);

  /**
   * Desliga: altera SOMENTE a preferência local já usada pelo app.
   * Não remove token, não cancela canais, não toca no backend.
   */
  const disable = useCallback(() => {
    writePreference(false);
    setPreference(false);
  }, []);

  return {
    isNative,
    permission,
    preference,
    effectiveEnabled,
    loading,
    enable,
    disable,
    /** true quando não há mais como pedir permissão pelo app. */
    blocked: permission === 'denied',
    unsupported: permission === 'unsupported',
  };
}
