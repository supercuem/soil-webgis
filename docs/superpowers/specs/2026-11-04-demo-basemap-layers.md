# Hai chế độ bản đồ minh họa

Trang GitHub Pages công khai giữ Đường phố OpenStreetMap làm nền và cho bật/tắt độc lập hai lớp phủ Địa chính, Thổ nhưỡng. Hai lớp mới dùng hình học được tạo hoàn toàn giả lập quanh sáu điểm DEMO hiện có. Ranh thửa có mã tờ/thửa minh họa; vùng thổ nhưỡng có nhóm đất minh họa. Người xem bấm vào đa giác để biết đó là dữ liệu giả lập. Điểm mẫu và các bộ lọc hiện có tiếp tục hoạt động khi bật riêng hoặc đồng thời các lớp.

Nguồn địa chính và thổ nhưỡng thật trong thư mục dự án riêng không được đọc khi tạo bản công khai. Trang không công bố chủ sử dụng đất, địa chỉ, tọa độ khảo sát, hoặc kết quả phân tích thật. Thổ nhưỡng tô màu nhẹ dưới ranh thửa, và điểm mẫu nằm trên cùng để luôn bấm được.

## Cách triển khai

Giữ Leaflet và bộ dữ liệu JSON tĩnh hiện có. Bổ sung GeoJSON thửa giả lập từ cùng script tạo dữ liệu demo; mở rộng lớp đất demo lên sáu vùng. Cách này ít phụ thuộc và phù hợp GitHub Pages. Một cách khác là dùng dịch vụ thửa ngoài, nhưng chưa có nguồn được phép dùng và sẽ làm trang phụ thuộc dịch vụ đó.
