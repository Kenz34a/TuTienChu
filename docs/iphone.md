# Chơi Vân Tiên Ký trên iPhone và iPad

Game có dự án **app iOS riêng** tại `ios/`, hỗ trợ **iOS/iPadOS 17.2 trở lên**, đóng gói sẵn game để chơi ngoại tuyến. Đăng nhập cùng tài khoản và địa chỉ máy chủ để đồng bộ với web, Windows và Android. Xuất bản lưu mở bảng chia sẻ của iOS; chọn **Lưu vào Tệp** để giữ JSON.

## Cài app iPhone riêng từ laptop Windows

[**Tải app iPhone (.ipa chưa ký)**](https://github.com/Kenz34a/TuTienChu/releases/download/v1.5.0/van-tien-ky-ios-unsigned.ipa) · [SHA-256](https://github.com/Kenz34a/TuTienChu/releases/download/v1.5.0/ios-SHA256SUMS.txt)

Đây là app iOS đóng gói sẵn game, không cần mở Safari. Tệp `.ipa` **chưa được ký bằng tài khoản Apple**, nên không thể cài bằng cách bấm vào tệp trên iPhone. Bạn có thể dùng **Sideloadly trên Windows** để ký và cài bằng Apple Account của mình; không cần Mac cho cách này.

1. Tải `.ipa` ở trên về laptop. Tải **Sideloadly** từ [trang chính thức](https://sideloadly.io/). Làm theo hướng dẫn Windows trên trang đó để cài bản iTunes/iCloud tương thích; trang hiện yêu cầu bản tải từ Apple thay vì Microsoft Store.
2. Cắm iPhone/iPad iOS 17.2+ bằng cáp, mở khóa và chọn **Tin cậy máy tính này**. Mở Sideloadly và chọn thiết bị của bạn.
3. Kéo `van-tien-ky-ios-unsigned.ipa` vào Sideloadly, chọn chế độ ký bằng **Apple ID**, nhập tài khoản của bạn trực tiếp trên máy của bạn và bấm **Start**. Xác nhận đăng nhập/2FA nếu được yêu cầu. Sideloadly là công cụ bên thứ ba; xem thông tin của họ trước khi sử dụng. Không gửi mật khẩu hay mã xác thực trong chat hoặc lên GitHub.
4. Trên iPhone vào **Cài đặt → Quyền riêng tư & bảo mật → Chế độ nhà phát triển (Developer Mode)** và bật nếu được yêu cầu. Trong **Cài đặt → Cài đặt chung → VPN & Quản lý thiết bị**, tin cậy tài khoản phát triển của bạn nếu iOS yêu cầu.
5. Mở **Vân Tiên Ký**. Để đồng bộ, vào **Tài khoản & đồng bộ**, nhập URL HTTPS Render của game và đăng nhập cùng tài khoản trên web/Windows/Android. Chơi cục bộ không cần nhập máy chủ.

Với tài khoản Apple miễn phí, app thường hết hạn sau **7 ngày**; ký/cài lại bằng cùng tài khoản và bundle ID. Sideloadly có tùy chọn tự làm mới khi máy tính kết nối được với điện thoại. Đồng bộ hoặc xuất bản lưu trước khi gỡ app; giữ nguyên bundle ID khi cập nhật. Xem [FAQ chính thức](https://sideloadly.io/faq) về giới hạn tài khoản và lỗi cài đặt.

Bản IPA được đóng gói từ archive thiết bị **arm64** đã build trên Mac của GitHub, có kiểm tra checksum, executable và tài nguyên game. Chưa thử ký/cài bằng Sideloadly trên iPhone thật; kết quả cài phụ thuộc tài khoản, thiết bị và công cụ ký. Chưa có bản TestFlight/App Store.

## Dùng miễn phí khi chỉ có laptop Windows

Dùng Safari trên iOS/iPadOS **17.2 trở lên** để các API lưu và đồng bộ hoạt động đầy đủ.

1. Triển khai website HTTPS theo [hướng dẫn Render + Neon](deploy-render-neon.md).
2. Trên iPhone mở website bằng **Safari**, đợi game tải xong một lần khi có mạng.
3. Chọn **Chia sẻ → Thêm vào màn hình chính → Thêm**. Nếu Safari hiện **Mở dưới dạng ứng dụng**, bật lựa chọn đó.
4. Mở biểu tượng **Vân Tiên Ký** trên màn hình chính, vào **Tài khoản & đồng bộ** và dùng cùng tài khoản trên web/Windows/Android.

Đây là bản web cài trên màn hình chính (PWA), có icon và cửa sổ riêng, không cần trả phí Apple Developer. Game lưu nhân vật trên thiết bị, cache tài nguyên để chơi ngoại tuyến sau lần tải đầu. Chat, boss thế giới, giftcode và đồng bộ cần mạng. Safari có thể thu hồi cache/dữ liệu khi thiết bị thiếu dung lượng hoặc xóa dữ liệu website; hãy đồng bộ và xuất bản lưu dự phòng. Safari và bản trên màn hình chính có thể có bộ lưu riêng: đăng nhập để nhận nhân vật từ máy chủ.

Render Free có thể ngủ; lần đầu mở website chờ khoảng một phút rồi thử lại. Trong bản PWA, máy chủ là website đang mở nên không cần tự nhập URL khác.

## Cài thử app iOS riêng bằng Mac

Cần **Mac chạy Xcode 26+**, Node.js 24, Apple Account và iPhone/iPad iOS 17.2+. Có thể dùng **Personal Team miễn phí** để cài thử trên thiết bị của bạn; bản ký miễn phí thường cần ký/cài lại sau **7 ngày**. Không cần đưa tài khoản Apple hay mật khẩu vào repo hoặc gửi trong chat.

```bash
git clone https://github.com/Kenz34a/TuTienChu.git
cd TuTienChu
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci
npm run ios:sync
npm run ios:open
```

Trong Xcode:

1. Vào **Settings → Accounts**, thêm Apple Account của bạn.
2. Chọn project **App → target App → Signing & Capabilities**, bật **Automatically manage signing**, chọn **Personal Team** hoặc team Apple Developer của bạn.
3. Nếu bundle ID `vn.vantienky.game` không đăng ký được cho team của bạn, đổi sang ID riêng, ví dụ `com.tenban.vantienky`. Giữ cùng ID ở các lần cập nhật để bảo toàn dữ liệu.
4. Kết nối iPhone bằng cáp, mở khóa và **Trust** Mac. Chọn iPhone làm thiết bị chạy. Bật **Developer Mode** trong **Cài đặt → Quyền riêng tư & bảo mật** trên iOS 16+ nếu được yêu cầu.
5. Bấm **Run ▶**. Nếu iPhone yêu cầu tin cậy chứng chỉ phát triển, vào **Cài đặt → Cài đặt chung → VPN & Quản lý thiết bị** và xác nhận tài khoản phát triển của bạn.

Khi mở app, vào **Tài khoản & đồng bộ**, nhập URL HTTPS Render của game (không thêm `/api`), đăng nhập cùng tài khoản và chọn nhân vật trên tài khoản. HTTPS được yêu cầu trên app iOS/Android; giữ cấu hình bảo mật mạng mặc định của iOS.

App không yêu cầu truy cập toàn bộ thư viện ảnh hay bộ nhớ. Bảng chia sẻ dùng tệp trong cache của app; nhập bản lưu bằng bộ chọn tệp. Xóa app sẽ xóa dữ liệu cục bộ: đồng bộ hoặc xuất JSON trước khi gỡ/cài lại.

## Kiểm thử build trên GitHub

[Actions → Build iOS](https://github.com/Kenz34a/TuTienChu/actions/workflows/ios.yml) chạy trên **macOS với Xcode 26.3**. Workflow build cho Simulator, cài/mở trong iPhone Simulator, chụp màn hình, build archive cho thiết bị vật lý và kiểm tra game đóng gói khớp `dist/` cùng privacy manifest.

Trong mục **Artifacts** của lần chạy thành công:

- `van-tien-ky-ios-simulator.zip`: app dành cho iPhone Simulator trên Mac.
- `van-tien-ky-ios-unsigned-archive.zip`: archive **chưa ký**, dành cho người phát triển ký bằng team Apple phù hợp.
- `van-tien-ky-ios-unsigned.ipa`: app thiết bị trong cấu trúc `Payload/App.app`, **chưa ký**; cần ký bằng tài khoản Apple trước khi cài.
- `ios-SHA256SUMS.txt`: checksum SHA-256 của IPA.
- `ios-simulator.png`: ảnh kiểm tra ứng dụng trong Simulator.

Các gói này **chưa có chữ ký để bấm cài trên iPhone**. Trên Mac có thể dùng `npm run ios:build -- simulator` hoặc `npm run ios:build -- device`; lệnh thứ hai tạo archive và IPA chưa ký. Bản cài trên thiết bị cần chữ ký/provisioning phù hợp. Các kiểm tra trình duyệt WebKit mô phỏng Safari bổ sung cho kiểm tra build, chưa thay thế thử trên iPhone thật.

Người quản lý repo có thể chạy workflow **Publish unsigned iPhone IPA**, nhập ID của lần Build iOS thành công ở đúng commit hiện tại. Workflow kiểm tra nguồn build/checksum rồi thêm IPA vào release game cùng phiên bản; không thay đổi các tệp Windows/Android đã phát hành.

## Phát hành cho nhiều người

Để phân phối app iOS riêng qua **TestFlight/App Store**, cần tư cách thành viên **Apple Developer Program** có phí (thông thường 99 USD/năm, thay đổi theo khu vực), app trong App Store Connect, chứng chỉ/provisioning và thông tin phát hành. Trong Xcode ký với team của bạn rồi **Product → Archive → Distribute App**. TestFlight cần xử lý/xét duyệt phù hợp; bản beta thường hết hạn sau 90 ngày.

Hiện chưa có link TestFlight/App Store hay IPA đã ký. Repo không chứa khóa ký, provisioning profile hoặc tài khoản Apple. Nếu muốn chơi miễn phí ngay sau khi website online, dùng cách Safari ở đầu hướng dẫn.
