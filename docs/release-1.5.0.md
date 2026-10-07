Bản **1.5.0** cho web, Windows và Android.

- **Hậu kỳ ở cả 20 cảnh giới:** Sơ kỳ → Trung kỳ → Hậu kỳ → Đỉnh phong, tổng 80 bậc. Cập nhật cách đột phá, nội dung map/quái/nhiệm vụ, bảng xếp hạng và chat. Tự chuyển bản lưu cũ sang v2, giữ đúng cảnh giới Sơ/Trung/Đỉnh, tu vi, tài nguyên và trận chiến.
- **Giftcode tài khoản:** nhập tại Quà tặng & giftcode hoặc nút Nhập giftcode trên Đạo lộ. Quà gồm linh/tiên/thần thạch, linh khí, vật phẩm và trang bị; nhận một lần/tài khoản, lịch sử dùng chung web/PC/Android. Có tu vi tối thiểu, thời hạn, giới hạn tổng lượt. Quà và lượt nhận cùng giao dịch, không mất lượt khi ba lô đầy.
- **Trang admin riêng `/admin`:** tìm/sửa toàn bộ nhân vật, cộng tiền/vật phẩm/trang bị, quản lý quyền và khóa tài khoản, đổi mật khẩu, thu hồi phiên; tạo/bật/tắt giftcode và xem người nhận. Có thông báo máy chủ, bảo trì, điều khiển boss thế giới, xóa chat và nhật ký với khôi phục nhân vật. Các thao tác được kiểm tra quyền trên máy chủ, kiểm tra phiên bản bản lưu và ghi nhật ký.

**Cấp admin lần đầu:** chạy máy chủ và tạo tài khoản trong game, rồi mở terminal thứ hai tại thư mục chứa `package.json`:

```bash
npm run admin -- grant ten_tai_khoan
```

Dùng cùng `DATA_DIR` nếu đã cấu hình riêng. Đăng nhập `/admin` bằng tài khoản đó; khi thử trên laptop: `http://localhost:3000/admin`. Không có tài khoản/mật khẩu admin mặc định. Xem `docs/admin.md` trong gói web/server.

**Nâng cấp:** sao lưu SQLite và xuất JSON trước khi cập nhật. Cập nhật cả máy chủ, web và hai app lên 1.5; bản 1.4 không đọc được định dạng v2. Nếu admin chỉnh nhân vật đang được chơi và xuất hiện xung đột đồng bộ, chọn bản trên tài khoản để nhận thay đổi.

**Windows:** giải nén toàn bộ ZIP, mở `VanTienKy-win32-x64/VanTienKy.exe` (Windows 10/11 x64). **Android:** cài APK (Android 7.0+); khóa ký phát triển có thể khác bản trước, hãy xuất bản lưu/đồng bộ trước khi gỡ nếu không cài đè được. Các app chơi ngoại tuyến; chưa chạy trên thiết bị Windows/Android thật, chưa ký chứng thư Windows hoặc phát hành Google Play.

**Web:** gói web/server đã build; cài Node.js 24, chạy `npm ci --omit=dev`, `npm start` trong thư mục giải nén. Cộng đồng/giftcode cần cùng máy chủ, ổ đĩa dữ liệu bền vững và HTTPS khi dùng app. Repo chưa có website công khai. Thông báo hiện khi đang mở game; chưa có push nền. Game chưa có chống gian lận.
