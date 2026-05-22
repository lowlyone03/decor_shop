jest.mock('../../models/Order', () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn()
}));

jest.mock('../../models/Product', () => ({
    find: jest.fn(),
    updateOne: jest.fn()
}));

jest.mock('../../models/User', () => ({
    find: jest.fn()
}));

jest.mock('../../models/Notification', () => ({
    insertMany: jest.fn()
}));

jest.mock('../../utils/vnpay', () => ({
    createVnpayPaymentUrl: jest.fn(({ order }) => `https://vnpay.test/pay/${order.orderCode}`)
}));

jest.mock('../../utils/helpers', () => ({
    validateAddress: jest.fn(),
    cleanText: jest.fn((value) => String(value || '').trim()),
    findUsablePromotion: jest.fn(),
    checkoutTotals: jest.fn(),
    nextOrderCode: jest.fn(),
    syncOrderTotals: jest.fn(() => false)
}));

const orderController = require('../orderController');
const Order = require('../../models/Order');
const Product = require('../../models/Product');

function responseMock() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    };
}

function requestMock(body = {}) {
    return {
        params: { id: 'order_123' },
        body,
        user: { _id: 'user_123' },
        headers: {},
        protocol: 'http',
        socket: { remoteAddress: '127.0.0.1' },
        get: jest.fn(() => 'localhost:5000')
    };
}

function orderMock(overrides = {}) {
    return {
        _id: 'order_123',
        orderCode: 'CSDC20260521001',
        customer: 'user_123',
        paymentMethod: 'vnpay',
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
        createdAt: new Date(),
        items: [
            { product: 'prod_1', quantity: 2 }
        ],
        save: jest.fn().mockResolvedValue(true),
        ...overrides
    };
}

describe('Order Controller Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Product.updateOne.mockResolvedValue({ modifiedCount: 1 });
    });

    describe('createVnpayPayment', () => {
        test('should create a new VNPay payment URL for an unpaid VNPay order', async () => {
            const req = requestMock();
            const res = responseMock();
            const order = orderMock();
            Order.findOne.mockResolvedValue(order);

            await orderController.createVnpayPayment(req, res);

            expect(Order.findOne).toHaveBeenCalledWith({ _id: 'order_123', customer: 'user_123' });
            expect(res.json).toHaveBeenCalledWith({
                order,
                paymentUrl: 'https://vnpay.test/pay/CSDC20260521001'
            });
        });

        test('should reject payment retry for a cancelled order', async () => {
            const req = requestMock();
            const res = responseMock();
            Order.findOne.mockResolvedValue(orderMock({ orderStatus: 'cancelled' }));

            await orderController.createVnpayPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Không thể thanh toán lại đơn hàng ở trạng thái hiện tại.' });
        });
    });

    describe('cancelOrder', () => {
        test('should allow immediate cancellation of an unpaid pending VNPay order and restore stock', async () => {
            const req = requestMock();
            const res = responseMock();
            const order = orderMock({ createdAt: new Date() });
            Order.findOne.mockResolvedValue(order);

            await orderController.cancelOrder(req, res);

            expect(order.orderStatus).toBe('cancelled');
            expect(order.save).toHaveBeenCalled();
            expect(Product.updateOne).toHaveBeenCalledWith(
                { _id: 'prod_1' },
                { $inc: { stock: 2, sold: -2 } }
            );
            expect(res.json).toHaveBeenCalledWith({ order });
        });
    });
});
