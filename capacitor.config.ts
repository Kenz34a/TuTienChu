import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'vn.vantienky.game',
  appName: 'Vân Tiên Ký',
  webDir: 'dist',
  android: { allowMixedContent: false },
  server: { androidScheme: 'https' },
};
export default config;
