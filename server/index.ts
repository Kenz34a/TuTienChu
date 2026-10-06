import { resolve } from 'node:path';
import { createApp } from './app';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const { app, close } = createApp({
  databasePath: resolve(process.env.DATA_DIR || 'var', 'van-tien-ky.sqlite'),
  staticDir: 'dist',
  apkPath: 'release/van-tien-ky-android.apk',
  pcPath: 'release/van-tien-ky-pc-windows.zip',
  allowedOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
});
const server = app.listen(port, '0.0.0.0', () =>
  console.log(`Vân Tiên Ký web + sync server listening on port ${port}`),
);
function stop() {
  server.close(() => {
    close();
    process.exit(0);
  });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
