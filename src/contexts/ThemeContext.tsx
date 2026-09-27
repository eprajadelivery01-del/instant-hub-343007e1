import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Registra o plugin nativo StatusBar diretamente pela ponte do Capacitor,
// sem importar o pacote @capacitor/status-bar no bundle web. Isso evita
// falhas de build quando o pacote é reinstalado, mantendo o mesmo
// comportamento nativo (o plugin continua instalado no projeto Android/iOS).
interface StatusBarPlugin {
  setOverlaysWebView(options: { overlay: boolean }): Promise<void>;
  setStyle(options: { style: string }): Promise<void>;
  setBackgroundColor(options: { color: string }): Promise<void>;
}
const StatusBar = registerPlugin<StatusBarPlugin>('StatusBar');
const STATUS_BAR_STYLE_DARK = 'DARK'; // ícones claros (equivale a Style.Dark)

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);

    // Mantém a barra superior igual ao acabamento nativo do tema escuro com ícones claros nos dois temas.
    const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
    if (themeColorMetas.length > 0) {
      themeColorMetas.forEach(meta => meta.setAttribute('content', '#091D35'));
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', '#091D35');
      document.head.appendChild(meta);
    }

    let metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaStatusBar) {
      metaStatusBar = document.createElement('meta');
      metaStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(metaStatusBar);
    }
    metaStatusBar.setAttribute('content', 'black-translucent');

    // A cor e os ícones da barra não acompanham a troca de tema.
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        StatusBar.setStyle({ style: STATUS_BAR_STYLE_DARK }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#091D35' }).catch(() => {});
      } catch (e) {
        console.error('Error setting native status bar theme:', e);
      }
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
