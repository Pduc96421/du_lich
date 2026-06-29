# HƯỚNG DẪN KIỂM THỬ - NGUYỄN ĐỨC BẢO
## Chức năng: Tìm kiếm tour & Đặt tour (có coupon)

---

# Terminal 1 - Khởi động Backend
cd /home/phamduc/Documents/code/du_lich/BE
npm run dev

# Terminal 2 - Khởi động Frontend  
cd /home/phamduc/Documents/code/du_lich/fe-web-ban-tour-du-lich
npm run dev

# Terminal 3 - Chạy test (sau khi FE+BE đang chạy)
cd /home/phamduc/Documents/code/du_lich/fe-web-ban-tour-du-lich
npm run test:feedback


## 1) Bạn có cần cài thêm công cụ không?

Để kiểm thử chức năng của mình, bạn cần **3 nhóm công cụ**:

| Công cụ | Dùng để làm gì | Bắt buộc? |
|---------|---------------|-----------|
| **Trình duyệt** (Chrome / Firefox) | Chạy test thủ công (UC Test Case) | ✅ Bắt buộc |
| **Postman** | Chạy API Testing | ✅ Bắt buộc |
| **Jest / Supertest** | Chạy Unit Test (Node.js) | ✅ Bắt buộc |
| **Playwright** (hoặc Selenium) | Chạy Automation Test (E2E) | ✅ Bắt buộc |
| **JMeter** (hoặc k6) | Chạy Performance Test | ⚠️ Khuyến khích |
| **Node.js 18+, npm 9+** | Chạy dự án Backend + test | ✅ Bắt buộc |
| **MySQL 8+** | Cơ sở dữ liệu dự án | ✅ Bắt buộc |

---

## 2) Cài đặt môi trường (nếu chưa có)

### 2.1 Kiểm tra đã có gì

```powershell
node -v       # cần >= 18
npm -v        # cần >= 9
mysql --version
```

### 2.2 Cài Node.js (nếu chưa có)

Tải tại: https://nodejs.org/en (chọn LTS)

### 2.3 Cài MySQL (nếu chưa có)

Tải tại: https://dev.mysql.com/downloads/mysql/

Hoặc dùng **XAMPP** (có MySQL kèm theo): https://www.apachefriends.org/

### 2.4 Cài Postman

Tải tại: https://www.postman.com/downloads/

> Hoặc dùng Postman trên web: https://web.postman.co (không cần cài)

### 2.5 Cài Playwright (cho Automation Test)

```powershell
# Cài Playwright global hoặc trong thư mục gốc dự án
npm install -D @playwright/test
npx playwright install chromium
```

### 2.6 Cài JMeter (cho Performance Test)

Tải tại: https://jmeter.apache.org/download_jmeter.cgi

> Giải nén file `.zip` vào thư mục bất kỳ, chạy `bin/jmeter.bat` (Windows).

### 2.7 Cài Jest + Supertest (cho Unit Test)

Sau khi đã clone/giải nén dự án và vào thư mục BE:

```powershell
cd .\hethongbantourdulich\DoAnTotNghiep_D21-main\DoAnTotNghiep_D21\BE
npm install
npm install --save-dev jest supertest ts-jest @types/jest @types/supertest
```

---

## 3) Khởi động dự án để test

### Bước 1: Tạo Database

Mở MySQL Workbench hoặc terminal MySQL, chạy:

