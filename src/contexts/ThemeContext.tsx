import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

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
      themeColorMetas.forEach(meta => meta.setAttribute('content', '#5C5C5C'));
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', '#5C5C5C');
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
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#5C5C5C' }).catch(() => {});
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
