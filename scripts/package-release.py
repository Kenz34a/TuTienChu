"""Package reviewed source, built web/server and APK; never include player data/secrets."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parent.parent
release = root / 'release'
release.mkdir(exist_ok=True)
apk = release / 'van-tien-ky-android.apk'
assert apk.is_file(), 'Build the Android APK first: npm run android:build'
with zipfile.ZipFile(apk) as archive:
    for file in (root / 'dist').rglob('*'):
        if file.is_file():
            assert archive.read('assets/public/' + file.relative_to(root / 'dist').as_posix()) == file.read_bytes(), f'Stale APK asset: {file}'
files = set()
for name in ['src', 'server', 'scripts', 'public', 'tests', 'dist', 'server-build', 'android', 'ios', 'desktop', 'docs']:
    for file in (root / name).rglob('*'):
        if not file.is_file() or "__pycache__" in file.parts:
            continue
        path = file.relative_to(root)
        if name == 'desktop' and 'web' in path.parts:
            continue
        if name == 'android' and (set(path.parts) & {'build', '.gradle', 'capacitor-cordova-android-plugins'} or 'assets' in path.parts or path.name == 'local.properties'):
            continue
        if name == 'ios' and (set(path.parts) & {'build', 'DerivedData', 'SourcePackages', 'xcuserdata', 'Pods', 'public'} or path.name in {'capacitor.config.json', 'config.xml'}):
            continue
        files.add(path)
for name in ['package.json', 'package-lock.json', 'README.md', 'index.html', 'tsconfig.json', 'vite.config.ts', 'playwright.config.ts', 'capacitor.config.ts', 'Dockerfile', '.dockerignore', '.gitignore', '.env.example', '.nvmrc', '.prettierrc.json', '.prettierignore', 'render.yaml']:
    files.add(Path(name))
files.add(apk.relative_to(root))
guide = '''VÂN TIÊN KÝ 1.6 — WEB + APP PC/ANDROID/iOS + MÁY CHỦ ĐỒNG BỘ

PC WINDOWS: tải gói riêng van-tien-ky-pc-windows.zip. Giải nén toàn bộ,
mở VanTienKy-win32-x64/VanTienKy.exe. Dành cho Windows 10/11 64-bit.
Gói PC chưa ký chứng thư Windows. Chưa chạy trên Windows thật; đã kiểm tra
app Electron thực tế trong Linux. Không cần Node hay máy chủ để chơi offline.
Sao chép ZIP Windows vào release/ của máy chủ nếu muốn nút tải PC trên web.

ANDROID: mở release/van-tien-ky-android.apk trên Android 7.0 trở lên.
Đây là APK thử nghiệm ký bằng khóa phát triển, chưa phát hành Google Play.
Nếu không thể cập nhật do khác chữ ký, xuất bản lưu/đồng bộ trước khi gỡ bản cũ.
App có sẵn game, chơi được ngoại tuyến. Để đồng bộ: mở Tài khoản & đồng bộ,
nhập địa chỉ HTTPS của website game rồi dùng cùng tài khoản trên web/app.
Chưa thử cài trên thiết bị Android thật; APK đã build và xác minh chữ ký.

iPHONE/iPAD: mở website HTTPS bằng Safari, Chia sẻ -> Thêm vào màn hình chính
để dùng bản web cài miễn phí. App iOS riêng có mã Xcode trong ios/; cần Mac
và Xcode 26+ để ký/cài. Personal Team miễn phí thường hết hạn sau 7 ngày;
TestFlight/App Store cần Apple Developer có phí. Gói này không có IPA đã ký.
Đọc docs/iphone.md để cài thử và dùng cùng tài khoản trên mọi thiết bị.

WEB: không mở index.html bằng cách nhấp trực tiếp vào tệp trong ZIP.
Cài Node.js 24, giải nén, mở terminal tại thư mục chứa package.json và chạy:
  npm ci --omit=dev
  npm start
Bản web và máy chủ đã build sẵn trong dist/ và server-build/.
Máy chủ dùng cổng 3000 mặc định. Để mở trên Internet/điện thoại, triển khai
lên hosting Node/Docker, dùng Neon/PostgreSQL qua DATABASE_URL và cấu hình HTTPS khi chạy Render Free.
SQLite chỉ dùng tại máy riêng hoặc hosting có ổ đĩa bền vững DATA_DIR.
Có Dockerfile; đọc README.md để build hoặc triển khai đầy đủ.
Gói này chưa tự tạo hosting hay tên miền công khai.

DỮ LIỆU: tự lưu trên thiết bị. Đăng nhập để đồng bộ tài khoản. Máy chủ dùng
SQLite trong DATA_DIR (mặc định var/). Phải giữ và sao lưu thư mục này.
Khi hai bản khác nhau, chọn bản trên tài khoản hoặc trên thiết bị; xuất bản
lưu dự phòng trước khi chọn nếu muốn giữ cả hai. Admin có thể đổi mật khẩu; chưa có khôi phục qua email.

BẢN 1.6: Vạn Bảo Các mua bán giữa người chơi, 100 nội dung mới:
Động Thiên, linh thú, linh viên, phù lục, viễn chinh, 9 map, 12 NPC,
12 nhiệm vụ, 8 bí kíp, 6 phó bản, 5 truyền thừa mới. Xem docs/release-1.6.1.md.
Cập nhật mọi thiết bị lên 1.6 trước khi đồng bộ.

BẢN 1.5: thiền theo phút, linh khí, 27 map, bí kíp, linh căn/truyền thừa,
ba loại thạch, tự lập tông môn, phó bản, sáng/tối, thông báo và thiên bảng.
Thêm 50 danh hiệu, cẩm nang 20 cảnh giới, 3 phương thức đột phá và chat.
Thêm Hậu kỳ: 20 cảnh giới x 4 giai đoạn, 80 bậc; tự chuyển bản lưu cũ v1
sang v2, giữ đúng tu vi/tài nguyên. Cập nhật tất cả app/web cùng bản 1.5.
Sao lưu SQLite và xuất bản lưu trước khi cập nhật. Bản 1.4 không đọc được v2.
Giftcode và trang /admin: tạo tài khoản trong game rồi mở terminal thứ hai
ở thư mục này, chạy npm run admin -- grant ten_tai_khoan (cùng DATA_DIR).
Admin quản lý tiền, vật phẩm, nhân vật, tài khoản, giftcode, thông báo,
bảo trì, boss, chat, nhật ký và khôi phục bản lưu; xem docs/admin.md.
Chat/online/boss thế giới/giftcode cần cùng máy chủ; chưa có push nền.

Gói không chứa tài khoản thử nghiệm, bản lưu người chơi hay bí mật môi trường.
'''
archive_path = release / 'van-tien-ky-web-server.zip'
with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(root / path, path.as_posix())
    archive.writestr('HUONG-DAN.txt', guide)
# Refresh the earlier static web archive, with accurate limitations.
with zipfile.ZipFile(release / 'van-tien-ky-web.zip', 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for file in sorted((root / 'dist').rglob('*')):
        if file.is_file(): archive.write(file, file.relative_to(root / 'dist').as_posix())
    archive.writestr('HUONG-DAN.txt', 'Bản web tĩnh chỉ dùng để chơi cục bộ/PWA; không có máy chủ tài khoản và đồng bộ. Dùng van-tien-ky-web-server.zip để triển khai bản đầy đủ. Phải phục vụ bằng HTTP/HTTPS, không mở tệp HTML trực tiếp.\n')
checksums = ''.join(hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + file.name + '\n' for file in [apk, archive_path, release / 'van-tien-ky-pc-windows.zip'] if file.is_file())
(release / 'SHA256SUMS.txt').write_text(checksums)
print(f'Packaged {len(files)} files: {archive_path.name} ({archive_path.stat().st_size} bytes).')
