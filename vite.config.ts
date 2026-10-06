import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
      '/downloads': { target: 'http://127.0.0.1:3000', changeOrigin: false },
    },
  },
  test: { include: ['src/**/*.test.ts', 'server/**/*.test.ts'] },
});
