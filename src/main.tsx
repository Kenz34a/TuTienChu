import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AdminPage } from './AdminPage';
import './styles.css';
import { nativeApp } from './cloud/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/') ? (
      <AdminPage />
    ) : (
      <App />
    )}
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD && !nativeApp) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      window.dispatchEvent(new CustomEvent('pwa-error'));
    });
  });
}