```sql
CREATE DATABASE webbantourdulich
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Sau đó import dữ liệu mẫu:

```powershell
mysql -u root -p webbantourdulich < "d:\ky2\SQA\Hệ thống Website bán tour du lịch\FILENOPCUOI\CSDL.sql"
```

### Bước 2: Tạo file `.env` trong thư mục BE

Vào thư mục: `hethongbantourdulich\DoAnTotNghiep_D21-main\DoAnTotNghiep_D21\BE`

Tạo file `.env` với nội dung:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=webbantourdulich
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD

JWT_SECRET=any_random_secret_string
JWT_REFRESH_SECRET=any_random_refresh_secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

> **Lưu ý:** Thay `YOUR_MYSQL_PASSWORD` bằng mật khẩu MySQL của bạn.

### Bước 3: Chạy Backend

```powershell
cd .\hethongbantourdulich\DoAnTotNghiep_D21-main\DoAnTotNghiep_D21\BE
npm install
npm run dev
```

Thành công khi thấy log:
```
Server đang chạy trên port 5000
Kết nối database thành công
```

### Bước 4: Chạy Frontend (mở terminal mới)

```powershell
cd .\hethongbantourdulich\DoAnTotNghiep_D21-main\FE\fe-web-ban-tour-du-lich
```

Tạo file `.env`:

```env
VITE_URL_SERVER=http://localhost:5000
VITE_BASE_API_URL=http://localhost:5000/api
```

```powershell
npm install
npm run dev
```

Truy cập: **http://localhost:5173**

---

## 4) Cách chạy từng loại test

### 4.1 UC Test Case (Test thủ công trên trình duyệt)

1. Đảm bảo Backend (port 5000) và Frontend (port 5173) đang chạy.
2. Mở Chrome/Firefox, truy cập `http://localhost:5173`.
3. Thực hiện từng bước theo cột **Steps** trong sheet `Bao - UC Test Case`.
4. So sánh kết quả thực tế với cột **Expected Output**.
5. Ghi kết quả **Pass / Fail** vào cột **Test Results**.
6. Nếu **Fail**: chụp màn hình lỗi → dán vào cột **Hình ảnh mô tả lỗi** (click vào ô, Insert → Image trong Excel, hoặc paste trực tiếp bằng Ctrl+V).
7. Ghi mô tả lỗi vào cột **Mô tả lỗi**.

> **Tip:** Dùng tài khoản test (đăng ký tài khoản mới trên web) để test đặt tour.

### 4.2 API Testing (Postman) — Điền vào sheet `Bảo - Automation Te` (phần Phụ lục API)

> **Lưu ý quan trọng:** Trong file `SQA_Report_Bao_v2.xlsx`, API Testing được gộp vào sheet **`Bảo - Automation Te`** ở phần **Phụ lục API**. Không có sheet riêng "Bao - API Testing".

1. Mở Postman.
2. Tạo Collection mới tên "Tour Website API".
3. Với mỗi API cần test:
   - Tạo request với **Method** và **Endpoint** tương ứng (VD: `GET http://localhost:5000/api/v1/tours?keyword=Da Lat`).
   - Nếu cần Authorization: vào tab **Authorization** → Type: **Bearer Token** → dán token vào.
   - Nếu có Body: vào tab **Body** → chọn **raw** → **JSON** → dán JSON body.
   - Nhấn **Send**.
4. Chụp ảnh kết quả Postman → dán vào phần Phụ lục API trong sheet `Bảo - Automation Te`.
5. Ghi **Pass / Fail** và mô tả kết quả thực tế.

> **Cách lấy token đăng nhập:**
> ```
> POST http://localhost:5000/api/auth/login
> Body: {"email": "your@email.com", "password": "yourpassword"}
> ```
> Copy `token` từ response → dùng cho các API cần auth.

> **Lưu ý về endpoint thực tế:** Kiểm tra file `BE/src/routes/` để xem đúng đường dẫn API. Route trong BE dùng prefix `/api/v1/`. VD: `/api/v1/tours`, `/api/v1/bookings`, `/api/v1/coupons`. Nếu endpoint thực tế khác với hướng dẫn, hãy điều chỉnh cho đúng.

### 4.3 Unit Test (Jest)

#### Cách 1: Tạo file test mới

Vào thư mục BE, tạo file test trong thư mục `src/__tests__/` hoặc bên cạnh file cần test:

```typescript
// src/__tests__/couponService.test.ts
import { validateCoupon } from '../services/couponService';

describe('validateCoupon', () => {
  it('should return valid for a valid coupon', async () => {
    // Mock DB hoặc dùng test DB
    const result = await validateCoupon('SALE10');
    expect(result.valid).toBe(true);
  });

  it('should return invalid for non-existent coupon', async () => {
    const result = await validateCoupon('XYZNOTEXIST');
    expect(result.valid).toBe(false);
  });
});
```

#### Cách 2: Chạy test

```powershell
# Trong thư mục BE
npx jest
# Hoặc
npm test
```

> Nếu chưa có script test trong `package.json`, thêm vào:
> ```json
> "scripts": {
>   "test": "jest --passWithNoTests"
> }
> ```

#### Điền kết quả vào sheet `Bao - Unit Test`:

