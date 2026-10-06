# Vân Tiên Ký

Game tu tiên chữ tiếng Việt, có **web, app PC Windows và app Android (APK) riêng**. PC dùng Electron, Android dùng Capacitor; cả hai đóng gói giao diện và cơ chế game, chơi được ngoại tuyến ngay sau khi cài. Đăng nhập cùng tài khoản để đồng bộ nhân vật, trang bị, ba lô, nhiệm vụ và trận chiến giữa PC, Android và web.

## Tải bản 1.4.0

- [App Windows 10/11 64-bit](https://github.com/Kenz34a/TuTienChu/releases/download/v1.4.0/van-tien-ky-pc-windows.zip): giải nén toàn bộ rồi mở `VanTienKy-win32-x64/VanTienKy.exe`.
- [APK Android 7.0 trở lên](https://github.com/Kenz34a/TuTienChu/releases/download/v1.4.0/van-tien-ky-android.apk).
- [Gói web và máy chủ đã build](https://github.com/Kenz34a/TuTienChu/releases/download/v1.4.0/van-tien-ky-web-server.zip).
- [Tất cả bản phát hành và hướng dẫn](https://github.com/Kenz34a/TuTienChu/releases).

Mã nguồn nằm trong kho Git; các tệp app nằm trong **Releases**, không nằm trong danh sách mã nguồn. Website chơi trực tuyến cần triển khai máy chủ riêng theo hướng dẫn bên dưới; trang GitHub này dùng để xem mã nguồn và tải app.

Để dựng lại bản phát hành trên GitHub, mở **Actions → Build Windows and Android release → Run workflow**. Tag phải khớp phiên bản trong `package.json`. Workflow kiểm tra game/API, build web, máy chủ, Windows và APK, xác minh APK/checksum rồi đưa các gói vào Releases. APK CI dùng khóa phát triển của máy build; nếu thay thế APK thử nghiệm ký bằng khóa khác, xuất bản lưu trước khi gỡ bản cũ để cài lại.

## Chạy web và máy chủ đồng bộ

Yêu cầu **Node.js 24** và npm. Cơ sở dữ liệu SQLite tích hợp trong Node, không cần dịch vụ cơ sở dữ liệu riêng.

```bash
npm ci
npm run build:all
npm start
```

Máy chủ nghe trên `0.0.0.0`, cổng **3000** mặc định, phục vụ web, API, APK và gói PC. Có thể đặt `PORT`, `DATA_DIR`, `CORS_ORIGINS` trong môi trường hosting (xem `.env.example`; không tự đọc `.env`). Bản lưu tài khoản ở `DATA_DIR/van-tien-ky.sqlite`; mặc định `var/`. Thư mục này cần ổ đĩa bền vững và sao lưu để dữ liệu không mất khi triển khai lại.

Khi phát triển, chạy máy chủ trên rồi mở thêm `npm run dev` (5173). Vite chuyển `/api` và `/downloads` về máy chủ 3000. `npm run preview` ở 4173 dùng để kiểm tra bản build. Dùng checkout sẵn có trong tác vụ cloud, không cần Git worktree.

```bash
npm test          # Cơ chế game + API tài khoản, lưu và xung đột
npm run build:all # TypeScript + web + máy chủ
npm run test:e2e  # Chromium desktop/điện thoại; tự khởi động backend và preview
```

E2E dùng `/usr/bin/chromium` nếu có, hoặc `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Nếu máy chưa có Chromium, dùng `npx playwright install chromium`. Dữ liệu thử nghiệm E2E được tách dưới `var/e2e` khi test tự khởi động máy chủ.

## Đưa website lên Internet

**Không mở `index.html` trực tiếp từ ZIP**: trình duyệt không phục vụ module, API và đường dẫn tài nguyên đúng khi mở dạng tệp. **Hosting tĩnh chỉ với `dist/` không hỗ trợ tài khoản hay đồng bộ.** Bản đầy đủ cần máy chủ Node 24 hoặc Docker và HTTPS, ở gốc tên miền.

Cách triển khai bằng Docker trên VPS/hosting hỗ trợ container:

```bash
docker build -t van-tien-ky .
docker run -d --name van-tien-ky --restart unless-stopped \
  -p 3000:3000 -v van-tien-data:/data van-tien-ky
```

Nếu môi trường build dùng proxy có CA riêng, Dockerfile hỗ trợ truyền CA bằng BuildKit secret `proxy_ca` (`docker build --secret id=proxy_ca,src=/duong-dan/ca.pem ...`); CA chỉ dùng khi cài phụ thuộc, không bị đóng gói trong image. Không tắt kiểm tra TLS.

Đặt reverse proxy có HTTPS trước cổng 3000 và trỏ tên miền về máy chủ. Kiểm tra `/api/health` trả JSON `service: van-tien-ky, ready: true`; truy cập gốc tên miền phải hiển thị game. Khi dùng reverse proxy nhiều tầng, điều chỉnh `trust proxy` theo cấu hình thực tế. Hosting Node thông thường: lệnh build `npm ci && npm run build:all`, lệnh start `npm start`, mount ổ đĩa bền vững tại đường dẫn `DATA_DIR`.

Đặt `release/van-tien-ky-android.apk` và `release/van-tien-ky-pc-windows.zip` trên máy chủ để các nút tải app hoạt động. Gói web/server ZIP chứa APK và mã nguồn PC; gói Windows ZIP tải riêng, sao chép vào `release/` trước khi triển khai nếu muốn phục vụ tải PC. Docker tự chứa các bản tải nếu có trước khi build; không cần SDK Android trên máy chủ web. Nếu đưa web và API ra hai tên miền riêng, cần cấu hình bổ sung; mặc định là chung một tên miền.

Repo có gói triển khai và APK nhưng **chưa được triển khai lên một tên miền công khai**. Cổng trong môi trường phát triển không phải đường dẫn Internet dùng trên điện thoại.

## Chơi app PC Windows

Tệp **`release/van-tien-ky-pc-windows.zip`** dành cho **Windows 10/11 64-bit**. Giải nén **toàn bộ gói**, mở thư mục `VanTienKy-win32-x64` rồi chạy **`VanTienKy.exe`**. Không chạy trực tiếp EXE trong ZIP và không tách EXE khỏi các DLL/thư mục đi kèm. Không cần cài Node.js, chạy máy chủ hoặc mở trình duyệt để chơi ngoại tuyến.

Bản PC dùng cùng game và hệ thống tài khoản với Android/web. Trong **Tài khoản & đồng bộ**, nhập URL HTTPS của website game và đăng nhập cùng tài khoản. Tiến trình cục bộ ở dữ liệu người dùng ứng dụng (`%APPDATA%/VanTienKy` trên Windows); đóng/mở app vẫn giữ tiến độ. Xuất bản lưu mở hộp thoại lưu JSON của Windows. Chưa có cơ chế tự cập nhật hoặc chứng thư ký Windows trong bản thử nghiệm này.

Để build gói Windows từ môi trường Linux này (Node.js 24.5+ và Python 3):

```bash
npm ci
npm run pc:build
```

Electron được tải từ bản phát hành chính thức với SHA-256 ghim trong gói npm. Script dùng proxy môi trường của Node, không tắt kiểm tra TLS/checksum. Gói có icon và thông tin phiên bản Windows của game; không yêu cầu Wine để đóng gói. Khi chạy app để phát triển: `npm run pc:dev`. Nếu chưa có binary Electron, chạy `node --use-env-proxy node_modules/electron/install.js` (dùng checksum chính thức từ gói).

Kiểm tra app PC thực tế: `npm run test:pc` sau build web, với backend đang chạy. Linux cần X display hoặc Xvfb (`DISPLAY=:99`); cờ `PC_TEST_NO_SANDBOX=1` chỉ dành cho smoke test trong container không hỗ trợ sandbox hệ điều hành, không đưa vào bản phát hành. Có thể tạo bản Linux kiểm thử bằng `npm run pc:build:linux`, rồi đặt `PC_TEST_EXECUTABLE` trỏ tới binary `VanTienKy` để kiểm tra đúng gói ASAR. Gói Windows được tạo và kiểm tra nội dung trên Linux; chưa chạy trên Windows thật.

## Cài app Android

Tệp **`release/van-tien-ky-android.apk`** dùng trên **Android 7.0 trở lên**. Tải APK, mở tệp và cho phép cài ứng dụng từ nguồn đã tải. Đây là bản APK ký bằng khóa phát triển, chưa phát hành Google Play. Khóa thử nghiệm của mỗi lần build GitHub Actions có thể khác nhau: nếu Android báo không thể cập nhật bản cũ, hãy **xuất bản lưu hoặc đồng bộ trước**, rồi gỡ bản cũ, cài bản mới và nhập lại/đăng nhập. Bản phát hành cửa hàng cần khóa ký riêng được giữ an toàn; không đưa khóa vào Git hoặc gửi trong chat.

Trong app: mở **Tài khoản & đồng bộ**, nhập **địa chỉ HTTPS của website game**, rồi đăng nhập hoặc tạo tài khoản. Trên web dùng cùng tài khoản. Nếu chưa có website, vẫn chơi ngoại tuyến; sau khi triển khai website, nhập địa chỉ và liên kết nhân vật. Có thể đặt sẵn địa chỉ bằng `VITE_API_URL` lúc build APK.

Để build lại app: cài **JDK 21**, **Android SDK Platform 36**, **Build Tools 36.0.0**, đặt `ANDROID_HOME` và `JAVA_HOME` trỏ tới SDK/JDK rồi chạy:

```bash
npm ci
npm run android:build
```

Script build web, đồng bộ tài nguyên Capacitor, chạy Gradle `assembleDebug`, sao chép APK vào `release/` và kiểm tra chữ ký bằng `apksigner`. Gradle wrapper ghim SHA-256 từ nguồn chính thức. Script hỗ trợ proxy HTTP/HTTPS không có thông tin đăng nhập; cấu hình proxy có xác thực tại máy build, không ghi bí mật vào repo. Icon và màn hình khởi động Android dùng bộ nhận diện của game.

Bản web vẫn có thể cài PWA trên Chrome/Edge hoặc Safari. Cache ngoại tuyến chỉ chứa tài nguyên game, không chứa API, tài khoản hoặc APK hay gói PC. App Android dùng tài nguyên đóng gói sẵn, không phụ thuộc tải website để khởi động. Xuất bản lưu trên Android dùng màn hình chia sẻ tệp của hệ thống.

## Tài khoản và đồng bộ

- Tên tài khoản gồm 3–24 chữ không dấu, số hoặc `_`; mật khẩu 10–128 ký tự. Mật khẩu được băm bằng scrypt và salt riêng; máy chủ chỉ lưu hash token. Phiên đăng nhập có hạn 30 ngày, đăng xuất thu hồi phiên thiết bị hiện tại.
- Game tự lưu trên thiết bị và kiểm tra đồng bộ mỗi 2 giây. Thiết bị đang rảnh kiểm tra bản mới trên máy chủ mỗi 15 giây; có nút **Đồng bộ ngay** trước khi chuyển thiết bị. Hồi phục thụ động và mỗi giây đếm thiền không tạo xung đột; tu vi và linh khí mới kiếm được vẫn được đồng bộ.
- Đăng nhập tài khoản đã có nhân vật luôn cho chọn dùng bản trên tài khoản hoặc bản trên thiết bị. Ghi bản lưu cần đúng số phiên bản; nếu thiết bị khác đã lưu, máy chủ trả bản mới và tạm dừng đồng bộ để bạn chọn. Không tự ghi đè bản mới bằng bản cũ.
- Khi offline, tiếp tục chơi và lưu cục bộ; khi kết nối lại, đồng bộ bản chờ, kể cả sau khi mở lại ứng dụng. Tránh chơi hai tab trên **cùng một trình duyệt** vì chúng dùng chung bộ lưu cục bộ.
- Chưa có khôi phục mật khẩu qua email. Hãy giữ mật khẩu và xuất bản lưu dự phòng. Thiên bảng xếp nhân vật thật theo tu vi, tu vi tích lũy và chiến lực; top online tính phiên hoạt động trong hai phút. Boss thế giới chia sẻ sinh lực trên máy chủ. Chưa có PvP, giao dịch giữa người chơi hay hệ thống chống gian lận.

## Hệ thống game

- **20 cảnh giới × 3 giai đoạn:** Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hóa Thần, Luyện Hư, Hợp Thể, Đại Thừa, Độ Kiếp, Chân Tiên, Huyền Tiên, Kim Tiên, Thái Ất, Đại La, Tiên Vương, Tiên Đế, Chân Thần, Thiên Thần, Thần Vương, Thần Đế. Mỗi cảnh giới có Sơ kỳ, Trung kỳ và Đỉnh phong.
- **Tam giới, 27 địa điểm (9 map mỗi giới):** Địa Giới từ Luyện Khí; Tiên Giới mở ở Chân Tiên; Thần Giới mở ở Chân Thần. Mỗi địa điểm có yêu quái, phẩm tu vi và đoạn truyện riêng.
- **Chiến đấu theo lượt:** công kích, Lưu Vân Quyết (sát thương ×2,2, hồi 3 lượt), phòng ngự (giảm 70% sát thương), uống đan và rút lui. Thắng trận nhận tu vi, linh thạch, nguyên liệu và cơ hội nhận trang bị; bại trận mất 5% linh thạch.
- **Quần thể yêu quái:** mỗi khu vực có 5 loại quái thường và 3 loại tinh anh, tổng cộng 135 quái thường + 81 tinh anh; thêm 27 đối thủ phó bản và 3 boss ẩn. 70% lượt khám phá gặp quái; trong các trận đó, 80% gặp quái thường, 20% tinh anh. Danh sách yêu quái tại mỗi map hiển thị tên, tu vi và những loài đã gặp. Tinh anh có sinh lực ×1,65, công kích ×1,3, phòng thủ ×1,4; chiến lợi phẩm ×2,2, luôn có tinh hoa, 75% cơ hội rơi trang bị và 18% rơi Cổ ngọc.
- **Bí cảnh và boss ẩn:** mỗi giới có một bí cảnh, tự phát hiện sau 5 lần xuất hành tại các khu vực thuộc giới đó. Vô Danh Cổ Động (Kim Đan Sơ kỳ) có U Minh Lang Vương; Đào Nguyên Cấm Cảnh (Kim Tiên Sơ kỳ) có Cửu U Tiên Long; Táng Thần Mật Vực (Thiên Thần Sơ kỳ) có Thôn Thiên Cổ Thần. Khiêu chiến cần 1 Cổ ngọc, 16 thể lực và ít nhất 50% sinh lực. Cổ ngọc tiêu hao ngay khi vào, không hoàn lại khi rút lui/bại trận. Boss tăng 30% công kích một lần khi còn 35% sinh lực. Phần thưởng mỗi boss chỉ nhận một lần: chiến lợi phẩm ×6, trang bị phẩm cao chắc chắn, 3 tinh hoa và 2 Tụ Linh Đan. Nếu ba lô đầy, trang bị rơi được đổi thành tinh hoa.
- **7 vị trí trang bị:** áo, mũ, quần, giày, nhẫn, găng tay, vòng cổ. **9 phẩm:** Phàm, Linh, Pháp, Bảo, Linh bảo, Đạo, Tiên, Thần, Hỗn Độn. Cường hóa đến +10; phân giải để lấy tinh hoa.
- Ba lô **120 ô** gồm 114 ô trang bị và 6 ô vật phẩm xếp chồng dành riêng cho nguyên liệu, đan dược và cổ ngọc; phần thưởng vật phẩm luôn có chỗ nhận.
- **Nhiệm vụ:** 68 nhiệm vụ: 58 nhiệm vụ chính, 3 nhiệm vụ hằng ngày và 7 cơ duyên ẩn, gồm khám phá map, phó bản, bí kíp, linh căn, truyền thừa và tự lập tông môn. Nhiệm vụ hằng ngày làm mới lúc 00:00 theo `Asia/Ho_Chi_Minh`.
- **5 chủng tộc:** Nhân, Linh, Long, Hồ và Cổ tộc, với bonus chỉ số khác nhau. Huyết mạch chỉ chọn một lần; đạo hiệu đổi được.
- **20 NPC:** hội thoại, cơ duyên và đổi vật phẩm; **9 tông môn** với gia trì riêng và 4 cấp thân phận. **Tự khai sơn lập phái** từ Trúc Cơ: đặt tên, đóng góp ngân khố, nâng đại điện/động phủ/đan phòng đến cấp 10 và chiêu mộ đệ tử NPC. Tông môn tự lập vẫn được giữ khi rời tông.
- **Luyện đan, đúc pháp khí, thương hội**, Tụ Linh Hương và nghỉ tại khách điếm. Trang bị chế tạo tăng phẩm theo tu vi. Thể lực tự hồi 2 điểm/phút, sinh lực hồi đầy trong 10 phút khi không chiến đấu; hồi phục sau khi rời game tính tối đa 8 giờ.
- **Ngồi thiền liên tục:** bấm bắt đầu/dừng; mỗi đủ 60 giây nhận 3% tu vi cần lên giai đoạn × gia trì tu luyện và linh khí. Không cộng tu vi ngay khi bấm. Giữ phần giây lẻ khi dừng hoặc mở lại; tích lũy ngoại tuyến tối đa 2 giờ. Đột phá cần tu vi, linh khí và thạch; cảnh giới tiên/thần yêu cầu tiền tệ tương ứng. Tụ Linh Hương tăng hiệu quả thiền 20% trong thời gian còn tác dụng.
- **Ba loại tiền tệ:** linh thạch, tiên thạch, thần thạch; đổi hai chiều tại thương hội, 1.000 linh = 1 tiên, 1.000 tiên = 1 thần. Quái, khám phá và nhiệm vụ ở tiên/thần giới thưởng thạch đúng giới; dùng cho bí kíp, truyền thừa và đột phá bậc cao.
- **15 bí kíp:** tham ngộ đến cấp 10, vận dụng tối đa 3 đạo pháp; tăng công, thủ, sinh lực hoặc hiệu quả thiền.
- **10 linh căn:** ngũ hành, Băng, Phong, Lôi, Thiên và Hỗn Độn. Kiểm tra một lần, tẩy luyện đến cấp 10; Hỗn Độn mở qua truyền thừa Thái Sơ. **9 truyền thừa** đòi hỏi khám phá, thiền, bí kíp hoặc vượt phó bản, nhận gia trì vĩnh viễn một lần.
- **9 phó bản:** mỗi phó bản 3 cửa chiến đấu, giữ sinh lực giữa các cửa và lưu cả trận đang đánh. Tốn 18 thể lực, cần 50% sinh lực; hồi 30 phút từ lúc vào, kể cả rút lui hoặc bại trận. Vượt đủ ba cửa nhận linh khí, trang bị và vật phẩm.
- **Cộng đồng:** thiên bảng top 100, top online và 3 boss thế giới hồi sinh mỗi giờ vào phút 00/20/40, tồn tại 15 phút. Công kích hồi 5 giây theo tài khoản; sinh lực và đóng góp giữ trong SQLite qua lần khởi động lại. Thưởng mỗi chu kỳ nhận một lần, còn nhận được trong 7 ngày. Cần kết nối cùng máy chủ và đồng bộ trước khi tham gia.
- **50 danh hiệu:** 5 phẩm Hiếm/Sử thi/Truyền thuyết/Thần thoại/Chí tôn, 6 hiệu ứng thanh vân/hỏa diễm/lôi quang/băng tinh/tinh hà/hồng mông. Mở từ cảnh giới, trừ yêu, thiền, map, bí kíp, linh căn, truyền thừa, tông môn, phó bản, tài phú và NPC/boss. Đã mở thì giữ vĩnh viễn. Chỉ gia trì của danh hiệu đang mang có hiệu lực; có thể bật/tắt chuyển động, hỗ trợ giảm chuyển động của thiết bị. Hiển thị trên nhân vật, thiên bảng và chat; lưu/đồng bộ cùng nhân vật.
- **Đột phá rõ chi phí:** bảng hiển thị tu vi, linh khí, linh thạch và thạch theo giới, chỉ rõ phần còn thiếu. Nút Đột phá cho xem lý do khi chưa đủ thay vì bị khóa xám. Cẩm nang 20 cảnh giới ghi phương pháp tu luyện trong cảnh giới và cách vượt cảnh giới; 3 đường đột phá: cơ bản, dùng 1 Tụ Linh Đan giảm 20% linh khí, hoặc 1 tinh hoa giảm 20% linh thạch. Không trừ tài nguyên khi chưa đủ điều kiện; chưa cần tiên/thần thạch ở Kim Đan.
- **Chat thế giới:** kênh Tam giới/Địa/Tiên/Thần, gửi bằng tài khoản đã đồng bộ; tên, tu vi và danh hiệu lấy từ bản lưu máy chủ. Tiên/Thần giới yêu cầu tu vi tương ứng để gửi. Mỗi tin tối đa 200 ký tự, cách nhau 3 giây; lịch sử SQLite tồn tại qua khởi động lại, tối đa 2.000 tin/3 ngày, hiển thị 100 tin gần nhất mỗi kênh. Chat cần cùng máy chủ HTTPS, chưa có ảnh/file/nhắn riêng hoặc công cụ quản trị chat.
- **Truy cập nhanh:** Bảng xếp hạng, Chat thế giới, Sổ danh hiệu và Cách đột phá ngay đầu trang Đạo lộ. Nếu chưa kết nối máy chủ, bảng cá nhân hiển thị nhân vật thiết bị và nêu rõ trạng thái; thứ hạng cộng đồng cần máy chủ.
- **Thông báo trong game:** boss hồi sinh, top online lúc vào, nhiệm vụ sẵn nhận và đủ tài nguyên đột phá; có trạng thái chưa đọc, giữ tối đa 50 tin. Hiển thị khi đang mở game; chưa có push khi đã đóng app.
- **Giao diện sáng/tối** lưu lựa chọn; tranh SVG tu sĩ, biểu tượng bí kíp/linh căn/NPC và bố cục tương thích điện thoại.
- Nhật ký 60 sự kiện, đạo thư hướng dẫn, thành tựu, xuất/nhập bản lưu và xác nhận trước khi bắt đầu lại.

## Lưu tiến trình và cấu trúc

Bản lưu thiết bị ở `localStorage` với khóa `van-tien-ky.save.v1`. Vào **Cài đặt → Xuất bản lưu** để sao lưu hoặc nhập JSON. Xóa dữ liệu trình duyệt/app sẽ xóa bản cục bộ và phiên đăng nhập; bản trên tài khoản vẫn ở máy chủ nếu ổ đĩa dữ liệu được giữ.

Bản lưu nhập vào được kiểm tra phiên bản, chỉ số, ID vật phẩm, ID trang bị, nhiệm vụ và trạng thái trận chiến. Bản lưu cũ lỗi sẽ được giữ nguyên và chặn ghi đè tự động để người chơi có thể xuất trước khi xử lý.

Bản 1.4 tương thích với bản lưu v1 trước đây, kể cả trận chiến đang diễn ra; thêm mặc định cho linh khí, thiền, linh căn, truyền thừa, bí kíp, ví và tông môn tự lập, giữ nhân vật/trang bị/nhiệm vụ cũ. Lịch sử khám phá cũ chỉ có danh sách địa điểm, nên mỗi địa điểm đã đến được tính là một lần xuất hành cho cơ chế bí cảnh mới; các chỉ số và vật phẩm cũ được giữ nguyên.

```text
src/game/          Dữ liệu và cơ chế tu tiên, kiểm tra bản lưu, kiểm thử
src/cloud/         API client, đồng bộ, giao diện tài khoản và xử lý xung đột
src/App.tsx        Các màn hình, hội thoại, chiến đấu
server/            Express, tài khoản scrypt, phiên đăng nhập, SQLite, API lưu
android/           Dự án Android riêng, Capacitor, icon và splash
desktop/           App PC Electron, giao thức nội bộ, preload và xuất bản lưu
scripts/           Build web/offline, backend, APK và PC
tests/             E2E game, ngoại tuyến và đồng bộ giữa hai thiết bị
Dockerfile         Máy chủ production phục vụ web + API + bản tải Android/PC
```
