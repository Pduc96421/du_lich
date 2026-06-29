# Backend API - Hệ thống Website Bán Tour Du Lịch

Backend API cho hệ thống quản lý và bán tour du lịch, được xây dựng bằng Node.js, Express, TypeScript, MySQL và Sequelize.

## 🚀 Công nghệ sử dụng

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Typed JavaScript
- **MySQL** - Relational database
- **Sequelize** - ORM cho Node.js
- **Vite** - Build tool và dev server
- **JWT** - Authentication
- **Bcrypt** - Password hashing

## 📁 Cấu trúc thư mục

```
src/
├── config/          # Database configuration
├── models/          # Sequelize models
├── services/        # Business logic layer
├── controllers/     # Request handlers (gọi services)
├── routes/          # API routes
├── middleware/      # Custom middleware
├── utils/           # Utility functions
└── server.ts        # Entry point
```

### Kiến trúc Layered Architecture

Dự án sử dụng kiến trúc phân tầng (Layered Architecture):

```
Request → Route → Controller → Service → Model → Database
                                   ↓
                              Response
```

- **Routes**: Định nghĩa endpoints và middleware
- **Controllers**: Xử lý request/response, validation input
- **Services**: Business logic, xử lý nghiệp vụ
- **Models**: ORM models, tương tác với database
- **Middleware**: Authentication, authorization, error handling

## 📊 Database Models

### User (Người dùng)
- Quản lý thông tin người dùng
- Xác thực và phân quyền (admin/user)
- Mã hóa mật khẩu tự động

### Tour (Tour du lịch)
- Thông tin chi tiết tour
- Giá, thời gian, điểm đến
- Loại tour (trong nước/quốc tế)
- Đánh giá và lượt xem

### TourSchedule (Lịch trình tour)
- Ngày khởi hành cụ thể
- Quản lý số chỗ còn trống
- Trạng thái (available/full/cancelled)

### Booking (Đặt tour)
- Thông tin đặt tour của khách hàng
- Quản lý số lượng người (người lớn/trẻ em/trẻ sơ sinh)
- Trạng thái thanh toán và đặt tour

### Review (Đánh giá)
- Đánh giá và nhận xét về tour
- Rating từ 1-5 sao
- Cần được phê duyệt bởi admin

## 🔧 Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd tour-booking-backend
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` từ `.env.example` và cập nhật thông tin:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=webbantourdulich
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# Email Configuration (cho chức năng forgot password)
# Xem hướng dẫn chi tiết ở phần "Email OAuth Setup" bên dưới
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
EMAIL_FROM=your_email@gmail.com

# VNPay Configuration (Sandbox)
VNPAY_TMN_CODE=DUJUBNF7
VNPAY_HASH_SECRET=H5730102G9YFBOKHKU75MUQ90YY26HMC
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5000/api/v1/payment/vnpay-return
```

### 4. Thông tin thẻ Test VNPay (Sandbox)

Dùng các thông tin sau để thực hiện thanh toán thử nghiệm trên cổng VNPay:

- **Ngân hàng:** Chọn **NCB**
- **Số thẻ:** `9704198526191432198`
- **Tên chủ thẻ:** `NGUYEN VAN A`
- **Ngày phát hành:** `07/15`
- **Mật khẩu OTP:** `123456`