- Cột **Đường dẫn file**: điền đường dẫn file test (VD: `src/__tests__/couponService.test.ts`).
- Cột **Test Results**: `Pass` nếu jest báo PASS, `Fail` nếu jest báo FAIL.
- Cột **Mã nguồn**: copy đoạn code test tương ứng dán vào.

---

### 4.4 Automation Test (Playwright E2E)

**Mục đích:** Tự động hóa luồng người dùng chính: tìm kiếm → chọn tour → đặt tour → áp coupon.

#### Cài đặt & tạo script

```powershell
# Trong thư mục gốc dự án (FE)
cd .\hethongbantourdulich\DoAnTotNghiep_D21-main\FE\fe-web-ban-tour-du-lich
npm install -D @playwright/test
npx playwright install chromium
```

Tạo file test `tests/tour-booking.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Luồng tìm kiếm & đặt tour', () => {

  test('TC-Auto-01: Tìm kiếm tour với từ khóa hợp lệ', async ({ page }) => {
    await page.goto(BASE_URL);
    // Nhập từ khóa tìm kiếm
    await page.fill('input[placeholder*="tìm kiếm"]', 'Đà Lạt');
    await page.click('button:has-text("Tìm kiếm")');
    // Kiểm tra kết quả
    await expect(page.locator('.tour-card, .tour-item').first()).toBeVisible();
    await expect(page.locator('text=Đà Lạt').first()).toBeVisible();
  });

  test('TC-Auto-02: Vào chi tiết tour và mở form đặt tour', async ({ page }) => {
    await page.goto(BASE_URL + '/tours');
    // Click vào tour đầu tiên
    await page.locator('.tour-card a, .tour-item a').first().click();
    // Kiểm tra trang chi tiết
    await expect(page.locator('text=đặt tour, button:has-text("Đặt tour")')).toBeVisible();
    // Nhấn nút đặt tour
    await page.click('button:has-text("Đặt tour")');
    // Kiểm tra form đặt tour hiển thị
    await expect(page.locator('input[name="fullName"], input[placeholder*="họ tên"]')).toBeVisible();
  });

  test('TC-Auto-03: Đặt tour thành công với coupon SALE10', async ({ page }) => {
    // Đăng nhập trước
    await page.goto(BASE_URL + '/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    // Vào tour và đặt
    await page.goto(BASE_URL + '/tours/1');
    await page.click('button:has-text("Đặt tour")');

    // Điền form
    await page.fill('input[name="fullName"]', 'Nguyễn Văn Test');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '0987654321');
    await page.fill('input[name="quantity"]', '2');
    // Nhập coupon
    await page.fill('input[name="couponCode"], input[placeholder*="mã giảm"]', 'SALE10');
    await page.click('button:has-text("Áp dụng")');
    // Kiểm tra giảm giá hiển thị
    await expect(page.locator('text=10%, text=Giảm')).toBeVisible();
    // Xác nhận đặt
    await page.click('button:has-text("Xác nhận")');
    // Kiểm tra booking thành công
    await expect(page.locator('text=thành công, text=đơn hàng')).toBeVisible();
  });

  test('TC-Auto-04: Nhập coupon hết hạn - hiển thị lỗi', async ({ page }) => {
    await page.goto(BASE_URL + '/tours/1');
    await page.click('button:has-text("Đặt tour")');
    // Nhập coupon hết hạn
    await page.fill('input[name="couponCode"]', 'OLDCODE');
    await page.click('button:has-text("Áp dụng")');
    // Kiểm tra thông báo lỗi
    await expect(page.locator('text=hết hạn, text=không hợp lệ')).toBeVisible();
  });
});
```

#### Chạy Automation Test

```powershell
# Chạy tất cả test
npx playwright test

# Chạy 1 file cụ thể
npx playwright test tests/tour-booking.spec.ts

# Chạy có hiển thị trình duyệt (headed mode)
npx playwright test --headed

# Xuất báo cáo HTML
npx playwright test --reporter=html
npx playwright show-report
```

#### Điền kết quả vào sheet `Bảo - Automation Te`

- Chụp ảnh màn hình **test runner** (passed/failed) → dán vào sheet.
- Dán đoạn script vào phần **IV. Phân tích kịch bản**.
- Ghi tổng số test pass/fail, ngày chạy, phiên bản Playwright.

---

### 4.5 Performance Test (JMeter)

