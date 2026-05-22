const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createVnpayPaymentUrl } = require('../utils/vnpay');
const {
    validateAddress,
    cleanText,
    findUsablePromotion,
    checkoutTotals,
    nextOrderCode,
    syncOrderTotals
} = require('../utils/helpers');
const { sendOrderConfirmationEmail } = require('../utils/email');

exports.createOrder = async (req, res) => {
    try {
        const { shippingInfo, paymentMethod, note, promotionCode } = req.body;
        const Cart = require('../models/Cart'); // Lazy load to avoid circular ref if any
        const cart = await Cart.findOne({ customer: req.user._id });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng đang trống.' });
        }

        const addressResult = validateAddress(shippingInfo);
        if (addressResult.error) return res.status(400).json({ message: addressResult.error });
        if (!['cod', 'bank_transfer', 'vnpay'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ.' });
        }

        const productIds = cart.items.map((item) => item.product);
        const products = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map((product) => [String(product._id), product]));
        const { effectivePrice, primaryImage } = require('../utils/helpers');

        for (const item of cart.items) {
            const product = productMap.get(String(item.product));
            if (!product || product.status !== 'active') {
                return res.status(400).json({ message: `Sản phẩm ${item.name} không còn khả dụng.` });
            }
            if (item.quantity > product.stock) {
                return res.status(400).json({ message: `Sản phẩm ${product.name} chỉ còn ${product.stock} trong kho.` });
            }
            item.name = product.name;
            item.image = primaryImage(product);
            item.priceAtAdding = effectivePrice(product);
            item.itemTotal = item.quantity * item.priceAtAdding;
        }
        cart.subTotal = cart.items.reduce((sum, entry) => sum + entry.itemTotal, 0);
        await cart.save();

        const promotion = await findUsablePromotion(promotionCode);
        if (promotionCode && !promotion) {
            return res.status(400).json({ message: 'Ma giam gia khong hop le hoac da het han.' });
        }
        if (promotion && cart.subTotal < Number(promotion.minOrderValue || 0)) {
            return res.status(400).json({ message: `Don hang chua dat gia tri toi thieu ${promotion.minOrderValue}.` });
        }
        const totals = checkoutTotals(cart.subTotal, promotion);

        const reservedItems = [];
        for (const item of cart.items) {
            const result = await Product.updateOne(
                { _id: item.product, status: 'active', stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity, sold: item.quantity } }
            );
            if (!result.modifiedCount) {
                await Promise.all(reservedItems.map((reserved) => Product.updateOne(
                    { _id: reserved.product },
                    { $inc: { stock: reserved.quantity, sold: -reserved.quantity } }
                )));
                return res.status(400).json({ message: `Sản phẩm ${item.name} không đủ tồn kho.` });
            }
            reservedItems.push({ product: item.product, quantity: item.quantity });
        }

        let order;
        try {
            const Promotion = require('../models/Promotion');
            order = await Order.create({
                orderCode: await nextOrderCode(),
                customer: req.user._id,
                shippingInfo: {
                    fullName: addressResult.address.fullName,
                    phone: addressResult.address.phone,
                    address: addressResult.address.address,
                    ward: addressResult.address.ward,
                    district: addressResult.address.district,
                    city: addressResult.address.city
                },
                items: cart.items.map((item) => ({
                    product: item.product,
                    name: item.name,
                    image: item.image,
                    purchasePrice: item.priceAtAdding,
                    quantity: item.quantity,
                    itemTotal: item.itemTotal
                })),
                itemsTotal: totals.itemsTotal,
                shippingFee: totals.shippingFee,
                discountAmount: totals.discountAmount,
                promotionCode: promotion?.code,
                totalAmount: totals.totalAmount,
                paymentMethod,
                note: cleanText(note, 500)
            });
            if (promotion) await Promotion.updateOne({ _id: promotion._id }, { $inc: { usedCount: 1 } });
        } catch (error) {
            await Promise.all(reservedItems.map((reserved) => Product.updateOne(
                { _id: reserved.product },
                { $inc: { stock: reserved.quantity, sold: -reserved.quantity } }
            )));
            throw error;
        }

        cart.items = [];
        cart.subTotal = 0;
        await cart.save();

        // Phát thông báo đơn hàng mới qua socket.io
        req.app.get('io').emit('new_order', {
            _id: order._id,
            orderCode: order.orderCode,
            customerName: addressResult.address.fullName,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt
        });

        // Tạo thông báo trong CSDL cho admin
        try {
            const admins = await User.find({ role: 'admin' });
            const notifications = admins.map((admin) => ({
                recipient: admin._id,
                title: `Đơn hàng mới: ${order.orderCode}`,
                message: `Khách hàng ${addressResult.address.fullName} vừa đặt đơn trị giá ${order.totalAmount.toLocaleString('vi-VN')}đ.`,
                type: 'order',
                link: `/admin/orders.html?id=${order._id}`
            }));
            await Notification.insertMany(notifications);
        } catch (err) {
            console.error('Lỗi khi tạo thông báo admin:', err);
        }

        const payload = { order };
        if (order.paymentMethod === 'vnpay') {
            payload.paymentUrl = createVnpayPaymentUrl({ order, req });
        }

        // Gửi email xác nhận
        sendOrderConfirmationEmail(req.user.email, order, req.user.name).catch(err => console.error('Order email error:', err));

        res.status(201).json(payload);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });
        const dirtyOrders = orders.filter((order) => !order.promotionCode && syncOrderTotals(order));
        if (dirtyOrders.length) {
            await Promise.all(dirtyOrders.map((order) => order.save()));
        }
        res.json({ orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createVnpayPayment = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        if (order.paymentMethod !== 'vnpay') {
            return res.status(400).json({ message: 'Đơn hàng này không dùng phương thức VNPay.' });
        }
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Đơn hàng đã được thanh toán.' });
        }
        if (['cancelled', 'return_requested', 'refunding', 'refunded'].includes(order.orderStatus)) {
            return res.status(400).json({ message: 'Không thể thanh toán lại đơn hàng ở trạng thái hiện tại.' });
        }

        res.json({
            order,
            paymentUrl: createVnpayPaymentUrl({ order, req })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        const canCancelUnpaidVnpay = order.paymentMethod === 'vnpay'
            && order.paymentStatus === 'unpaid'
            && order.orderStatus === 'pending';

        if (order.orderStatus === 'pending') {
            const ageInMs = Date.now() - new Date(order.createdAt).getTime();
            const ageInHours = ageInMs / (1000 * 60 * 60);
            if (!canCancelUnpaidVnpay && ageInHours < 24) {
                return res.status(400).json({ message: 'Đơn hàng mới đặt dưới 24h và đang chờ xác nhận, chưa thể tự hủy. Vui lòng liên hệ hotline nếu cần hỗ trợ gấp.' });
            }
        } else if (!['processing'].includes(order.orderStatus)) {
            return res.status(400).json({ message: 'Đơn hàng không thể hủy ở trạng thái hiện tại.' });
        }

        order.orderStatus = 'cancelled';
        await order.save();

        await Promise.all(order.items.map((item) => Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity, sold: -item.quantity } }
        )));

        res.json({ order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.returnOrder = async (req, res) => {
    try {
        const { reason, condition, description, images = [] } = req.body;
        const order = await Order.findOne({ _id: req.params.id, customer: req.user._id, orderStatus: 'completed' });
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng đã giao để hoàn trả.' });

        const deliveredTime = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime();
        const ageSinceDelivered = (Date.now() - deliveredTime) / (1000 * 60 * 60 * 24);

        if (ageSinceDelivered > 3) {
            return res.status(400).json({ message: 'Đã quá thời hạn 3 ngày cho phép hoàn trả.' });
        }

        order.returnRequest = {
            reason,
            condition,
            description,
            images,
            status: 'pending',
            requestedAt: new Date()
        };
        order.orderStatus = 'return_requested';
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
            status: 'return_requested',
            note: `Khách hàng gửi yêu cầu hoàn trả. Lý do: ${reason || 'N/A'}`
        });

        await order.save();

        // Phát thông báo yêu cầu trả hàng qua socket.io cho admin
        req.app.get('io').emit('return_requested', {
            _id: order._id,
            orderCode: order.orderCode,
            customerName: req.user.name || req.user.email,
            reason: reason || 'Không rõ',
            createdAt: new Date()
        });

        // Tạo thông báo trong CSDL cho tất cả admin
        try {
            const admins = await User.find({ role: 'admin' });
            const notifications = admins.map((admin) => ({
                recipient: admin._id,
                title: `Yêu cầu trả hàng: ${order.orderCode}`,
                message: `Khách hàng ${req.user.name || req.user.email} yêu cầu trả hàng. Lý do: ${reason || 'Không rõ'}`,
                type: 'order',
                link: `/admin/orders.html?id=${order._id}`
            }));
            await Notification.insertMany(notifications);
        } catch (err) {
            console.error('Lỗi khi tạo thông báo trả hàng:', err);
        }

        res.json({ message: 'Đã gửi yêu cầu hoàn trả thành công. Chúng tôi sẽ phản hồi trong vòng 24h.', order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
