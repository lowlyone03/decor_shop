jest.mock('../../models/User', () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock('../../models/Order', () => ({
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock('../../models/Review', () => ({
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock('../../models/Contact', () => ({
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn()
}));

jest.mock('../../models/Product', () => ({
    updateOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock('../../models/Category', () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock('../../models/Promotion', () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn()
}));

jest.mock('../../models/Banner', () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn()
}));

jest.mock('../../models/Blog', () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn()
}));

jest.mock('../../models/Notification', () => ({
    create: jest.fn()
}));

jest.mock('../../models/Subscriber', () => ({
    countDocuments: jest.fn()
}));

jest.mock('../../utils/cache', () => ({
    del: jest.fn()
}));

jest.mock('../../utils/crypto', () => ({
    hashPassword: jest.fn((value) => `hashed-${value}`)
}));

jest.mock('../../utils/helpers', () => ({
    escapeRegex: jest.fn((value) => value),
    dateRangeFromQuery: jest.fn(() => ({ from: new Date(), to: new Date() })),
    startOfLocalDay: jest.fn((date = new Date()) => date),
    endOfLocalDay: jest.fn((date = new Date()) => date),
    orderRevenueMatch: jest.fn((extra = {}) => extra),
    percentChange: jest.fn(() => 0),
    shortProduct: jest.fn((product) => product),
    toPublicUser: jest.fn((user) => user),
    slugify: jest.fn((value) => String(value || '').toLowerCase()),
    cleanText: jest.fn((value) => String(value || '').trim()),
    contactCategories: ['general', 'order'],
    isValidEmail: jest.fn((value) => String(value || '').includes('@'))
}));

const adminController = require('../adminController');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Notification = require('../../models/Notification');

function responseMock() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    };
}

function requestMock(status = 'cancelled') {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));

    return {
        params: { id: 'order_123' },
        body: { status },
        app: {
            get: jest.fn(() => ({ to }))
        },
        socketMocks: { emit, to }
    };
}

function orderMock(orderStatus = 'pending') {
    return {
        _id: 'order_123',
        orderCode: 'CSDC20260521001',
        customer: 'user_123',
        orderStatus,
        paymentStatus: 'unpaid',
        items: [
            { product: 'prod_1', quantity: 2 },
            { product: 'prod_2', quantity: 1 }
        ],
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true)
    };
}

describe('Admin Controller Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Product.updateOne.mockResolvedValue({ modifiedCount: 1 });
        Notification.create.mockResolvedValue({
            _id: 'notif_123',
            title: 'Cap nhat don hang',
            message: 'Don hang da bi huy.',
            type: 'order',
            link: '/customers/profile.html?view=orders',
            createdAt: new Date()
        });
    });

    describe('updateOrderStatus', () => {
        test('should restore product stock when admin cancels an active order', async () => {
            const req = requestMock('cancelled');
            const res = responseMock();
            const order = orderMock('pending');
            Order.findById.mockResolvedValue(order);

            await adminController.updateOrderStatus(req, res);

            expect(Product.updateOne).toHaveBeenCalledTimes(2);
            expect(Product.updateOne).toHaveBeenNthCalledWith(1, { _id: 'prod_1' }, { $inc: { stock: 2, sold: -2 } });
            expect(Product.updateOne).toHaveBeenNthCalledWith(2, { _id: 'prod_2' }, { $inc: { stock: 1, sold: -1 } });
            expect(order.orderStatus).toBe('cancelled');
            expect(order.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ order });
        });

        test('should not restore product stock again if order is already cancelled', async () => {
            const req = requestMock('cancelled');
            const res = responseMock();
            const order = orderMock('cancelled');
            Order.findById.mockResolvedValue(order);

            await adminController.updateOrderStatus(req, res);

            expect(Product.updateOne).not.toHaveBeenCalled();
            expect(order.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ order });
        });
    });
});
