import { resolve } from 'node:path';
import { createApp } from './app';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
if (process.env.REQUIRE_POSTGRES === '1' && !process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required on this hosting configuration.');
if (!!process.env.BOOTSTRAP_ADMIN_USERNAME !== !!process.env.BOOTSTRAP_ADMIN_PASSWORD)
  throw new Error('Set both admin bootstrap fields, or remove both.');
const { app, close } = await createApp({
  databaseURL: process.env.DATABASE_URL,
  databaseSchema: process.env.DATABASE_SCHEMA,
  bootstrapAdmin:
    process.env.BOOTSTRAP_ADMIN_USERNAME && process.env.BOOTSTRAP_ADMIN_PASSWORD
      ? {
          username: process.env.BOOTSTRAP_ADMIN_USERNAME,
          password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
        }
      : undefined,
  databasePath: resolve(process.env.DATA_DIR || 'var', 'van-tien-ky.sqlite'),
  staticDir: 'dist',
  apkPath: 'release/van-tien-ky-android.apk',
  pcPath: 'release/van-tien-ky-pc-windows.zip',
  appReleaseTag: process.env.APP_RELEASE_TAG,
  allowedOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
});
const server = app.listen(port, '0.0.0.0', () =>
  console.log(`Vân Tiên Ký web + sync server listening on port ${port}`),
);
function stop() {
  server.close(async () => {
    await close();
    process.exit(0);
  });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
