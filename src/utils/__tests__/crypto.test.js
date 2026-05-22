const crypto = require('crypto');
const {
    hashPassword,
    verifyPassword,
    hashToken,
    signToken,
    verifyToken
} = require('../crypto');

// Thiết lập AUTH_SECRET cố định cho môi trường test
process.env.AUTH_SECRET = 'test-secret-key-12345';

describe('Crypto Utility Modules', () => {
    
    describe('hashPassword & verifyPassword', () => {
        const plainPassword = 'MySecurePassword123';

        test('should hash password using bcrypt and return a valid string', () => {
            const hashed = hashPassword(plainPassword);
            expect(hashed).toBeDefined();
            expect(typeof hashed).toBe('string');
            expect(hashed).not.toBe(plainPassword);
            expect(hashed.startsWith('$2a$') || hashed.startsWith('$2b$')).toBe(true);
        });

        test('should verify password successfully with correct bcrypt hash', () => {
            const hashed = hashPassword(plainPassword);
            const isMatch = verifyPassword(plainPassword, hashed);
            expect(isMatch).toBe(true);
        });

        test('should reject incorrect password', () => {
            const hashed = hashPassword(plainPassword);
            const isMatch = verifyPassword('WrongPassword', hashed);
            expect(isMatch).toBe(false);
        });

        test('should return false if hashedPassword is empty or undefined', () => {
            expect(verifyPassword(plainPassword, null)).toBe(false);
            expect(verifyPassword(plainPassword, '')).toBe(false);
        });

        test('should fallback and verify password successfully with legacy SHA256 hash', () => {
            // Tạo hash SHA256 kiểu cũ
            const legacyHash = crypto.createHash('sha256').update(plainPassword).digest('hex');
            
            // Hàm verifyPassword phải nhận biết và so khớp chính xác
            const isMatch = verifyPassword(plainPassword, legacyHash);
            expect(isMatch).toBe(true);

            const isMatchWrong = verifyPassword('WrongPassword', legacyHash);
            expect(isMatchWrong).toBe(false);
        });
    });

    describe('hashToken', () => {
        test('should hash a simple token using SHA256 and return hex string', () => {
            const token = 'reset-password-123456';
            const expectedHash = crypto.createHash('sha256').update(token).digest('hex');
            
            const hashed = hashToken(token);
            expect(hashed).toBe(expectedHash);
            expect(hashed).toHaveLength(64); // SHA256 hex is 64 characters long
        });
    });

    describe('signToken & verifyToken', () => {
        const userId = 'user_65fd328e932b1a89c';

        test('should sign a token and return a base64url encoded string', () => {
            const token = signToken(userId);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            
            // Decode để kiểm tra cấu trúc sơ bộ
            const decodedRaw = Buffer.from(token, 'base64url').toString('utf8');
            const parts = decodedRaw.split('.');
            expect(parts).toHaveLength(3); // userId.issuedAt.signature
            expect(parts[0]).toBe(userId);
            expect(Number(parts[1])).toBeLessThanOrEqual(Date.now());
        });

        test('should verify a valid signed token and return the correct userId', () => {
            const token = signToken(userId);
            const decodedUserId = verifyToken(token);
            expect(decodedUserId).toBe(userId);
        });

        test('should return null for token with invalid signature', () => {
            const token = signToken(userId);
            // Giải mã, chỉnh sửa signature rồi mã hóa lại
            const decodedRaw = Buffer.from(token, 'base64url').toString('utf8');
            const [uid, issuedAt, signature] = decodedRaw.split('.');
            const tamperedSignature = signature.replace(/./, 'x'); // đổi 1 ký tự
            const tamperedToken = Buffer.from(`${uid}.${issuedAt}.${tamperedSignature}`).toString('base64url');

            const result = verifyToken(tamperedToken);
            expect(result).toBeNull();
        });

        test('should return null for malformed tokens', () => {
            expect(verifyToken('invalid-token-without-periods')).toBeNull();
            expect(verifyToken('part1.part2')).toBeNull(); // missing signature
            expect(verifyToken('')).toBeNull();
            expect(verifyToken(null)).toBeNull();
        });

        test('should handle decoding errors gracefully and return null', () => {
            // Truyền một chuỗi base64url bị lỗi giải mã nghiêm trọng
            const result = verifyToken('!!!invalid_base64!!!');
            expect(result).toBeNull();
        });
    });
});
