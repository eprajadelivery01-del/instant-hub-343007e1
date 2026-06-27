import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.epraja.appFma',
  appName: 'É Pra Já - Cliente',
  webDir: 'dist',
  backgroundColor: '#0D0D0D',
  android: {
    backgroundColor: '#0D0D0D',
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#0D0D0D',
      style: 'DARK',
      overlaysWebView: false,
    },
    SplashScreen: {
      backgroundColor: '#0D0D0D',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchAutoHide: true,
      launchShowDuration: 1500,
    },
  },
};

export default config;
