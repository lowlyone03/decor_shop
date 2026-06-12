const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Contact = require('../models/Contact');
const Review = require('../models/Review');
const Promotion = require('../models/Promotion');
const StaffShift = require('../models/StaffShift');
const StaffKPI = require('../models/StaffKPI');
const Interaction = require('../models/Interaction');
const { escapeRegex, sanitizeInput, cleanText } = require('../utils/helpers');

// ── Helpers ──────────────────────────────────────
function vnDate(date = new Date()) {
    return new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function vnMinuteNow() {
    const now = new Date();
    const h = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }));
    const m = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', minute: 'numeric' }));
    return h * 60 + m;
}

function monthKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// State machine — luồng trạng thái hợp lệ cho NVBH
const STAFF_TRANSITIONS = {
    pending:                ['processing', 'cancelled'],
    processing:             ['shipping', 'cancelled'],
    shipping:               ['completed'],
    cancellation_requested: ['cancelled'],
    return_requested:       ['refunding'],
    // Các trạng thái khóa — NVBH không được chạm
    // completed, cancelled, refunding, refunded → không có transition
};

const HIGH_VALUE_THRESHOLD = 100000000;

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
exports.getDashboard = async (req, res) => {
    try {
        const staffId = req.user._id;
        const today = vnDate();
        const currentMinute = vnMinuteNow();

        // Tìm ca hiện tại
        const activeShift = await StaffShift.findOne({
            staff: staffId, status: 'active', shiftDate: today
        }).lean();

        const upcomingShiftToday = !activeShift ? await StaffShift.findOne({
            staff: staffId, status: 'scheduled', shiftDate: today,
            endMinute: { $gt: currentMinute }
        }).sort({ startMinute: 1 }).lean() : null;

        let shiftStatus = 'no_shift_today';
        let currentShift = null;
        if (activeShift) {
            shiftStatus = 'in_shift';
            currentShift = activeShift;
        } else if (upcomingShiftToday) {
            if (upcomingShiftToday.startMinute <= currentMinute + 30) {
                shiftStatus = 'not_checked_in';
            } else {
                shiftStatus = 'upcoming_shift_today';
            }
            currentShift = upcomingShiftToday;
        }

        // Thống kê đơn
        const [pendingOrders, myProcessingOrders, pendingContacts, pendingReviews] = await Promise.all([
            Order.countDocuments({ orderStatus: 'pending' }),
            Order.countDocuments({ processedBy: staffId, orderStatus: { $in: ['processing', 'shipping'] } }),
            Contact.countDocuments({ status: 'pending' }),
            Review.countDocuments({ status: 'pending' })
        ]);

        // Ca sắp tới (3 ca kế tiếp)
        const upcomingShifts = await StaffShift.find({
            staff: staffId,
            status: 'scheduled',
            $or: [
                { shiftDate: { $gt: today } },
                { shiftDate: today, startMinute: { $gt: currentMinute } }
            ]
        }).sort({ shiftDate: 1, shiftOrder: 1 }).limit(3).lean();

        // CRM stats
        const abandonedCartCount = await Cart.countDocuments({
            updatedAt: { $lte: new Date(Date.now() - 1 * 60 * 60 * 1000) },
            'items.0': { $exists: true },
            $or: [
                { crmClaimedBy: null },
                { crmClaimExpires: { $lt: new Date() } }
            ]
        });

        // Stats trong ca hiện tại
        let shiftStats = { ordersProcessed: 0, revenueInShift: 0 };
        if (activeShift) {
            shiftStats = activeShift.stats || shiftStats;
        }

        res.json({
            admin: { name: req.user.name, role: req.user.role, avatar: req.user.avatar },
            shiftStatus,
            currentShift,
            shiftStats,
            checklist: {
                pendingOrders,
                myProcessingOrders,
                pendingContacts,
                pendingReviews
            },
            crm: { abandonedCartCount },
            upcomingShifts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// CA TRỰC
// ═══════════════════════════════════════════════════════════════
exports.getMyShifts = async (req, res) => {
    try {
        const from = req.query.from || vnDate();
        const to = req.query.to || vnDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        const shifts = await StaffShift.find({
            staff: req.user._id,
            shiftDate: { $gte: from, $lte: to }
        }).sort({ shiftDate: 1, shiftOrder: 1 }).lean();
        res.json({ shifts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.checkIn = async (req, res) => {
    try {
        const shift = await StaffShift.findById(req.params.id);
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca làm việc.' });
        if (String(shift.staff) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Đây không phải ca của bạn.' });
        }
        if (shift.status !== 'scheduled') {
            return res.status(400).json({ message: `Ca đang ở trạng thái "${shift.status}", không thể check-in.` });
        }

        const today = vnDate();
        const currentMinute = vnMinuteNow();

        // Chỉ cho check-in sớm tối đa 30 phút & trước khi ca kết thúc
        if (shift.shiftDate !== today) {
            return res.status(400).json({ message: 'Chỉ có thể check-in vào đúng ngày ca làm việc.' });
        }
        if (currentMinute < shift.startMinute - 30) {
            return res.status(400).json({ message: 'Chưa đến giờ check-in. Bạn có thể check-in sớm tối đa 30 phút.' });
        }
        if (currentMinute >= shift.endMinute) {
            return res.status(400).json({ message: 'Ca đã kết thúc, không thể check-in.' });
        }

        shift.status = 'active';
        shift.checkInAt = new Date();
        shift.isLateCheckIn = currentMinute > shift.startMinute;
        await shift.save();

        // Cập nhật KPI lateCount nếu trễ
        if (shift.isLateCheckIn) {
            await StaffKPI.findOneAndUpdate(
                { staff: req.user._id, month: monthKey() },
                { $inc: { lateCount: 1, totalShifts: 1 } },
                { upsert: true }
            );
        } else {
            await StaffKPI.findOneAndUpdate(
                { staff: req.user._id, month: monthKey() },
                { $inc: { totalShifts: 1 } },
                { upsert: true }
            );
        }

        const populated = await StaffShift.findById(shift._id).populate('staff', 'name email avatar').lean();
        res.json({ message: 'Check-in thành công!', shift: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.checkOut = async (req, res) => {
    try {
        const shift = await StaffShift.findById(req.params.id);
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca làm việc.' });
        if (String(shift.staff) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Đây không phải ca của bạn.' });
        }
        if (shift.status !== 'active') {
            return res.status(400).json({ message: `Ca đang ở trạng thái "${shift.status}", không thể check-out.` });
        }

        // Bắt buộc báo cáo cuối ca
        const { content, incidents, handover } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Vui lòng nhập báo cáo cuối ca trước khi check-out.' });
        }

        shift.status = 'completed';
        shift.checkOutAt = new Date();
        shift.report = {
            content: sanitizeInput(content, 2000),
            incidents: incidents ? sanitizeInput(incidents, 1000) : undefined,
            handover: handover ? sanitizeInput(handover, 1000) : undefined
        };

        await shift.save();

        // Cập nhật KPI — chốt lương ca
        await StaffKPI.findOneAndUpdate(
            { staff: req.user._id, month: monthKey() },
            {
                $inc: {
                    completedShifts: 1,
                    totalHours: shift.durationHours,
                    totalSalary: shift.totalPay,
                    totalOrders: shift.stats?.ordersProcessed || 0,
                    totalRevenue: shift.stats?.revenueInShift || 0
                }
            },
            { upsert: true }
        );

        const populated = await StaffShift.findById(shift._id).populate('staff', 'name email avatar').lean();
        res.json({ message: 'Check-out thành công! Lương ca đã được chốt.', shift: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// ĐƠN HÀNG
// ═══════════════════════════════════════════════════════════════
exports.getOrders = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 5), 100);
        const filter = {};

        if (req.query.status && req.query.status !== 'all') filter.orderStatus = req.query.status;
        if (req.query.mine === 'true') filter.processedBy = req.user._id;
        if (req.query.q) {
            const regex = new RegExp(escapeRegex(req.query.q), 'i');
            filter.$or = [{ orderCode: regex }, { 'shippingInfo.fullName': regex }, { 'shippingInfo.phone': regex }];
            const matchingUsers = await User.find({
                $or: [{ name: regex }, { email: regex }, { phone: regex }]
            }).select('_id').lean();
            if (matchingUsers.length > 0) {
                filter.$or.push({ customer: { $in: matchingUsers.map(u => u._id) } });
            }
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('customer', 'name email phone avatar')
                .populate('processedBy', 'name staffCode')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter)
        ]);

        res.json({ orders, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getOrderDetail = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email phone avatar addresses')
            .populate('processedBy', 'name staffCode')
            .populate('lastUpdatedBy', 'name staffCode')
            .populate('statusHistory.changedBy', 'name staffCode')
            .lean();
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Nhận đơn — atomic claim
exports.claimOrder = async (req, res) => {
    try {
        const result = await Order.findOneAndUpdate(
            { _id: req.params.id, orderStatus: 'pending', processedBy: null },
            {
                processedBy: req.user._id,
                lastUpdatedBy: req.user._id,
                $push: {
                    statusHistory: {
                        status: 'claimed',
                        note: 'Nhân viên nhận xử lý đơn',
                        changedBy: req.user._id,
                        shiftId: req.activeShift?._id
                    }
                }
            },
            { new: true }
        ).populate('customer', 'name email phone')
         .populate('processedBy', 'name staffCode');

        if (!result) {
            return res.status(409).json({ message: 'Đơn hàng đã được nhận bởi người khác hoặc không còn ở trạng thái chờ.' });
        }

        // Cập nhật stats ca
        if (req.activeShift) {
            await StaffShift.updateOne(
                { _id: req.activeShift._id },
                { $inc: { 'stats.ordersProcessed': 1 } }
            );
        }

        res.json({ message: 'Đã nhận đơn hàng thành công!', order: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Đổi trạng thái — optimistic lock + state machine + duyệt đơn cao
exports.updateOrderStatus = async (req, res) => {
    try {
        const newStatus = req.body.newStatus || req.body.status;
        const { expectedStatus, note } = req.body;
        if (!newStatus) return res.status(400).json({ message: 'Thiếu trạng thái mới.' });

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        // Optimistic lock — kiểm tra trạng thái kỳ vọng
        if (expectedStatus && order.orderStatus !== expectedStatus) {
            return res.status(409).json({
                message: `Đơn hàng đã bị thay đổi trạng thái (hiện tại: ${order.orderStatus}). Vui lòng tải lại.`,
                currentStatus: order.orderStatus
            });
        }

        // Kiểm tra quyền — chỉ người nhận đơn mới được đổi trạng thái
        if (order.processedBy && String(order.processedBy) !== String(req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Đơn hàng đang được xử lý bởi nhân viên khác.' });
        }

        // State machine — kiểm tra luồng hợp lệ
        const allowedNext = STAFF_TRANSITIONS[order.orderStatus];
        if (!allowedNext || !allowedNext.includes(newStatus)) {
            return res.status(400).json({
                message: `Không thể chuyển từ "${order.orderStatus}" sang "${newStatus}".`,
                allowedTransitions: allowedNext || []
            });
        }

        // Duyệt đơn giá trị cao
        if (newStatus === 'completed' && order.totalAmount > HIGH_VALUE_THRESHOLD && req.user.role !== 'admin') {
            return res.status(403).json({
                message: `Đơn hàng > ${(HIGH_VALUE_THRESHOLD / 1000000).toFixed(0)} triệu cần admin duyệt để hoàn tất.`,
                requiresAdminApproval: true
            });
        }

        order.orderStatus = newStatus;
        order.lastUpdatedBy = req.user._id;
        order.statusHistory.push({
            status: newStatus,
            note: note ? sanitizeInput(note, 500) : undefined,
            changedBy: req.user._id,
            shiftId: req.activeShift?._id
        });

        if (newStatus === 'completed') {
            order.deliveredAt = new Date();
            if (order.paymentMethod === 'cod') order.paymentStatus = 'paid';
        }

        await order.save();

        // Cập nhật stats ca + revenue
        if (req.activeShift && newStatus === 'completed') {
            await StaffShift.updateOne(
                { _id: req.activeShift._id },
                { $inc: { 'stats.revenueInShift': order.totalAmount } }
            );
        }

        res.json({ message: `Đã chuyển trạng thái đơn sang "${newStatus}".`, order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// KHÁCH HÀNG (read-only)
// ═══════════════════════════════════════════════════════════════
exports.getCustomers = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 5), 100);
        const filter = { role: 'customer' };
        if (req.query.q) {
            const regex = new RegExp(escapeRegex(req.query.q), 'i');
            filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
        }
        const [customers, total] = await Promise.all([
            User.find(filter).select('name email phone avatar status createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            User.countDocuments(filter)
        ]);
        res.json({ customers, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCustomerDetail = async (req, res) => {
    try {
        const customer = await User.findOne({ _id: req.params.id, role: 'customer' })
            .select('name email phone avatar addresses status createdAt').lean();
        if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });

        const orders = await Order.find({ customer: req.params.id })
            .select('orderCode totalAmount orderStatus paymentMethod createdAt')
            .sort({ createdAt: -1 }).limit(20).lean();

        res.json({ customer, orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// SẢN PHẨM / DANH MỤC / TỒN KHO (read-only, ẩn giá vốn)
// ═══════════════════════════════════════════════════════════════
exports.getProducts = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 5), 100);
        const filter = {};
        if (req.query.q) {
            const regex = new RegExp(escapeRegex(req.query.q), 'i');
            filter.$or = [{ name: regex }, { sku: regex }];
        }
        if (req.query.category) filter.category = req.query.category;

        const [products, total] = await Promise.all([
            Product.find(filter)
                .select('-costPrice')  // ẩn giá vốn
                .populate('category', 'name slug')
                .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Product.countDocuments(filter)
        ]);
        res.json({ products, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 }).lean();
        const active = categories.filter(c => c.status === 'active').length;
        const featured = categories.filter(c => c.isFeatured).length;
        const hidden = categories.filter(c => c.status === 'hidden').length;

        const categoryIds = categories.map(c => c._id);
        const productCounts = await Product.aggregate([
            { $match: { category: { $in: categoryIds }, status: { $ne: 'deleted' } } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const productCountMap = Object.fromEntries(productCounts.map(item => [String(item._id), item.count]));

        const categoriesWithCount = categories.map(cat => ({ ...cat, productCount: productCountMap[String(cat._id)] || 0 }));

        res.json({ 
            categories: categoriesWithCount,
            total: categories.length,
            page: 1,
            pages: 1,
            allCategories: categories.map(c => ({ _id: c._id, name: c.name, slug: c.slug, image: c.image })),
            stats: {
                total: categories.length,
                active,
                featured,
                hidden
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInventory = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 5), 100);
        const filter = {};
        if (req.query.q) {
            const regex = new RegExp(escapeRegex(req.query.q), 'i');
            filter.$or = [{ name: regex }, { sku: regex }];
        }
        const [products, total, allProducts] = await Promise.all([
            Product.find(filter)
                .select('name sku stock images status category price')
                .populate('category', 'name')
                .sort({ stock: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            Product.countDocuments(filter),
            Product.find({}).lean()
        ]);
        const stats = {
            totalSKU: allProducts.length,
            totalValue: allProducts.reduce((sum, p) => sum + (p.stock * (p.price || 0)), 0),
            lowStockCount: allProducts.filter(p => p.stock > 0 && p.stock <= 20).length,
            outOfStockCount: allProducts.filter(p => p.stock === 0).length,
            importQty: 0,
            importValue: 0,
            exportQty: 0,
            exportValue: 0
        };
        res.json({ products, total, page, pages: Math.ceil(total / limit) || 1, stats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// KHUYẾN MÃI (chỉ active)
// ═══════════════════════════════════════════════════════════════
exports.getPromotions = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 5), 50);
        const filter = {};
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }

        const [promotions, total, statsRows] = await Promise.all([
            Promotion.find(filter)
                .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Promotion.countDocuments(filter),
            Promotion.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        ]);

        const statsMap = Object.fromEntries(statsRows.map(item => [item._id, item.count]));
        const totalCount = await Promotion.countDocuments();

        res.json({ 
            promotions,
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            stats: {
                total: totalCount,
                active: statsMap.active || 0,
                expired: statsMap.expired || 0,
                disabled: statsMap.disabled || 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// ĐÁNH GIÁ
// ═══════════════════════════════════════════════════════════════
exports.getReviews = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 5), 100);
        const filter = {};
        if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate('product', 'name images')
                .populate('customer', 'name email avatar')
                .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Review.countDocuments(filter)
        ]);
        res.json({ reviews, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.replyReview = async (req, res) => {
    try {
        // Staff không xóa review, chỉ có thể phản hồi (duyệt pending → active)
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });

        if (req.body.status && ['active', 'pending'].includes(req.body.status)) {
            review.status = req.body.status;
        }
        await review.save();

        // Cập nhật KPI
        await StaffKPI.findOneAndUpdate(
            { staff: req.user._id, month: monthKey() },
            { $inc: { reviewsHandled: 1 } },
            { upsert: true }
        );

        res.json({ message: 'Đã xử lý đánh giá.', review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// LIÊN HỆ
// ═══════════════════════════════════════════════════════════════
exports.getContacts = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 5), 100);
        const filter = {};
        if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
        if (req.query.q) {
            const regex = new RegExp(escapeRegex(req.query.q), 'i');
            filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }, { subject: regex }];
        }
        const [contacts, total] = await Promise.all([
            Contact.find(filter)
                .populate('assignedTo', 'name staffCode')
                .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Contact.countDocuments(filter)
        ]);
        res.json({ contacts, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getContactDetail = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id)
            .populate('assignedTo', 'name staffCode')
            .populate('handledBy', 'name staffCode')
            .lean();
        if (!contact) return res.status(404).json({ message: 'Không tìm thấy liên hệ.' });
        res.json(contact);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.replyContact = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ message: 'Không tìm thấy liên hệ.' });

        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Nội dung phản hồi không được để trống.' });
        }

        contact.replies.push({
            sender: 'admin',
            senderName: req.user.name,
            senderAvatar: req.user.avatar,
            message: sanitizeInput(message, 2000)
        });

        if (contact.status === 'pending') contact.status = 'processing';
        if (!contact.handledBy) {
            contact.handledBy = req.user._id;
            contact.handledAt = new Date();
        }

        await contact.save();

        await StaffKPI.findOneAndUpdate(
            { staff: req.user._id, month: monthKey() },
            { $inc: { contactsHandled: 1 } },
            { upsert: true }
        );

        res.json({ message: 'Đã gửi phản hồi.', contact });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateContactStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'processing', 'resolved'].includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }
        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            {
                status,
                handledBy: req.user._id,
                handledAt: new Date()
            },
            { new: true }
        );
        if (!contact) return res.status(404).json({ message: 'Không tìm thấy liên hệ.' });
        res.json({ message: 'Đã cập nhật trạng thái.', contact });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// CRM — BÁN CHỦ ĐỘNG
// ═══════════════════════════════════════════════════════════════

// Giỏ hàng bỏ quên (1-4h, loại cooldown 48h, loại đã claim)
exports.getAbandonedCarts = async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

        const carts = await Cart.find({
            updatedAt: { $lte: oneHourAgo },  // treo quá 1h, không có cận trên
            'items.0': { $exists: true },
            customer: { $exists: true, $ne: null },
            $or: [
                { crmClaimedBy: null },
                { crmClaimExpires: { $lt: new Date() } }
            ]
        })
        .populate('customer', 'name email phone avatar')
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean();

        // Lọc khách đang trong cooldown 48h (đã có interaction gần đây)
        const customerIds = carts.map(c => c.customer?._id).filter(Boolean);
        const recentInteractions = await Interaction.find({
            customer: { $in: customerIds },
            source: 'abandoned_cart',
            createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        }).select('customer').lean();
        const cooldownSet = new Set(recentInteractions.map(i => String(i.customer)));

        const filtered = carts.filter(c => !cooldownSet.has(String(c.customer?._id)));

        res.json({ carts: filtered, total: filtered.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Claim giỏ (giữ chỗ 30 phút)
exports.claimAbandonedCart = async (req, res) => {
    try {
        const result = await Cart.findOneAndUpdate(
            {
                _id: req.params.id,
                $or: [
                    { crmClaimedBy: null },
                    { crmClaimExpires: { $lt: new Date() } }
                ]
            },
            {
                crmClaimedBy: req.user._id,
                crmClaimExpires: new Date(Date.now() + 30 * 60 * 1000)
            },
            { new: true }
        ).populate('customer', 'name email phone');

        if (!result) {
            return res.status(409).json({ message: 'Giỏ hàng đã được nhân viên khác nhận chăm sóc.' });
        }

        res.json({ message: 'Đã nhận chăm sóc giỏ hàng.', cart: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Follow-up khách cũ
exports.getFollowUps = async (req, res) => {
    try {
        const daysAgo = parseInt(req.query.days) || 30;
        const targetDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const rangeTo = new Date(targetDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        const customers = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'completed',
                    createdAt: { $gte: targetDate, $lte: rangeTo }
                }
            },
            {
                $group: {
                    _id: '$customer',
                    lastOrderDate: { $max: '$createdAt' },
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$totalAmount' }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users', localField: '_id', foreignField: '_id', as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 1,
                    name: '$user.name',
                    email: '$user.email',
                    phone: '$user.phone',
                    avatar: '$user.avatar',
                    lastOrderDate: 1,
                    totalOrders: 1,
                    totalSpent: 1
                }
            }
        ]);

        res.json({ customers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Nhật ký liên hệ
exports.getInteractions = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 5), 50);
        const filter = {};
        if (req.query.customer) filter.customer = req.query.customer;
        if (req.query.source) filter.source = req.query.source;

        const [interactions, total] = await Promise.all([
            Interaction.find(filter)
                .populate('customer', 'name email phone avatar')
                .populate('staff', 'name staffCode')
                .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Interaction.countDocuments(filter)
        ]);
        res.json({ interactions, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createInteraction = async (req, res) => {
    try {
        const { customer, channel, source, result, note, followUpDate, relatedCart, relatedOrder } = req.body;
        if (!customer || !channel) {
            return res.status(400).json({ message: 'Cần chọn khách hàng và kênh liên hệ.' });
        }

        const interaction = await Interaction.create({
            customer,
            staff: req.user._id,
            shift: req.activeShift?._id,
            channel,
            source: source || 'manual',
            result: result || 'following',
            note: note ? sanitizeInput(note, 2000) : undefined,
            followUpDate: followUpDate ? new Date(followUpDate) : undefined,
            relatedCart,
            relatedOrder
        });

        // Nếu kết quả là chốt đơn → gắn "người cứu đơn"
        if (result === 'order_placed' && relatedOrder) {
            await Order.updateOne(
                { _id: relatedOrder },
                { recoveredBy: req.user._id }
            );
            await StaffKPI.findOneAndUpdate(
                { staff: req.user._id, month: monthKey() },
                { $inc: { ordersRescued: 1 } },
                { upsert: true }
            );
        }

        await StaffKPI.findOneAndUpdate(
            { staff: req.user._id, month: monthKey() },
            { $inc: { interactionsLogged: 1 } },
            { upsert: true }
        );

        const populated = await Interaction.findById(interaction._id)
            .populate('customer', 'name email phone')
            .populate('staff', 'name staffCode')
            .lean();
        res.status(201).json({ message: 'Đã ghi nhật ký liên hệ.', interaction: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// KPI & LƯƠNG
// ═══════════════════════════════════════════════════════════════
exports.getMyKPI = async (req, res) => {
    try {
        const month = req.query.month || monthKey();
        let kpi = await StaffKPI.findOne({ staff: req.user._id, month }).lean();
        if (!kpi) {
            kpi = { staff: req.user._id, month, totalOrders: 0, completedOrders: 0, cancelledOrders: 0, returnedOrders: 0, totalRevenue: 0, avgProcessingTime: 0, totalShifts: 0, completedShifts: 0, totalHours: 0, lateCount: 0, totalSalary: 0, reviewsHandled: 0, contactsHandled: 0, interactionsLogged: 0, ordersRescued: 0 };
        }
        res.json(kpi);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMySalary = async (req, res) => {
    try {
        const month = req.query.month || monthKey();
        const kpi = await StaffKPI.findOne({ staff: req.user._id, month }).lean();
        const completedShifts = kpi?.completedShifts || 0;
        const totalSalary = completedShifts * 300000;

        // Lấy chi tiết ca trong tháng
        const [year, m] = month.split('-');
        const fromDate = `${year}-${m}-01`;
        const lastDay = new Date(Number(year), Number(m), 0).getDate();
        const toDate = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;

        let shifts = await StaffShift.find({
            staff: req.user._id,
            shiftDate: { $gte: fromDate, $lte: toDate }
        }).sort({ shiftDate: 1, shiftOrder: 1 }).lean();

        const todayDate = new Date();
        const todayStr = todayDate.toISOString().split('T')[0];

        shifts = shifts.map(s => {
            if (s.status === 'scheduled') {
                if (s.shiftDate < todayStr) s.status = 'absent';
            } else if (s.status === 'absent') {
                if (s.shiftDate > todayStr) s.status = 'scheduled';
            }
            return s;
        });

        res.json({
            month,
            completedShifts,
            totalSalary,
            payPerShift: 300000,
            lateCount: kpi?.lateCount || 0,
            totalHours: kpi?.totalHours || 0,
            shifts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// HỒ SƠ CÁ NHÂN
// ═══════════════════════════════════════════════════════════════
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('name email phone avatar staffCode baseSalaryPerHour role status createdAt')
            .lean();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        // Whitelist — chỉ cho sửa tên, avatar, mật khẩu
        const update = {};
        if (req.body.name) update.name = cleanText(req.body.name, 80);
        if (req.body.avatar) update.avatar = req.body.avatar;
        if (req.body.phone) update.phone = req.body.phone;

        // Chặn sửa các trường nhạy cảm
        if (req.body.staffCode || req.body.role || req.body.baseSalaryPerHour || req.body.email || req.body.status) {
            return res.status(403).json({ message: 'Bạn không có quyền sửa các trường này.' });
        }

        // Đổi mật khẩu
        if (req.body.newPassword) {
            const bcrypt = require('bcryptjs');
            const user = await User.findById(req.user._id);
            if (!req.body.currentPassword) {
                return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại.' });
            }
            const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
            }
            update.password = await bcrypt.hash(req.body.newPassword, 10);
        }

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
            .select('name email phone avatar staffCode baseSalaryPerHour role status');
        res.json({ message: 'Đã cập nhật hồ sơ.', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
