# Điều hành máy chủ Vân Tiên Ký

## Đăng nhập

Chạy máy chủ bằng Node.js 24 (`npm start`), tạo tài khoản của bạn trong game. Trong terminal thứ hai tại thư mục dự án, chạy `npm run admin -- grant ten_tai_khoan`. Mở `/admin` trên website máy chủ, đăng nhập tài khoản đó. Trên laptop chạy máy chủ: `http://localhost:3000/admin`.

Không có mật khẩu mặc định. Lệnh chỉ cấp quyền cho tài khoản đã tồn tại; không mở đăng ký admin từ trình duyệt. Nếu đặt `DATA_DIR` cho máy chủ, đặt cùng đường dẫn cho terminal chạy lệnh admin. `npm run admin -- list` xem admin; `npm run admin -- revoke ten_tai_khoan` gỡ quyền. Admin hoạt động cuối cùng được bảo vệ khỏi bị gỡ quyền hoặc khóa.

Khi chạy **Render Free + Neon**, không có terminal máy chủ. Cấu hình riêng `BOOTSTRAP_ADMIN_USERNAME` và `BOOTSTRAP_ADMIN_PASSWORD` (16–128 ký tự) tạo admin đầu tiên một lần trước khi mở website. Xóa cả hai biến sau khi đăng nhập thành công; xem [hướng dẫn Render + Neon](deploy-render-neon.md). Quyền và dữ liệu được giữ trong Neon. CLI trên máy tin cậy cũng hỗ trợ `DATABASE_URL`; không gửi chuỗi kết nối/mật khẩu trong chat hay Git.

## Điều hành người chơi

Mục Người chơi có tìm kiếm và phân trang. Chọn **Điều hành** để xem nhân vật trên máy chủ. Có thể đổi tên, chọn cảnh giới, đặt tổng tu vi/linh khí/linh thạch hoặc dùng trình chỉnh JSON cho toàn bộ nhân vật. Bản lưu phải hợp lệ: ID vật phẩm/cảnh giới/trang bị đúng, giá trị trong giới hạn, không tạo ID trang bị trùng nhau. Nút **Lưu nhân vật** xác nhận trước khi ghi.

Phần **Tặng tài nguyên** cộng vào dữ liệu hiện có: linh/tiên/thần thạch, linh khí, vật phẩm và một trang bị có vị trí/phẩm/cường hóa đã chọn. Phần thưởng tối đa 1.000.000 mỗi loại tiền/linh khí, 10.000 mỗi vật phẩm cho một thao tác. Không cấp một phần nếu vượt giới hạn hoặc hết ô trang bị.

Khóa tài khoản, đổi mật khẩu hoặc thu hồi phiên sẽ đăng xuất các phiên hiện có. Mật khẩu mới có 10–128 ký tự và không được ghi vào nhật ký. Mở khóa cho phép đăng nhập lại; các phiên đã thu hồi không được khôi phục. Quyền admin có hiệu lực ngay trên máy chủ; tài khoản đăng nhập lại để cập nhật liên kết quản trị trong game.

Nếu người chơi đang có tiến độ cục bộ khi admin sửa, đồng bộ có thể báo hai bản khác nhau. Hãy xuất bản lưu trước nếu cần giữ tiến độ cục bộ; chọn **bản trên tài khoản** để nhận sửa đổi của admin. Máy chủ dùng số phiên bản để ngăn ghi đè bản mới bằng yêu cầu cũ. Tiến trình game chạy trên thiết bị; hệ thống này chưa chống chỉnh bản lưu/gian lận.

## Tạo giftcode

Trong mục Giftcode: nhập mã gồm 3–40 chữ không dấu, số, `_` hoặc `-`; để trống để sinh mã. Chọn tên gói quà, phần thưởng, tu vi tối thiểu, giới hạn tổng lượt nhận (0 là không giới hạn), thời gian mở và hết hạn. Giờ trên biểu mẫu theo múi giờ trình duyệt; máy chủ kiểm tra bằng thời gian tuyệt đối. Không chọn ngày hết hạn trước thời gian mở.

Mỗi tài khoản nhận một mã một lần. Mã phân biệt với mã đã tạo trước đây, kể cả bị tắt; tắt/bật không xóa lịch sử hay tái cấp lượt. Người chơi cần đăng nhập và đồng bộ trước khi nhập mã ở **Quà tặng & giftcode**. Nếu ba lô đầy hoặc phần thưởng không hợp lệ, giao dịch hoàn tác cả quà lẫn lượt nhận. Quà và lịch sử tồn tại qua khởi động lại, dùng chung giữa các thiết bị kết nối cùng máy chủ.

## Thông báo, bảo trì, boss và chat

Mục Máy chủ đặt thông báo tối đa 500 ký tự và chế độ bảo trì. Người chơi có kết nối đọc thông báo khi mở game và mỗi 15 giây. Bảo trì tạm chặn lưu nhân vật, nhận giftcode, gửi chat và thao tác boss của người chơi thường; admin vẫn điều hành. Game ngoại tuyến vẫn tiếp tục; sau bảo trì người chơi đồng bộ lại. Đây là bảo trì API game, không dừng tiến trình hosting.

Mục Boss thế giới thao tác với HP/chòm chu kỳ trong cơ sở dữ liệu: hồi sinh mở chu kỳ mới trong 15 phút, hồi máu đưa boss về sinh lực tối đa trong chu kỳ hiện tại, kết liễu đưa sinh lực về 0. Đóng góp và phần thưởng vẫn theo chu kỳ; hồi máu không xóa lượt đã nhận. Lịch tự nhiên tiếp tục ở lần hồi sinh theo giờ tiếp theo.

Mục Quản lý chat hiển thị tin gần nhất và cho xóa từng tin. Dùng khóa tài khoản trong Người chơi nếu cần ngăn tài khoản tiếp tục gửi.

## Nhật ký và sao lưu

Các thay đổi được ghi với người thực hiện, thời gian, mục tiêu và nội dung. Chỉnh/tặng tài nguyên cho nhân vật lưu ảnh trước và sau; mục Nhật ký admin có **Khôi phục** để đưa về ảnh trước thao tác. Khôi phục cũng được ghi nhật ký và có thể hoàn tác. Nó khôi phục nhân vật, không xóa lịch sử nhận giftcode.

Sao lưu cơ sở dữ liệu theo lịch riêng của hosting. Với Neon dùng công cụ sao lưu/xuất PostgreSQL của bạn; với SQLite sao lưu toàn bộ tệp. Khi sao chép tệp thủ công, dừng máy chủ trước để tránh mất dữ liệu còn trong WAL. Giữ bản sao trước khi nâng cấp 1.5: máy chủ tự chuyển cảnh giới v1 sang v2 một lần, cập nhật bảng xếp hạng và tu vi trong chat. Các app/web cần cùng bản 1.5 trở lên; bản cũ không đọc được v2.
