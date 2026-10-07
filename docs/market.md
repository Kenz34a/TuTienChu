# Vạn Bảo Các — mua bán giữa người chơi

Từ Đạo lộ bấm **Mở Vạn Bảo Các**, hoặc mở menu **Vạn Bảo Các**. Tính năng cần mạng và tài khoản trên cùng máy chủ; không tạo người mua giả. Đồng bộ nhân vật, xuất định và kết thúc trận chiến trước khi mua/bán.

## Đăng bán

1. Mở **Ký gửi**, chọn bảo vật từ ba lô. Bán được trang bị chưa mặc, vật phẩm, nguyên liệu Động Thiên và phù lục. Trang bị bán từng món.
2. Nhập số lượng và **giá mỗi món**, chọn loại thạch. Tiên thạch cần stage 36, thần thạch cần stage 64, như cơ chế đổi thạch của game. Phù lục cần tu vi tương ứng.
3. Để trống người nhận để đăng chợ công khai; nhập **tên tài khoản đăng nhập** của bằng hữu để gửi đơn riêng, không dùng tên nhân vật. Người nhận phải tồn tại và không bị khóa.
4. Xem tổng giá và tiền nhận sau phí rồi đăng bán. Đồ được giữ trong đơn, rời ba lô; không thể dùng lại trong lúc ký gửi.

Tối đa 20 đơn chưa đóng. Tổng giá mỗi đơn tối đa 1 tỷ thạch, số lượng tối đa 100.000. Đơn mở 7 ngày; phí 2% làm tròn xuống chỉ thu khi bán thành công.

## Mua và nhận tiền

Chọn **Chợ đạo hữu** hoặc **Đơn riêng**, mở bảo vật và xác nhận tổng giá. Mua toàn bộ đơn; không mua một phần. Cần đủ tiền và chỗ ba lô nếu là trang bị. Đồ, tiền và lịch sử được lưu cùng lúc trên máy chủ. Người bán không cần đang online; tiền cộng vào bản lưu mới nhất của họ.

Máy chủ khóa giao dịch đồng thời: hai người mua cùng đơn chỉ một người nhận đồ. Gửi lại yêu cầu đã thành công trả về kết quả cũ, không trừ/cộng tiền lần nữa. Đơn của tài khoản bị khóa tạm ngừng giao dịch.

Nếu mạng ngắt khi xác nhận, **làm mới chợ và xem Lịch sử/Đơn của tôi trước khi đăng lại một đơn mới**. Nút thử lại cùng bản nháp giữ mã yêu cầu để tránh ký gửi trùng.

## Thu hồi và hết hạn

Mở **Đơn của tôi**, chọn **Thu hồi bảo vật**, xác nhận. Không mất phí, đồ về tài khoản. Đơn hết hạn vẫn giữ đồ an toàn trong bảng ký gửi; **chủ đơn phải thu hồi**, không tự gửi trả. Nếu ba lô đầy, dọn chỗ rồi thu hồi trang bị. Đơn đã bán không thể thu hồi.

## Đồng bộ khi nhiều thiết bị cùng chơi

Kết quả giao dịch dùng bản lưu tài khoản. Mở **Tài khoản & đồng bộ → Đồng bộ ngay** để nhận tiền/đồ trên thiết bị khác. Nếu báo xung đột, xuất bản lưu dự phòng rồi **Dùng bản trên tài khoản** để giữ kết quả giao dịch. Chọn bản thiết bị cũ có thể ghi đè tài nguyên vì game vẫn hỗ trợ chơi offline.

Mọi app/web phải cập nhật 1.6 trước khi dùng linh thú/nguyên liệu/phù lục mới. Giao dịch có kiểm tra phiên bản, quyền sở hữu, số lượng và phí; game chưa có chống sửa JSON/chống gian lận toàn bộ nền kinh tế.

## Dữ liệu máy chủ

Bảng `market_listings` giữ đồ ký gửi, người bán/người nhận/người mua, giá, phí tính theo tổng, trạng thái và thời gian. Cùng cơ sở dữ liệu `users`/`saves`: Neon khi chạy Render Free, SQLite trên laptop. Sao lưu toàn bộ cơ sở dữ liệu, không chỉ bảng nhân vật. Công cụ `npm run migrate:postgres` có chuyển cả đơn/lịch sử khi nhập SQLite vào PostgreSQL mới.
