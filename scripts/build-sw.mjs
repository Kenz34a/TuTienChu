import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Cache every bundled file. No CDN or network API is needed during play.
async function files(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const all = await Promise.all(
    entries
      .filter((e) => e.name !== 'sw.js')
      .map((e) =>
        e.isDirectory() ? files(join(dir, e.name), `${prefix}${e.name}/`) : [`/${prefix}${e.name}`],
      ),
  );
  return all.flat();
}
const assets = (await files('dist')).sort();
const hash = createHash('sha256');
for (const asset of assets) hash.update(await readFile(join('dist', asset)));
const version = `van-tien-ky-${hash.digest('hex').slice(0, 12)}`;
await writeFile(
  'dist/sw.js',
  `const CACHE = ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('van-tien-ky-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const path = new URL(event.request.url).pathname;
  if (path === '/api' || path.startsWith('/api/') || path === '/downloads' || path.startsWith('/downloads/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => response.ok ? response : caches.match('/index.html', { ignoreVary: true }).then(cached => cached || response)).catch(() => caches.match('/index.html', { ignoreVary: true })));
  } else if (ASSETS.includes(new URL(event.request.url).pathname)) {
    // Static same-origin files only. Vite sends Vary: Origin; module requests
    // have an Origin header whereas install-time cache requests do not.
    event.respondWith(caches.match(event.request, { ignoreVary: true }).then(cached => cached || fetch(event.request)));
  }
});
`,
);
console.log(`Offline cache: ${assets.length} files · ${version}`);
