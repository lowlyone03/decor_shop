const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Contact = require('../models/Contact');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Promotion = require('../models/Promotion');
const Banner = require('../models/Banner');
const Blog = require('../models/Blog');
const Notification = require('../models/Notification');
const Subscriber = require('../models/Subscriber');
const StaffShift = require('../models/StaffShift');
const { localDateString, localMinutes, isShiftActiveNow } = require('../utils/staffShift');
const InventoryTransaction = require('../models/InventoryTransaction');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const appCache = require('../utils/cache');
const { hashPassword } = require('../utils/crypto');
const {
    escapeRegex,
    dateRangeFromQuery,
    startOfLocalDay,
    endOfLocalDay,
    orderRevenueMatch,
    percentChange,
    shortProduct,
    toPublicUser,
    slugify,
    cleanText,
    sanitizeInput,
    validateObjectId,
    contactCategories,
    isValidEmail
} = require('../utils/helpers');
const { hydrateContactsWithCustomers, hydrateContactWithCustomer } = require('../utils/contactPresenter');

// BOD Approval Simulator States
let bannerBODStatus = 'locked';
let blogBODStatus = 'locked';

async function restoreCancelledOrderStock(order) {
    const restoreTasks = (order.items || [])
        .filter((item) => item.product && Number(item.quantity) > 0)
        .map((item) => Product.updateOne(
            { _id: item.product },
            { $inc: { stock: Number(item.quantity), sold: -Number(item.quantity) } }
        ));

    if (restoreTasks.length) await Promise.all(restoreTasks);
}

function addDaysLocalString(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return localDateString(date);
}


async function validateShiftRequest(payload, excludeId = null) {
    const window = buildShiftWindow(payload);
    if (window.error) return { error: window.error };

    const staff = await User.findOne({ _id: payload.staff, role: 'staff' }).select('_id name email role status').lean();
    if (!staff) return { error: 'Khong tim thay nhan vien ban hang.' };
    if (staff.status !== 'active') return { error: 'Tai khoan nhan vien dang bi khoa.' };

    const baseFilter = {
        staff: staff._id,
        shiftDate: window.shiftDate,
        status: { $ne: 'cancelled' }
    };
    if (excludeId) baseFilter._id = { $ne: excludeId };

    const sameDayShift = await StaffShift.findOne(baseFilter).lean();
    if (sameDayShift) return { error: 'Moi nhan vien chi duoc co mot ca trong cung ngay.' };

    return { staff, window };
}

function ensureAdminOnly(req, res) {
    if (req.user?.role === 'admin') return true;
    res.status(403).json({ message: 'Chi quan tri vien moi duoc quan ly nhan vien va ca lam.' });
    return false;
}

// Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const { from, to } = dateRangeFromQuery(req.query);
        const todayStart = startOfLocalDay();
        const todayEnd = endOfLocalDay();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yesterdayStart = startOfLocalDay(yesterday);
        const yesterdayEnd = endOfLocalDay(yesterday);
        const rangeMatch = { createdAt: { $gte: from, $lte: to } };

        const [
            revenueTodayRows,
            revenueYesterdayRows,
            ordersToday,
            ordersYesterday,
            pendingOrders,
            returnOrders,
            activeProducts,
            newCustomersToday,
            newCustomersYesterday,
            statusRows,
            revenueByDayRows,
            revenueByMonthRows,
            recentOrders,
            lowStockProducts,
            bestSellingProducts,
            pendingReviewDocs,
            latestReviewDocs,
            contacts,
            promotionRows,
            activePromotions,
            bannersCount,
            categoriesCount,
            adminsCount,
            customersCount,
            subscribersCount
        ] = await Promise.all([
            Order.aggregate([
                { $match: orderRevenueMatch({ createdAt: { $gte: todayStart, $lte: todayEnd } }) },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
            ]),
            Order.aggregate([
                { $match: orderRevenueMatch({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }) },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
            ]),
            Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
            Order.countDocuments({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
            Order.countDocuments({ orderStatus: 'pending' }),
            Order.countDocuments({ $or: [{ orderStatus: 'returned' }, { 'returnRequest.status': 'pending' }] }),
            Product.countDocuments({ status: 'active' }),
            User.countDocuments({ role: 'customer', createdAt: { $gte: todayStart, $lte: todayEnd } }),
            User.countDocuments({ role: 'customer', createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
            Order.aggregate([
                { $match: rangeMatch },
                { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
            ]),
            Order.aggregate([
                { $match: orderRevenueMatch(rangeMatch) },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Order.aggregate([
                { $match: orderRevenueMatch(rangeMatch) },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Order.find({}).populate('customer', 'name email avatar').sort({ createdAt: -1 }).limit(20).lean(),
            Product.find({ status: 'active' }).sort({ stock: 1, sold: -1 }).limit(6).lean(),
            Product.find({ status: 'active' }).sort({ sold: -1, rating: -1 }).limit(4).lean(),
            Review.find({ status: 'pending' }).populate('customer', 'name avatar').populate('product', 'name images slug').sort({ createdAt: -1 }).limit(4).lean(),
            Review.find({}).populate('customer', 'name avatar').populate('product', 'name images slug').sort({ createdAt: -1 }).limit(4).lean(),
            Contact.find({}).sort({ updatedAt: -1 }).limit(4).lean(),
            Order.aggregate([
                { $match: orderRevenueMatch({ ...rangeMatch, promotionCode: { $exists: true, $ne: null } }) },
                { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 }, discount: { $sum: '$discountAmount' } } }
            ]),
            Promotion.find({ status: 'active' }).sort({ endDate: 1 }).limit(5).lean(),
            Banner.countDocuments({ status: 'active' }),
            Category.countDocuments({ status: 'active' }),
            User.countDocuments({ role: 'admin', status: 'active' }),
            User.countDocuments({ role: 'customer' }),
            Subscriber.countDocuments({ status: 'active' })
        ]);

        const revenueToday = revenueTodayRows[0]?.total || 0;
        const revenueYesterday = revenueYesterdayRows[0]?.total || 0;
        const totalRangeOrders = statusRows.reduce((sum, item) => sum + item.count, 0);
        const deliveredRangeOrders = statusRows.find((item) => item._id === 'completed')?.count || 0;
        const statusCounts = statusRows.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        const orderStatusSummary = [
            { status: 'pending', count: statusCounts.pending || 0 },
            { status: 'processing', count: statusCounts.processing || 0 },
            { status: 'shipping', count: statusCounts.shipping || 0 },
            { status: 'completed', count: statusCounts.completed || 0 },
            { status: 'cancellation_requested', count: statusCounts.cancellation_requested || 0 },
            { status: 'cancelled', count: statusCounts.cancelled || 0 },
            { status: 'return_requested', count: statusCounts.return_requested || 0 },
            { status: 'refunding', count: statusCounts.refunding || 0 },
            { status: 'refunded', count: statusCounts.refunded || 0 }
        ].map(({ status, count }) => {
            return { status, count, percent: totalRangeOrders ? Number(((count / totalRangeOrders) * 100).toFixed(1)) : 0 };
        });
        const reviewsForDashboard = pendingReviewDocs.length ? pendingReviewDocs : latestReviewDocs;
        const promotionMetrics = promotionRows[0] || { revenue: 0, orders: 0, discount: 0 };
        const completionRate = totalRangeOrders ? Number(((deliveredRangeOrders / totalRangeOrders) * 100).toFixed(1)) : 0;
        const employees = [
            { name: 'Nguyen Thi Mai', shift: '08:00 - 12:00', status: 'on' },
            { name: 'Tran Van Nam', shift: '13:00 - 17:00', status: 'on' },
            { name: 'Le Thi Huong', shift: '18:00 - 22:00', status: 'on' },
            { name: 'Pham Quoc Huy', shift: 'Nghi', status: 'off' },
            { name: 'Dang Minh Anh', shift: '08:00 - 12:00', status: 'on' }
        ];

        res.json({
            period: { from, to },
            admin: toPublicUser(req.user),
            kpis: {
                revenueToday,
                revenueChange: percentChange(revenueToday, revenueYesterday),
                newOrders: ordersToday,
                newOrdersChange: percentChange(ordersToday, ordersYesterday),
                pendingOrders,
                returnOrders,
                activeProducts,
                newCustomers: newCustomersToday,
                newCustomersChange: percentChange(newCustomersToday, newCustomersYesterday),
                completionRate,
                onlineEmployees: employees.filter((item) => item.status === 'on').length
            },
            revenue: {
                byDay: revenueByDayRows.map((item) => ({ label: item._id, revenue: item.revenue, orders: item.orders })),
                byMonth: revenueByMonthRows.map((item) => ({ label: item._id, revenue: item.revenue, orders: item.orders }))
            },
            orders: {
                total: totalRangeOrders,
                statuses: orderStatusSummary,
                recent: recentOrders.map((order) => ({
                    _id: order._id,
                    orderCode: order.orderCode,
                    customerName: order.shippingInfo?.fullName || order.customer?.name || 'Khach hang',
                    totalAmount: order.totalAmount,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: order.paymentStatus,
                    orderStatus: order.orderStatus,
                    createdAt: order.createdAt
                }))
            },
            inventory: lowStockProducts.map(shortProduct),
            bestSellers: bestSellingProducts.map(shortProduct),
            reviews: reviewsForDashboard.map((review) => ({
                _id: review._id,
                customerName: review.customer?.name || 'Khach hang',
                customerAvatar: review.customer?.avatar,
                productName: review.product?.name || 'San pham',
                rating: review.rating,
                comment: review.comment,
                status: review.status,
                createdAt: review.createdAt
            })),
            contacts: contacts.map((contact) => ({
                _id: contact._id,
                fullName: contact.fullName,
                email: contact.email,
                phone: contact.phone,
                subject: contact.subject,
                message: contact.message,
                status: contact.status,
                createdAt: contact.createdAt
            })),
            promotions: {
                revenue: promotionMetrics.revenue || 0,
                orders: promotionMetrics.orders || 0,
                discount: promotionMetrics.discount || 0,
                conversionRate: totalRangeOrders ? Number((((promotionMetrics.orders || 0) / totalRangeOrders) * 100).toFixed(1)) : 0,
                active: activePromotions.map((promotion) => ({
                    _id: promotion._id,
                    code: promotion.code,
                    name: promotion.name,
                    usedCount: promotion.usedCount,
                    maxUsage: promotion.maxUsage,
                    endDate: promotion.endDate
                }))
            },
            employees,
            totals: {
                banners: bannersCount,
                categories: categoriesCount,
                admins: adminsCount,
                customers: customersCount,
                subscribers: subscribersCount
            },
            generatedAt: new Date()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Orders
exports.getOrders = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
        const filter = {};

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
        if (req.query.status && req.query.status !== 'all') {
            filter.orderStatus = req.query.status;
        }
        if (req.query.mine === 'true') {
            filter.processedBy = req.user._id;
        }

        const [orders, total, statsRows] = await Promise.all([
            Order.find(filter).populate('customer', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Order.countDocuments(filter),
            Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }])
        ]);

        const statsMap = Object.fromEntries(statsRows.map((item) => [item._id, item.count]));
        const totalCount = await Order.countDocuments();

        res.json({
            orders,
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            stats: {
                total: totalCount,
                pending: statsMap.pending || 0,
                shipping: statsMap.shipping || 0,
                completed: statsMap.completed || 0,
                cancelled: statsMap.cancelled || 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email phone avatar')
            .populate('items.product', 'name images slug')
            .lean();
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const allowedStatuses = [
            'pending', 'processing', 'shipping', 'completed',
            'cancellation_requested', 'cancelled', 'return_requested', 'refunding', 'refunded'
        ];
        const allowedPaymentStatuses = ['unpaid', 'paid', 'refunded'];
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Khong tim thay don hang.' });
        const previousStatus = order.orderStatus;

        if (req.body.status !== undefined) {
            const newStatus = req.body.status;
            if (!allowedStatuses.includes(newStatus)) return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
            
            // Chặn lùi trạng thái
            const statusWeights = {
                'pending': 1, 'processing': 2, 'shipping': 3, 'completed': 4,
                'cancellation_requested': 0, 'cancelled': -1, 'return_requested': -2, 'refunding': -3, 'refunded': -4
            };
            const oldWeight = statusWeights[previousStatus];
            const newWeight = statusWeights[newStatus];
            
            if (previousStatus !== newStatus) {
                if (oldWeight > 0 && newWeight > 0 && newWeight < oldWeight) {
                    return res.status(400).json({ message: `Không thể lùi trạng thái đơn hàng (từ "${previousStatus}" về "${newStatus}").` });
                }
                if (oldWeight <= 0 && newWeight > 0) {
                    return res.status(400).json({ message: `Không thể khôi phục đơn hàng đã bị hủy hoặc hoàn trả.` });
                }
            }

            order.orderStatus = newStatus;
            if (!order.statusHistory) order.statusHistory = [];
            order.statusHistory.push({
                status: req.body.status,
                note: req.body.note || 'Admin cập nhật trạng thái'
            });
            if (req.body.status === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();
            if (req.body.status === 'completed') order.paymentStatus = 'paid';
            if (req.body.status === 'refunded') {
                order.paymentStatus = 'refunded';
                if (order.returnRequest && order.returnRequest.status === 'pending') {
                    order.returnRequest.status = 'approved';
                }
            }
            if (req.body.status === 'cancelled' && previousStatus !== 'cancelled') {
                await restoreCancelledOrderStock(order);
            }
        }
        if (req.body.paymentStatus !== undefined) {
            if (!allowedPaymentStatuses.includes(req.body.paymentStatus)) return res.status(400).json({ message: 'Trang thai thanh toan khong hop le.' });
            order.paymentStatus = req.body.paymentStatus;
        }
        await order.save();

        if (req.body.status !== undefined) {
            const statusMap = {
                processing: 'đã được xác nhận và đang xử lý',
                shipping: 'đã được bàn giao cho đơn vị vận chuyển',
                completed: 'đã giao thành công',
                cancelled: 'đã bị hủy',
                return_requested: 'đang được yêu cầu trả hàng',
                refunded: 'đã được hoàn tiền'
            };

            if (statusMap[req.body.status]) {
                const notif = await Notification.create({
                    recipient: order.customer,
                    title: 'Cập nhật đơn hàng',
                    message: `Đơn hàng ${order.orderCode} của bạn ${statusMap[req.body.status]}.`,
                    type: 'order',
                    link: `/customers/profile.html?view=orders`
                });

                req.app.get('io').to(String(order.customer)).emit('customer_notification', {
                    _id: notif._id,
                    title: notif.title,
                    message: notif.message,
                    type: notif.type,
                    link: notif.link,
                    createdAt: notif.createdAt
                });
            }
        }

        res.json({ order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Customers
exports.getCustomers = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
        const filter = { role: 'customer' };

        if (req.query.q) {
            const regex = new RegExp(escapeRegex(req.query.q), 'i');
            filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
        }
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }

        const [customers, total, statsRows] = await Promise.all([
            User.find(filter).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            User.countDocuments(filter),
            User.aggregate([{ $match: { role: 'customer' } }, { $group: { _id: '$status', count: { $sum: 1 } } }])
        ]);

        const customerIds = customers.map(c => c._id);
        const orderStats = await Order.aggregate([
            { $match: { customer: { $in: customerIds }, orderStatus: 'completed' } },
            { $group: { _id: '$customer', totalSpent: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } }
        ]);

        const orderStatsMap = Object.fromEntries(orderStats.map(item => [item._id.toString(), item]));

        const enrichedCustomers = customers.map(c => ({
            ...c,
            totalSpent: orderStatsMap[c._id.toString()]?.totalSpent || 0,
            orderCount: orderStatsMap[c._id.toString()]?.orderCount || 0
        }));

        const statsMap = Object.fromEntries(statsRows.map((item) => [item._id, item.count]));
        const totalCount = await User.countDocuments({ role: 'customer' });

        res.json({
            customers: enrichedCustomers,
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            stats: {
                total: totalCount,
                active: statsMap.active || 0,
                locked: statsMap.locked || 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateCustomerStatus = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, role: 'customer' });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        if (req.body.status !== 'active' && req.body.status !== 'locked') {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }
        user.status = req.body.status;
        await user.save();
        res.json({ message: `Đã ${user.status === 'locked' ? 'khóa' : 'mở khóa'} tài khoản khách hàng.`, status: user.status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Reviews
exports.getReviews = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
        const filter = {};

        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }

        const [reviews, total, statsRows] = await Promise.all([
            Review.find(filter)
                .populate('customer', 'name email avatar')
                .populate('product', 'name images slug')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Review.countDocuments(filter),
            Review.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        ]);

        const statsMap = Object.fromEntries(statsRows.map((item) => [item._id, item.count]));
        const totalCount = await Review.countDocuments();
        const avgRatingAgg = await Review.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]);

        res.json({
            reviews,
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            stats: {
                total: totalCount,
                active: statsMap.active || 0,
                pending: statsMap.pending || 0,
                hidden: statsMap.hidden || 0,
                avgRating: avgRatingAgg.length ? avgRatingAgg[0].avg.toFixed(1) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateReviewStatus = async (req, res) => {
    try {
        const allowedStatuses = ['active', 'hidden', 'pending'];
        if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ message: 'Trang thai danh gia khong hop le.' });
        const review = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: 'after' });
        if (!review) return res.status(404).json({ message: 'Khong tim thay danh gia.' });
        const stats = await Review.aggregate([
            { $match: { product: review.product, status: 'active' } },
            { $group: { _id: '$product', rating: { $avg: '$rating' }, numReviews: { $sum: 1 } } }
        ]);
        await Product.findByIdAndUpdate(review.product, {
            rating: stats[0] ? Number(stats[0].rating.toFixed(1)) : 0,
            numReviews: stats[0]?.numReviews || 0
        });
        res.json({ review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateReviewVideoStatus = async (req, res) => {
    try {
        const allowedStatuses = ['active', 'hidden'];
        if (!allowedStatuses.includes(req.body.videoStatus)) return res.status(400).json({ message: 'Trạng thái video không hợp lệ.' });
        const review = await Review.findByIdAndUpdate(req.params.id, { videoStatus: req.body.videoStatus }, { returnDocument: 'after' });
        if (!review) return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });
        res.json({ review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Contacts
exports.getContacts = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 5), 50);
        const filter = {};

        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        if (req.query.priority && req.query.priority !== 'all') {
            filter.priority = req.query.priority;
        }
        if (req.query.category && req.query.category !== 'all') {
            filter.category = req.query.category;
        }
        if (req.query.q) {
            const rawQuery = String(req.query.q).trim();
            const ticketQuery = rawQuery.replace(/^#?LH/i, '');
            const regex = new RegExp(escapeRegex(rawQuery), 'i');
            filter.$or = [
                { fullName: regex },
                { email: regex },
                { phone: regex },
                { subject: regex },
                { message: regex }
            ];
            if (/^[a-f0-9]{2,24}$/i.test(ticketQuery)) {
                filter.$or.push({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: '$_id' },
                            regex: escapeRegex(ticketQuery),
                            options: 'i'
                        }
                    }
                });
            }
        }

        const today = startOfLocalDay();
        const endToday = endOfLocalDay();
        const [contacts, total, pendingCount, processingCount, resolvedCount, resolvedToday, totalAll,
            catGeneral, catOrder, catConsulting, catComplaint, catWarranty, catFeedback, highPriorityPending, respondedContacts, hourlyRows] = await Promise.all([
            Contact.find(filter).populate('customer', 'name email phone avatar').sort({ priority: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Contact.countDocuments(filter),
            Contact.countDocuments({ status: 'pending' }),
            Contact.countDocuments({ status: 'processing' }),
            Contact.countDocuments({ status: 'resolved' }),
            Contact.countDocuments({ status: 'resolved', updatedAt: { $gte: today } }),
            Contact.countDocuments({}),
            Contact.countDocuments({ category: 'general' }),
            Contact.countDocuments({ category: 'order' }),
            Contact.countDocuments({ category: 'consulting' }),
            Contact.countDocuments({ category: 'complaint' }),
            Contact.countDocuments({ category: 'warranty' }),
            Contact.countDocuments({ category: 'feedback' }),
            Contact.countDocuments({ priority: 'high', status: { $ne: 'resolved' } }),
            Contact.find({ 'replies.sender': 'admin' }).select('createdAt replies').lean(),
            Contact.aggregate([
                { $match: { createdAt: { $gte: today, $lte: endToday } } },
                {
                    $group: {
                        _id: { $hour: { date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const firstResponseMinutes = respondedContacts
            .map((contact) => {
                const firstAdminReply = (contact.replies || [])
                    .filter((reply) => reply.sender === 'admin')
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
                if (!firstAdminReply) return null;
                return Math.max((new Date(firstAdminReply.createdAt) - new Date(contact.createdAt)) / 60000, 0);
            })
            .filter((value) => Number.isFinite(value));
        const avgFirstResponseMinutes = firstResponseMinutes.length
            ? Math.round(firstResponseMinutes.reduce((sum, value) => sum + value, 0) / firstResponseMinutes.length)
            : 0;
        const slaRate = firstResponseMinutes.length
            ? Math.round((firstResponseMinutes.filter((value) => value <= 24 * 60).length / firstResponseMinutes.length) * 100)
            : (totalAll > 0 ? Math.round((resolvedCount / totalAll) * 100) : 0);
        const hourlyContacts = Array.from({ length: 24 }, (_, hour) => {
            const row = hourlyRows.find((item) => item._id === hour);
            return row ? row.count : 0;
        });

        const hydratedContacts = await hydrateContactsWithCustomers(contacts);

        res.json({
            contacts: hydratedContacts,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            stats: {
                total: totalAll,
                pending: pendingCount,
                processing: processingCount,
                resolved: resolvedCount,
                resolvedToday,
                slaRate,
                avgFirstResponseMinutes,
                hourlyContacts,
                highPriorityPending,
                categories: {
                    general: catGeneral,
                    order: catOrder,
                    consulting: catConsulting,
                    complaint: catComplaint,
                    warranty: catWarranty,
                    feedback: catFeedback
                }
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getContactById = async (req, res) => {
    try {
        const row = await Contact.findById(req.params.id).populate('customer', 'name email phone avatar').lean();
        const contact = await hydrateContactWithCustomer(row);
        if (!contact) return res.status(404).json({ message: 'Không tìm thấy liên hệ.' });
        res.json({ contact });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateContactStatus = async (req, res) => {
    try {
        const allowedStatuses = ['pending', 'processing', 'resolved'];
        if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ message: 'Trạng thái liên hệ không hợp lệ.' });
        const update = { status: req.body.status };
        if (req.body.internalNote !== undefined) update.internalNote = req.body.internalNote;
        if (req.body.priority && ['normal', 'high'].includes(req.body.priority)) update.priority = req.body.priority;
        if (req.body.category && contactCategories.includes(req.body.category)) update.category = req.body.category;
        const row = await Contact.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' })
            .populate('customer', 'name email phone avatar')
            .lean();
        const contact = await hydrateContactWithCustomer(row);
        if (!contact) return res.status(404).json({ message: 'Không tìm thấy liên hệ.' });
        req.app.get('io')?.emit('contact_updated', { contact });
        const customerId = contact.customer?._id || contact.customer;
        if (customerId) req.app.get('io')?.to(String(customerId)).emit('customer_contact_updated', { contact });
        res.json({ contact });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.replyContact = async (req, res) => {
    try {
        const message = cleanText(req.body.message, 2000);
        if (!message) return res.status(400).json({ message: 'Nội dung phản hồi không được để trống.' });
        const contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ message: 'Không tìm thấy liên hệ.' });
        contact.replies.push({
            sender: 'admin',
            senderName: req.user.name || 'Admin',
            senderAvatar: req.user.avatar,
            message
        });
        if (contact.status === 'pending') contact.status = 'processing';
        await contact.save();
        await contact.populate('customer', 'name email phone avatar');
        const hydrated = await hydrateContactWithCustomer(contact);
        const customerId = hydrated.customer?._id || hydrated.customer;
        if (customerId) {
            const notif = await Notification.create({
                recipient: customerId,
                title: 'Casa Decor da phan hoi yeu cau',
                message: hydrated.subject || 'Yeu cau ho tro cua ban da co phan hoi moi.',
                type: 'contact',
                link: `/customers/contact.html?ticket=${hydrated._id}`
            });
            req.app.get('io')?.to(String(customerId)).emit('customer_contact_reply', {
                contact: hydrated,
                notification: {
                    _id: notif._id,
                    title: notif.title,
                    message: notif.message,
                    type: notif.type,
                    link: notif.link,
                    createdAt: notif.createdAt
                }
            });
        }
        req.app.get('io')?.emit('contact_admin_reply', { contact: hydrated });
        res.json({ contact: hydrated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Products
exports.getProducts = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 5), 50);
        const filter = {};
        if (req.query.q) filter.name = new RegExp(escapeRegex(req.query.q), 'i');
        if (req.query.category) filter.category = req.query.category;
        if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
        if (req.query.stock === 'low') filter.stock = { $gt: 0, $lte: 10 };
        if (req.query.stock === 'out') filter.stock = 0;

        const [products, total, categories, statsRows, lowStock, topProducts] = await Promise.all([
            Product.find(filter).populate('category', 'name slug').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Product.countDocuments(filter),
            Category.find({ status: 'active' }).sort({ name: 1 }).lean(),
            Product.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Product.find({ stock: { $lte: 10 } }).populate('category', 'name slug').sort({ stock: 1, sold: -1 }).limit(4).lean(),
            Product.find({ status: 'active' }).populate('category', 'name slug').sort({ sold: -1, rating: -1 }).limit(4).lean()
        ]);

        const statsMap = Object.fromEntries(statsRows.map((item) => [item._id, item.count]));
        const hidden = statsMap.hidden || 0;
        const outOfStock = statsMap.out_of_stock || 0;
        const lowStockCount = await Product.countDocuments({ stock: { $gt: 0, $lte: 10 } });
        res.json({
            products: products.map(shortProduct),
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            categories: categories.map((category) => ({ _id: category._id, name: category.name, slug: category.slug })),
            stats: {
                total: await Product.countDocuments({}),
                active: statsMap.active || 0,
                lowStock: lowStockCount,
                hidden,
                outOfStock
            },
            lowStock: lowStock.map(shortProduct),
            topProducts: topProducts.map(shortProduct)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name slug').lean();
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        res.json({ product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const name = cleanText(req.body.name, 120);
        const categoryId = req.body.category;
        if (!name || !categoryId) return res.status(400).json({ message: 'Vui lòng nhập tên và danh mục sản phẩm.' });
        const category = await Category.findById(categoryId);
        if (!category) return res.status(400).json({ message: 'Danh mục không hợp lệ.' });
        let slug = slugify(req.body.slug || name);
        let suffix = 2;
        while (await Product.exists({ slug })) {
            slug = `${slugify(name)}-${suffix}`;
            suffix += 1;
        }
        const images = [];
        if (req.body.image) {
            images.push({ url: req.body.image, alt: name, isPrimary: true });
        }
        if (req.body.galleryImages) {
            try {
                const gallery = JSON.parse(req.body.galleryImages);
                if (Array.isArray(gallery)) {
                    gallery.forEach(url => {
                        if (url) images.push({ url, alt: name, isPrimary: false });
                    });
                }
            } catch (e) { }
        }

        const product = await Product.create({
            name,
            slug,
            category: category._id,
            price: Math.max(Number(req.body.price || 0), 0),
            salePrice: req.body.salePrice ? Math.max(Number(req.body.salePrice), 0) : undefined,
            stock: Math.max(parseInt(req.body.stock, 10) || 0, 0),
            status: ['active', 'hidden', 'out_of_stock'].includes(req.body.status) ? req.body.status : 'active',
            images,
            videoUrl: req.body.videoUrl,
            shortDescription: cleanText(req.body.shortDescription, 220),
            description: req.body.description,
            material: req.body.material,
            dimensions: req.body.dimensions,
            color: req.body.color,
            style: req.body.style,
            searchText: req.body.searchText,
            isFeatured: Boolean(req.body.isFeatured),
            isNewProduct: Boolean(req.body.isNewProduct)
        });
        res.status(201).json({ product: shortProduct(await product.populate('category', 'name slug')) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const update = {};
        if (req.body.name !== undefined) update.name = cleanText(req.body.name, 120);
        if (req.body.category !== undefined) update.category = req.body.category;
        if (req.body.price !== undefined) update.price = Math.max(Number(req.body.price || 0), 0);
        if (req.body.salePrice !== undefined) update.salePrice = req.body.salePrice ? Math.max(Number(req.body.salePrice), 0) : undefined;
        if (req.body.stock !== undefined) update.stock = Math.max(parseInt(req.body.stock, 10) || 0, 0);
        if (req.body.status !== undefined) {
            if (!['active', 'hidden', 'out_of_stock'].includes(req.body.status)) return res.status(400).json({ message: 'Trạng thái sản phẩm không hợp lệ.' });
            update.status = req.body.status;
        }
        if (req.body.image !== undefined || req.body.galleryImages !== undefined) {
            const images = [];
            const productName = update.name || req.body.name || 'San pham';
            if (req.body.image) {
                images.push({ url: req.body.image, alt: productName, isPrimary: true });
            }
            if (req.body.galleryImages) {
                try {
                    const gallery = JSON.parse(req.body.galleryImages);
                    if (Array.isArray(gallery)) {
                        gallery.forEach(url => {
                            if (url) images.push({ url, alt: productName, isPrimary: false });
                        });
                    }
                } catch (e) { }
            }
            update.images = images;
        }
        if (req.body.videoUrl !== undefined) update.videoUrl = req.body.videoUrl;
        if (req.body.shortDescription !== undefined) update.shortDescription = cleanText(req.body.shortDescription, 220);
        if (req.body.description !== undefined) update.description = req.body.description;
        if (req.body.material !== undefined) update.material = req.body.material;
        if (req.body.dimensions !== undefined) update.dimensions = req.body.dimensions;
        if (req.body.color !== undefined) update.color = req.body.color;
        if (req.body.style !== undefined) update.style = req.body.style;
        if (req.body.searchText !== undefined) update.searchText = req.body.searchText;
        if (req.body.isFeatured !== undefined) update.isFeatured = Boolean(req.body.isFeatured);
        if (req.body.isNewProduct !== undefined) update.isNewProduct = Boolean(req.body.isNewProduct);
        if (req.body.slug !== undefined) update.slug = slugify(req.body.slug);

        const product = await Product.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' }).populate('category', 'name slug');
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        res.json({ product: shortProduct(product) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name slug');
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

        // Check if product is in any active order
        const activeOrders = await Order.countDocuments({
            'items.product': req.params.id,
            orderStatus: { $nin: ['delivered', 'cancelled'] }
        });

        if (activeOrders > 0) {
            return res.status(400).json({ message: 'Không thể xóa sản phẩm đang nằm trong đơn hàng chưa hoàn tất.' });
        }

        if (product.status === 'hidden') {
            await Product.findByIdAndDelete(req.params.id);
            req.app.get('io')?.emit('product_unavailable', { productId: req.params.id, productName: product.name });
            return res.json({ product: null, message: 'Đã xóa hoàn toàn sản phẩm khỏi hệ thống.' });
        }

        product.status = 'hidden';
        await product.save();
        req.app.get('io')?.emit('product_unavailable', { productId: req.params.id, productName: product.name });
        res.json({ product: shortProduct(product), message: 'Đã ẩn sản phẩm khỏi cửa hàng. (Xóa lần nữa để xóa vĩnh viễn)' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Categories
exports.getCategories = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 5), 50);
        const filter = {};
        if (req.query.q) filter.name = new RegExp(escapeRegex(req.query.q), 'i');
        if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
        if (req.query.type === 'featured') filter.isFeatured = true;
        if (req.query.slug && req.query.slug !== 'all') filter.slug = req.query.slug;

        const [categories, total, allCategories, statsRows] = await Promise.all([
            Category.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Category.countDocuments(filter),
            Category.find({ status: 'active' }).sort({ createdAt: -1 }).lean(),
            Category.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        ]);

        const statsMap = Object.fromEntries(statsRows.map((item) => [item._id, item.count]));
        const featuredCount = await Category.countDocuments({ isFeatured: true });

        const categoryIds = categories.map(c => c._id);
        const productCounts = await Product.aggregate([
            { $match: { category: { $in: categoryIds }, status: { $ne: 'deleted' } } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const productCountMap = Object.fromEntries(productCounts.map(item => [String(item._id), item.count]));

        res.json({
            categories: categories.map(cat => ({ ...cat, productCount: productCountMap[String(cat._id)] || 0 })),
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            allCategories: allCategories.map(c => ({ _id: c._id, name: c.name, slug: c.slug, image: c.image })),
            stats: {
                total: await Category.countDocuments({}),
                active: statsMap.active || 0,
                hidden: statsMap.hidden || 0,
                featured: featuredCount
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const name = cleanText(req.body.name, 120);
        if (!name) return res.status(400).json({ message: 'Vui lòng nhập tên danh mục.' });
        let slug = slugify(req.body.slug || name);
        let suffix = 2;
        while (await Category.exists({ slug })) {
            slug = `${slugify(name)}-${suffix}`;
            suffix += 1;
        }
        const category = await Category.create({
            name,
            slug,
            description: cleanText(req.body.description, 500),
            image: req.body.image,
            status: ['active', 'hidden'].includes(req.body.status) ? req.body.status : 'active',
            isFeatured: Boolean(req.body.isFeatured)
        });
        res.status(201).json({ category, message: 'Đã tạo danh mục thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const update = {};
        if (req.body.name !== undefined) update.name = cleanText(req.body.name, 120);
        if (req.body.slug !== undefined) update.slug = slugify(req.body.slug);
        if (req.body.description !== undefined) update.description = cleanText(req.body.description, 500);
        if (req.body.image !== undefined) update.image = req.body.image;
        if (req.body.status !== undefined) {
            if (!['active', 'hidden'].includes(req.body.status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
            update.status = req.body.status;
        }
        if (req.body.isFeatured !== undefined) update.isFeatured = Boolean(req.body.isFeatured);

        const category = await Category.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
        res.json({ category, message: 'Đã cập nhật danh mục.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });

        // Check if category has products
        const productsCount = await Product.countDocuments({ category: req.params.id });
        if (productsCount > 0) {
            return res.status(400).json({ message: `Không thể xóa vì danh mục đang chứa ${productsCount} sản phẩm. Vui lòng xóa hết sản phẩm trước.` });
        }

        if (category.status === 'hidden') {
            await Category.findByIdAndDelete(req.params.id);
            return res.json({ category: null, message: 'Đã xóa hoàn toàn danh mục khỏi hệ thống.' });
        }

        category.status = 'hidden';
        await category.save();
        res.json({ category, message: 'Đã ẩn danh mục khỏi hệ thống. (Xóa lần nữa để xóa vĩnh viễn)' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Promotions
exports.getPromotions = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
        const filter = {};

        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        if (req.query.q) {
            const regex = new RegExp(escapeRegex(req.query.q), 'i');
            filter.$or = [{ name: regex }, { code: regex }];
        }

        const [promotions, total, statsRows] = await Promise.all([
            Promotion.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Promotion.countDocuments(filter),
            Promotion.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        ]);

        const statsMap = Object.fromEntries(statsRows.map((item) => [item._id, item.count]));
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

exports.createPromotion = async (req, res) => {
    try {
        const { name, code, discountType, discountValue, startDate, endDate, minOrderValue, maxUsage } = req.body;

        if (!name || !discountType || !discountValue || !startDate || !endDate) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
        }

        if (!['percentage', 'fixed'].includes(discountType)) {
            return res.status(400).json({ message: 'Loại giảm giá không hợp lệ.' });
        }

        const value = Number(discountValue);
        if (!Number.isFinite(value) || value <= 0) {
            return res.status(400).json({ message: 'Giá trị giảm giá phải lớn hơn 0.' });
        }

        if (discountType === 'percentage' && value > 100) {
            return res.status(400).json({ message: 'Giảm giá theo % không được vượt quá 100%.' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
        }

        const cleanCode = code ? String(code).trim().toUpperCase() : undefined;
        if (cleanCode) {
            const existed = await Promotion.findOne({ code: cleanCode });
            if (existed) return res.status(409).json({ message: 'Mã khuyến mãi đã tồn tại.' });
        }

        const promotion = await Promotion.create({
            name: cleanText(name, 120),
            code: cleanCode,
            discountType,
            discountValue: value,
            startDate: start,
            endDate: end,
            minOrderValue: Math.max(Number(minOrderValue || 0), 0),
            maxUsage: maxUsage ? Math.max(Number(maxUsage), 0) : undefined,
            status: 'active'
        });

        appCache.del('promotions');
        res.status(201).json({ promotion, message: 'Đã tạo khuyến mãi thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPromotionById = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id).lean();
        if (!promotion) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi.' });
        res.json(promotion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updatePromotion = async (req, res) => {
    try {
        const update = {};

        if (req.body.name !== undefined) update.name = cleanText(req.body.name, 120);

        if (req.body.code !== undefined) {
            const cleanCode = req.body.code ? String(req.body.code).trim().toUpperCase() : undefined;
            if (cleanCode) {
                const existed = await Promotion.findOne({ code: cleanCode, _id: { $ne: req.params.id } });
                if (existed) return res.status(409).json({ message: 'Mã khuyến mãi đã tồn tại.' });
            }
            update.code = cleanCode;
        }

        if (req.body.discountType !== undefined) {
            if (!['percentage', 'fixed'].includes(req.body.discountType)) {
                return res.status(400).json({ message: 'Loại giảm giá không hợp lệ.' });
            }
            update.discountType = req.body.discountType;
        }

        if (req.body.discountValue !== undefined) {
            const value = Number(req.body.discountValue);
            if (!Number.isFinite(value) || value <= 0) {
                return res.status(400).json({ message: 'Giá trị giảm giá phải lớn hơn 0.' });
            }
            const type = req.body.discountType || (await Promotion.findById(req.params.id)).discountType;
            if (type === 'percentage' && value > 100) {
                return res.status(400).json({ message: 'Giảm giá theo % không được vượt quá 100%.' });
            }
            update.discountValue = value;
        }

        if (req.body.startDate !== undefined) update.startDate = new Date(req.body.startDate);
        if (req.body.endDate !== undefined) update.endDate = new Date(req.body.endDate);

        if (update.startDate || update.endDate) {
            const promotion = await Promotion.findById(req.params.id);
            const start = update.startDate || promotion.startDate;
            const end = update.endDate || promotion.endDate;
            if (end <= start) {
                return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
            }
        }

        if (req.body.minOrderValue !== undefined) update.minOrderValue = Math.max(Number(req.body.minOrderValue || 0), 0);
        if (req.body.maxUsage !== undefined) update.maxUsage = req.body.maxUsage ? Math.max(Number(req.body.maxUsage), 0) : undefined;

        if (req.body.status !== undefined) {
            if (!['active', 'expired', 'disabled'].includes(req.body.status)) {
                return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
            }
            update.status = req.body.status;
        }

        const promotion = await Promotion.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
        if (!promotion) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi.' });

        appCache.del('promotions');
        res.json({ promotion, message: 'Đã cập nhật khuyến mãi.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndDelete(req.params.id);
        if (!promotion) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi.' });

        appCache.del('promotions');
        res.json({ message: 'Đã xóa khuyến mãi thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Banners
exports.getBanners = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        if (req.query.position && req.query.position !== 'all') {
            filter.position = req.query.position;
        }
        if (req.query.q) {
            filter.title = new RegExp(escapeRegex(req.query.q), 'i');
        }

        const banners = await Banner.find(filter).sort({ position: 1, displayOrder: 1, createdAt: -1 }).lean();
        const total = await Banner.countDocuments({});
        const active = await Banner.countDocuments({ status: 'active' });
        const hidden = await Banner.countDocuments({ status: 'hidden' });

        const latestBanner = await Banner.findOne().sort({ updatedAt: -1 });
        const lastUpdate = latestBanner ? latestBanner.updatedAt : null;

        res.json({
            banners,
            stats: {
                total,
                active,
                hidden,
                lastUpdate
            },
            bodStatus: bannerBODStatus
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBannerBODStatus = async (req, res) => {
    try {
        const latestBanner = await Banner.findOne().sort({ updatedAt: -1 });
        const lastUpdate = latestBanner ? latestBanner.updatedAt : null;

        const isLockedByDefault = lastUpdate ? (Date.now() - new Date(lastUpdate).getTime() < 180 * 24 * 60 * 60 * 1000) : false;

        res.json({
            bodStatus: bannerBODStatus,
            isLockedByDefault,
            lastUpdate
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.requestBannerBOD = async (req, res) => {
    try {
        bannerBODStatus = 'pending';
        res.json({ status: bannerBODStatus, message: 'Đã gửi yêu cầu phê duyệt tới Hội đồng quản trị.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.approveBannerBOD = async (req, res) => {
    try {
        bannerBODStatus = 'unlocked';
        res.json({ status: bannerBODStatus, message: 'Hội đồng quản trị đã phê duyệt yêu cầu chỉnh sửa.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.lockBannerBOD = async (req, res) => {
    try {
        bannerBODStatus = 'locked';
        res.json({ status: bannerBODStatus, message: 'Đã khóa lại các tính năng chỉnh sửa.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createBanner = async (req, res) => {
    try {
        const { title, description, image, buttonText, link, position, displayOrder, status } = req.body;
        if (!image || !position) {
            return res.status(400).json({ message: 'Vui lòng cung cấp hình ảnh và vị trí của banner.' });
        }
        const banner = await Banner.create({
            title: cleanText(title, 120),
            description: cleanText(description, 500),
            image,
            buttonText: cleanText(buttonText, 50),
            link: link || '#',
            position,
            displayOrder: Number(displayOrder || 0),
            status: status === 'hidden' ? 'hidden' : 'active'
        });
        res.status(201).json({ banner, message: 'Đã tạo banner thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateBanner = async (req, res) => {
    try {
        const update = {};
        if (req.body.title !== undefined) update.title = cleanText(req.body.title, 120);
        if (req.body.description !== undefined) update.description = cleanText(req.body.description, 500);
        if (req.body.image !== undefined) update.image = req.body.image;
        if (req.body.buttonText !== undefined) update.buttonText = cleanText(req.body.buttonText, 50);
        if (req.body.link !== undefined) update.link = req.body.link;
        if (req.body.position !== undefined) {
            if (!['hero', 'sale', 'lookbook'].includes(req.body.position)) {
                return res.status(400).json({ message: 'Vị trí banner không hợp lệ.' });
            }
            update.position = req.body.position;
        }
        if (req.body.displayOrder !== undefined) update.displayOrder = Number(req.body.displayOrder);
        if (req.body.status !== undefined) {
            if (!['active', 'hidden'].includes(req.body.status)) {
                return res.status(400).json({ message: 'Trạng thái banner không hợp lệ.' });
            }
            update.status = req.body.status;
        }

        const banner = await Banner.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
        if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner.' });
        res.json({ banner, message: 'Đã cập nhật thông tin banner.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner.' });
        res.json({ message: 'Đã xóa banner thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Blogs
exports.getBlogs = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        if (req.query.q) {
            filter.title = new RegExp(escapeRegex(req.query.q), 'i');
        }

        const blogs = await Blog.find(filter).populate('author', 'name email').sort({ createdAt: -1 }).lean();
        const total = await Blog.countDocuments({});
        const active = await Blog.countDocuments({ status: 'active' });
        const hidden = await Blog.countDocuments({ status: 'hidden' });

        const latestBlog = await Blog.findOne().sort({ updatedAt: -1 });
        const lastUpdate = latestBlog ? latestBlog.updatedAt : null;

        res.json({
            blogs,
            stats: {
                total,
                published: active,
                draft: hidden,
                lastUpdate
            },
            bodStatus: blogBODStatus
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBlogBODStatus = async (req, res) => {
    try {
        const latestBlog = await Blog.findOne().sort({ updatedAt: -1 });
        const lastUpdate = latestBlog ? latestBlog.updatedAt : null;

        const isLockedByDefault = lastUpdate ? (Date.now() - new Date(lastUpdate).getTime() < 180 * 24 * 60 * 60 * 1000) : false;

        res.json({
            bodStatus: blogBODStatus,
            isLockedByDefault,
            lastUpdate
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.requestBlogBOD = async (req, res) => {
    try {
        blogBODStatus = 'pending';
        res.json({ status: blogBODStatus, message: 'Đã gửi yêu cầu phê duyệt tới Hội đồng quản trị.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.approveBlogBOD = async (req, res) => {
    try {
        blogBODStatus = 'unlocked';
        res.json({ status: blogBODStatus, message: 'Hội đồng quản trị đã phê duyệt yêu cầu chỉnh sửa.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.lockBlogBOD = async (req, res) => {
    try {
        blogBODStatus = 'locked';
        res.json({ status: blogBODStatus, message: 'Đã khóa lại các tính năng chỉnh sửa.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createBlog = async (req, res) => {
    try {
        const { title, thumbnail, summary, content, status } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Vui lòng điền tiêu đề và nội dung bài viết.' });
        }
        let slug = slugify(title);
        let suffix = 2;
        while (await Blog.exists({ slug })) {
            slug = `${slugify(title)}-${suffix}`;
            suffix += 1;
        }

        const blog = await Blog.create({
            title: cleanText(title, 120),
            slug,
            thumbnail,
            summary: cleanText(summary, 300),
            content,
            author: req.user._id,
            status: status === 'hidden' ? 'hidden' : 'active'
        });
        res.status(201).json({ blog, message: 'Đã tạo bài viết thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateBlog = async (req, res) => {
    try {
        const update = {};
        if (req.body.title !== undefined) {
            update.title = cleanText(req.body.title, 120);
            update.slug = slugify(req.body.title);
            let suffix = 2;
            while (await Blog.exists({ slug: update.slug, _id: { $ne: req.params.id } })) {
                update.slug = `${slugify(req.body.title)}-${suffix}`;
                suffix += 1;
            }
        }
        if (req.body.thumbnail !== undefined) update.thumbnail = req.body.thumbnail;
        if (req.body.summary !== undefined) update.summary = cleanText(req.body.summary, 300);
        if (req.body.content !== undefined) update.content = req.body.content;
        if (req.body.status !== undefined) {
            if (!['active', 'hidden'].includes(req.body.status)) {
                return res.status(400).json({ message: 'Trạng thái bài viết không hợp lệ.' });
            }
            update.status = req.body.status;
        }

        const blog = await Blog.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' }).populate('author', 'name email');
        if (!blog) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
        res.json({ blog, message: 'Đã cập nhật bài viết.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
        res.json({ message: 'Đã xóa bài viết thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upload ảnh sản phẩm
exports.uploadProductImage = async (req, res) => {
    try {
        const { image } = req.body;
        const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(image || '');
        if (!match) {
            return res.status(400).json({ message: 'Vui lòng chọn file ảnh hợp lệ (PNG, JPG hoặc WEBP).' });
        }

        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ message: 'Ảnh sản phẩm tối đa 5MB.' });
        }

        const extension = match[1].toLowerCase().replace('jpeg', 'jpg');
        const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'products');
        fs.mkdirSync(uploadDir, { recursive: true });

        const filename = `product-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
        fs.writeFileSync(path.join(uploadDir, filename), buffer);

        const imageUrl = `/uploads/products/${filename}`;
        res.status(201).json({ url: imageUrl, message: 'Tải ảnh lên thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upload video sản phẩm
exports.uploadProductVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Không tìm thấy file video.' });
        }
        const videoUrl = `/uploads/videos/${req.file.filename}`;
        res.status(201).json({ url: videoUrl, message: 'Tải video lên thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách nhân viên
exports.createStaff = async (req, res) => {
    try {
        if (!ensureAdminOnly(req, res)) return;
        const { name, email, phone, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Tên, email và mật khẩu là bắt buộc.' });
        }
        
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống.' });
        }

        const hashedPassword = await hashPassword(password);
        
        const staffCount = await User.countDocuments({ role: { $in: ['staff', 'admin'] } });
        const staffCode = `NV${String(staffCount + 1).padStart(2, '0')}`;

        const newStaff = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone ? phone.trim() : '',
            password: hashedPassword,
            role: role || 'staff',
            staffCode: staffCode
        });

        await newStaff.save();
        res.status(201).json({ message: 'Thêm nhân viên thành công', staff: newStaff });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        if (!ensureAdminOnly(req, res)) return;
        const { id } = req.params;
        const { name, phone, role, status, password } = req.body;
        
        const staff = await User.findById(id);
        if (!staff) return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });

        if (name) staff.name = name.trim();
        if (phone !== undefined) staff.phone = phone.trim();
        if (role) staff.role = role;
        if (status) staff.status = status;
        if (password) {
            staff.password = await hashPassword(password);
        }

        await staff.save();
        res.json({ message: 'Cập nhật thành công', staff });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        if (!ensureAdminOnly(req, res)) return;
        const { id } = req.params;
        
        const staff = await User.findById(id);
        if (!staff) return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });

        await StaffShift.deleteMany({ staff: id });
        await User.findByIdAndDelete(id);
        res.json({ message: 'Đã xóa nhân viên và lịch ca.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getStaff = async (req, res) => {
    try {
        if (!ensureAdminOnly(req, res)) return;
        const from = req.query.from || localDateString();
        const to = req.query.to || addDaysLocalString(6);
        const [staffList, total, shifts] = await Promise.all([
            User.find({ role: 'staff' })
                .select('-password -resetPasswordToken -resetPasswordExpires -addresses')
                .sort({ createdAt: -1 })
                .lean(),
            User.countDocuments({ role: 'staff' }),
            StaffShift.find({ shiftDate: { $gte: from, $lte: to } })
                .populate('staff', 'name email phone avatar status role')
                .sort({ shiftDate: 1, startMinute: 1 })
                .lean()
        ]);

        const decorated = staffList;
        const today = localDateString();
        const todayShifts = shifts.filter((shift) => shift.shiftDate === today && shift.status !== 'cancelled');
        res.json({
            staff: decorated,
            shifts,
            total,
            stats: {
                total,
                active: staffList.filter((item) => item.status === 'active').length,
                onShift: decorated.filter((item) => item.currentShift).length,
                scheduledToday: todayShifts.length,
                todayHours: todayShifts.reduce((sum, shift) => sum + Number(shift.durationHours || 0), 0)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Inventory
exports.getInventory = async (req, res) => {
    try {
        
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 500);
        const filter = {};
        
        if (req.query.q) {
            const regex = new RegExp(escapeRegex(req.query.q), 'i');
            filter.$or = [{ name: regex }, { sku: regex }, { searchName: regex }];
        }
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }

        // Today range (Vietnam time = UTC+7)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const [productsList, total, allProducts, todayImports, todayExports] = await Promise.all([
            Product.find(filter).populate('category', 'name').sort({ stock: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            Product.countDocuments(filter),
            Product.find({}).lean(),
            InventoryTransaction.find({ type: 'import', createdAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
            InventoryTransaction.find({ type: 'export', createdAt: { $gte: todayStart, $lte: todayEnd } }).lean()
        ]);

        let totalSKU = allProducts.length;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalValue = 0;
        let totalItems = 0;

        allProducts.forEach(p => {
            if (p.stock === 0) outOfStockCount++;
            else if (p.stock <= 20) lowStockCount++;
            totalValue += p.stock * p.price;
            totalItems += p.stock;
        });

        // Tính tổng SL và giá trị nhập/xuất hôm nay
        let importQty = 0, importValue = 0;
        todayImports.forEach(t => {
            t.items.forEach(item => {
                importQty += item.quantityChange;
                importValue += item.quantityChange * (item.price || 0);
            });
        });

        let exportQty = 0, exportValue = 0;
        todayExports.forEach(t => {
            t.items.forEach(item => {
                exportQty += item.quantityChange;
                exportValue += item.quantityChange * (item.price || 0);
            });
        });

        res.json({
            products: productsList,
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            stats: {
                totalSKU,
                lowStockCount,
                outOfStockCount,
                totalValue,
                totalItems,
                importQty,
                importValue,
                exportQty,
                exportValue
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Inventory Transactions
exports.createInventoryTransaction = async (req, res) => {
    try {
        const { type, items, reason } = req.body;
        
        if (!['import', 'export', 'check'].includes(type)) {
            return res.status(400).json({ message: 'Loại giao dịch không hợp lệ' });
        }
        
        let prefix = type === 'import' ? 'PNK' : (type === 'export' ? 'PXK' : 'PKK');
        const code = `${prefix}-${Date.now().toString().slice(-6)}`;
        
        const transaction = new InventoryTransaction({
            type,
            code,
            items,
            reason,
            createdBy: req.user._id
        });
        
        // Update product stock
        for (let item of items) {
            const product = await Product.findById(item.product);
            if (product) {
                if (type === 'import') {
                    product.stock += Number(item.quantityChange);
                } else if (type === 'export') {
                    product.stock -= Number(item.quantityChange);
                    if (product.stock < 0) product.stock = 0;
                } else if (type === 'check') {
                    product.stock = Number(item.quantityChange); // For check, quantityChange is the actual new stock
                }
                await product.save();
            }
        }
        
        await transaction.save();
        res.status(201).json({ message: 'Tạo phiếu thành công', transaction });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInventoryTransactions = async (req, res) => {
    try {
        const transactions = await InventoryTransaction.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateInventoryProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        
        if (req.body.stock !== undefined) {
            product.stock = Number(req.body.stock);
            if (product.stock < 0) product.stock = 0;
        }
        
        await product.save();
        res.json({ message: 'Cập nhật tồn kho thành công', product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ── Staff & Auto Schedule ──────────────────────────────────────
function groupShiftsByStaff(shifts = []) {
    const map = new Map();
    for (const shift of shifts) {
        const staffId = String(shift.staff?._id || shift.staff);
        if (!map.has(staffId)) map.set(staffId, []);
        map.get(staffId).push(shift);
    }
    return map;
}

function decorateStaffWithShifts(staffList = [], shifts = []) {
    const byStaff = groupShiftsByStaff(shifts);
    return staffList.map((staff) => {
        const staffShifts = (byStaff.get(String(staff._id)) || []).sort((a, b) => {
            if (a.shiftDate !== b.shiftDate) return a.shiftDate.localeCompare(b.shiftDate);
            return a.startMinute - b.startMinute;
        });
        const currentShift = staffShifts.find((shift) => isShiftActiveNow(shift));
        const nextShift = staffShifts.find((shift) => {
            const now = new Date();
            if (shift.shiftDate < localDateString(now)) return false;
            if (shift.shiftDate === localDateString(now)) return shift.startMinute > localMinutes(now);
            return true;
        });
        return {
            ...staff,
            shifts: staffShifts,
            currentShift,
            nextShift
        };
    });
}

exports.getStaff = async (req, res) => {
    try {
        const from = req.query.from || localDateString(new Date());
        const to = req.query.to || localDateString(new Date());

        const [staffList, total, shifts] = await Promise.all([
            User.find({ role: 'staff' }).select('-password').sort({ createdAt: -1 }).lean(),
            User.countDocuments({ role: 'staff' }),
            StaffShift.find({ shiftDate: { $gte: from, $lte: to } })
                .populate('staff', 'name email phone avatar status role')
                .sort({ shiftDate: 1, startMinute: 1 })
                .lean()
        ]);

        const decorated = decorateStaffWithShifts(staffList, shifts);

        const scheduledStaffIds = new Set(shifts.map(s => String(s.staff._id || s.staff)));
        const scheduledToday = new Set();
        const todayStr = localDateString(new Date());
        shifts.forEach(s => {
            if (s.shiftDate === todayStr) scheduledToday.add(String(s.staff._id || s.staff));
        });

        res.json({
            staff: decorated,
            shifts: shifts,
            stats: {
                total,
                active: staffList.filter((item) => item.status === 'active').length,
                scheduledAny: scheduledStaffIds.size,
                scheduledToday: scheduledToday.size
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createStaffShift = async (req, res) => {
    try {
        const { staff, shiftDate, startTime, durationHours, note } = req.body;
        
        let startMins = 0;
        if (startTime === '00:00') startMins = 0;
        else if (startTime === '06:00') startMins = 360;
        else if (startTime === '12:00') startMins = 720;
        else if (startTime === '18:00') startMins = 1080;
        else throw new Error('Giờ bắt đầu không hợp lệ (Phải là 00:00, 06:00, 12:00, 18:00)');
        
        const endMins = startMins + 360;
        const endTimeHours = Math.floor(endMins / 60);
        const endTime = endTimeHours === 24 ? '23:59' : `${String(endTimeHours).padStart(2, '0')}:00`;

        const conflict = await StaffShift.findOne({
            staff, shiftDate, startMinute: { $lt: endMins }, endMinute: { $gt: startMins }
        });
        if (conflict) {
            return res.status(400).json({ message: 'Nhân viên đã có ca trùng lặp trong khoảng thời gian này.' });
        }

        const shift = await StaffShift.create({
            staff,
            shiftDate,
            startTime,
            endTime,
            startMinute: startMins,
            endMinute: endMins,
            durationHours: 6,
            payRate: 50000,
            totalPay: 300000,
            note
        });

        const populated = await StaffShift.findById(shift._id).populate('staff', 'name email phone avatar status role').lean();
        res.status(201).json({ message: 'Tạo ca làm thành công.', shift: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStaffShift = async (req, res) => {
    try {
        const existing = await StaffShift.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Không tìm thấy ca làm việc.' });

        if (req.body.staff) existing.staff = req.body.staff;
        if (req.body.shiftDate) existing.shiftDate = req.body.shiftDate;
        if (req.body.startTime) {
            const startTime = req.body.startTime;
            let startMins = 0;
            if (startTime === '00:00') startMins = 0;
            else if (startTime === '06:00') startMins = 360;
            else if (startTime === '12:00') startMins = 720;
            else if (startTime === '18:00') startMins = 1080;
            else throw new Error('Giờ bắt đầu không hợp lệ');
            existing.startTime = startTime;
            existing.startMinute = startMins;
            existing.endMinute = startMins + 360;
            existing.endTime = startMins === 1080 ? '23:59' : `${String((startMins+360)/60).padStart(2, '0')}:00`;
        }
        if (req.body.note !== undefined) existing.note = req.body.note;

        const conflict = await StaffShift.findOne({
            _id: { $ne: existing._id },
            staff: existing.staff,
            shiftDate: existing.shiftDate,
            startMinute: { $lt: existing.endMinute },
            endMinute: { $gt: existing.startMinute }
        });
        if (conflict) {
            return res.status(400).json({ message: 'Ca làm sửa đổi bị trùng với ca khác.' });
        }

        await existing.save();
        const populated = await StaffShift.findById(existing._id).populate('staff', 'name email phone avatar status role').lean();
        res.json({ message: 'Cập nhật thành công.', shift: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteStaffShift = async (req, res) => {
    try {
        const shift = await StaffShift.findByIdAndDelete(req.params.id);
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca.' });
        res.json({ message: 'Đã xóa ca làm việc.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.autoAssignShifts = async (req, res) => {
    try {
        const { from, to, staffIds } = req.body;
        // from = 'YYYY-MM-DD', to = 'YYYY-MM-DD'

        // Validate date format
        if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
            return res.status(400).json({ message: 'Khoảng thời gian không hợp lệ. Định dạng: YYYY-MM-DD' });
        }

        // Lấy danh sách NV
        let staffList;
        if (staffIds && Array.isArray(staffIds) && staffIds.length > 0) {
            staffList = await User.find({ _id: { $in: staffIds }, role: 'staff', status: 'active' })
                .select('_id name staffCode').sort({ createdAt: 1 }).lean();
        } else {
            staffList = await User.find({ role: 'staff', status: 'active' })
                .select('_id name staffCode').sort({ createdAt: 1 }).lean();
        }

        if (staffList.length < 4) {
            return res.status(400).json({
                message: `Cần tối thiểu 4 nhân viên để phủ đủ 4 ca/ngày. Hiện tại: ${staffList.length}.`
            });
        }

        const N = staffList.length;
        const ScheduleRotation = require('../models/ScheduleRotation');

        // Lấy hoặc tạo bản ghi rotation — đảm bảo offset nối tiếp qua các tháng
        let rotation = await ScheduleRotation.findOne({});
        if (!rotation) {
            rotation = await ScheduleRotation.create({
                staffList: staffList.map(s => s._id),
                currentOffset: 0
            });
        }

        // Nếu danh sách NV thay đổi → cập nhật nhưng GIỮ NGUYÊN offset
        const oldListStr = rotation.staffList.map(String).sort().join(',');
        const newListStr = staffList.map(s => String(s._id)).sort().join(',');
        if (oldListStr !== newListStr) {
            rotation.staffList = staffList.map(s => s._id);
            // Đảm bảo offset không vượt quá danh sách mới
            rotation.currentOffset = rotation.currentOffset % N;
            await rotation.save();
        }

        // Iterate over from -> to dates
        const startDate = new Date(from);
        const endDate = new Date(to);
        if (startDate > endDate) {
            return res.status(400).json({ message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.' });
        }

        const SHIFTS = [
            { name: 'Đêm',   order: 4, start: '00:00', end: '06:00', startMin: 0,    endMin: 360  },
            { name: 'Sáng',   order: 1, start: '06:00', end: '12:00', startMin: 360,  endMin: 720  },
            { name: 'Chiều',  order: 2, start: '12:00', end: '18:00', startMin: 720,  endMin: 1080 },
            { name: 'Tối',    order: 3, start: '18:00', end: '00:00', startMin: 1080, endMin: 1440 }
        ];

        let created = 0;
        let skipped = 0;
        let offset = rotation.currentOffset;

        const curDate = new Date(startDate);
        while (curDate <= endDate) {
            const shiftDate = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;

            for (let si = 0; si < 4; si++) {
                const shiftDef = SHIFTS[si];

                // Kiểm tra ca đã tồn tại (idempotent: check theo ngày + thứ tự ca)
                const existing = await StaffShift.findOne({
                    shiftDate,
                    shiftOrder: shiftDef.order
                });

                if (existing) {
                    skipped++;
                    continue;
                }

                const staffIndex = (offset + si) % N;
                const targetStaff = staffList[staffIndex];

                await StaffShift.create({
                    staff: targetStaff._id,
                    shiftName: shiftDef.name,
                    shiftOrder: shiftDef.order,
                    shiftDate,
                    startTime: shiftDef.start,
                    endTime: shiftDef.end,
                    startMinute: shiftDef.startMin,
                    endMinute: shiftDef.endMin,
                    durationHours: 6,
                    payRate: 50000,
                    totalPay: 300000,
                    createdBy: req.user._id
                });

                created++;
            }
            
            // Tăng offset 1 đơn vị cho ngày tiếp theo (để xoay vòng NV1->NV2)
            offset++;
            
            // Tăng ngày
            curDate.setDate(curDate.getDate() + 1);
        }

        // Lưu offset CUỐI CÙNG — chỉ cộng cho ca thực sự được tạo
        rotation.currentOffset = offset % N;
        rotation.lastScheduledDate = to;
        await rotation.save();

        res.json({
            message: `Đã tạo ${created} ca mới, bỏ qua ${skipped} ca đã tồn tại.`,
            created,
            skipped,
            currentOffset: rotation.currentOffset
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ── B9: Admin mở rộng — Force-checkout, Reassign, Bảng lương, Gán đơn ──

exports.forceCheckout = async (req, res) => {
    try {
        const shift = await StaffShift.findById(req.params.id);
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca.' });
        if (shift.status !== 'active') {
            return res.status(400).json({ message: `Ca đang ở trạng thái "${shift.status}", không thể force-checkout.` });
        }

        shift.status = 'auto_completed';
        shift.isForgotCheckOut = true;
        shift.checkOutAt = new Date();
        shift.note = (shift.note || '') + ` [Admin force-checkout bởi ${req.user.name}]`;
        await shift.save();

        // Chốt lương ca
        const StaffKPI = require('../models/StaffKPI');
        const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        await StaffKPI.findOneAndUpdate(
            { staff: shift.staff, month },
            { $inc: { completedShifts: 1, totalHours: shift.durationHours, totalSalary: shift.totalPay } },
            { upsert: true }
        );

        // Kick khỏi socket
        const io = req.app.get('io');
        if (io?.kickUser) io.kickUser(String(shift.staff), 'Admin đã buộc kết thúc ca của bạn.');

        const populated = await StaffShift.findById(shift._id).populate('staff', 'name staffCode').lean();
        res.json({ message: 'Đã force-checkout ca thành công.', shift: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.reassignShift = async (req, res) => {
    try {
        const { newStaffId, reason } = req.body;
        if (!newStaffId) return res.status(400).json({ message: 'Thiếu ID nhân viên mới.' });

        const shift = await StaffShift.findById(req.params.id);
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca.' });
        if (!['scheduled', 'active'].includes(shift.status)) {
            return res.status(400).json({ message: 'Chỉ có thể reassign ca scheduled hoặc active.' });
        }

        const newStaff = await User.findOne({ _id: newStaffId, role: 'staff', status: 'active' });
        if (!newStaff) return res.status(404).json({ message: 'Nhân viên mới không hợp lệ.' });

        // Kiểm tra trùng ca
        const conflict = await StaffShift.findOne({
            staff: newStaffId,
            shiftDate: shift.shiftDate,
            shiftOrder: shift.shiftOrder,
            status: { $nin: ['cancelled', 'absent'] }
        });
        if (conflict) return res.status(409).json({ message: 'Nhân viên mới đã có ca trùng thời gian.' });

        shift.reassign = {
            originalStaff: shift.staff,
            reason: reason || 'Admin reassign',
            reassignedAt: new Date()
        };
        shift.staff = newStaffId;
        if (shift.status === 'active') {
            shift.status = 'scheduled';
            shift.checkInAt = undefined;
        }
        await shift.save();

        const populated = await StaffShift.findById(shift._id).populate('staff', 'name staffCode').lean();
        res.json({ message: 'Đã chuyển ca thành công.', shift: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cancelShift = async (req, res) => {
    try {
        const shift = await StaffShift.findById(req.params.id);
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca.' });
        if (['completed', 'auto_completed', 'cancelled'].includes(shift.status)) {
            return res.status(400).json({ message: 'Ca đã hoàn tất hoặc đã hủy, không thể hủy lại.' });
        }

        shift.status = 'cancelled';
        shift.note = (shift.note || '') + ` [Hủy ca bởi admin ${req.user.name}]`;
        await shift.save();

        res.json({ message: 'Đã hủy ca.', shift });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.assignOrder = async (req, res) => {
    try {
        const { staffId } = req.body;
        if (!staffId) return res.status(400).json({ message: 'Thiếu ID nhân viên.' });

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        const staff = await User.findOne({ _id: staffId, role: 'staff', status: 'active' });
        if (!staff) return res.status(404).json({ message: 'Nhân viên không hợp lệ.' });

        order.processedBy = staffId;
        order.lastUpdatedBy = req.user._id;
        order.statusHistory.push({
            status: 'assigned',
            note: `Admin gán đơn cho ${staff.name}`,
            changedBy: req.user._id
        });
        await order.save();

        const Notification = require('../models/Notification');
        const notif = await Notification.create({
            recipient: staffId,
            title: 'Phân công đơn hàng',
            message: `Admin đã phân công đơn hàng ${order.orderCode} cho bạn.`,
            type: 'order',
            link: `/management/orders.html`
        });

        req.app.get('io')?.to(String(staffId)).emit('staff_notification', {
            _id: notif._id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            link: notif.link,
            createdAt: notif.createdAt
        });

        res.json({ message: `Đã gán đơn cho ${staff.name}.`, order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPayroll = async (req, res) => {
    try {
        const month = req.query.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const StaffKPI = require('../models/StaffKPI');

        const staffList = await User.find({ role: 'staff' }).select('name staffCode status avatar').lean();
        const kpis = await StaffKPI.find({ month }).lean();
        const kpiMap = new Map(kpis.map(k => [String(k.staff), k]));

        const payrolls = staffList.map(staff => {
            const kpi = kpiMap.get(String(staff._id)) || {};
            return {
                staff,
                month,
                completedShifts: kpi.completedShifts || 0,
                totalHours: kpi.totalHours || 0,
                totalSalary: kpi.totalSalary || 0,
                lateCount: kpi.lateCount || 0,
                totalOrders: kpi.totalOrders || 0,
                totalRevenue: kpi.totalRevenue || 0,
                reviewsHandled: kpi.reviewsHandled || 0,
                contactsHandled: kpi.contactsHandled || 0,
                interactionsLogged: kpi.interactionsLogged || 0,
                ordersRescued: kpi.ordersRescued || 0
            };
        });

        res.json({ payrolls, month });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── Reports ──────────────────────────────────────
exports.getReports = async (req, res) => {
    try {
        const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const to = req.query.to || new Date().toISOString();
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const diffMs = toDate - fromDate;
        const prevFromDate = new Date(fromDate.getTime() - diffMs);
        const prevToDate = new Date(toDate.getTime() - diffMs);

        const currentMatch = { createdAt: { $gte: fromDate, $lte: toDate } };
        const prevMatch = { createdAt: { $gte: prevFromDate, $lte: prevToDate } };
        const revenueMatchCurrent = { ...currentMatch, orderStatus: { $in: ['completed', 'delivered'] } };
        const revenueMatchPrev = { ...prevMatch, orderStatus: { $in: ['completed', 'delivered'] } };

        const [
            ordersCurrent, ordersPrev,
            revCurrent, revPrev,
            customersCurrent, customersPrev,
            returnCurrent, returnPrev,
            visitsCurrent, visitsPrev,
            lowStockProducts,
            topCustomers
        ] = await Promise.all([
            Order.countDocuments(currentMatch),
            Order.countDocuments(prevMatch),
            Order.aggregate([{ $match: revenueMatchCurrent }, { $group: { _id: null, total: { $sum: '$totalAmount' }, maxOrderValue: { $max: '$totalAmount' }, minOrderValue: { $min: '$totalAmount' } } }]),
            Order.aggregate([{ $match: revenueMatchPrev }, { $group: { _id: null, total: { $sum: '$totalAmount' }, maxOrderValue: { $max: '$totalAmount' }, minOrderValue: { $min: '$totalAmount' } } }]),
            User.countDocuments({ role: 'customer', createdAt: { $gte: fromDate, $lte: toDate } }),
            User.countDocuments({ role: 'customer', createdAt: { $gte: prevFromDate, $lte: prevToDate } }),
            Order.countDocuments({ ...currentMatch, orderStatus: 'returned' }),
            Order.countDocuments({ ...prevMatch, orderStatus: 'returned' }),
            Promise.resolve(100),
            Promise.resolve(100),
            Product.aggregate([
                { $match: { stock: { $lt: 20 } } },
                { $sort: { stock: 1 } },
                { $limit: 5 },
                { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
                { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
                { $project: { _id: 1, name: 1, stock: 1, categoryName: '$cat.name', image: { $arrayElemAt: ['$images.url', 0] } } }
            ]),
            Order.aggregate([
                { $match: revenueMatchCurrent },
                { $group: { _id: '$customer', totalSpent: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
                { $sort: { totalSpent: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDoc' } },
                { $unwind: '$userDoc' },
                { $project: { _id: 1, name: '$userDoc.name', phone: '$userDoc.phone', totalSpent: 1, orderCount: 1, image: '$userDoc.avatar' } }
            ])
        ]);

        const totalRevenue = revCurrent[0]?.total || 0;
        const prevRevenue = revPrev[0]?.total || 0;
        const maxOrderValue = revCurrent[0]?.maxOrderValue || 0;
        const minOrderValue = revCurrent[0]?.minOrderValue || 0;
        const prevMaxOrderValue = revPrev[0]?.maxOrderValue || 0;
        const prevMinOrderValue = revPrev[0]?.minOrderValue || 0;
        const maxOrdChange = prevMaxOrderValue ? ((maxOrderValue - prevMaxOrderValue) / prevMaxOrderValue * 100) : 0;
        const minOrdChange = prevMinOrderValue ? ((minOrderValue - prevMinOrderValue) / prevMinOrderValue * 100) : 0;
        
        const revenueByDay = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const ordersByPaymentMethod = await Order.aggregate([
            { $match: currentMatch },
            { $group: { _id: '$paymentMethod', method: { $first: '$paymentMethod' }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
        ]);

        const revenueByCategory = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
            { $unwind: '$prod' },
            { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
            { $unwind: '$cat' },
            { $group: { _id: '$cat._id', categoryName: { $first: '$cat.name' }, revenue: { $sum: '$items.itemTotal' } } },
            { $sort: { revenue: -1 } }
        ]);

        const prevRevenueByCategory = await Order.aggregate([
            { $match: revenueMatchPrev },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
            { $unwind: '$prod' },
            { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
            { $unwind: '$cat' },
            { $group: { _id: '$cat._id', revenue: { $sum: '$items.itemTotal' } } }
        ]);

        const categoryTrends = revenueByCategory.map(cat => {
            const prev = prevRevenueByCategory.find(p => p._id.toString() === cat._id.toString());
            const prevRev = prev ? prev.revenue : 0;
            const change = prevRev ? ((cat.revenue - prevRev) / prevRev * 100) : 100;
            return { categoryName: cat.categoryName, revenue: cat.revenue, change };
        });

        const topProducts = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $unwind: '$items' },
            { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.itemTotal' } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'prod' } },
            { $unwind: '$prod' },
            { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
            { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, name: '$prod.name', price: '$prod.price', categoryName: '$cat.name', totalSold: 1, totalRevenue: 1, image: { $arrayElemAt: ['$prod.images.url', 0] } } }
        ]);

        const revenueByHour = await Order.aggregate([
            { $match: currentMatch },
            { $group: { _id: { $hour: { date: '$createdAt', timezone: '+07:00' } }, hour: { $first: { $hour: { date: '$createdAt', timezone: '+07:00' } } }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
            { $sort: { _id: 1 } }
        ]);

        const orderStatusFunnel = await Order.aggregate([
            { $match: currentMatch },
            { $group: { _id: '$orderStatus', status: { $first: '$orderStatus' }, count: { $sum: 1 } } }
        ]);
        
        const revChange = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
        const ordChange = ordersPrev ? ((ordersCurrent - ordersPrev) / ordersPrev * 100) : 0;
        const custChange = customersPrev ? ((customersCurrent - customersPrev) / customersPrev * 100) : 0;
        const convRate = visitsCurrent ? (ordersCurrent / visitsCurrent) * 100 : 0;

        res.json({
            period: { from, to },
            kpis: {
                totalRevenue: totalRevenue,
                revenueChange: revChange,
                totalOrders: ordersCurrent,
                ordersChange: ordChange,
                conversionRate: convRate,
                conversionChange: 0,
                avgOrderValue: ordersCurrent ? totalRevenue / ordersCurrent : 0,
                maxOrderValue: maxOrderValue,
                maxOrderChange: maxOrdChange,
                minOrderValue: minOrderValue,
                minOrderChange: minOrdChange,
                newCustomers: customersCurrent,
                customersChange: custChange,
                returnRate: ordersCurrent ? (returnCurrent / ordersCurrent) * 100 : 0,
                returnRateChange: 0
            },
            revenueByDay,
            ordersByPaymentMethod,
            revenueByCategory,
            topProducts,
            revenueByHour,
            orderStatusFunnel,
            topCustomers,
            lowStockProducts,
            categoryTrends,
            insights: {
                revenueChange: revChange,
                salesChange: ordChange,
                conversionRate: convRate,
                customersChange: custChange
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── Backups ──────────────────────────────────────
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

exports.createBackup = async (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const [
            products, categories, orders, users, reviews, contacts, promotions, banners, blogs, notifications, staffShifts, inventoryTransactions
        ] = await Promise.all([
            Product.find().lean(), Category.find().lean(), Order.find().lean(), User.find().select('-password').lean(), Review.find().lean(), Contact.find().lean(), Promotion.find().lean(), Banner.find().lean(), Blog.find().lean(), Notification.find().lean(), StaffShift.find().lean(), InventoryTransaction.find().lean()
        ]);
        const backupData = {
            version: '2.0', exportedAt: new Date().toISOString(),
            collections: { products, categories, orders, users, reviews, contacts, promotions, banners, blogs, notifications, staffShifts, inventoryTransactions }
        };
        const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.cdbak`;
        fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(backupData));
        res.status(201).json({ message: 'Tạo bản sao lưu thành công.', backup: { filename, size: JSON.stringify(backupData).length, createdAt: new Date() } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getBackups = async (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.cdbak'));
        const backups = files.map(filename => {
            const stats = fs.statSync(path.join(BACKUP_DIR, filename));
            return { filename, size: stats.size, createdAt: stats.birthtime };
        }).sort((a, b) => b.createdAt - a.createdAt);
        res.json({ backups });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.deleteBackup = async (req, res) => {
    try {
        const filePath = path.join(BACKUP_DIR, req.params.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.json({ message: 'Xóa bản sao lưu thành công.' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.restoreBackup = async (req, res) => {
    try {
        const filePath = path.join(BACKUP_DIR, req.params.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File backup không tồn tại.' });
        
        const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { collections } = backupData;
        
        if (!collections) return res.status(400).json({ message: 'File backup không hợp lệ.' });

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await Promise.all([
                Product.deleteMany({}).session(session),
                Category.deleteMany({}).session(session),
                Order.deleteMany({}).session(session),
                User.deleteMany({}).session(session),
                Review.deleteMany({}).session(session),
                Contact.deleteMany({}).session(session),
                Promotion.deleteMany({}).session(session),
                Banner.deleteMany({}).session(session),
                Blog.deleteMany({}).session(session),
                Notification.deleteMany({}).session(session),
                StaffShift.deleteMany({}).session(session),
                InventoryTransaction.deleteMany({}).session(session)
            ]);

            if (collections.products?.length) await Product.insertMany(collections.products, { session });
            if (collections.categories?.length) await Category.insertMany(collections.categories, { session });
            if (collections.orders?.length) await Order.insertMany(collections.orders, { session });
            if (collections.users?.length) await User.insertMany(collections.users, { session });
            if (collections.reviews?.length) await Review.insertMany(collections.reviews, { session });
            if (collections.contacts?.length) await Contact.insertMany(collections.contacts, { session });
            if (collections.promotions?.length) await Promotion.insertMany(collections.promotions, { session });
            if (collections.banners?.length) await Banner.insertMany(collections.banners, { session });
            if (collections.blogs?.length) await Blog.insertMany(collections.blogs, { session });
            if (collections.notifications?.length) await Notification.insertMany(collections.notifications, { session });
            if (collections.staffShifts?.length) await StaffShift.insertMany(collections.staffShifts, { session });
            if (collections.inventoryTransactions?.length) await InventoryTransaction.insertMany(collections.inventoryTransactions, { session });

            await session.commitTransaction();
            session.endSession();
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }

        res.json({ message: 'Khôi phục bản sao lưu thành công.' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
