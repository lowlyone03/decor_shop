const User = require('../models/User');
const StaffShift = require('../models/StaffShift');
const { verifyToken } = require('../utils/crypto');
const { localDateString, localMinutes } = require('../utils/staffShift');

async function authRequired(req, res, next) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const userId = verifyToken(token);
    if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

    try {
        const user = await User.findById(userId).select('-password');
        if (!user || user.status !== 'active') return res.status(401).json({ message: 'Tài khoản không hợp lệ.' });
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function optionalAuthUser(req) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const userId = verifyToken(token);
    if (!userId) return null;
    try {
        const user = await User.findById(userId).select('-password');
        return user && user.status === 'active' ? user : null;
    } catch {
        return null;
    }
}

async function adminRequired(req, res, next) {
    if (req.user?.role === 'admin') return next();
    if (req.user?.role === 'staff') {
        const now = new Date();
        const activeShift = await StaffShift.findOne({
            staff: req.user._id,
            shiftDate: localDateString(now),
            status: { $in: ['scheduled', 'active'] },
            startMinute: { $lte: localMinutes(now) },
            endMinute: { $gt: localMinutes(now) }
        }).lean();
        if (activeShift) {
            req.activeShift = activeShift;
            return next();
        }
    }
    return res.status(403).json({ message: 'Ban khong co quyen truy cap khu vuc quan tri.' });
}

module.exports = {
    authRequired,
    optionalAuthUser,
    adminRequired
};
