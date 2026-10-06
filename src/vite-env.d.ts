/// <reference types="vite/client" />

interface Window {
  vanTienDesktop?: {
    platform: 'pc';
    exportSave(raw: string): Promise<{ saved: boolean; error?: string }>;
  };
}
