# Hướng dẫn chi tiết thực hiện kiểm thử Hiệu năng (Performance Test) với JMeter

Tài liệu này hướng dẫn từng bước cách thiết lập và chạy 5 test case kiểm thử hiệu năng cho module **Đánh giá tour và Feedback** trên Apache JMeter theo như kịch bản đã báo cáo trong file Excel SQA.

---

## 1. Chuẩn bị môi trường
1. Đảm bảo Backend Server đang chạy tại `http://localhost:5000`.
2. Mở Apache JMeter bằng cách chạy file `jmeter.bat` (trên Windows) hoặc `jmeter.sh` (trên Linux/Mac) trong thư mục `bin` của JMeter đã tải về.

---

## 2. Thiết lập Test Plan và Thread Group

### 2.1. Tạo Test Plan
1. Chuột phải vào **Test Plan** ở cột bên trái -> **Add** -> **Config Element** -> **HTTP Request Defaults**.
2. Thiết lập thông số mặc định:
   - **Server Name or IP**: `localhost`
   - **Port Number**: `5000`
   - **Protocol**: `http`

3. Chuột phải vào **Test Plan** -> **Add** -> **Config Element** -> **HTTP Header Manager**.
4. Bấm **Add** ở dưới cùng để thêm Header:
   - **Name**: `Content-Type`
   - **Value**: `application/json`

### 2.2. Tạo Thread Group (Giả lập User)
1. Chuột phải vào **Test Plan** -> **Add** -> **Threads (Users)** -> **Thread Group**.
2. Đặt tên: `Thread Group - Feedback & Review`
3. Cấu hình kịch bản chịu tải (giống như trong báo cáo):
   - **Number of Threads (users)**: `20`
   - **Ramp-up period (seconds)**: `10`
   - **Loop Count**: `5`

---

## 3. Cài đặt 5 Test Case (HTTP Requests)

Dưới `Thread Group - Feedback & Review`, ta sẽ thêm 5 HTTP Request tương ứng với 5 API.
Để thêm 1 HTTP Request: Chuột phải vào **Thread Group** -> **Add** -> **Sampler** -> **HTTP Request**.

### API 1: Lấy danh sách đánh giá của tour
- **Tên Request**: `1. GET Danh sách đánh giá tour`
- **Method**: `GET`
- **Path**: `/api/reviews/tour/1`
- **Parameters (ở tab Parameters)**:
  - Tên: `page`, Giá trị: `1`
  - Tên: `limit`, Giá trị: `10`

### API 2: Gửi đánh giá tour mới
*(Yêu cầu: Cần truyền Token của User đã hoàn thành tour vào HTTP Header Manager và cần `order_id` hợp lệ)*
- **Tên Request**: `2. POST Gửi đánh giá tour mới`
- **Method**: `POST`
- **Path**: `/api/reviews`
- **Body Data** (chuyển sang tab Body Data):
  ```json
  {
    "tour_id": 3,
    "order_id": 3,
    "rating": 5,
    "text": "Tuyệt vời!"
  }
  ```

### API 3: Gửi phản hồi (Feedback) hệ thống
*(Yêu cầu: Cần truyền Token của User vào HTTP Header Manager)*
- **Tên Request**: `3. POST Gửi phản hồi hệ thống`
- **Method**: `POST`
- **Path**: `/api/feedbacks/create-feedback`
- **Body Data**:
  ```json
  {
    "title": "Lỗi UI",
    "message": "Giao diện bị lệch trên điện thoại"
  }
  ```

### API 4: Lấy danh sách feedback (Admin)
*(Yêu cầu: Cần truyền Token của Admin vào HTTP Header Manager)*
- **Tên Request**: `4. GET Lấy danh sách feedback (Admin)`
- **Method**: `GET`
- **Path**: `/api/feedbacks/get-feedback`
- **Parameters**:
  - Tên: `page`, Giá trị: `1`
  - Tên: `limit`, Giá trị: `20`

### API 5: Cập nhật trạng thái feedback (Admin)
*(Yêu cầu: Cần truyền Token của Admin vào HTTP Header Manager)*
- **Tên Request**: `5. PUT Cập nhật trạng thái feedback (Admin)`
- **Method**: `PUT`
- **Path**: `/api/feedbacks/mark-cancelled/1`
- **Body Data**: Để trống hoặc cấu hình raw body nếu cần thiết (API này không bắt buộc body theo controller).

---

## 4. Thêm Listeners để xem kết quả

Listeners là công cụ giúp ghi lại và xuất các chỉ số performance (Response Time, Throughput, Error Rate...).
Chuột phải vào **Thread Group** -> **Add** -> **Listener** và thêm các loại sau:

1. **View Results Tree**: Giúp bạn xem chi tiết từng request có thành công hay không (mã 200 OK) và dữ liệu Response trả về là gì. Dùng để debug kịch bản xem API có chạy đúng thực tế không.
2. **Summary Report**: Bảng tổng hợp thống kê quan trọng nhất. Cung cấp các số liệu đã điền vào file Excel SQA (Samples, Average, Min, Max, Std. Dev., Error %, Throughput).

---

## 5. Chạy Test và Đọc kết quả

1. Lưu Test Plan lại (File -> Save).
2. Nhấn nút **Play** (màu xanh lá) trên thanh công cụ để bắt đầu chạy kịch bản.
3. Chờ cho đến khi góc trên cùng bên phải hiển thị icon chạy xong.
4. Mở **Summary Report** để lấy các thông số:
   - **# Samples**: Tổng số request (20 users x 5 vòng = 100).
   - **Average**: Thời gian phản hồi trung bình (ms).
   - **Min / Max**: Thời gian nhanh nhất và chậm nhất.
   - **Error %**: Tỷ lệ lỗi (Nên ở mức 0%).
   - **Throughput**: Số request xử lý trên mỗi giây.
5. So sánh hoặc cập nhật các kết quả thực tế này vào file `SQA_Report_PhamVanDuc.xlsx`.
