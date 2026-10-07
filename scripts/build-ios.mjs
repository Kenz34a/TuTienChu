import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

if (process.platform !== 'darwin') {
  console.error(
    'Native iOS builds require macOS and Xcode 26+. On Windows/Linux use npm run ios:sync to prepare the project, or the GitHub Build iOS workflow.',
  );
  process.exit(1);
}
const target = process.argv[2] || 'simulator';
if (!['simulator', 'device'].includes(target)) {
  console.error('Usage: npm run ios:build -- simulator|device');
  process.exit(1);
}
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const version = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
if (
  version.error ||
  version.status !== 0 ||
  Number(/Xcode (\d+)/.exec(version.stdout)?.[1] || 0) < 26
) {
  console.error(
    'Select Xcode 26+ with xcode-select, accept its license and install iOS platform support.',
  );
  process.exit(1);
}
run('npm', ['run', 'ios:sync']);
mkdirSync('release', { recursive: true });
const args = [
  '-project',
  'ios/App/App.xcodeproj',
  '-scheme',
  'App',
  '-configuration',
  target === 'simulator' ? 'Debug' : 'Release',
  '-destination',
  target === 'simulator' ? 'generic/platform=iOS Simulator' : 'generic/platform=iOS',
  '-derivedDataPath',
  'ios/DerivedData',
  '-clonedSourcePackagesDirPath',
  'ios/SourcePackages',
  'CODE_SIGNING_ALLOWED=NO',
];
if (target === 'simulator') run('xcodebuild', [...args, 'build']);
else {
  run('xcodebuild', [
    ...args,
    '-archivePath',
    'release/VanTienKy-ios-unsigned.xcarchive',
    'archive',
  ]);
  const staging = mkdtempSync(join(tmpdir(), 'van-tien-ios-'));
  const ipa = resolve('release/van-tien-ky-ios-unsigned.ipa');
  try {
    const payload = join(staging, 'Payload');
    mkdirSync(payload);
    cpSync(
      'release/VanTienKy-ios-unsigned.xcarchive/Products/Applications/App.app',
      join(payload, 'App.app'),
      { recursive: true, verbatimSymlinks: true },
    );
    run('ditto', ['-c', '-k', '--keepParent', payload, ipa]);
    const digest = createHash('sha256').update(readFileSync(ipa)).digest('hex');
    writeFileSync('release/ios-SHA256SUMS.txt', `${digest}  van-tien-ky-ios-unsigned.ipa\n`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
console.log(
  target === 'simulator'
    ? 'Simulator app: ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app. This build runs in the simulator, not on a physical iPhone.'
    : 'Unsigned iPhone IPA: release/van-tien-ky-ios-unsigned.ipa. Sign with your own Apple account before installation (for example Sideloadly on Windows or Xcode on Mac). Device archive: release/VanTienKy-ios-unsigned.xcarchive. This is not an App Store/TestFlight release.',
);