> Link tài liệu thẻ test đầy đủ: [Tài liệu VNPay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#danh-sach-the-test)

GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
EMAIL_FROM=your_email@gmail.com

# Upload Configuration
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

#### 📧 Email OAuth Setup (Cho chức năng Forgot Password)

Nếu bạn gặp lỗi `unauthorized_client` hoặc `Cấu hình OAuth không hợp lệ`, làm theo các bước sau:

**Bước 1: Tạo OAuth 2.0 Credentials trong Google Cloud Console**

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Chọn **Application type**: **Web application**
6. Thêm **Authorized redirect URIs**: `https://developers.google.com/oauthplayground`
7. Lưu lại **Client ID** và **Client Secret**

**Bước 2: Cấu hình OAuth Consent Screen**

1. Vào **APIs & Services** > **OAuth consent screen**
2. Chọn **User Type**: **External** (hoặc Internal nếu dùng Google Workspace)
3. Điền thông tin:
   - App name: Tên ứng dụng của bạn
   - User support email: Email hỗ trợ
   - Developer contact: Email của bạn
4. Thêm **Scopes**: `https://mail.google.com/`
5. Thêm **Test users**: Thêm email sẽ dùng để gửi email (EMAIL_FROM)

**Bước 3: Lấy Refresh Token**

1. Truy cập [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click icon ⚙️ ở góc trên bên phải
3. Check **Use your own OAuth credentials**
4. Nhập **OAuth Client ID** và **OAuth Client secret** (từ Bước 1)
5. Ở bên trái, tìm và chọn scope: `https://mail.google.com/`
6. Click **Authorize APIs**
7. Đăng nhập và cho phép quyền truy cập
8. Click **Exchange authorization code for tokens**
9. Copy **Refresh token** (đây là giá trị cho `GOOGLE_REFRESH_TOKEN`)

**Bước 4: Cập nhật file .env**

```env
GOOGLE_CLIENT_ID=your_client_id_from_step_1
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_1
GOOGLE_REFRESH_TOKEN=your_refresh_token_from_step_3
EMAIL_FROM=your_email@gmail.com  # Email đã được thêm vào Test users
```

**Lưu ý:**
- Refresh token có thể hết hạn nếu bạn revoke access hoặc thay đổi password
- Nếu refresh token hết hạn, làm lại Bước 3 để lấy token mới
- Trong development mode, nếu không cấu hình email, OTP vẫn được tạo và log ra console để test

**Troubleshooting:**

- **Lỗi `unauthorized_client`**: Kiểm tra Client ID và Client Secret có đúng không
- **Lỗi `invalid_grant`**: Refresh token đã hết hạn, cần lấy lại (Bước 3)
- **Lỗi `access_denied`**: Email chưa được thêm vào Test users trong OAuth consent screen
- **Lỗi `Invalid login: 535-5.7.8` hoặc `BadCredentials`**: 
  - Refresh token đã hết hạn → Làm lại Bước 3 để lấy token mới
  - Email (EMAIL_FROM) chưa được thêm vào Test users → Thêm vào OAuth consent screen (Bước 2)
  - OAuth consent screen chưa được cấu hình đúng → Kiểm tra lại Bước 2
  - Access token không được tạo đúng → Kiểm tra lại Client ID và Client Secret

### 4. Tạo database

Tạo database MySQL:

```sql
CREATE DATABASE webbantourdulich CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Chạy Migrations (Tạo tables)

```bash
npm run db:migrate
```

Lệnh này sẽ tạo **14 tables**: users, admins, roles, admin_roles, tours, tickets, orders, order_items, coupons, user_coupons, reviews, blog_posts, supports, chats

### 6. Chạy Seeders (Dữ liệu mẫu - Optional)

```bash
npm run db:seed
```

Seeders sẽ tạo:
- 🔐 **Admin & Employees** (mật khẩu chung: `Admin@123456`):
  - **Super Admin**: `admin@tourmanager.com`
  - **Content Manager**: `content@tourmanager.com`
  - **Guide Bắc**: `guide_north@tourmanager.com`
  - **Guide Trung**: `guide_central@tourmanager.com`
  - **Guide Nam**: `guide_south@tourmanager.com`
- 👥 **10 Users** (mật khẩu chung: `User@123456`)
- 🏖️ **5 Tours** (Đà Lạt, Nha Trang, Hạ Long, Phú Quốc, Sapa)
- 🎫 **10 Tickets** (adult/child cho mỗi tour)
- 🎟️ **4 Coupons** (SUMMER2024, NEWYEAR2025, EARLYBIRD, FIRSTTIME)
- ⭐ **5 Reviews** mẫu

### 7. Chạy server

Development mode (với hot reload):
```bash
npm run dev
```

Build production:
```bash
npm run build
npm start
```

---

## 📦 Database Migration & Seeding

### Migration Commands

```bash
# Tạo tất cả tables
npm run db:migrate

# Rollback migration cuối cùng
npm run db:migrate:undo

# Rollback tất cả migrations
npm run db:migrate:undo:all
```

### Seeder Commands

```bash
# Insert dữ liệu mẫu
npm run db:seed

# Xóa dữ liệu seeded
npm run db:seed:undo
```

### Reset Database (All-in-one)

```bash
# Xóa tất cả → Migrate lại → Seed lại
npm run db:reset
```

📖 **Chi tiết đầy đủ**: Xem file [MIGRATION.md](MIGRATION.md)

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/register` | Đăng ký tài khoản mới | Public |
| POST | `/login` | Đăng nhập | Public |
| GET | `/me` | Lấy thông tin user hiện tại | Private |
| PUT | `/profile` | Cập nhật thông tin | Private |
| PUT | `/change-password` | Đổi mật khẩu | Private |

### Tours (`/api/tours`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Lấy danh sách tours | Public |
| GET | `/featured` | Lấy tours nổi bật | Public |
| GET | `/:id` | Lấy chi tiết tour | Public |
| POST | `/` | Tạo tour mới | Admin |
| PUT | `/:id` | Cập nhật tour | Admin |
| DELETE | `/:id` | Xóa tour | Admin |

### Bookings (`/api/bookings`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Lấy tất cả bookings | Admin |
| POST | `/` | Tạo booking mới | Private |
| GET | `/my-bookings` | Lấy bookings của user | Private |
| GET | `/:id` | Lấy chi tiết booking | Private |
| PUT | `/:id/cancel` | Hủy booking | Private |

### Reviews (`/api/reviews`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/tour/:tourId` | Lấy reviews của tour | Public |
| GET | `/stats/:tourId?` | Thống kê reviews | Public |
| POST | `/` | Tạo review mới | Private |
| GET | `/my-reviews` | Lấy reviews của user | Private |
| PUT | `/:id` | Cập nhật review | Private |
| DELETE | `/:id` | Xóa review | Private |
| GET | `/` | Lấy tất cả reviews | Admin |
| PUT | `/:id/approve` | Phê duyệt review | Admin |
| PUT | `/:id/reject` | Từ chối review | Admin |

## 🔍 Query Parameters

### Tours List
- `page` - Số trang (default: 1)
- `limit` - Số items mỗi trang (default: 10)
- `search` - Tìm kiếm theo tên/điểm đến
- `tour_type` - Lọc theo loại (domestic/international)
- `destination` - Lọc theo điểm đến
- `min_price` - Giá tối thiểu
- `max_price` - Giá tối đa
- `sort` - Sắp xếp (price_asc/price_desc/rating)

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Thông báo",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Thông báo lỗi"
}
```

## 🔐 Authentication

API sử dụng JWT (JSON Web Tokens) để xác thực. Sau khi đăng nhập/đăng ký, client sẽ nhận được token.

Gửi token trong header:
```
Authorization: Bearer <token>
```

## 🛡️ Security Features

- Password hashing với bcrypt
- JWT authentication
- CORS enabled
- Helmet.js security headers
- Input validation
- SQL injection protection (Sequelize ORM)

## 📦 Dependencies chính

- `express` - Web framework
- `sequelize` - ORM
- `mysql2` - MySQL driver
- `typescript` - Type safety
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `cors` - CORS middleware
- `helmet` - Security headers
- `morgan` - HTTP logger
- `dotenv` - Environment variables

## 🔄 Database Relationships

```
User ─────< Booking
         └──< Review

Tour ─────< TourSchedule
     └────< Booking
     └────< Review

TourSchedule ───< Booking

Booking ───── Review (1-1)
```

## 💡 Features

### Core Features
- ✅ **Authentication & Authorization**: JWT-based auth với phân quyền Admin/User
- ✅ **Tour Management**: CRUD operations, search, filter, sort
- ✅ **Booking System**: Đặt tour, quản lý số chỗ tự động, hủy booking
- ✅ **Review System**: Đánh giá, rating 1-5 sao, phê duyệt review
- ✅ **Schedule Management**: Quản lý lịch trình tour, theo dõi chỗ trống

### Technical Features
- ✅ **Service Layer**: Tách biệt business logic khỏi controllers
- ✅ **Error Handling**: Centralized error handling
- ✅ **Response Standardization**: Chuẩn hóa API response format
- ✅ **Pagination**: Hỗ trợ phân trang cho tất cả list endpoints
- ✅ **Input Validation**: Validate dữ liệu đầu vào
- ✅ **Security**: Helmet, CORS, password hashing
- ✅ **Logging**: Morgan HTTP logger
- ✅ **Type Safety**: Full TypeScript support

## 🚧 TODO

- [ ] Upload images (Multer)
- [ ] Payment integration
- [ ] Email notifications
- [ ] Admin dashboard endpoints
- [ ] Statistics & reports
- [ ] Advanced search
- [ ] Caching (Redis)
- [ ] API rate limiting
- [ ] Swagger documentation
- [ ] Unit & integration tests

## 📄 License

MIT

## 👥 Author

Backend API được phát triển để phục vụ cho hệ thống website bán tour du lịch.

