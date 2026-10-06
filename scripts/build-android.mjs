import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function run(command, args, cwd = process.cwd(), env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (existsSync('/workspace/toolchains/android-sdk') ? '/workspace/toolchains/android-sdk' : '');
if (!sdk)
  throw new Error(
    'Install Android SDK 36 + Build Tools 36.0.0 and set ANDROID_HOME; Java 21 is required.',
  );
const compiler = process.env.JAVA_HOME
  ? resolve(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac')
  : 'javac';
const javaCheck = spawnSync(compiler, ['-version'], { encoding: 'utf8' });
if (javaCheck.error || javaCheck.status !== 0)
  throw new Error(
    'A full JDK 21 is required. Set JAVA_HOME to the JDK directory; a Java runtime alone cannot build the APK.',
  );
run('npm', ['run', 'build']);
run('npx', ['cap', 'sync', 'android']);
const gradleFlags = [];
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) {
  const url = new URL(proxy);
  if (url.username || url.password)
    throw new Error(
      'Authenticated Java proxy requires local Gradle configuration; do not put credentials in build arguments.',
    );
  for (const protocol of ['http', 'https'])
    gradleFlags.push(
      `-D${protocol}.proxyHost=${url.hostname}`,
      `-D${protocol}.proxyPort=${url.port || '80'}`,
    );
  // Local development servers must remain reachable without the egress proxy.
  gradleFlags.push('-Dhttp.nonProxyHosts=localhost|127.*|[::1]');
}
const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  JAVA_OPTS: `${process.env.JAVA_OPTS || ''} ${gradleFlags.join(' ')}`,
};
run(
  process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
  [':app:assembleDebug', '--no-daemon', '--max-workers=2', '--console=plain', ...gradleFlags],
  resolve('android'),
  env,
);
mkdirSync('release', { recursive: true });
copyFileSync(
  'android/app/build/outputs/apk/debug/app-debug.apk',
  'release/van-tien-ky-android.apk',
);
run(
  resolve(sdk, 'build-tools/36.0.0', process.platform === 'win32' ? 'apksigner.bat' : 'apksigner'),
  ['verify', '--verbose', 'release/van-tien-ky-android.apk'],
);
console.log('Android APK: release/van-tien-ky-android.apk (development signature, Android 7.0+).');
