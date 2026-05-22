const helpers = require('../helpers');

// Mock các model Mongoose để tránh kết nối DB thật
jest.mock('../../models/Order', () => ({
    exists: jest.fn()
}));
jest.mock('../../models/Product', () => ({
    find: jest.fn()
}));
jest.mock('../../models/Category', () => ({}));
jest.mock('../../models/Promotion', () => ({
    findOne: jest.fn()
}));

const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Promotion = require('../../models/Promotion');

describe('Helpers Utility Modules', () => {

    describe('escapeRegex', () => {
        test('should escape regular expression special characters', () => {
            expect(helpers.escapeRegex('hello.world*')).toBe('hello\\.world\\*');
            expect(helpers.escapeRegex('-[a-z]+-')).toBe('-\\[a-z\\]\\+-');
            expect(helpers.escapeRegex(null)).toBe('');
        });
    });

    describe('cleanText', () => {
        test('should remove HTML tags, collapse whitespace, trim and respect maxLength', () => {
            const input = '   <script>alert(1)</script>   Xin chào    các  bạn!   ';
            expect(helpers.cleanText(input, 50)).toBe('scriptalert(1)/script Xin chào các bạn!');
            expect(helpers.cleanText('Abc', 2)).toBe('Ab');
            expect(helpers.cleanText(null)).toBe('');
        });
    });

    describe('normalizeSearch', () => {
        test('should remove Vietnamese diacritics and convert to lowercase', () => {
            expect(helpers.normalizeSearch('Nguyễn Trí Thức')).toBe('nguyen tri thuc');
            expect(helpers.normalizeSearch('Đường sá đông đúc')).toBe('duong sa dong duc');
            expect(helpers.normalizeSearch(null)).toBe('');
        });
    });

    describe('orderDateCode & nextOrderCode', () => {
        test('should generate order base date code prefix', () => {
            const date = new Date('2026-05-20T10:00:00Z');
            const code = helpers.orderDateCode(date);
            expect(code).toBe('CSDC20260520');
        });

        test('should return base code if it does not exist in DB', async () => {
            Order.exists.mockResolvedValue(false);
            const code = await helpers.nextOrderCode();
            expect(code).toBe(helpers.orderDateCode());
        });

        test('should suffix order code with incrementing numbers if code already exists', async () => {
            const base = helpers.orderDateCode();
            Order.exists.mockImplementation((query) => {
                if (query.orderCode === base) return Promise.resolve(true);
                if (query.orderCode === `${base}-02`) return Promise.resolve(true);
                return Promise.resolve(false);
            });
            const code = await helpers.nextOrderCode();
            expect(code).toBe(`${base}-03`);
        });
    });

    describe('toPublicUser', () => {
        test('should sanitize user object and remove password', () => {
            const user = { _id: '123', name: 'Test', email: 'test@example.com', password: 'hashedpassword', role: 'customer', status: 'active' };
            const sanitized = helpers.toPublicUser(user);
            expect(sanitized).not.toHaveProperty('password');
            expect(sanitized._id).toBe('123');
            expect(sanitized.name).toBe('Test');
            expect(helpers.toPublicUser(null)).toBeNull();
        });
    });

    describe('primaryImage & effectivePrice & positiveInt', () => {
        test('primaryImage should return correct primary url or first url', () => {
            const productWithPrimary = { images: [{ url: '1.jpg', isPrimary: false }, { url: '2.jpg', isPrimary: true }] };
            expect(helpers.primaryImage(productWithPrimary)).toBe('2.jpg');
            const productWithoutPrimary = { images: [{ url: '3.jpg' }, { url: '4.jpg' }] };
            expect(helpers.primaryImage(productWithoutPrimary)).toBe('3.jpg');
            expect(helpers.primaryImage({})).toBe('');
        });

        test('effectivePrice should handle sale price logic', () => {
            expect(helpers.effectivePrice({ price: 100000 })).toBe(100000);
            expect(helpers.effectivePrice({ price: 100000, salePrice: 80000 })).toBe(80000);
            expect(helpers.effectivePrice({ price: 100000, salePrice: 120000 })).toBe(100000);
            expect(helpers.effectivePrice(null)).toBe(0);
        });

        test('positiveInt should return positive integer or fallback', () => {
            expect(helpers.positiveInt(5)).toBe(5);
            expect(helpers.positiveInt('5.7')).toBe(5);
            expect(helpers.positiveInt(-2)).toBe(1);
            expect(helpers.positiveInt('invalid', 10)).toBe(10);
        });
    });

    describe('promotionDiscountAmount', () => {
        test('should return 0 if no promotion', () => {
            expect(helpers.promotionDiscountAmount(250000, null)).toBe(0);
        });

        test('should return 0 if subtotal is below minimum order value', () => {
            const promo = { minOrderValue: 200000, discountValue: 50000, discountType: 'fixed' };
            expect(helpers.promotionDiscountAmount(100000, promo)).toBe(0);
        });

        test('should return 0 if promotion usage limit exceeded', () => {
            const promo = { minOrderValue: 100000, discountValue: 20000, discountType: 'fixed', maxUsage: 10, usedCount: 10 };
            expect(helpers.promotionDiscountAmount(150000, promo)).toBe(0);
        });

        test('should handle maxUsage not yet exceeded', () => {
            const promo = { minOrderValue: 0, discountValue: 10000, discountType: 'fixed', maxUsage: 10, usedCount: 5 };
            expect(helpers.promotionDiscountAmount(50000, promo)).toBe(10000);
        });

        test('should calculate fixed discount correctly', () => {
            const promo = { minOrderValue: 100000, discountValue: 50000, discountType: 'fixed' };
            expect(helpers.promotionDiscountAmount(150000, promo)).toBe(50000);
            const promoNoMin = { minOrderValue: 0, discountValue: 50000, discountType: 'fixed' };
            expect(helpers.promotionDiscountAmount(30000, promoNoMin)).toBe(30000);
        });

        test('should calculate percentage discount correctly', () => {
            const promo = { minOrderValue: 100000, discountValue: 10, discountType: 'percentage' };
            expect(helpers.promotionDiscountAmount(200000, promo)).toBe(20000);
        });

        test('should cap percentage discount at order value', () => {
            const promo = { minOrderValue: 0, discountValue: 200, discountType: 'percentage' };
            expect(helpers.promotionDiscountAmount(50000, promo)).toBe(50000);
        });
    });

    describe('checkoutTotals', () => {
        test('should handle empty cart (0 total)', () => {
            const res = helpers.checkoutTotals(0);
            expect(res.shippingFee).toBe(0);
            expect(res.totalAmount).toBe(0);
        });

        test('should add shipping fee for orders under 1,000,000', () => {
            const res = helpers.checkoutTotals(500000);
            expect(res.shippingFee).toBe(30000);
            expect(res.discountAmount).toBe(0);
            expect(res.totalAmount).toBe(530000);
        });

        test('should have free shipping for orders at or over 1,000,000', () => {
            const res = helpers.checkoutTotals(1000000);
            expect(res.shippingFee).toBe(0);
            expect(res.totalAmount).toBe(1000000);
        });

        test('should apply auto discount of 200,000 for orders over 1,500,000', () => {
            const res = helpers.checkoutTotals(1600000);
            expect(res.shippingFee).toBe(0);
            expect(res.discountAmount).toBe(200000);
            expect(res.totalAmount).toBe(1400000);
        });

        test('should apply the maximum discount between auto-discount and coupon discount', () => {
            const promo = { minOrderValue: 100000, discountValue: 15, discountType: 'percentage' };
            const res = helpers.checkoutTotals(1600000, promo);
            // coupon = 240,000 > auto = 200,000
            expect(res.discountAmount).toBe(240000);
            expect(res.totalAmount).toBe(1360000);
        });
    });

    describe('cartLineTotal & cartResponse', () => {
        test('cartLineTotal should use saved itemTotal when valid', () => {
            expect(helpers.cartLineTotal({ itemTotal: 50000 })).toBe(50000);
            expect(helpers.cartLineTotal({ itemTotal: 0 })).toBe(0);
        });

        test('cartLineTotal should fallback when itemTotal is invalid', () => {
            // No itemTotal -> fallback
            expect(helpers.cartLineTotal({ priceAtAdding: 25000, quantity: 3 })).toBe(75000);
            // Negative itemTotal -> fallback
            expect(helpers.cartLineTotal({ priceAtAdding: 10000, quantity: 2, itemTotal: -1 })).toBe(20000);
        });

        test('cartResponse should format empty cart correctly', () => {
            const res = helpers.cartResponse(null, 'user123');
            expect(res.customer).toBe('user123');
            expect(res.items).toEqual([]);
            expect(res.subTotal).toBe(0);
            expect(res.totalAmount).toBe(0);
        });

        test('cartResponse should compute totals from cart with items', () => {
            const cart = {
                customer: 'user123',
                items: [{ itemTotal: 300000 }, { itemTotal: 200000 }]
            };
            const res = helpers.cartResponse(cart);
            expect(res.subTotal).toBe(500000);
            expect(res.shippingFee).toBe(30000);
            expect(res.totalAmount).toBe(530000);
        });

        test('cartResponse should handle Mongoose document with toObject()', () => {
            const cart = {
                customer: 'user123',
                items: [{ itemTotal: 1000000 }],
                toObject: function () { return { customer: this.customer, items: this.items }; }
            };
            const res = helpers.cartResponse(cart);
            expect(res.subTotal).toBe(1000000);
            expect(res.shippingFee).toBe(0); // >= 1,000,000 -> free ship
        });
    });

    describe('syncCartPrices', () => {
        test('should return null if cart is null', async () => {
            const result = await helpers.syncCartPrices(null);
            expect(result).toBeNull();
        });

        test('should return empty cart unchanged', async () => {
            const result = await helpers.syncCartPrices({ items: [] });
            expect(result).toEqual({ items: [] });
        });

        test('should update item data and save cart if products change', async () => {
            const mockProduct = {
                _id: 'prod1', name: 'Ghế Sofa', price: 500000, salePrice: 450000,
                status: 'active', images: [{ url: 'sofa.jpg', isPrimary: true }]
            };
            Product.find.mockResolvedValue([mockProduct]);
            const mockCart = {
                items: [{ product: 'prod1', name: 'Ghế cũ', image: 'cu.jpg', priceAtAdding: 500000, quantity: 2, itemTotal: 1000000 }],
                subTotal: 1000000,
                save: jest.fn().mockResolvedValue(true)
            };
            await helpers.syncCartPrices(mockCart);
            expect(mockCart.items[0].name).toBe('Ghế Sofa');
            expect(mockCart.items[0].priceAtAdding).toBe(450000);
            expect(mockCart.items[0].itemTotal).toBe(900000);
            expect(mockCart.subTotal).toBe(900000);
            expect(mockCart.save).toHaveBeenCalled();
        });

        test('should skip inactive products and not save if nothing changed', async () => {
            const mockProduct = {
                _id: 'prod1', name: 'Ghế Sofa', price: 500000, salePrice: 450000,
                status: 'inactive', images: []
            };
            Product.find.mockResolvedValue([mockProduct]);
            const mockCart = {
                items: [{ product: 'prod1', name: 'Ghế Sofa', image: '', priceAtAdding: 450000, quantity: 2, itemTotal: 900000 }],
                subTotal: 900000,
                save: jest.fn()
            };
            await helpers.syncCartPrices(mockCart);
            expect(mockCart.save).not.toHaveBeenCalled();
        });
    });

    describe('syncOrderTotals', () => {
        test('should calculate totals and return true when changed', () => {
            const order = { items: [{ purchasePrice: 500000, quantity: 2, itemTotal: 1000000 }], itemsTotal: 0, shippingFee: 0, discountAmount: 0, totalAmount: 0 };
            const changed = helpers.syncOrderTotals(order);
            expect(changed).toBe(true);
            expect(order.itemsTotal).toBe(1000000);
            expect(order.shippingFee).toBe(0);
            expect(order.totalAmount).toBe(1000000);
        });

        test('should return false when totals already match', () => {
            const order = { items: [{ itemTotal: 500000 }], itemsTotal: 500000, shippingFee: 30000, discountAmount: 0, totalAmount: 530000 };
            expect(helpers.syncOrderTotals(order)).toBe(false);
        });

        test('should fallback to purchasePrice * quantity when itemTotal is not finite', () => {
            const order = { items: [{ purchasePrice: 150000, quantity: 2 }], itemsTotal: 0, shippingFee: 0, discountAmount: 0, totalAmount: 0 };
            helpers.syncOrderTotals(order);
            expect(order.itemsTotal).toBe(300000);
            expect(order.shippingFee).toBe(30000);
            expect(order.totalAmount).toBe(330000);
        });
    });

    describe('date utilities & percentChange', () => {
        test('percentChange calculations', () => {
            expect(helpers.percentChange(120, 100)).toBe(20);
            expect(helpers.percentChange(80, 100)).toBe(-20);
            expect(helpers.percentChange(50, 0)).toBe(100);
            expect(helpers.percentChange(0, 0)).toBe(0);
        });

        test('dateKey & monthKey format with a date', () => {
            const date = new Date('2026-05-20T12:00:00');
            expect(helpers.dateKey(date)).toBe('2026-05-20');
            expect(helpers.monthKey(date)).toBe('2026-05');
        });

        test('dateKey & monthKey with no arguments use today', () => {
            expect(helpers.dateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(helpers.monthKey()).toMatch(/^\d{4}-\d{2}$/);
        });

        test('startOfLocalDay & endOfLocalDay with no arguments', () => {
            const start = helpers.startOfLocalDay();
            expect(start.getHours()).toBe(0);
            expect(start.getMinutes()).toBe(0);
            const end = helpers.endOfLocalDay();
            expect(end.getHours()).toBe(23);
            expect(end.getMinutes()).toBe(59);
        });

        test('startOfLocalDay & endOfLocalDay with specific date', () => {
            const date = new Date('2026-01-15');
            expect(helpers.startOfLocalDay(date).getHours()).toBe(0);
            expect(helpers.endOfLocalDay(date).getHours()).toBe(23);
        });

        test('dateRangeFromQuery with explicit from/to', () => {
            const range = helpers.dateRangeFromQuery({ from: '2026-01-01', to: '2026-01-31' });
            expect(range.from.getHours()).toBe(0);
            expect(range.to.getHours()).toBe(23);
        });

        test('dateRangeFromQuery with defaults (no params)', () => {
            const range = helpers.dateRangeFromQuery({});
            expect(range.from).toBeInstanceOf(Date);
            expect(range.to).toBeInstanceOf(Date);
        });
    });

    describe('validation utilities & address', () => {
        test('isValidEmail', () => {
            expect(helpers.isValidEmail('abc@gmail.com')).toBe(true);
            expect(helpers.isValidEmail('abc@gmail')).toBe(false);
            expect(helpers.isValidEmail('')).toBe(false);
        });

        test('isValidVietnamPhone', () => {
            expect(helpers.isValidVietnamPhone('0912345678')).toBe(true);
            expect(helpers.isValidVietnamPhone('+84987654321')).toBe(true);
            expect(helpers.isValidVietnamPhone('0123456789')).toBe(false);
        });

        test('normalizePhone should strip non-digit characters', () => {
            expect(helpers.normalizePhone('(090) 123-456')).toBe('090123456');
            expect(helpers.normalizePhone('+84912345678')).toBe('+84912345678');
            expect(helpers.normalizePhone(null)).toBe('');
        });

        test('validateAddress should pass for valid address', () => {
            const addr = { fullName: 'Nguyễn Văn A', phone: '0987654321', address: '123 Đường Láng', ward: 'Láng Thượng', district: 'Đống Đa', city: 'Hà Nội' };
            const res = helpers.validateAddress(addr);
            expect(res.error).toBeUndefined();
            expect(res.address.fullName).toBe('Nguyễn Văn A');
        });

        test('validateAddress should error on invalid phone', () => {
            const addr = { fullName: 'Nguyễn Văn A', phone: '123', address: '123 Đường Láng', ward: 'Láng Thượng', district: 'Đống Đa', city: 'Hà Nội' };
            expect(helpers.validateAddress(addr).error).toBe('Số điện thoại không hợp lệ.');
        });

        test('validateAddress should error on short fullName', () => {
            const addr = { fullName: 'A', phone: '0987654321', address: '123 Đường Láng', ward: 'Láng Thượng', district: 'Đống Đa', city: 'Hà Nội' };
            expect(helpers.validateAddress(addr).error).toBe('Tên người nhận không hợp lệ.');
        });

        test('validateAddress should error on missing address fields', () => {
            const addr = { fullName: 'Nguyễn Văn A', phone: '0987654321', address: '', ward: '', district: 'Đống Đa', city: 'Hà Nội' };
            expect(helpers.validateAddress(addr).error).toBe('Vui lòng nhập đầy đủ địa chỉ giao hàng.');
        });

        test('validateAddress should support street field alias', () => {
            const addr = { fullName: 'Nguyễn Văn A', phone: '0987654321', street: '456 Nguyễn Huệ', ward: 'Bến Nghé', district: 'Quận 1', city: 'Hồ Chí Minh' };
            const res = helpers.validateAddress(addr);
            expect(res.error).toBeUndefined();
            expect(res.address.street).toBe('456 Nguyễn Huệ');
        });
    });

    describe('inferContactMeta', () => {
        test('warranty category from keywords', () => {
            const meta = helpers.inferContactMeta({ subject: 'Yêu cầu bảo hành ghế sofa', message: 'Ghế sofa của tôi bị nứt da' });
            expect(meta.category).toBe('warranty');
            expect(meta.priority).toBe('high');
        });

        test('order category with order code extraction', () => {
            const meta = helpers.inferContactMeta({ subject: 'Hỏi về đơn hàng CSDC20260520-02', message: 'Khi nào giao?' });
            expect(meta.category).toBe('order');
            expect(meta.relatedOrderCode).toBe('CSDC20260520-02');
        });

        test('complaint category', () => {
            const meta = helpers.inferContactMeta({ message: 'Thái độ nhân viên kém và chậm trễ' });
            expect(meta.category).toBe('complaint');
            expect(meta.priority).toBe('high');
        });

        test('consulting category', () => {
            const meta = helpers.inferContactMeta({ message: 'Tôi muốn tư vấn về kích thước sản phẩm' });
            expect(meta.category).toBe('consulting');
            expect(meta.priority).toBe('normal');
        });

        test('feedback category', () => {
            const meta = helpers.inferContactMeta({ message: 'Tôi xin góp ý và gửi feedback' });
            expect(meta.category).toBe('feedback');
        });

        test('general fallback category', () => {
            const meta = helpers.inferContactMeta({ message: 'Xin chào Decor Shop' });
            expect(meta.category).toBe('general');
            expect(meta.priority).toBe('normal');
        });

        test('respects pre-defined valid category', () => {
            const meta = helpers.inferContactMeta({ category: 'consulting', message: 'Bảo hành sản phẩm' });
            expect(meta.category).toBe('consulting');
        });

        test('respects pre-defined priority = high', () => {
            const meta = helpers.inferContactMeta({ priority: 'high', message: 'Xin chào' });
            expect(meta.priority).toBe('high');
        });

        test('uses known source values and falls back to website', () => {
            expect(helpers.inferContactMeta({ source: 'facebook', message: '' }).source).toBe('facebook');
            expect(helpers.inferContactMeta({ source: 'zalo', message: '' }).source).toBe('zalo');
            expect(helpers.inferContactMeta({ source: 'unknown_source', message: '' }).source).toBe('website');
        });

        test('returns undefined relatedOrderCode when no match', () => {
            expect(helpers.inferContactMeta({ message: 'Không có mã đơn' }).relatedOrderCode).toBeUndefined();
        });
    });

    describe('shortProduct', () => {
        test('returns null for null input', () => {
            expect(helpers.shortProduct(null)).toBeNull();
        });

        test('maps object category correctly', () => {
            const p = { _id: 'p1', name: 'Product 1', slug: 'p1', category: { _id: 'c1', name: 'Cat 1', slug: 'cat-1' } };
            expect(helpers.shortProduct(p).category._id).toBe('c1');
        });

        test('passes through string category ID', () => {
            const p = { _id: 'p2', name: 'Product 2', category: 'cat-id-string' };
            expect(helpers.shortProduct(p).category).toBe('cat-id-string');
        });

        test('handles undefined category', () => {
            const p = { _id: 'p3', name: 'Product 3' };
            expect(helpers.shortProduct(p).category).toBeUndefined();
        });
    });

    describe('orderRevenueMatch', () => {
        test('with extra filter', () => {
            const match = helpers.orderRevenueMatch({ createdAt: { $gte: new Date() } });
            expect(match.orderStatus.$nin).toContain('cancelled');
            expect(match.orderStatus.$nin).toContain('returned');
            expect(match.createdAt).toBeDefined();
        });

        test('with no extra args', () => {
            const match = helpers.orderRevenueMatch();
            expect(match.orderStatus.$nin).toEqual(['cancelled', 'returned']);
        });
    });

    describe('slugify', () => {
        test('slugifies Vietnamese text', () => {
            expect(helpers.slugify('Ghế Sofa Cao Cấp')).toBe('ghe-sofa-cao-cap');
        });

        test('falls back to san-pham-{timestamp} for empty result', () => {
            expect(helpers.slugify('!!!')).toMatch(/^san-pham-\d+$/);
        });
    });

    describe('findUsablePromotion', () => {
        test('returns null for empty or null code', async () => {
            expect(await helpers.findUsablePromotion('')).toBeNull();
            expect(await helpers.findUsablePromotion(null)).toBeNull();
        });

        test('calls Promotion.findOne with uppercased code', async () => {
            Promotion.findOne.mockResolvedValue({ code: 'SUMMER20', status: 'active' });
            const promo = await helpers.findUsablePromotion('summer20');
            expect(Promotion.findOne).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUMMER20' }));
            expect(promo.code).toBe('SUMMER20');
        });

        test('returns null when no promotion found', async () => {
            Promotion.findOne.mockResolvedValue(null);
            expect(await helpers.findUsablePromotion('NOTFOUND')).toBeNull();
        });
    });
});
