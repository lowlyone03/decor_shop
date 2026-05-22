const { authRequired, adminRequired, optionalAuthUser } = require('../auth');

// Mock User model và crypto utility
jest.mock('../../models/User', () => ({
    findById: jest.fn()
}));
jest.mock('../../utils/crypto', () => ({
    verifyToken: jest.fn()
}));

const User = require('../../models/User');
const { verifyToken } = require('../../utils/crypto');

describe('Auth Middlewares', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = {
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        
        jest.clearAllMocks();
    });

    describe('authRequired middleware', () => {
        test('should return 401 if no Authorization header is provided', async () => {
            req.headers.authorization = '';
            verifyToken.mockReturnValue(null);

            await authRequired(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng đăng nhập.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should return 401 if token verification fails', async () => {
            req.headers.authorization = 'Bearer invalid-token';
            verifyToken.mockReturnValue(null);

            await authRequired(req, res, next);

            expect(verifyToken).toHaveBeenCalledWith('invalid-token');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng đăng nhập.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should return 401 if user is not found in database', async () => {
            req.headers.authorization = 'Bearer valid-token';
            verifyToken.mockReturnValue('user_123');
            
            // Mock Mongoose chain findById().select()
            const selectMock = jest.fn().mockResolvedValue(null);
            User.findById.mockReturnValue({ select: selectMock });

            await authRequired(req, res, next);

            expect(User.findById).toHaveBeenCalledWith('user_123');
            expect(selectMock).toHaveBeenCalledWith('-password');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tài khoản không hợp lệ.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should return 401 if user status is not active', async () => {
            req.headers.authorization = 'Bearer valid-token';
            verifyToken.mockReturnValue('user_123');
            
            const inactiveUser = { _id: 'user_123', status: 'banned', role: 'customer' };
            const selectMock = jest.fn().mockResolvedValue(inactiveUser);
            User.findById.mockReturnValue({ select: selectMock });

            await authRequired(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tài khoản không hợp lệ.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should call next and set req.user if token and user are valid', async () => {
            req.headers.authorization = 'Bearer valid-token';
            verifyToken.mockReturnValue('user_123');
            
            const activeUser = { _id: 'user_123', status: 'active', role: 'customer' };
            const selectMock = jest.fn().mockResolvedValue(activeUser);
            User.findById.mockReturnValue({ select: selectMock });

            await authRequired(req, res, next);

            expect(req.user).toBe(activeUser);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should return 500 if database query throws an error', async () => {
            req.headers.authorization = 'Bearer valid-token';
            verifyToken.mockReturnValue('user_123');
            
            const selectMock = jest.fn().mockRejectedValue(new Error('Lỗi kết nối DB'));
            User.findById.mockReturnValue({ select: selectMock });

            await authRequired(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi kết nối DB' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('optionalAuthUser helper function', () => {
        test('should return null if no token provided or invalid', async () => {
            req.headers.authorization = '';
            verifyToken.mockReturnValue(null);

            const user = await optionalAuthUser(req);
            expect(user).toBeNull();
        });

        test('should return user if active user matches token', async () => {
            req.headers.authorization = 'Bearer valid-token';
            verifyToken.mockReturnValue('user_123');

            const activeUser = { _id: 'user_123', status: 'active' };
            const selectMock = jest.fn().mockResolvedValue(activeUser);
            User.findById.mockReturnValue({ select: selectMock });

            const user = await optionalAuthUser(req);
            expect(user).toBe(activeUser);
        });

        test('should return null if database query fails', async () => {
            req.headers.authorization = 'Bearer valid-token';
            verifyToken.mockReturnValue('user_123');

            const selectMock = jest.fn().mockRejectedValue(new Error('Error'));
            User.findById.mockReturnValue({ select: selectMock });

            const user = await optionalAuthUser(req);
            expect(user).toBeNull();
        });
    });

    describe('adminRequired middleware', () => {
        test('should return 403 if user role is not admin', () => {
            req.user = { _id: 'user_123', role: 'customer' };

            adminRequired(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Ban khong co quyen truy cap khu vuc quan tri.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should call next if user role is admin', () => {
            req.user = { _id: 'admin_123', role: 'admin' };

            adminRequired(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});
