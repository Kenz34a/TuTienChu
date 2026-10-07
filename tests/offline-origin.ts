import { createApp } from '../server/app';
import { openDatabase } from '../server/database.mjs';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

// WebKit 2359's setOffline kills even service-worker responses (Playwright
// #42775). Stop a dedicated real origin instead, without skipping assertions.
export async function offlineOrigin() {
  const url = process.env.TEST_DATABASE_URL,
    schema = 'test_' + randomUUID().replaceAll('-', '');
  const root = url ? await openDatabase({ databaseURL: url }) : undefined;
  if (root) await root.exec(`CREATE SCHEMA ${schema}`);
  const service = await createApp({
    databaseURL: url,
    databaseSchema: url ? schema : undefined,
    staticDir: 'dist',
  });
  let server: Server | undefined,
    port = 0;
  const resume = async () => {
    server = service.app.listen(port, '127.0.0.1');
    await new Promise<void>((r) => server!.once('listening', r));
    port = (server.address() as { port: number }).port;
  };
  const pause = async () => {
    if (!server?.listening) return;
    await new Promise<void>((r) => {
      server!.close(() => r());
      server!.closeAllConnections();
    });
  };
  await resume();
  return {
    base: `http://127.0.0.1:${port}`,
    pause,
    resume,
    close: async () => {
      await pause();
      await service.close();
      if (root) {
        await root.exec(`DROP SCHEMA ${schema} CASCADE`);
        await root.close();
      }
    },
  };
}
