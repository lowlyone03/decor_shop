const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Wishlist = require('../models/Wishlist');
const Promotion = require('../models/Promotion');
const Blog = require('../models/Blog');
const Banner = require('../models/Banner');
const Contact = require('../models/Contact');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

const appCache = require('../utils/cache');
const {
    findUsablePromotion,
    promotionDiscountAmount,
    cleanText,
    normalizePhone,
    isValidEmail,
    isValidVietnamPhone,
    inferContactMeta
} = require('../utils/helpers');
const { optionalAuthUser } = require('../middlewares/auth');
const { hydrateContactsWithCustomers, hydrateContactWithCustomer } = require('../utils/contactPresenter');

async function notifyAdminsAboutContact(req, contact, title, message, eventName) {
    const hydrated = await hydrateContactWithCustomer(contact);
    const admins = await User.find({ role: { $in: ['admin', 'staff'] }, status: 'active' }).select('_id').lean();
    await Promise.all(admins.map((admin) => Notification.create({
        recipient: admin._id,
        title,
        message,
        type: 'contact',
        link: `/admin/contacts.html?id=${hydrated._id}`
    })));
    req.app.get('io')?.emit(eventName, { contact: hydrated, title, message });
    return hydrated;
}

// Review creation
exports.createReview = async (req, res) => {
    try {
        const { product, order, rating, comment } = req.body;
        let images = [];
        let video = undefined;
        if (req.files) {
            if (req.files['images'] && req.files['images'].length > 0) {
                images = req.files['images'].map(file => `/images/reviews/${file.filename}`);
            }
            if (req.files['video'] && req.files['video'].length > 0) {
                video = `/images/reviews/${req.files['video'][0].filename}`;
            }
        } else if (req.body.images) {
            images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
        }
        const validOrder = await Order.findOne({
            _id: order,
            customer: req.user._id,
            orderStatus: 'completed',
            'items.product': product
        });
        if (!validOrder) {
            return res.status(400).json({ message: 'Chỉ có thể đánh giá sản phẩm đã mua và đã giao.' });
        }

        const review = await Review.create({
            product,
            order,
            rating,
            comment,
            images,
            video,
            customer: req.user._id,
            status: 'active'
        });

        const stats = await Review.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(product), status: 'active' } },
            { $group: { _id: '$product', rating: { $avg: '$rating' }, numReviews: { $sum: 1 } } }
        ]);

        if (stats[0]) {
            await Product.findByIdAndUpdate(product, {
                rating: Number(stats[0].rating.toFixed(1)),
                numReviews: stats[0].numReviews
            });
        }

        res.status(201).json({ review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Wishlist
exports.getWishlist = async (req, res) => {
    try {
        const items = await Wishlist.find({ customer: req.user._id }).populate('product');
        res.json({ products: items.map((item) => item.product).filter(Boolean) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addWishlist = async (req, res) => {
    try {
        await Wishlist.updateOne(
            { customer: req.user._id, product: req.params.productId },
            { customer: req.user._id, product: req.params.productId },
            { upsert: true }
        );
        res.status(201).json({ message: 'Đã thêm vào yêu thích.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.removeWishlist = async (req, res) => {
    try {
        await Wishlist.deleteOne({ customer: req.user._id, product: req.params.productId });
        res.json({ message: 'Đã xóa khỏi yêu thích.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Promotions
exports.getPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find({ status: 'active' }).sort({ endDate: 1 }).lean();
        res.json({ promotions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.validatePromotion = async (req, res) => {
    try {
        const code = String(req.body.code || '').trim().toUpperCase();
        const subTotal = Math.max(Math.round(Number(req.body.subTotal) || 0), 0);
        const promotion = await findUsablePromotion(code);
        if (!promotion) {
            return res.status(404).json({ message: 'Ma giam gia khong hop le hoac da het han.' });
        }
        if (subTotal < Number(promotion.minOrderValue || 0)) {
            return res.status(400).json({ message: `Don hang toi thieu ${promotion.minOrderValue}.` });
        }
        const discountAmount = promotionDiscountAmount(subTotal, promotion);
        res.json({ promotion, discountAmount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Blogs
exports.getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find({ status: 'active' }).populate('author', 'name').sort({ createdAt: -1 }).lean();
        res.json({ blogs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug, status: 'active' }).populate('author', 'name').lean();
        if (!blog) return res.status(404).json({ message: 'Khong tim thay bai viet.' });
        const related = await Blog.find({ status: 'active', _id: { $ne: blog._id } }).sort({ createdAt: -1 }).limit(4).lean();
        res.json({ blog, related });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Banners
exports.getBanners = async (req, res) => {
    try {
        let banners = appCache.get('banners');
        if (!banners) {
            banners = await Banner.find({ status: 'active' }).sort({ position: 1, displayOrder: 1 }).lean();
            appCache.set('banners', banners);
        }
        res.json({ banners });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Contacts & Tickets
exports.createContact = async (req, res) => {
    try {
        const currentUser = await optionalAuthUser(req);
        const fullName = cleanText(req.body.fullName || currentUser?.name, 80);
        const email = String(req.body.email || currentUser?.email || '').toLowerCase().trim();
        const phone = normalizePhone(req.body.phone || currentUser?.phone);
        const subject = cleanText(req.body.subject, 160);
        const message = cleanText(req.body.message, 2000);

        if (!fullName || fullName.length < 2) return res.status(400).json({ message: 'Vui lòng nhập họ tên hợp lệ.' });
        if (!isValidEmail(email)) return res.status(400).json({ message: 'Email không hợp lệ.' });
        if (phone && !isValidVietnamPhone(phone)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
        if (!message || message.length < 5) return res.status(400).json({ message: 'Nội dung liên hệ quá ngắn.' });

        const meta = inferContactMeta({
            subject,
            message,
            category: req.body.category,
            priority: req.body.priority,
            source: req.body.source
        });

        const contact = await Contact.create({
            customer: currentUser?._id,
            customerAvatar: currentUser?.avatar,
            fullName,
            email,
            phone,
            subject,
            message,
            relatedOrderCode: cleanText(req.body.orderSelectRadio || req.body.relatedOrderCode || '', 20),
            ...meta
        });
        const hydrated = await notifyAdminsAboutContact(
            req,
            contact,
            'Yeu cau lien he moi',
            `${fullName} vua gui yeu cau: ${subject || message.slice(0, 80)}`,
            'contact_created'
        );
        res.status(201).json({ contact: hydrated, message: 'Cảm ơn bạn đã liên hệ. Casa Decor sẽ phản hồi sớm nhất.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTickets = async (req, res) => {
    try {
        const currentUser = await optionalAuthUser(req);
        const email = currentUser?.email || String(req.query.email || '').toLowerCase().trim();
        const phone = normalizePhone(req.query.phone);
        if (!isValidEmail(email)) return res.json({ contacts: [], stats: { open: 0, replied: 0, avgFirstResponseMinutes: 15 } });

        const filter = { email };
        if (!currentUser && phone) filter.phone = phone;
        const rows = await Contact.find(filter).populate('customer', 'name email phone avatar').sort({ updatedAt: -1 }).limit(30).lean();
        const contacts = await hydrateContactsWithCustomers(rows);
        const responseTimes = contacts
            .map((contact) => {
                const firstAdminReply = (contact.replies || [])
                    .filter((reply) => reply.sender === 'admin')
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
                if (!firstAdminReply) return null;
                return Math.max((new Date(firstAdminReply.createdAt) - new Date(contact.createdAt)) / 60000, 0);
            })
            .filter((value) => Number.isFinite(value));

        res.json({
            contacts,
            stats: {
                open: contacts.filter((contact) => contact.status !== 'resolved').length,
                replied: contacts.filter((contact) => (contact.replies || []).some((reply) => reply.sender === 'admin')).length,
                avgFirstResponseMinutes: responseTimes.length
                    ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
                    : 15
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.replyTicket = async (req, res) => {
    try {
        const message = cleanText(req.body.message, 2000);
        if (!message || message.length < 2) return res.status(400).json({ message: 'Nội dung phản hồi quá ngắn.' });

        const currentUser = await optionalAuthUser(req);
        const email = currentUser?.email || String(req.body.email || '').toLowerCase().trim();
        const phone = normalizePhone(req.body.phone);
        const contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ.' });
        if (contact.email !== email || (!currentUser && contact.phone && phone && contact.phone !== phone)) {
            return res.status(403).json({ message: 'Không thể xác minh yêu cầu hỗ trợ này.' });
        }

        contact.replies.push({
            sender: 'customer',
            senderName: currentUser?.name || contact.fullName || 'Khách hàng',
            senderAvatar: currentUser?.avatar || contact.customerAvatar,
            message
        });
        if (currentUser && !contact.customer) contact.customer = currentUser._id;
        if (currentUser?.avatar) contact.customerAvatar = currentUser.avatar;
        if (contact.status === 'resolved') contact.status = 'processing';
        else contact.status = 'pending';
        await contact.save();
        const hydrated = await notifyAdminsAboutContact(
            req,
            contact,
            'Khach hang phan hoi lien he',
            `${contact.fullName} vua phan hoi yeu cau ${contact.subject || ''}`.trim(),
            'contact_customer_reply'
        );
        res.json({ contact: hydrated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Newsletter
exports.subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Vui lòng nhập email.' });
        await Subscriber.updateOne({ email }, { email, status: 'active' }, { upsert: true });
        res.status(201).json({ message: 'Đăng ký nhận bản tin thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(20).lean(),
            Notification.countDocuments({ recipient: req.user._id, isRead: false })
        ]);
        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        await Notification.updateOne(
            { _id: req.params.id, recipient: req.user._id },
            { $set: { isRead: true } }
        );
        res.json({ message: 'Đã đọc thông báo.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'Đã đọc tất cả thông báo.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
