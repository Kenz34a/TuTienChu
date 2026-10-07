import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

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
else
  run('xcodebuild', [
    ...args,
    '-archivePath',
    'release/VanTienKy-ios-unsigned.xcarchive',
    'archive',
  ]);
console.log(
  target === 'simulator'
    ? 'Simulator app: ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app. This build runs in the simulator, not on a physical iPhone.'
    : 'Unsigned device archive: release/VanTienKy-ios-unsigned.xcarchive. Sign with your Apple team in Xcode before installing or distributing.',
);
