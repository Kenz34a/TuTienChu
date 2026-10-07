import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'vn.vantienky.game',
  appName: 'Vân Tiên Ký',
  webDir: 'dist',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never', preferredContentMode: 'mobile', backgroundColor: '#f7f7f2' },
  server: { androidScheme: 'https', iosScheme: 'capacitor' },
};
export default config;
