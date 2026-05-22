const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const authSecret = process.env.AUTH_SECRET || 'casa-decor-dev-secret';

/**
 * Hash a password using bcryptjs.
 */
function hashPassword(password) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(String(password), salt);
}

/**
 * Verify a plain text password against a hashed password.
 * Supports both bcryptjs and legacy SHA256 hashes for backward compatibility.
 */
function verifyPassword(plainPassword, hashedPassword) {
    if (!hashedPassword) return false;
    
    // Check if the hash is a bcrypt hash
    if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
        return bcrypt.compareSync(String(plainPassword), hashedPassword);
    }
    
    // Fallback to legacy SHA256
    const oldHash = crypto.createHash('sha256').update(String(plainPassword)).digest('hex');
    return oldHash === hashedPassword;
}

/**
 * Hash short-lived tokens (e.g., reset password tokens) using SHA256.
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Sign a token using HMAC-SHA256.
 */
function signToken(userId) {
    const payload = `${userId}.${Date.now()}`;
    const signature = crypto.createHmac('sha256', authSecret).update(payload).digest('hex');
    return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

/**
 * Verify an HMAC-SHA256 signed token.
 */
function verifyToken(token) {
    try {
        const raw = Buffer.from(token, 'base64url').toString('utf8');
        const [userId, issuedAt, signature] = raw.split('.');
        if (!userId || !issuedAt || !signature) return null;
        
        const expected = crypto.createHmac('sha256', authSecret).update(`${userId}.${issuedAt}`).digest('hex');
        if (expected !== signature) return null;
        
        return userId;
    } catch {
        return null;
    }
}

module.exports = {
    hashPassword,
    verifyPassword,
    hashToken,
    signToken,
    verifyToken
};
