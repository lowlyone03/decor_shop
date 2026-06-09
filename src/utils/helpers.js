const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Promotion = require('../models/Promotion');

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startOfLocalDay(date = new Date()) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}

function endOfLocalDay(date = new Date()) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
}

function cleanText(value, max = 500) {
    return String(value || '')
        .replace(/<[^>]*>/g, '')          // strip all HTML tags
        .replace(/[<>"'`]/g, '')          // strip remaining dangerous chars
        .replace(/javascript:/gi, '')     // strip JS protocol
        .replace(/on\w+\s*=/gi, '')       // strip inline event handlers
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

/**
 * Sanitize a generic string input: removes HTML, control characters, and JS injection patterns.
 */
function sanitizeInput(value, max = 1000) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/<[^>]*>/g, '')           // strip HTML tags
        .replace(/[<>"'`]/g, '')           // strip dangerous chars
        .replace(/javascript:/gi, '')      // strip JS protocol
        .replace(/on\w+\s*=/gi, '')        // strip event handlers
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
        .replace(/\$where|\$ne|\$gt|\$lt|\$regex/gi, '') // NoSQL operator stripping
        .trim()
        .slice(0, max);
}

/**
 * Validate a MongoDB ObjectId (24-char hex string).
 * Use this before passing user-supplied IDs to DB queries.
 */
function validateObjectId(id) {
    return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}

function normalizeSearch(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

/**
 * Tạo Regex tìm kiếm gần đúng (Fuzzy Search) hỗ trợ sai chính tả 1 ký tự hoặc thiếu ký tự.
 */
function generateFuzzyRegex(keyword) {
    const words = String(keyword).trim().split(/\s+/);
    const fuzzyWords = words.map(word => {
        if (word.length <= 2) return escapeRegex(word);
        
        const variations = [escapeRegex(word)];
        // Tạo các biến thể: mỗi vị trí có thể sai 1 ký tự, thiếu 1 ký tự, hoặc dư 1 ký tự
        for (let i = 0; i < word.length; i++) {
            // Thay thế 1 ký tự bằng 1 ký tự bất kỳ (sai chính tả) hoặc bỏ qua (thiếu ký tự)
            variations.push(escapeRegex(word.slice(0, i)) + '.?' + escapeRegex(word.slice(i + 1)));
        }
        return `(${variations.join('|')})`;
    });
    
    return new RegExp(fuzzyWords.join('.*?'), 'i');
}

function orderDateCode(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});
    return `CSDC${parts.year}${parts.month}${parts.day}`;
}

async function nextOrderCode() {
    const baseCode = orderDateCode();
    if (!await Order.exists({ orderCode: baseCode })) return baseCode;

    let index = 2;
    let orderCode = `${baseCode}-${String(index).padStart(2, '0')}`;
    while (await Order.exists({ orderCode })) {
        index += 1;
        orderCode = `${baseCode}-${String(index).padStart(2, '0')}`;
    }
    return orderCode;
}

function toPublicUser(user) {
    if (!user) return null;
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        addresses: user.addresses,
        status: user.status,
        createdAt: user.createdAt
    };
}

function primaryImage(product) {
    const image = product.images?.find((item) => item.isPrimary) || product.images?.[0];
    return image?.url || '';
}

function effectivePrice(product) {
    const price = Number(product?.price || 0);
    const salePrice = Number(product?.salePrice || 0);
    return salePrice > 0 && salePrice < price ? salePrice : price;
}

function positiveInt(value, fallback = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(Math.floor(number), 1);
}

function promotionDiscountAmount(subTotal, promotion) {
    if (!promotion) return 0;
    const orderValue = Math.max(Math.round(Number(subTotal) || 0), 0);
    if (orderValue < Number(promotion.minOrderValue || 0)) return 0;
    if (promotion.maxUsage && Number(promotion.usedCount || 0) >= Number(promotion.maxUsage)) return 0;
    if (promotion.discountType === 'percentage') {
        return Math.min(Math.round(orderValue * (Number(promotion.discountValue || 0) / 100)), orderValue);
    }
    return Math.min(Math.round(Number(promotion.discountValue || 0)), orderValue);
}

async function findUsablePromotion(code) {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return null;
    const now = new Date();
    return Promotion.findOne({
        code: cleanCode,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    });
}

function checkoutTotals(itemsTotal = 0, promotion = null) {
    const subTotal = Math.max(Math.round(Number(itemsTotal) || 0), 0);
    const shippingFee = subTotal === 0 || subTotal >= 1000000 ? 0 : 30000;
    const autoDiscount = subTotal >= 1500000 ? 200000 : 0;
    const couponDiscount = promotionDiscountAmount(subTotal, promotion);
    const discountAmount = Math.max(autoDiscount, couponDiscount);
    return {
        subTotal,
        itemsTotal: subTotal,
        shippingFee,
        discountAmount,
        totalAmount: Math.max(subTotal + shippingFee - discountAmount, 0)
    };
}

function cartLineTotal(item = {}) {
    const savedTotal = Number(item.itemTotal);
    if (Number.isFinite(savedTotal) && savedTotal >= 0) return savedTotal;
    return Math.max(Number(item.priceAtAdding || 0), 0) * positiveInt(item.quantity);
}

function cartResponse(cart, customerId) {
    const payload = cart
        ? (typeof cart.toObject === 'function' ? cart.toObject() : cart)
        : { customer: customerId, items: [], subTotal: 0 };
    const subTotal = (payload.items || []).reduce((sum, item) => sum + cartLineTotal(item), 0);
    const totals = checkoutTotals(subTotal);
    return {
        ...payload,
        subTotal: totals.subTotal,
        shippingFee: totals.shippingFee,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount
    };
}

async function syncCartPrices(cart) {
    if (!cart || !cart.items?.length) return cart;
    const productIds = cart.items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    let changed = false;
    
    const validItems = [];

    for (const item of cart.items) {
        const product = productMap.get(String(item.product));
        if (!product || product.status !== 'active') {
            changed = true; // Product deleted or hidden, remove it from cart
            continue;
        }
        const quantity = positiveInt(item.quantity);
        const price = effectivePrice(product);
        const image = primaryImage(product);
        const itemTotal = quantity * price;
        if (item.quantity !== quantity || item.name !== product.name || item.image !== image || item.priceAtAdding !== price || item.itemTotal !== itemTotal) {
            item.quantity = quantity;
            item.name = product.name;
            item.image = image;
            item.priceAtAdding = price;
            item.itemTotal = itemTotal;
            changed = true;
        }
        validItems.push(item);
    }

    if (cart.items.length !== validItems.length) {
        cart.items = validItems;
        changed = true;
    }

    const subTotal = cart.items.reduce((sum, item) => sum + cartLineTotal(item), 0);
    if (cart.subTotal !== subTotal) {
        cart.subTotal = subTotal;
        changed = true;
    }
    if (changed) await cart.save();
    return cart;
}

function syncOrderTotals(order) {
    const itemsTotal = (order.items || []).reduce((sum, item) => {
        const savedTotal = Number(item.itemTotal);
        if (Number.isFinite(savedTotal) && savedTotal >= 0) return sum + savedTotal;
        return sum + Math.max(Number(item.purchasePrice || 0), 0) * positiveInt(item.quantity);
    }, 0);
    const totals = checkoutTotals(itemsTotal);
    const changed = Number(order.itemsTotal || 0) !== totals.itemsTotal
        || Number(order.shippingFee || 0) !== totals.shippingFee
        || Number(order.discountAmount || 0) !== totals.discountAmount
        || Number(order.totalAmount || 0) !== totals.totalAmount;
    order.itemsTotal = totals.itemsTotal;
    order.shippingFee = totals.shippingFee;
    order.discountAmount = totals.discountAmount;
    order.totalAmount = totals.totalAmount;
    return changed;
}

function dateRangeFromQuery(query = {}) {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
        from: startOfLocalDay(query.from ? new Date(query.from) : firstDay),
        to: endOfLocalDay(query.to ? new Date(query.to) : today)
    };
}

