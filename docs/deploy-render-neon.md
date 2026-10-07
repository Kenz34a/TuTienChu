# Chạy Vân Tiên Ký online miễn phí với Render + Neon

Render chạy website và API; Neon giữ tài khoản, nhân vật, giftcode, chat và dữ liệu boss trong PostgreSQL. Web, Windows và Android dùng chung địa chỉ máy chủ. Máy chủ vẫn hỗ trợ SQLite khi chạy trên laptop, nhưng Render Free phải dùng Neon vì ổ đĩa của Render không giữ tệp qua khởi động lại.

## 1. Tạo tài khoản và cơ sở dữ liệu Neon

1. Mở [Neon](https://console.neon.tech), đăng ký bằng GitHub hoặc email, chọn **Free**.
2. Tạo project, chẳng hạn `van-tien-ky`. Chọn vùng **AWS Europe (Frankfurt)** để gần vùng Render trong cấu hình repo. Dùng database `neondb` và role mặc định.
3. Bấm **Connect**, chọn database và role, bật **Connection pooling**. Sao chép **connection string** dạng `postgresql://...@...-pooler.../neondb?sslmode=require` (có thể kèm `channel_binding=require`). Đây là `DATABASE_URL`.

Chuỗi này chứa mật khẩu cơ sở dữ liệu: chỉ dán vào biến môi trường riêng trên Render. Không đưa vào GitHub, ảnh chụp công khai hay chat. Nếu lỡ công khai, đổi mật khẩu role trong Neon và cập nhật Render.

## 2. Tạo website Render

1. Mở [Render](https://dashboard.render.com), đăng ký và kết nối tài khoản GitHub sở hữu repo.
2. Bấm [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FKenz34a%2FTuTienChu). Hoặc chọn **New → Blueprint**, chọn repo **Kenz34a/TuTienChu**, nhánh **main**. Render đọc `render.yaml`.
3. Chọn tên Blueprint và kiểm tra dịch vụ `van-tien-ky` dùng gói **Free**, tổng phí dự kiến **$0**. Không tạo thêm Render PostgreSQL hay ổ đĩa trả phí.
4. Nhập ba giá trị Render yêu cầu:

| Biến                       | Giá trị bạn nhập                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Connection string riêng của Neon ở bước 1                                                     |
| `BOOTSTRAP_ADMIN_USERNAME` | Tên admin bạn chọn: 3–24 chữ không dấu, số hoặc `_`                                           |
| `BOOTSTRAP_ADMIN_PASSWORD` | Mật khẩu admin riêng: 16–128 ký tự, nên dùng mật khẩu dài và lưu trong trình quản lý mật khẩu |

5. Bấm **Deploy/Apply** rồi đợi build và trạng thái **Live**. Mở URL HTTPS Render cấp, dạng `https://ten-dich-vu.onrender.com`.

Nếu tài khoản Render không cho tạo Blueprint Free, chọn **New → Web Service**, kết nối cùng repo/nhánh, runtime **Node**, region **Frankfurt**, instance **Free**, Build Command `npm ci --include=dev && npm run build:all`, Start Command `npm start`, Health Check Path `/api/health`. Trong Environment thêm ba biến riêng ở bảng trên và các biến cố định: `NODE_VERSION=24.19.0`, `NODE_ENV=production`, `ELECTRON_SKIP_BINARY_DOWNLOAD=1`, `REQUIRE_POSTGRES=1`, `APP_RELEASE_TAG=v1.6.1`. Kiểm tra chi phí $0 trước khi tạo.

Không cần tự đặt `PORT`; máy chủ đọc cổng Render cấp. Không cần `DATA_DIR` hay `CORS_ORIGINS` nếu phục vụ web và API cùng website. `REQUIRE_POSTGRES=1` giúp dừng deploy khi thiếu cấu hình Neon, tránh vô tình dùng SQLite dễ mất dữ liệu.

### Nếu đã tạo dịch vụ với runtime Docker

Bạn có thể giữ dịch vụ Docker hiện tại, vẫn dùng gói **Free** và Neon. Dockerfile build web/API từ mã nguồn; không cần APK, app Windows hay thư mục `release/` có sẵn trong GitHub. Thư mục này được tạo khi build. Đặt `APP_RELEASE_TAG=v1.6.1` để các nút tải Android/Windows chuyển tới GitHub Releases.

Trong **Environment**, đặt `DATABASE_URL` của Neon, `REQUIRE_POSTGRES=1`, `APP_RELEASE_TAG=v1.6.1` và cặp `BOOTSTRAP_ADMIN_USERNAME`/`BOOTSTRAP_ADMIN_PASSWORD` cho lần khởi tạo đầu tiên như bảng trên. Không chọn ổ đĩa trả phí hay dùng SQLite trên Render Free. Đặt **Health Check Path** là `/api/health`. Node.js đã có trong image nên không cần Build/Start Command của runtime Node.

Nếu log báo `COPY /app/release ... not found`, hãy chọn **Manual Deploy → Deploy latest commit** sau khi repo có bản sửa Dockerfile. Nếu lần triển khai tiếp theo lỗi ở kết nối cơ sở dữ liệu hoặc bootstrap, xem log mới và kiểm tra các biến tương ứng; lỗi thư mục `release/` xảy ra trước khi kết nối Neon.

## 3. Đăng nhập admin và chơi

Mở `https://ten-dich-vu.onrender.com/admin`, đăng nhập bằng tên và mật khẩu bootstrap vừa đặt. Tài khoản này đã được tạo trước khi website nhận kết nối công khai; không cần đăng ký lại trong game. Render Free không có terminal, nên không cần chạy lệnh cấp quyền tại Render.

Sau khi đăng nhập admin thành công, vào **Render → dịch vụ → Environment**, xóa **cả hai** biến `BOOTSTRAP_ADMIN_USERNAME` và `BOOTSTRAP_ADMIN_PASSWORD`, lưu và cho dịch vụ triển khai lại. Tài khoản/quyền đã lưu trong Neon nên vẫn còn. Giữ `DATABASE_URL`. Nếu sau này đồng bộ lại Blueprint và nó yêu cầu nhập hai biến, có thể xóa hai mục bootstrap khỏi cấu hình repo của bạn sau lần triển khai đầu tiên.

Mở trang game, đăng nhập cùng tài khoản admin hoặc tạo tài khoản người chơi khác, rồi đồng bộ nhân vật. Trong admin bạn có thể tạo giftcode, tặng tiền/trang bị, sửa tu vi, thông báo, bảo trì, boss và cấp quyền cho tài khoản khác.

Bootstrap chỉ chạy một lần trên mỗi cơ sở dữ liệu. Đổi hai biến bootstrap không đổi mật khẩu đã lưu và không cấp lại quyền đã bị thu hồi. Khi cần đổi mật khẩu, dùng trang admin bằng một admin khác đang hoạt động, hoặc công cụ quản trị trên máy tin cậy. Không có mật khẩu mặc định hay nút công khai để tự nhận quyền admin.

Trong app Windows/Android **1.6.1**, mở **Tài khoản & đồng bộ**, nhập URL HTTPS của website (không thêm `/api` hay `/admin`), đăng nhập cùng tài khoản và chọn nhân vật muốn dùng. Các nút tải app trên web chuyển tới GitHub Releases nếu máy chủ không có sẵn tệp app.

## 4. Kiểm tra đã lưu dữ liệu

- Mở `/api/health`: phải thấy `ready: true` và `storage: "postgres"`.
- Tạo người chơi, đồng bộ nhân vật, gửi một tin chat. Admin tạo giftcode rồi cho người chơi nhận thử.
- Trong Render chọn **Manual Deploy → Deploy latest commit**. Sau khi Live lại, kiểm tra nhân vật, chat và lịch sử giftcode vẫn còn. Đăng nhập app cùng tài khoản để kiểm tra đồng bộ.

Nếu deploy lỗi, xem **Render → Logs**. Kiểm tra chuỗi Neon đầy đủ, database/role đúng, project còn hoạt động và cả hai biến bootstrap đã nhập hoặc đã xóa cùng nhau. Mật khẩu bootstrap cần ít nhất 16 ký tự. Máy chủ dùng TLS có kiểm tra chứng chỉ khi kết nối Neon; không thêm `sslmode=disable` hay tắt kiểm tra TLS để chữa lỗi.

## Giới hạn gói miễn phí

Render Free ngủ sau khoảng **15 phút không có truy cập**; lần mở tiếp theo có thể mất khoảng **một phút**. Đợi trang tải rồi thử đồng bộ lại. Neon cũng tự ngủ khi không dùng và có hạn mức tài nguyên. Game vẫn chơi/lưu cục bộ trong app khi máy chủ đang ngủ; chat, bảng xếp hạng và đồng bộ cần máy chủ hoạt động. Không đảm bảo máy chủ thức liên tục 24/7 trên gói miễn phí.

Render áp dụng hạn mức giờ chạy Free theo workspace; Neon có hạn mức compute, dung lượng và lưu lượng theo gói. Xem [Render Free](https://render.com/docs/free) và [Neon Pricing](https://neon.com/pricing) để kiểm tra hạn mức hiện tại. Chọn Free ở cả hai; không bật nâng cấp trả phí nếu muốn giữ chi phí $0. Không dùng Render PostgreSQL Free thay Neon vì cơ sở dữ liệu Render Free hết hạn sau 30 ngày.

## Chuyển dữ liệu SQLite cũ (tùy chọn)

Nếu chưa có tài khoản/nhân vật máy chủ cũ, bỏ qua mục này. Bản lưu JSON trên thiết bị vẫn nhập và đồng bộ được như trước.

Muốn giữ toàn bộ tài khoản cũ, mật khẩu, quyền admin, phiên, nhân vật, chat, giftcode và boss: dừng máy chủ SQLite cũ, sao lưu `var/van-tien-ky.sqlite`, dùng **một Neon database mới còn trống** và nhập **trước khi** triển khai Render với bootstrap. Script từ chối ghi đè database đã có người chơi/dữ liệu admin.

Trong PowerShell trên laptop Windows, ở thư mục repo đã cập nhật:

```powershell
npm ci
npm run build:server
$secret = Read-Host 'Dán connection string Neon (ẩn)' -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', $secret).Password
try {
  npm run migrate:postgres -- .\var\van-tien-ky.sqlite
} finally {
  Remove-Item Env:DATABASE_URL
  Remove-Variable secret
}
```

Trên Linux/macOS, nhập chuỗi riêng vào biến môi trường trong terminal tin cậy, không ghi vào mã nguồn:

```bash
npm ci
npm run build:server
read -r -s -p 'Neon connection string: ' DATABASE_URL
export DATABASE_URL
npm run migrate:postgres -- var/van-tien-ky.sqlite
unset DATABASE_URL
```

Lệnh đọc nguồn SQLite ở chế độ chỉ đọc và nhập toàn bộ trong một giao dịch. Nếu lỗi thì dữ liệu nhập được hoàn tác; vẫn giữ bản SQLite dự phòng. Không chạy khi máy chủ đích đang phục vụ người chơi. Khi có admin cũ, bootstrap giữ nguyên admin đó; đăng nhập bằng tài khoản cũ. Nếu chưa có admin cũ, bootstrap tạo admin đầu tiên như bước 2. Dữ liệu Neon cần được sao lưu/xuất theo chính sách riêng của bạn; không phụ thuộc ổ đĩa Render.

## Kiểm thử PostgreSQL khi phát triển

Cài PostgreSQL cục bộ hoặc dùng dịch vụ PostgreSQL riêng dành cho kiểm thử, không dùng database thật của người chơi. Role kiểm thử cần quyền tạo/xóa schema. Với database kiểm thử đặt `TEST_DATABASE_URL` trong môi trường rồi chạy:

```bash
npm run build:server
npm test
```

Các kiểm thử PostgreSQL tạo schema riêng và xóa sau khi chạy. Nếu không đặt `TEST_DATABASE_URL`, phần PostgreSQL được bỏ qua, còn kiểm thử SQLite vẫn chạy. GitHub Actions cung cấp PostgreSQL 17 thật, chạy cả SQLite/PostgreSQL và 50 tình huống trình duyệt desktop/điện thoại với PostgreSQL. Không dùng `DATABASE_URL` của máy chủ thật làm `TEST_DATABASE_URL`.
