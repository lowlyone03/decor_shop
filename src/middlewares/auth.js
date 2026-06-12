const User = require('../models/User');
const { verifyToken } = require('../utils/crypto');

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
    return res.status(403).json({ message: 'Ban khong co quyen truy cap khu vuc quan tri.' });
}

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin')
        return res.status(403).json({ message: 'Chỉ admin được phép' });
    next();
};

// Chỉ admin — chặn cứng staff
const adminOnlyStrict = (req, res, next) => {
    if (req.user?.role !== 'admin')
        return res.status(403).json({ message: 'Chỉ quản trị viên được phép thực hiện.' });
    next();
};

// Staff hoặc Admin
const staffOrAdmin = (req, res, next) => {
    if (req.user?.role === 'admin' || req.user?.role === 'staff') return next();
    return res.status(403).json({ message: 'Bạn không có quyền truy cập khu vực này.' });
};

// Yêu cầu đang trong ca active (admin được miễn)
const requireActiveShift = async (req, res, next) => {
    if (req.user?.role === 'admin') return next();

    const StaffShift = require('../models/StaffShift');
    const now = new Date();
    const shiftDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const hours = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }));
    const minutes = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', minute: 'numeric' }));
    const currentMinute = hours * 60 + minutes;

    const activeShift = await StaffShift.findOne({
        staff: req.user._id,
        status: 'active'
    });

    if (!activeShift) {
        return res.status(403).json({ message: 'Bạn cần check-in ca trực trước khi thực hiện thao tác này.' });
    }

    req.activeShift = activeShift;
    next();
};

module.exports = {
    authRequired,
    optionalAuthUser,
    adminRequired,
    adminOnly,
    adminOnlyStrict,
    staffOrAdmin,
    requireActiveShift
};
