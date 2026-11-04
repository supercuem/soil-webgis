# Soil WebGIS — bản demo công khai

Đây là **bản minh họa giao diện** của Soil Atlas Đồng Nai để xem qua GitHub Pages. Sáu điểm, tất cả kết quả đo, sáu vùng thổ nhưỡng và 54 thửa địa chính hiển thị trên bản đồ đều được **tạo giả lập** trong `scripts/generate-demo-data.mjs`. Chúng không phải dữ liệu nghiên cứu và không phản ánh chất lượng đất thực tế.

Dữ liệu khảo sát thật, tọa độ lấy mẫu, API PostgreSQL và tài khoản người dùng không nằm trong repository này. Mô hình AI dự đoán chưa được xây dựng.

Mở `index.html` qua web server tĩnh để xem. Đường phố OpenStreetMap luôn làm nền; bật/tắt độc lập Địa chính (minh họa) và Thổ nhưỡng (minh họa) ở góc trên bản đồ, kể cả bật đồng thời. Bấm đa giác để xem nhãn giả lập. Bản đồ nền OpenStreetMap cần Internet. Có thể tạo lại dữ liệu minh họa bằng `node scripts/generate-demo-data.mjs`.
