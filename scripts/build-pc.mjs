import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { packager } from '@electron/packager';

const platform = process.argv.includes('--linux') ? 'linux' : 'win32';
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
const stage = await mkdtemp(join(tmpdir(), 'van-tien-pc-'));
try {
  await cp('desktop', stage, { recursive: true });
  await cp('dist', join(stage, 'web'), { recursive: true });
  const electronVersion = JSON.parse(
    await readFile('node_modules/electron/package.json', 'utf8'),
  ).version;
  const paths = await packager({
    dir: stage,
    name: 'VanTienKy',
    executableName: 'VanTienKy',
    out: resolve('release/pc-build'),
    platform,
    arch: 'x64',
    electronVersion,
    ...(platform === 'win32'
      ? {
          icon: resolve('desktop/icon.ico'),
          appVersion: '1.5.0',
          win32metadata: {
            ProductName: 'Vân Tiên Ký',
            FileDescription: 'Game tu tiên chữ',
            CompanyName: 'Kenz34a',
            OriginalFilename: 'VanTienKy.exe',
          },
        }
      : {}),
    asar: true,
    overwrite: true,
    prune: false,
    download: {
      checksums: JSON.parse(await readFile('node_modules/electron/checksums.json', 'utf8')),
    },
  });
  const guide = `VÂN TIÊN KÝ — APP PC\n\n${platform === 'win32' ? 'Yêu cầu Windows 10/11 64-bit. Giải nén toàn bộ thư mục rồi mở VanTienKy.exe. Không chạy EXE ngay bên trong ZIP, không tách EXE khỏi các tệp đi kèm. Bản thử nghiệm chưa ký chứng thư Windows.' : 'Bản Linux x64 dùng để phát triển và kiểm thử Electron.'}\n\nGame có sẵn, chơi ngoại tuyến và tự lưu trên máy. Trong Tài khoản & đồng bộ, nhập địa chỉ HTTPS của website game rồi đăng nhập cùng tài khoản trên web/Android. Chưa có tên miền public kèm theo gói này. Xuất bản lưu trước khi thay thế dữ liệu hoặc gỡ ứng dụng.\n`;
  await writeFile(join(paths[0], 'HUONG-DAN.txt'), guide);
  if (platform === 'win32') {
    await mkdir('release', { recursive: true });
    const archive = spawnSync(
      'python3',
      [
        '-c',
        "import shutil; shutil.make_archive('release/van-tien-ky-pc-windows', 'zip', 'release/pc-build', 'VanTienKy-win32-x64')",
      ],
      { stdio: 'inherit' },
    );
    if (archive.status !== 0) process.exit(archive.status || 1);
    console.log('Windows app: release/van-tien-ky-pc-windows.zip');
  } else console.log(`Linux test app: ${paths[0]}`);
} finally {
  await rm(stage, { recursive: true, force: true });
}
