<div align="center">
  <img src="https://via.placeholder.com/1200x300.png?text=Casa+Decor+-+N%E1%BB%99i+th%E1%BA%A5t+hi%E1%BB%87n+%C4%91%E1%BA%A1i" alt="Casa Decor Banner" />

  <h1>Casa Decor E-Commerce Platform</h1>
  
  <p><b>Hệ thống Thương Mại Điện Tử Chuyên Nghiệp Dành Cho Nội Thất & Trang Trí</b></p>

  [![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey.svg?style=for-the-badge&logo=express)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-6.x-47A248.svg?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101.svg?style=for-the-badge&logo=socket.io)](https://socket.io/)
</div>

---

## 📖 Giới thiệu (Overview)

**Casa Decor** là nền tảng thương mại điện tử chuyên cung cấp các sản phẩm trang trí nội thất cao cấp. Hệ thống được xây dựng với kiến trúc Client-Server hiện đại, đáp ứng đầy đủ các tiêu chuẩn của một website E-commerce thực thụ. Dự án bao gồm quản lý bán hàng, tương tác khách hàng theo thời gian thực (real-time), thanh toán trực tuyến, hệ thống gửi email tự động và hệ thống nghiệp vụ nội bộ phân quyền nhiều lớp (Customer - Staff - Admin).

Dự án được phát triển với tiêu chí **Tốc độ**, **Bảo mật** và **Trải nghiệm người dùng (UX/UI) tối ưu**.

---

## 🌟 Chức năng nổi bật (Key Features)

### 🛒 Dành cho Khách hàng (Customer End)
- **Tài khoản & Bảo mật:** Đăng ký, đăng nhập bảo mật với mã hóa `Bcrypt`. Hỗ trợ khôi phục mật khẩu (Reset password) tự động qua Email.
- **Trải nghiệm mua sắm:** Giao diện trực quan, lọc sản phẩm thông minh, quản lý Giỏ hàng (Cart) lưu trữ tự động và Sản phẩm yêu thích (Wishlist).
- **Thanh toán đa dạng:** Hỗ trợ thanh toán khi nhận hàng (COD) và tích hợp cổng thanh toán trực tuyến nội địa **VNPAY**.
- **Tương tác & CSKH:** Đánh giá sản phẩm (Reviews), đọc bài viết (Blogs), gửi liên hệ hỗ trợ.
- **Hỗ trợ thời gian thực:** Khách hàng có thể tạo yêu cầu hỗ trợ, đính kèm trực tiếp mã đơn hàng và chat trực tiếp với Ban quản trị qua WebSocket (`Socket.io`).
- **Email Tự động:** Tích hợp `Brevo SMTP` và `Nodemailer` gửi email xác nhận ngay sau khi đặt hàng thành công với template HTML chuyên nghiệp.

### 🛠️ Dành cho Quản trị viên (Admin Panel)
- **Quản lý Sản phẩm & Danh mục:** Thêm, sửa, xóa, tải lên hình ảnh sản phẩm. Cơ chế **Soft-delete & Hard-delete** giúp bảo vệ an toàn dữ liệu, chống xóa nhầm các sản phẩm đang kinh doanh.
- **Quản lý Đơn hàng:** Theo dõi luồng xử lý đơn hàng (Pending -> Processing -> Shipped -> Delivered -> Cancelled).
- **Marketing & CSKH:** Tạo mã giảm giá (Promotions / Coupons), quản lý Banner quảng cáo trang chủ, xử lý phản hồi từ khách hàng.
- **Quản trị Nhân sự:** Phân quyền hệ thống, quản lý tài khoản nhân viên (Staff), phân ca làm việc tự động qua thuật toán Round-robin.
- **Báo cáo & Thống kê:** Dashboard tổng quan báo cáo doanh thu, sản phẩm bán chạy, tỷ lệ chuyển đổi đơn hàng bằng biểu đồ trực quan.

### 💼 Dành cho Nhân viên bán hàng (Staff Panel)
- **Đăng nhập định danh:** Hệ thống tự động khóa đăng nhập nếu nhân viên không có trong ca làm việc hiện hành.
- **Bảng điều khiển chung (`/management`):** Sử dụng chung giao diện với Admin nhưng được phân quyền ẩn/hiện các module nhạy cảm (chỉ Admin mới thấy Doanh thu, Nhân sự).
- **Giao nhận đơn hàng:** Xử lý và chuyển trạng thái các đơn hàng được Admin phân bổ.
- **Tính lương KPI tự động:** Tính số giờ làm việc thực tế, số lượng đơn giao thành công để tự động tính lương thưởng ca trực.

---

## 💻 Công nghệ sử dụng (Tech Stack)

### Backend (Server)
- **Runtime Environment:** Node.js
- **Framework:** Express.js (RESTful API Architecture)
- **Database:** MongoDB & Mongoose ORM
- **Real-time Communication:** Socket.io (WebSocket)
- **Email Service:** Nodemailer + Brevo SMTP
- **Security:** Helmet, CORS, Express Rate Limit, Bcryptjs, JWT (JSON Web Tokens)
- **Task Scheduling:** `node-cron` (Dùng để tự động chuyển ca trực và chốt lương nhân viên mỗi ngày)

### Frontend (Client)
- **Cấu trúc:** HTML5 Semantic, CSS3
- **Logic:** Vanilla JavaScript (ES6+). *Dự án cố tình không sử dụng Framework (như React/Vue) để đạt tốc độ tải trang cực nhanh và rèn luyện kỹ năng thao tác DOM thuần.*
- **Giao diện (UI/UX):** Responsive Design (Mobile-first), CSS Flexbox/Grid, CSS Variables (Theming), hiệu ứng Glassmorphism.

---

## 🚀 Hướng dẫn cài đặt (Installation & Setup)

Để chạy dự án này trên môi trường phát triển cục bộ (Local Environment), vui lòng thực hiện theo các bước sau:

### 1. Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/) (Khuyên dùng bản v18.x trở lên)
- [MongoDB](https://www.mongodb.com/) (Có thể dùng MongoDB Local kết hợp Compass hoặc MongoDB Atlas Cloud)
- [Git](https://git-scm.com/)

### 2. Clone dự án và Cài đặt
Mở Terminal/Command Prompt và chạy các lệnh:
```bash
git clone https://github.com/lowlyone03/decor_shop.git
cd decor_shop
npm install
```

### 3. Cấu hình biến môi trường (.env)
Tạo một file `.env` ở thư mục gốc của dự án. Đã có sẵn file `.env.example`, bạn chỉ cần sao chép và cấu hình lại các thông số cá nhân:
```env
# Server Config
PORT=5000
ALLOWED_ORIGINS=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/decor_shop

# JWT Secret Key
JWT_SECRET=your_super_secret_jwt_key_here

# Brevo SMTP (Hệ thống gửi Email tự động)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_email@smtp-brevo.com
BREVO_SMTP_KEY=your_brevo_password
MAIL_FROM="Casa Decor" <nguyentrithuc2703205@gmail.com>

# VNPAY (Cổng thanh toán)
VNP_TMN_CODE=your_vnpay_tmn_code
VNP_HASH_SECRET=your_vnpay_hash_secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### 4. Đổ dữ liệu mẫu (Seeding Database)
Nếu chạy lần đầu tiên, hãy sử dụng lệnh sau để tự động tạo Danh mục, Sản phẩm, Tài khoản Admin và Nhân viên mẫu:
```bash
npm run seed
```

### 5. Khởi động Server
Chạy ứng dụng trong môi trường Development (có hỗ trợ tự động reload bằng Nodemon):
```bash
npm run dev
```
Truy cập website tại: `http://localhost:5000`

---

## 📂 Cấu trúc thư mục (Directory Architecture)

```text
decor_shop/
├── public/                 # Chứa toàn bộ mã nguồn Frontend (Client-side)
│   ├── management/         # Giao diện quản trị hợp nhất (Dùng cho cả Admin & Staff)
│   ├── customers/          # Giao diện dành riêng cho khách hàng (Storefront)
│   ├── css/                # Stylesheets (Vanilla CSS)
│   ├── images/             # Tài nguyên hình ảnh, Logo, Banners
│   └── js/                 # Client-side JavaScript
│
├── src/                    # Chứa mã nguồn Backend (Server-side Node.js)
│   ├── config/             # Cấu hình hệ thống (Database, VNPAY, Socket)
│   ├── controllers/        # Logic nghiệp vụ điều khiển luồng dữ liệu API
│   ├── middlewares/        # Middlewares (Xác thực JWT, Phân quyền Role, Upload ảnh)
│   ├── models/             # Định nghĩa Schema Cơ sở dữ liệu (Mongoose)
│   ├── routes/             # Khai báo các Endpoints API RESTful
│   ├── utils/              # Các hàm tiện ích (Format thời gian, Gửi Email, Mã hóa)
│   ├── jobs/               # Tác vụ lập lịch ngầm (Cron jobs chia ca, chốt lương)
│   └── server.js           # Điểm khởi chạy của Backend Server
│
├── backups/                # Thư mục chứa các bản sao lưu Database tự động
├── .env                    # File cấu hình bảo mật môi trường (Cần tự tạo)
├── package.json            # Quản lý thư viện và scripts npm
└── README.md               # Tài liệu dự án (File bạn đang đọc)
```

---

## 📝 Nhật ký thay đổi (Changelog)

- **[MỚI] Nâng cấp Giao diện Quản lý Lương (Payroll):** Giao diện bảng tính lương được làm lại theo phong cách Glassmorphism hiện đại. Cột "Số giờ công" được hiển thị chính xác (`hoursWorked`) và làm tròn số thập phân.
- **[MỚI] Sửa lỗi đồng bộ Hồ sơ Quản trị (Admin Profile):** Trang Profile của Admin giờ đây sẽ tự động tải (fetch) thông tin từ cơ sở dữ liệu thay vì sử dụng HTML tĩnh. Thông tin mặc định đã được chuẩn hóa liên hệ Admin.
- **[MỚI] Dọn dẹp mã nguồn:** Hệ thống đã được làm sạch, xóa bỏ các kịch bản kiểm tra phụ (`fix.js`, `check_admin.js`, v.v.) để giúp project nhẹ nhàng và chuẩn cấu trúc triển khai (Production-ready).
- **Tính năng Đính kèm Đơn hàng vào Chat:** Khách hàng có thể chọn trực tiếp mã đơn hàng gặp sự cố thông qua giao diện trực quan và trao đổi tin nhắn hai chiều với Ban quản trị.
- **Cơ chế Xóa 2 lớp (Soft-delete):** Đảm bảo an toàn dữ liệu, cho phép phục hồi (Restore) các dữ liệu bị xóa nhầm.

---

## 👨‍💻 Tác giả & Thông tin liên hệ

Dự án được phát triển và duy trì bởi:
- **Nguyễn Trí Thức**
- **Phương Anh**

**Thông tin liên hệ (Admin System):**
- 📧 Email: **nguyentrithuc2703205@gmail.com**
- 📞 Số điện thoại: **0336 881 795**

Nếu bạn có bất kỳ đóng góp nào hoặc cần hỗ trợ trong quá trình cài đặt, đừng ngần ngại liên hệ qua các kênh trên!

<div align="center">
  <i>Cảm ơn bạn đã xem qua dự án! ❤️ Nếu thấy hữu ích hãy cho repo một ⭐ nhé!</i>
</div>


---

## 🐳 Hướng dẫn chạy dự án bằng Docker

Dự án đã được cấu hình sẵn để chạy trơn tru với Docker & Docker Compose, giúp bạn không cần cài đặt Node.js hay MongoDB trực tiếp lên máy.

### 1. Yêu cầu hệ thống
- Đã cài đặt **Docker** và **Docker Compose** (hoặc Docker Desktop đối với Windows/Mac).

### 2. Khởi động dự án
Mở Terminal tại thư mục gốc của dự án và chạy:
```bash
docker-compose up -d --build
```
- Lệnh này sẽ tự động tải image MongoDB, cài đặt các thư viện Node.js và chạy ứng dụng ở chế độ ngầm (detach).
- Sau khi khởi động xong, truy cập vào trang chủ: **http://localhost:5000**

### 3. Đồng bộ Code (Hot-reload)
Hệ thống đã được thiết lập volume đồng bộ mã nguồn:
- **Thay đổi giao diện (HTML/CSS/JS Frontend):** Chỉ cần lưu file trong VSCode và F5 trình duyệt.
- **Thay đổi Logic (JS Backend):** Server Node.js (chạy bằng `nodemon`) sẽ tự động restart ngay khi file được lưu.
- *Lưu ý:* Chỉ cần chạy lại lệnh `docker-compose up -d --build` nếu bạn cài thêm package mới qua `npm install` hoặc thay đổi file `.env`.

### 4. Sao lưu & Phục hồi cơ sở dữ liệu vào Docker
Mặc định MongoDB trong Docker sẽ là một database trống. Để khôi phục dữ liệu:
**Backup dữ liệu (từ máy cũ):**
```bash
mongodump --uri="mongodb://localhost:27017/decor_shop"
```
**Phục hồi vào Docker (Khi đang chạy docker-compose):**
```bash
mongorestore --uri="mongodb://localhost:27017/decor_shop" --drop dump/decor_shop
```

### 5. Tắt dự án
Để dừng và dọn dẹp các container (dữ liệu DB vẫn được giữ lại an toàn trong volume):
```bash
docker-compose down
```
