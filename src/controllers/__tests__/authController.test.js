const authController = require('../authController');

// Mock User model
jest.mock('../../models/User', () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockUserInstance = {
        _id: 'user_123',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0987654321',
        password: 'hashedpassword',
        save: mockSave
    };
    const UserConstructor = jest.fn().mockImplementation(() => mockUserInstance);
    UserConstructor.findOne = jest.fn();
    UserConstructor.create = jest.fn();
    UserConstructor.findById = jest.fn();
    UserConstructor.findByIdAndUpdate = jest.fn();
    return UserConstructor;
});

// Mock crypto
jest.mock('../../utils/crypto', () => ({
    hashPassword: jest.fn((p) => `hashed-${p}`),
    verifyPassword: jest.fn((p, hash) => hash === `hashed-${p}` || hash === 'hashedpassword'),
    hashToken: jest.fn((t) => `hashed-token-${t}`),
    signToken: jest.fn((id) => `signed-token-${id}`)
}));

// Mock helpers
jest.mock('../../utils/helpers', () => ({
    cleanText: jest.fn((val) => String(val || '').trim()),
    normalizePhone: jest.fn((val) => String(val || '').replace(/[^\d+]/g, '').trim()),
    isValidEmail: jest.fn((val) => val.includes('@')),
    isValidVietnamPhone: jest.fn((val) => val.length === 10),
    validateAddress: jest.fn((addr) => ({ address: addr })),
    toPublicUser: jest.fn((user) => {
        if (!user) return null;
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone
        };
    })
}));

const User = require('../../models/User');

describe('Auth Controller Module', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            body: {},
            user: { _id: 'user_123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('register', () => {
        test('should register a new customer successfully', async () => {
            req.body = {
                name: 'Nguyen Van A',
                email: 'a@example.com',
                phone: '0987654321',
                password: 'password123'
            };
            
            User.findOne.mockResolvedValue(null); // email not used
            User.create.mockResolvedValue({
                _id: 'user_123',
                name: 'Nguyen Van A',
                email: 'a@example.com',
                phone: '0987654321'
            });

            await authController.register(req, res);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'a@example.com' });
            expect(User.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                token: 'signed-token-user_123'
            }));
        });

        test('should return 400 if fields are missing', async () => {
            req.body = { email: 'a@example.com' }; // missing password and name

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng nhập đủ họ tên, email và mật khẩu.' });
        });

        test('should return 409 if email is already taken', async () => {
            req.body = {
                name: 'Nguyen Van A',
                email: 'a@example.com',
                password: 'password123'
            };

            User.findOne.mockResolvedValue({ _id: 'existing_user' });

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ message: 'Email đã được sử dụng.' });
        });
    });

    describe('login', () => {
        test('should authenticate and login customer with correct credentials', async () => {
            req.body = { email: 'a@example.com', password: 'password123' };
            
            User.findOne.mockResolvedValue({
                _id: 'user_123',
                email: 'a@example.com',
                password: 'hashedpassword',
                status: 'active'
            });

            await authController.login(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                token: 'signed-token-user_123'
            }));
        });

        test('should return 401 if wrong email or password', async () => {
            req.body = { email: 'a@example.com', password: 'wrongpassword' };
            User.findOne.mockResolvedValue(null); // not found

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Email hoặc mật khẩu không đúng.' });
        });
    });

    describe('getMe', () => {
        test('should return req.user data', () => {
            req.user = { _id: 'user_123', name: 'User Name', email: 'test@example.com' };
            
            authController.getMe(req, res);

            expect(res.json).toHaveBeenCalledWith({
                user: expect.objectContaining({ _id: 'user_123' })
            });
        });
    });

    describe('updatePassword', () => {
        test('should update password with correct old password', async () => {
            req.body = { currentPassword: 'password123', newPassword: 'newsecure123' };
            
            const mockUser = {
                password: 'hashedpassword',
                save: jest.fn().mockResolvedValue(true)
            };
            User.findById.mockResolvedValue(mockUser);

            await authController.updatePassword(req, res);

            expect(mockUser.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ message: 'Đổi mật khẩu thành công.' });
        });
    });

    describe('forgotPassword', () => {
        test('should generate reset password url successfully', async () => {
            req.body = { email: 'a@example.com' };

            const mockUser = {
                email: 'a@example.com',
                save: jest.fn().mockResolvedValue(true)
            };
            User.findOne.mockResolvedValue(mockUser);

            await authController.forgotPassword(req, res);

            expect(mockUser.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Da tao lien ket dat lai mat khau.'
            }));
        });
    });
});