**Mục đích:** Đo thời gian phản hồi API dưới tải nhiều người dùng.

#### API cần test (prefix `/api/v1/`):

| API | Method | Mục đích |
|-----|--------|----------|
| `/api/v1/tours?keyword=Đà Lạt` | GET | Tìm kiếm tour |
| `/api/v1/tours/1` | GET | Chi tiết tour |
| `/api/v1/bookings` | POST | Tạo đơn hàng |
| `/api/v1/coupons/validate` | POST | Validate coupon |

#### Các bước thực hiện với JMeter:

**Bước 1: Tạo Test Plan mới**
- Mở JMeter → File → New
- Đổi tên Test Plan: "Tour Website Performance Test"

**Bước 2: Thêm Thread Group (mô phỏng người dùng)**
- Chuột phải Test Plan → Add → Threads → Thread Group
- Cấu hình:
  - Number of Threads: `20` (20 users)
  - Ramp-up period: `10` (tăng dần trong 10 giây)
  - Loop Count: `5` (mỗi user gọi 5 lần)

**Bước 3: Thêm HTTP Request Defaults**
- Chuột phải Thread Group → Add → Config Element → HTTP Request Defaults
- Server Name: `localhost`
- Port: `5000`

**Bước 4: Thêm HTTP Header Manager (cho token)**
- Chuột phải Thread Group → Add → Config Element → HTTP Header Manager
- Thêm header: `Authorization: Bearer <token_lấy_từ_Postman>`

**Bước 5: Thêm các HTTP Request**
- Thêm Sampler → HTTP Request cho từng API:

| Request | Method | Path |
|---------|--------|------|
| Search Tours | GET | `/api/v1/tours?keyword=Đà Lạt` |
| Tour Detail | GET | `/api/v1/tours/1` |
| Validate Coupon | POST | `/api/v1/coupons/validate` + Body: `{"code":"SALE10"}` |
| Create Booking | POST | `/api/v1/bookings` + Body (xem bên dưới) |

Body cho Create Booking (chọn Body Data tab):
```json
{
  "tour_id": 1,
  "full_name": "JMeter Test",
  "email": "test@test.com",
  "phone": "0987654321",
  "quantity": 1,
  "start_date": "2026-07-01"
}
```

**Bước 6: Thêm Listeners (xem kết quả)**
- Chuột phải Thread Group → Add → Listener:
  - **Aggregate Report** (bảng tổng hợp: Avg, Min, Max, 90% pct, Error %)
  - **View Results Tree** (xem chi tiết từng request)
  - **Summary Report**

**Bước 7: Chạy test**
- Nhấn nút **Start** (màu xanh) hoặc Ctrl+R
- Quan sát kết quả trong Aggregate Report

#### Chỉ tiêu đánh giá:

| Chỉ số | Mục tiêu |
|--------|----------|
| Average Response Time | < 2000ms (2 giây) |
| 90% Percentile (p90) | < 3000ms |
| Error Rate | < 1% |
| Throughput | > 10 req/sec |

#### Điền kết quả vào sheet `Bảo - Performance T`

- Chụp ảnh **Aggregate Report** → dán vào sheet.
- Điền: số thread, ramp-up, loop, kết quả p95/p90, error %, nhận xét.

---

```
1. Cài đặt môi trường (mục 2)
2. Khởi động dự án (mục 3)
3. Test thủ công UC Test Case → điền sheet "Bảo - UC Test Case"
4. Viết và chạy Unit Test (Jest) → điền sheet "Bảo - Unit Test"
5. Test API (Postman) + Automation (Playwright/Selenium) → điền sheet "Bảo - Automation Te"
6. Test hiệu năng (JMeter/k6) → điền sheet "Bảo - Performance T"
7. Review SRS + Code → điền sheet "Bảo - Review"
8. Tổng hợp kết quả → điền sheet "Bảo - Đánh giá kết quả"
```

---

## 6) Hướng dẫn điền file `SQA_Report_Bao_v2.xlsx`

### Quy ước ô ★ (nền vàng / có đánh dấu ★)

Các ô có ký hiệu **★** là các ô **bạn cần tự điền** sau khi chạy test thực tế. Nội dung không có ★ là gợi ý, có thể sửa cho đúng thực tế.

