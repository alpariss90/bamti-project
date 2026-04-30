import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bamti.revendeur',
  appName: 'BAM.TI REVENDEUR',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true // pour permettre a url non https de passer
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
