Vân Tiên Ký 1.2.0 là game tu tiên chữ tiếng Việt cho web, Windows và Android. Game có 20 cảnh giới với 3 giai đoạn, tam giới, trang bị, ba lô, NPC, tông môn, nhiệm vụ, quái thường, tinh anh và boss ẩn. App PC và Android có sẵn game để chơi ngoại tuyến.

### Tải và mở game

- **Windows 10/11 64-bit:** tải `van-tien-ky-pc-windows.zip`, giải nén toàn bộ, mở `VanTienKy-win32-x64/VanTienKy.exe`. Không cần cài Node.js. Giữ các DLL và thư mục đi kèm EXE.
- **Android 7.0 trở lên:** tải và mở `van-tien-ky-android.apk`. Đây là APK ký bằng khóa phát triển, chưa phát hành Google Play.
- **Web và máy chủ:** tải `van-tien-ky-web-server.zip`, giải nén, cài Node.js 24, chạy `npm ci --omit=dev` và `npm start` tại thư mục chứa `package.json`. Web và server đã build sẵn. Gói máy chủ có APK; tải thêm ZIP Windows vào `release/` nếu muốn phục vụ tải PC.
- `SHA256SUMS.txt` chứa SHA-256 của ba gói tải.

### Đồng bộ

Đăng nhập cùng tài khoản trên web, PC và Android. Đồng bộ qua Internet cần máy chủ HTTPS và thư mục dữ liệu SQLite bền vững. Trong app, nhập địa chỉ HTTPS của website tại **Tài khoản & đồng bộ**. Khi chưa có máy chủ, vẫn chơi và lưu trên thiết bị. Nếu các bản lưu khác nhau, chọn bản trên tài khoản hoặc trên thiết bị.

Kho GitHub và bản phát hành này chưa tạo website chơi trực tuyến công khai. Không mở trực tiếp `index.html` từ ZIP; xem README để triển khai Node/Docker.

### Kiểm tra và giới hạn

78 kiểm tra logic/API và 22 kiểm tra trình duyệt đã đạt. App Electron đã được kiểm tra trên Linux, gồm lưu tiến độ, xuất JSON và đồng bộ hai chiều với web. Gói Windows và APK đã build; APK đã xác minh chữ ký. Chưa chạy trực tiếp trên Windows hoặc điện thoại Android thật. Bản Windows chưa có chứng thư ký ứng dụng; chưa có tự cập nhật.
