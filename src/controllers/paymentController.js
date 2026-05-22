const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { verifyVnpayReturn } = require('../utils/vnpay');

exports.vnpayReturn = async (req, res) => {
    try {
        const { valid, params } = verifyVnpayReturn(req.query);
        if (!valid) {
            return res.redirect('/customers/orders.html?payment=invalid');
        }

        const order = await Order.findOne({ orderCode: params.vnp_TxnRef });
        if (!order) {
            return res.redirect('/customers/orders.html?payment=notfound');
        }

        const paidAmount = Math.round(Number(params.vnp_Amount || 0) / 100);
        const expectedAmount = Math.round(Number(order.totalAmount || 0));
        const success = params.vnp_ResponseCode === '00'
            && params.vnp_TransactionStatus === '00'
            && paidAmount === expectedAmount;

        if (success) {
            order.paymentStatus = 'paid';
            if (!order.statusHistory) order.statusHistory = [];
            order.statusHistory.push({
                status: order.orderStatus,
                note: `VNPay thanh toan thanh cong. Ma giao dich: ${params.vnp_TransactionNo || 'N/A'}`
            });
            await order.save();

            try {
                const admins = await User.find({ role: 'admin' }).select('_id').lean();
                await Notification.insertMany(admins.map((admin) => ({
                    recipient: admin._id,
                    title: `VNPay da thanh toan: ${order.orderCode}`,
                    message: `Don hang ${order.orderCode} da thanh toan thanh cong ${Number(order.totalAmount).toLocaleString('vi-VN')}d qua VNPay Sandbox.`,
                    type: 'order',
                    link: `/admin/orders.html?id=${order._id}`
                })));
                req.app.get('io')?.emit('new_order', {
                    _id: order._id,
                    orderCode: order.orderCode,
                    customerName: order.shippingInfo?.fullName || 'Khach hang',
                    totalAmount: order.totalAmount,
                    createdAt: order.createdAt
                });
            } catch (notifyError) {
                console.error('VNPay notification error:', notifyError);
            }

            return res.redirect(`/customers/order-detail.html?id=${order._id}&payment=success`);
        }

        if (order.paymentMethod === 'vnpay' && order.paymentStatus !== 'paid' && order.orderStatus !== 'cancelled') {
            if (!order.statusHistory) order.statusHistory = [];
            order.statusHistory.push({
                status: order.orderStatus,
                note: `VNPay thanh toan khong thanh cong. Ma phan hoi: ${params.vnp_ResponseCode || 'N/A'}`
            });
            await order.save();
        }

        return res.redirect(`/customers/order-detail.html?id=${order._id}&payment=failed`);
    } catch (error) {
        console.error('VNPay return error:', error);
        return res.redirect('/customers/orders.html?payment=error');
    }
};