| Loại nội dung | Cách điền |
|--------------|-----------|
| **Text** | Xóa `★ ...`, gõ nội dung thực tế |
| **Tích (✓ / x)** | Xóa `★ ...`, gõ chữ `x` vào cột Có/Không/N/A |
| **Ảnh chụp màn hình** | Click vào ô → Insert → Pictures → chọn ảnh. Hoặc Ctrl+V nếu đã copy ảnh |
| **Pass / Fail** | Xóa `★ Pass / Fail`, gõ `Pass` hoặc `Fail` |
| **Số** | Xóa `★ ...`, gõ số thực tế |

### Danh sách sheet cần điền

| Sheet | Nội dung | Công cụ |
|-------|----------|---------|
| `Bảo - UC Test Case` | 54 test case: Search (18) + Book (18) + Coupon (18) | Chrome, Firefox |
| `Bảo - Unit Test` | Unit test backend: tourService, couponService, bookingService | Jest + Supertest |
| `Bảo - Automation Te` | Kịch bản E2E (Playwright) + Phụ lục API (Postman) | Playwright + Postman |
| `Bảo - Performance T` | Test hiệu năng API (search, booking, coupon) | JMeter hoặc k6 |
| `Bảo - Review` | Review SRS (theo form Hoàng Mạnh Dũng) | Word + VS Code |
| `Bảo - Đánh giá kết quả` | Tổng hợp Pass/Fail, đánh giá, đề xuất | Tổng hợp từ các sheet trên |

### Lưu ý quan trọng

- **Tổng số test case** (Total/Passed/Failed/Not Run): điền vào hàng 4-7 trong sheet `Bảo - UC Test Case` sau khi chạy xong tất cả test.
- **Ảnh chụp màn hình**: bắt buộc với các test case, chèn vào cột **Hình ảnh mô tả** (cột F). Có thể dùng Insert → Pictures hoặc Ctrl+V.
- **Endpoint API thực tế**: Kiểm tra code BE (`src/routes/`) để xác nhận route. Prefix mặc định: `/api/v1/`.
- **Tên hàm / file Unit Test**: Điền đúng tên file và hàm trong code dự án thực tế.
- **Ngày thực hiện**: Điền ngày thực tế vào các ô ★ ngày trong từng sheet.
- **Man-hour**: Ước lượng số giờ làm việc cho từng hoạt động (tham khảo: UC ~8h, Unit Test ~4h, Automation ~4h, Performance ~2h, Review ~6h).

---

## 7) Lỗi thường gặp khi test

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| Frontend không load được | Backend chưa chạy | Chạy `npm run dev` trong thư mục BE trước |
| API trả về 500 | Lỗi kết nối DB hoặc lỗi code | Kiểm tra `.env`, kiểm tra MySQL đang chạy |
| API trả về 401 | Chưa có token hoặc token hết hạn | Đăng nhập lại để lấy token mới |
| `EADDRINUSE: 5000` | Đã có BE đang chạy cổng 5000 | Chỉ giữ 1 terminal BE, không chạy trùng |
| PowerShell chặn script | Chính sách bảo mật | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| Jest không tìm thấy module | Thiếu config jest | Thêm `jest.config.ts` hoặc config trong `package.json` |
| MySQL import lỗi encoding | Charset không đúng | Đảm bảo DB tạo với `utf8mb4` |

---

## 8) Kiểm tra coupon có trong DB không

Sau khi import `CSDL.sql`, kiểm tra bảng coupon:

```sql
USE webbantourdulich;
SELECT * FROM coupons LIMIT 10;
```

Nếu chưa có coupon, tạo mẫu để test:

```sql
INSERT INTO coupons (code, discount_percent, expiry_date, max_uses, used_count, is_active)
VALUES
  ('SALE10', 10, '2027-12-31', 100, 0, 1),
  ('SALE20', 20, '2027-12-31', 50, 0, 1),
  ('OLDCODE', 10, '2020-01-01', 100, 0, 1);  -- coupon het han de test
```

> **Lưu ý:** Cấu trúc bảng coupon có thể khác tùy code thực tế. Kiểm tra `CSDL.sql` hoặc code BE (`src/models/`) để xác nhận tên cột đúng.

---

*Cập nhật: 07/06/2026 | Người lập: Nguyễn Đức Bảo | File báo cáo: `SQA_Report_Bao_v2.xlsx`*
