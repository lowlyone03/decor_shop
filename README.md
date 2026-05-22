# Casa Decor - Hệ thống Thương Mại Điện Tử Chuyên Nghiệp

![Casa Decor Banner](https://via.placeholder.com/1200x300.png?text=Casa+Decor+-+T%C3%B4+%C4%91i%E1%BB%83m+kh%C3%B4ng+gian+s%E1%BB%91ng)

**Casa Decor** là nền tảng thương mại điện tử chuyên cung cấp các sản phẩm trang trí nội thất cao cấp. Hệ thống được xây dựng với kiến trúc Client-Server hiện đại, đáp ứng đầy đủ các tiêu chuẩn của một website E-commerce thực thụ bao gồm quản lý bán hàng, tương tác khách hàng, thanh toán trực tuyến và hệ thống gửi email tự động.

---

## 🌟 Chức năng nổi bật (Features)

### 🛍️ Dành cho Khách hàng (Customer)
- **Tài khoản & Bảo mật:** Đăng ký, đăng nhập, bảo vệ bằng mã hóa Bcrypt. Tính năng quên mật khẩu (Reset password qua Email).
- **Trải nghiệm mua sắm:** Xem danh mục, chi tiết sản phẩm, quản lý Giỏ hàng (Cart) và Sản phẩm yêu thích (Wishlist).
- **Thanh toán đa dạng:** Hỗ trợ thanh toán khi nhận hàng (COD) và đặc biệt là cổng thanh toán trực tuyến **VNPAY**.
- **Tương tác:** Đánh giá sản phẩm (Reviews), đọc bài viết (Blogs), gửi liên hệ hỗ trợ.
- **Email tự động:** Nhận email xác nhận đơn hàng đẹp mắt ngay sau khi đặt hàng thành công (Tích hợp Brevo SMTP).

### 🛠️ Dành cho Quản trị viên (Admin Panel)
- **Quản lý danh mục & Sản phẩm:** Thêm, sửa, xóa, tải lên hình ảnh sản phẩm.
- **Quản lý Đơn hàng:** Xem chi tiết đơn hàng, cập nhật trạng thái giao hàng.
- **Marketing & CSKH:** Quản lý mã giảm giá (Promotions), Banner quảng cáo, phản hồi Contact từ khách.
- **Vận hành nội bộ:** Quản lý nhân viên (Staff) và phân ca làm việc (Staff Shifts).

---

## 💻 Công nghệ sử dụng (Tech Stack)

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js (RESTful API)
- **Database:** MongoDB & Mongoose ORM
- **Real-time:** Socket.io (Hỗ trợ WebSocket)
- **Email Service:** Nodemailer + Brevo SMTP
- **Bảo mật:** Helmet, CORS, Express Rate Limit, Bcryptjs

### Frontend (Client)
- **Cấu trúc:** HTML5, CSS3, Vanilla JavaScript (Không sử dụng Framework để tối ưu tốc độ)
- **Giao diện:** Tương thích trên nhiều thiết bị (Responsive Design)

---

## 🚀 Hướng dẫn cài đặt (Installation & Setup)

Để chạy dự án này trên máy tính của bạn (Local Environment), vui lòng thực hiện theo các bước sau:

### Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/) (Khuyên dùng bản v18 trở lên)
- [MongoDB](https://www.mongodb.com/) (Cài đặt MongoDB Compass hoặc dùng MongoDB Atlas)

### Bước 1: Clone dự án và cài đặt thư viện
Mở Terminal/Command Prompt và chạy các lệnh:
```bash
git clone <đường-dẫn-repo-của-bạn>
cd decor_shop
npm install
```

### Bước 2: Cấu hình biến môi trường (.env)
Tạo một file `.env` ở thư mục gốc của dự án và điền các thông tin sau (sửa lại theo cấu hình của bạn):
```env
# Server
PORT=5000
ALLOWED_ORIGINS=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/decor_shop

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Brevo SMTP (Dùng để gửi email)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_email@smtp-brevo.com
BREVO_SMTP_KEY=your_brevo_password
MAIL_FROM="Casa Decor" <your_email@gmail.com>

# VNPAY (Thanh toán)
VNP_TMN_CODE=your_vnpay_tmn_code
VNP_HASH_SECRET=your_vnpay_hash_secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### Bước 3: Đổ dữ liệu mẫu (Seeding Database)
Nếu bạn chạy lần đầu, hãy nạp dữ liệu mẫu vào database để có sẵn danh mục, sản phẩm, và tài khoản test:
```bash
npm run seed
```

### Bước 4: Chạy Server
Khởi động server ở chế độ Development:
```bash
npm run dev
```
Truy cập website tại: `http://localhost:5000`

---

## 📂 Cấu trúc thư mục (Directory Structure)

```text
decor_shop/
│
├── public/              # Chứa toàn bộ source code Frontend (HTML/CSS/JS)
│   ├── admin/           # Trang quản trị dành cho Admin
│   ├── css/             # Stylesheet
│   ├── images/          # Hình ảnh (Logo, Sản phẩm, Banner)
│   ├── js/              # Client-side JavaScript
│   └── ...              # Các trang HTML (index.html, product.html...)
│
├── src/                 # Chứa mã nguồn Backend (Node.js)
│   ├── controllers/     # Xử lý logic nghiệp vụ cho từng route (auth, order, product...)
│   ├── models/          # Khai báo schema Database MongoDB (Mongoose)
│   ├── routes/          # Khai báo các đường dẫn API
│   ├── utils/           # Các hàm tiện ích (email.js, jwt.js...)
│   └── server.js        # Điểm bắt đầu (Entry point) của ứng dụng
│
├── scripts/             # Các đoạn script tiện ích (vd: seedDatabase.js)
├── .env                 # File cấu hình biến môi trường
├── package.json         # Danh sách thư viện và scripts npm
└── README.md            # Tài liệu dự án
```

---

## 👨‍💻 Tác giả
Dự án được phát triển bởi **Nguyễn Trí Thức** & **Phương Anh**.
Mọi thông tin đóng góp hoặc câu hỏi vui lòng liên hệ qua email!.

*Cảm ơn bạn đã xem qua dự án!* ❤️