function dateKey(date = new Date()) {
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function monthKey(date = new Date()) {
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function percentChange(current, previous) {
    const now = Number(current || 0);
    const before = Number(previous || 0);
    if (!before && !now) return 0;
    if (!before) return 100;
    return Number((((now - before) / before) * 100).toFixed(1));
}

function shortProduct(product) {
    if (!product) return null;
    return {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        sku: product.slug,
        image: primaryImage(product),
        price: product.price,
        salePrice: product.salePrice,
        stock: product.stock,
        sold: product.sold,
        rating: product.rating,
        status: product.status,
        category: product.category && typeof product.category === 'object' ? {
            _id: product.category._id,
            name: product.category.name,
            slug: product.category.slug
        } : product.category,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
}

function orderRevenueMatch(extra = {}) {
    return {
        orderStatus: { $nin: ['cancelled', 'returned'] },
        ...extra
    };
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

function normalizePhone(value) {
    return String(value || '').replace(/[^\d+]/g, '').trim();
}

function slugify(value) {
    const base = normalizeSearch(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return base || `san-pham-${Date.now()}`;
}

function isValidVietnamPhone(value) {
    const phone = normalizePhone(value);
    return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone);
}

function validateAddress(address = {}) {
    const normalized = {
        fullName: cleanText(address.fullName, 80),
        phone: normalizePhone(address.phone),
        street: cleanText(address.street || address.address, 160),
        address: cleanText(address.address || address.street, 160),
        ward: cleanText(address.ward, 80),
        district: cleanText(address.district, 80),
        city: cleanText(address.city, 80),
        isDefault: Boolean(address.isDefault)
    };
    if (!normalized.fullName || normalized.fullName.length < 2) return { error: 'Tên người nhận không hợp lệ.' };
    if (!isValidVietnamPhone(normalized.phone)) return { error: 'Số điện thoại không hợp lệ.' };
    if (!normalized.address || !normalized.ward || !normalized.district || !normalized.city) return { error: 'Vui lòng nhập đầy đủ địa chỉ giao hàng.' };
    return { address: normalized };
}

const contactCategories = ['general', 'order', 'consulting', 'complaint', 'warranty', 'feedback'];
const contactSources = ['website', 'facebook', 'zalo', 'email', 'phone'];

function inferContactMeta({ subject = '', message = '', category, priority, source } = {}) {
    const text = normalizeSearch([subject, message].join(' '));
    let inferredCategory = contactCategories.includes(category) ? category : 'general';

    if (!contactCategories.includes(category)) {
        if (/(bao hanh|loi|hong|vo|nut|doi tra|tra hang|hoan tien|refund|return)/i.test(text)) {
            inferredCategory = 'warranty';
        } else if (/(khieu nai|phan anh|khong hai long|cham|tre|that lac|sai|loi dich vu)/i.test(text)) {
            inferredCategory = 'complaint';
        } else if (/(don hang|ma don|van chuyen|giao hang|dia chi|thanh toan|hoa don|csdc|#?dh)/i.test(text)) {
            inferredCategory = 'order';
        } else if (/(tu van|mua|gia|kich thuoc|mau sac|chat lieu|combo|san pham)/i.test(text)) {
            inferredCategory = 'consulting';
        } else if (/(gop y|de xuat|feedback|nhan xet)/i.test(text)) {
            inferredCategory = 'feedback';
        }
    }

    const urgent = /(khieu nai|gap|khan|loi|hong|vo|hoan tien|that lac|tre|doi tra|tra hang|bao hanh)/i.test(text);
    const inferredPriority = priority === 'high' || urgent ? 'high' : 'normal';
    const inferredSource = contactSources.includes(source) ? source : 'website';
    const orderMatch = [subject, message].join(' ').match(/CSDC\d{8}(?:-\d{2})?|#?DH[A-Z0-9-]+/i);

    return {
        category: inferredCategory,
        priority: inferredPriority,
        source: inferredSource,
        relatedOrderCode: orderMatch ? orderMatch[0].replace(/^#/, '').toUpperCase() : undefined
    };
}

module.exports = {
    escapeRegex,
    startOfLocalDay,
    endOfLocalDay,
    cleanText,
    sanitizeInput,
    validateObjectId,
    normalizeSearch,
    generateFuzzyRegex,
    orderDateCode,
    nextOrderCode,
    toPublicUser,
    primaryImage,
    effectivePrice,
    positiveInt,
    promotionDiscountAmount,
    findUsablePromotion,
    checkoutTotals,
    cartLineTotal,
    cartResponse,
    syncCartPrices,
    syncOrderTotals,
    dateRangeFromQuery,
    dateKey,
    monthKey,
    percentChange,
    shortProduct,
    orderRevenueMatch,
    isValidEmail,
    normalizePhone,
    slugify,
    isValidVietnamPhone,
    validateAddress,
    contactCategories,
    contactSources,
    inferContactMeta
};
