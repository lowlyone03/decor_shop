# 🧪 Hướng dẫn Kiểm thử Tự động (Unit Test) - Decor Shop

Tài liệu này cung cấp hướng dẫn chi tiết về việc cài đặt, vận hành và viết các bản kiểm thử tự động (Unit Test) trong dự án **Decor Shop** bằng cách sử dụng framework **Jest**.

---

## 🌟 Tại sao cần Kiểm thử Tự động?

Khi dự án ngày càng phát triển, việc thêm hoặc nâng cấp các tính năng mới có thể vô tình làm hỏng các logic cũ đang chạy ổn định (gọi là lỗi hồi quy - *regression*). Tích hợp Unit Test giúp:
1. **Tự tin tái cấu trúc (Refactoring):** Thay đổi cấu trúc code hoặc nâng cấp thư viện mà không sợ phá hỏng nghiệp vụ lõi.
2. **Phát hiện lỗi sớm:** Tìm ra các góc khuất logic (edge cases) ngay trong quá trình viết mã trước khi đẩy lên production.
3. **Tài liệu hóa mã nguồn:** Các file test hoạt động như tài liệu hướng dẫn trực quan, giải thích chính xác cách một hàm hoặc module hoạt động thông qua các đầu vào và đầu ra mong đợi.

---

## 🚀 Cách chạy các bài kiểm thử

Các script kiểm thử đã được tích hợp sẵn trong file `package.json`. Bạn có thể sử dụng các lệnh sau:

### 1. Chạy toàn bộ kiểm thử
Lệnh này sẽ quét toàn bộ thư mục dự án và chạy các file có hậu tố `.test.js` hoặc `.spec.js`.
```bash
npm run test
```

### 2. Chạy chế độ tự động theo dõi (Watch Mode)
Lệnh này hữu ích trong quá trình phát triển (Coding). Mỗi khi bạn lưu thay đổi ở một file code hoặc file test, Jest sẽ tự động chạy lại các bài test liên quan.
```bash
npm run test:watch
```

### 3. Xuất báo cáo độ bao phủ mã nguồn (Code Coverage)
Lệnh này phân tích xem bao nhiêu phần trăm số dòng code, nhánh logic (if/else), hàm và file trong thư mục `src` đã được kiểm thử bao phủ.
```bash
npm run test:coverage
```
*Báo cáo chi tiết dạng giao diện web trực quan sẽ được tạo ra tại thư mục `coverage/lcov-report/index.html`.*

---

## 📁 Cấu trúc các file kiểm thử hiện tại

Chúng ta tập trung kiểm thử các thành phần chứa nhiều logic nghiệp vụ quan trọng và ít phụ thuộc nhất của hệ thống:

```text
src/
├── utils/
│   ├── crypto.js
│   ├── helpers.js
│   └── __tests__/             # Thư mục chứa các file test của Utilities
│       ├── crypto.test.js     # Kiểm thử mã hóa mật khẩu, token chữ ký HMAC
│       └── helpers.test.js    # Kiểm thử tính toán giỏ hàng, phí ship, chiết khấu mã KM, validate địa chỉ...
└── middlewares/
    ├── auth.js
    └── __tests__/             # Thư mục chứa các file test của Middlewares
        └── auth.test.js       # Kiểm thử phân quyền, kiểm tra token đăng nhập (Mock DB)
```

---

## 💡 Hướng dẫn viết Test Case mới

Khi viết thêm các tính năng mới trong `utils`, `middlewares`, `controllers`, hãy tuân thủ mô hình **AAA (Arrange - Act - Assert)**:

1. **Arrange (Thiết lập):** Chuẩn bị dữ liệu đầu vào, thiết lập các mock cần thiết.
2. **Act (Thực thi):** Gọi hàm hoặc module cần kiểm thử.
3. **Assert (Kỳ vọng):** Sử dụng các hàm `expect` của Jest để kiểm chứng kết quả trả về có khớp với kỳ vọng hay không.

### Ví dụ: Viết test cho một hàm tiện ích mới
Giả sử bạn vừa thêm hàm `calculateTax(price)` vào `helpers.js`. Hãy tạo test trong `helpers.test.js`:

```javascript
describe('calculateTax', () => {
    test('should calculate 10% tax for positive price', () => {
        // 1. Arrange
        const price = 100000;
        
        // 2. Act
        const tax = helpers.calculateTax(price);
        
        // 3. Assert
        expect(tax).toBe(10000);
    });

    test('should return 0 tax if price is negative or zero', () => {
        expect(helpers.calculateTax(-500)).toBe(0);
        expect(helpers.calculateTax(0)).toBe(0);
    });
});
```

### Cách Mock các Mongoose Models
Đối với các controller hoặc middleware cần truy vấn Cơ sở dữ liệu (MongoDB), ta cần mock database để kiểm thử chạy độc lập và cực kỳ nhanh mà không cần khởi động kết nối CSDL thật:

```javascript
// Mock User Model ở đầu file test
jest.mock('../../models/User', () => ({
    findOne: jest.fn(),
    findById: jest.fn()
}));

const User = require('../../models/User');

test('should find user', async () => {
    // Thiết lập hành vi cho hàm mock
    User.findOne.mockResolvedValue({ _id: '123', name: 'Nguyen Van A' });
    
    const user = await User.findOne({ name: 'Nguyen Van A' });
    expect(user.name).toBe('Nguyen Van A');
});
```

---

## 🛠️ Bộ thư viện khuyên dùng thêm (Nâng cao)
Nếu sau này dự án cần kiểm thử tích hợp sâu hơn (Integration Test) cho các API Routes, bạn có thể cài đặt thêm thư viện `supertest`:
```bash
npm install --save-dev supertest
```
Ví dụ cấu trúc kiểm thử API bằng `supertest`:
```javascript
const request = require('supertest');
const app = require('../server'); // Xuất app từ server.js nhưng không chạy listen

describe('GET /api/products', () => {
    test('should return list of products', async () => {
        const response = await request(app).get('/api/products');
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```
