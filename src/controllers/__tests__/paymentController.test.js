jest.mock('../../models/Order', () => ({
    findOne: jest.fn()
}));

jest.mock('../../models/User', () => ({
    find: jest.fn()
}));

jest.mock('../../models/Notification', () => ({
    insertMany: jest.fn()
}));

jest.mock('../../utils/vnpay', () => ({
    verifyVnpayReturn: jest.fn()
}));

const paymentController = require('../paymentController');
const Order = require('../../models/Order');
const { verifyVnpayReturn } = require('../../utils/vnpay');

function responseMock() {
    return {
        redirect: jest.fn()
    };
}

function orderMock() {
    return {
        _id: 'order_123',
        orderCode: 'CSDC20260521001',
        paymentMethod: 'vnpay',
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
        totalAmount: 3550000,
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true)
    };
}

describe('Payment Controller Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('vnpayReturn', () => {
        test('should keep failed VNPay orders unpaid so customers can retry payment', async () => {
            const req = {
                query: {},
                app: { get: jest.fn() }
            };
            const res = responseMock();
            const order = orderMock();
            verifyVnpayReturn.mockReturnValue({
                valid: true,
                params: {
                    vnp_TxnRef: order.orderCode,
                    vnp_Amount: '355000000',
                    vnp_ResponseCode: '10',
                    vnp_TransactionStatus: '02'
                }
            });
            Order.findOne.mockResolvedValue(order);

            await paymentController.vnpayReturn(req, res);

            expect(order.orderStatus).toBe('pending');
            expect(order.paymentStatus).toBe('unpaid');
            expect(order.statusHistory).toEqual([
                {
                    status: 'pending',
                    note: 'VNPay thanh toan khong thanh cong. Ma phan hoi: 10'
                }
            ]);
            expect(order.save).toHaveBeenCalled();
            expect(res.redirect).toHaveBeenCalledWith('/customers/order-detail.html?id=order_123&payment=failed');
        });
    });
});
