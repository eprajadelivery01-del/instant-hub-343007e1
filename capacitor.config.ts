import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.epraja',
  appName: 'É Pra Já - Delivery',
  webDir: 'dist',
  backgroundColor: '#0D0D0D',
  android: {
    backgroundColor: '#0D0D0D',
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/messaging': {
            symlink: true,
          },
        },
      },
    },
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#FF5722",
      sound: "default",
    },
    StatusBar: {
      backgroundColor: '#FFFFFF',
      style: 'DEFAULT',
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
