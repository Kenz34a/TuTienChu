import { build } from 'esbuild';
await build({
  entryPoints: ['server/index.ts', 'server/app.ts'],
  outdir: 'server-build',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  target: 'node24',
});
console.log('Web and sync server built.');
