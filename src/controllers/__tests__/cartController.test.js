const cartController = require('../cartController');

// Mock Cart model
jest.mock('../../models/Cart', () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockCartInstance = {
        customer: 'user_123',
        items: [],
        subTotal: 0,
        save: mockSave
    };
    const CartConstructor = jest.fn().mockImplementation(() => mockCartInstance);
    CartConstructor.findOne = jest.fn();
    CartConstructor.mockSave = mockSave;
    return CartConstructor;
});

// Mock Product model
jest.mock('../../models/Product', () => ({
    findById: jest.fn()
}));

// Mock helpers
jest.mock('../../utils/helpers', () => ({
    positiveInt: jest.fn((val) => Number(val) || 1),
    effectivePrice: jest.fn((prod) => prod.salePrice || prod.price),
    primaryImage: jest.fn((prod) => prod.image || ''),
    cartResponse: jest.fn((cart) => cart || { customer: 'user_123', items: [] }),
    syncCartPrices: jest.fn((cart) => cart)
}));

const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const helpers = require('../../utils/helpers');

describe('Cart Controller Module', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            user: { _id: 'user_123' },
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('getCart', () => {
        test('should retrieve cart and return cart response', async () => {
            const mockCart = { customer: 'user_123', items: [], subTotal: 0 };
            Cart.findOne.mockResolvedValue(mockCart);
            helpers.syncCartPrices.mockResolvedValue(mockCart);

            await cartController.getCart(req, res);

            expect(Cart.findOne).toHaveBeenCalledWith({ customer: 'user_123' });
            expect(res.json).toHaveBeenCalled();
        });

        test('should return 500 error if findOne fails', async () => {
            Cart.findOne.mockRejectedValue(new Error('DB Error'));

            await cartController.getCart(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'DB Error' });
        });
    });

    describe('addCartItem', () => {
        test('should return 404 if product is invalid, inactive or out of stock', async () => {
            req.body = { productId: 'prod_999', quantity: 2 };
            Product.findById.mockResolvedValue(null); // not found

            await cartController.addCartItem(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Sản phẩm không hợp lệ hoặc đã hết hàng.' });
        });

        test('should add new item to cart successfully', async () => {
            req.body = { productId: 'prod_111', quantity: 2 };
            
            const activeProduct = { _id: 'prod_111', name: 'Product A', status: 'active', stock: 10, price: 100000 };
            Product.findById.mockResolvedValue(activeProduct);
            
            const mockCart = {
                customer: 'user_123',
                items: [],
                subTotal: 0,
                save: jest.fn().mockResolvedValue(true)
            };
            Cart.findOne.mockResolvedValue(mockCart);

            await cartController.addCartItem(req, res);

            expect(mockCart.items).toHaveLength(1);
            expect(mockCart.items[0].product).toBe('prod_111');
            expect(mockCart.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('should increment quantity if item already in cart', async () => {
            req.body = { productId: 'prod_111', quantity: 2 };
            
            const activeProduct = { _id: 'prod_111', name: 'Product A', status: 'active', stock: 10, price: 100000 };
            Product.findById.mockResolvedValue(activeProduct);
            
            const mockCart = {
                customer: 'user_123',
                items: [{
                    product: 'prod_111',
                    quantity: 1,
                    priceAtAdding: 100000,
                    itemTotal: 100000
                }],
                subTotal: 100000,
                save: jest.fn().mockResolvedValue(true)
            };
            Cart.findOne.mockResolvedValue(mockCart);

            await cartController.addCartItem(req, res);

            expect(mockCart.items[0].quantity).toBe(3); // 1 + 2
            expect(mockCart.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('should return 400 if requested quantity exceeds stock', async () => {
            req.body = { productId: 'prod_111', quantity: 15 };
            
            const activeProduct = { _id: 'prod_111', name: 'Product A', status: 'active', stock: 10, price: 100000 };
            Product.findById.mockResolvedValue(activeProduct);
            
            const mockCart = { customer: 'user_123', items: [], subTotal: 0 };
            Cart.findOne.mockResolvedValue(mockCart);

            await cartController.addCartItem(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Chỉ còn 10 sản phẩm trong kho.' });
        });
    });

    describe('updateCartItem', () => {
        test('should update quantity of an existing item in cart', async () => {
            req.params.productId = 'prod_111';
            req.body.quantity = 5;

            const mockCart = {
                customer: 'user_123',
                items: [{
                    product: 'prod_111',
                    quantity: 2,
                    priceAtAdding: 100000,
                    itemTotal: 200000
                }],
                subTotal: 200000,
                save: jest.fn().mockResolvedValue(true)
            };
            Cart.findOne.mockResolvedValue(mockCart);

            const activeProduct = { _id: 'prod_111', name: 'Product A', status: 'active', stock: 10, price: 100000 };
            Product.findById.mockResolvedValue(activeProduct);

            await cartController.updateCartItem(req, res);

            expect(mockCart.items[0].quantity).toBe(5);
            expect(mockCart.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalled();
        });

        test('should return 404 if cart is not found', async () => {
            Cart.findOne.mockResolvedValue(null);

            await cartController.updateCartItem(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Giỏ hàng trống.' });
        });
    });

    describe('removeCartItem', () => {
        test('should remove item from cart', async () => {
            req.params.productId = 'prod_111';

            const mockCart = {
                customer: 'user_123',
                items: [
                    { product: 'prod_111', quantity: 2, itemTotal: 200000 },
                    { product: 'prod_222', quantity: 1, itemTotal: 50000 }
                ],
                subTotal: 250000,
                save: jest.fn().mockResolvedValue(true)
            };
            Cart.findOne.mockResolvedValue(mockCart);

            await cartController.removeCartItem(req, res);

            expect(mockCart.items).toHaveLength(1);
            expect(mockCart.items[0].product).toBe('prod_222');
            expect(mockCart.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalled();
        });
    });
});
