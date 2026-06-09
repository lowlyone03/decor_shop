const User = require('../models/User');

const { hashPassword, verifyPassword, hashToken, signToken } = require('../utils/crypto');
const { cleanText, sanitizeInput, normalizePhone, isValidEmail, isValidVietnamPhone, validateAddress, toPublicUser } = require('../utils/helpers');

const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');


exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const cleanName = cleanText(name, 80);
        const cleanEmail = String(email || '').toLowerCase().trim();
        const cleanPhone = normalizePhone(phone);

        if (!cleanName || !cleanEmail || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đủ họ tên, email và mật khẩu.' });
        }
        if (cleanName.length < 2) {
            return res.status(400).json({ message: 'Họ tên phải có ít nhất 2 ký tự.' });
        }
        if (!isValidEmail(cleanEmail)) {
            return res.status(400).json({ message: 'Email không hợp lệ.' });
        }
        if (cleanPhone && !isValidVietnamPhone(cleanPhone)) {
            return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        }

        const existed = await User.findOne({ email: cleanEmail });
        if (existed) return res.status(409).json({ message: 'Email đã được sử dụng.' });

        const user = await User.create({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password: hashPassword(password),
            role: 'customer',
            status: 'active'
        });

        // Gửi email chào mừng (không block response nếu lỗi)
        sendWelcomeEmail(cleanEmail, cleanName).catch(err => console.error('Welcome email error:', err));

        res.status(201).json({ token: signToken(user._id), user: toPublicUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const rawEmail = sanitizeInput(req.body.email, 200);
        const rawPassword = String(req.body.password || '');
        const cleanEmail = rawEmail.toLowerCase().trim();

        if (!cleanEmail || !rawPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
        }

        const user = await User.findOne({ email: cleanEmail });
        
        if (!user || !verifyPassword(rawPassword, user.password)) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Tài khoản đang bị khóa.' });
        }


        let activeShift = null;
        if (user.role === 'staff') {
            // Đã bỏ chặn đăng nhập ngoài ca (theo yêu cầu B2)
            // Lấy ca active hiện tại nếu có để trả về (chỉ để frontend biết trạng thái)
            const StaffShift = require('../models/StaffShift');
            
            function vnDate(date = new Date()) {
                return new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
            }
            function vnMinuteNow() {
                const now = new Date();
                const h = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }));
                const m = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', minute: 'numeric' }));
                return h * 60 + m;
            }
            
            activeShift = await StaffShift.findOne({
                staff: user._id,
                shiftDate: vnDate(),
                status: { $in: ['scheduled', 'active'] },
                startMinute: { $lte: vnMinuteNow() },
                endMinute: { $gt: vnMinuteNow() }
            }).lean();
        }

        res.json({ token: signToken(user._id), user: { ...toPublicUser(user), activeShift } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMe = (req, res) => {
    res.json({ user: toPublicUser(req.user) });
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, avatar, addresses } = req.body;
        const update = {};

        if (name !== undefined) {
            const cleanName = cleanText(name, 80);
            if (cleanName.length < 2) return res.status(400).json({ message: 'Họ tên không hợp lệ.' });
            update.name = cleanName;
        }
        if (email !== undefined) {
            const cleanEmail = String(email || '').toLowerCase().trim();
            if (!isValidEmail(cleanEmail)) return res.status(400).json({ message: 'Email không hợp lệ.' });
            const existed = await User.findOne({ email: cleanEmail, _id: { $ne: req.user._id } });
            if (existed) return res.status(409).json({ message: 'Email đã được sử dụng.' });
            update.email = cleanEmail;
        }
        if (phone !== undefined) {
            const cleanPhone = normalizePhone(phone);
            if (cleanPhone && !isValidVietnamPhone(cleanPhone)) {
                return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
            }
            update.phone = cleanPhone;
        }
        if (avatar !== undefined) update.avatar = avatar;
        if (addresses !== undefined) {
            if (!Array.isArray(addresses)) return res.status(400).json({ message: 'Danh sách địa chỉ không hợp lệ.' });
            const normalizedAddresses = [];
            for (const item of addresses.slice(0, 10)) {
                const result = validateAddress(item);
                if (result.error) return res.status(400).json({ message: result.error });
                normalizedAddresses.push({
                    fullName: result.address.fullName,
                    phone: result.address.phone,
                    street: result.address.street || result.address.address,
                    ward: result.address.ward,
                    district: result.address.district,
                    city: result.address.city,
                    isDefault: result.address.isDefault
                });
            }
            if (normalizedAddresses.length && !normalizedAddresses.some((item) => item.isDefault)) {
                normalizedAddresses[0].isDefault = true;
            }
            update.addresses = normalizedAddresses;
        }

        const user = await User.findByIdAndUpdate(req.user._id, update, { returnDocument: 'after' }).select('-password');
        res.json({ user: toPublicUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateAvatar = async (req, res) => {
    try {
        const { avatar } = req.body;
        const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(avatar || '');
        if (!match) {
            return res.status(400).json({ message: 'Vui lòng chọn file ảnh PNG, JPG hoặc WEBP.' });
        }
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > 3 * 1024 * 1024) {
            return res.status(400).json({ message: 'Ảnh đại diện tối đa 3MB.' });
        }
        const extension = match[1].toLowerCase().replace('jpeg', 'jpg');
        const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars');
        fs.mkdirSync(uploadDir, { recursive: true });
        const filename = `${req.user._id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        const avatarUrl = `/uploads/avatars/${filename}`;
        const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { returnDocument: 'after' }).select('-password');
        res.json({ user: toPublicUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);
        
        if (!verifyPassword(currentPassword || '', user.password)) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
        }
        if (String(newPassword || '').length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
        }

        user.password = hashPassword(newPassword || '');
        await user.save();
        res.json({ message: 'Đổi mật khẩu thành công.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email || '').toLowerCase().trim();
        if (!isValidEmail(email)) return res.status(400).json({ message: 'Email khong hop le.' });
        const user = await User.findOne({ email, status: 'active' });
        if (!user) return res.json({ message: 'Neu email ton tai, he thong da tao lien ket dat lai mat khau.' });
        
        const plainToken = crypto.randomBytes(24).toString('hex');
        user.resetPasswordToken = hashToken(plainToken);
        user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();

        const resetUrl = `/customers/reset-password.html?token=${plainToken}&email=${encodeURIComponent(email)}`;
        
        // Gửi email reset password
        sendPasswordResetEmail(email, resetUrl).catch(err => console.error('Reset password email error:', err));

        res.json({
            message: 'Đã gửi link đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam).',
            // resetUrl: Không trả về nữa để bảo mật
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const email = String(req.body.email || '').toLowerCase().trim();
        const token = String(req.body.token || '').trim();
        const password = String(req.body.password || '');

        if (!isValidEmail(email) || !token) {
            return res.status(400).json({ message: 'Lien ket dat lai mat khau khong hop le.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Mat khau moi phai co it nhat 6 ky tu.' });
        }

        const user = await User.findOne({
            email,
            resetPasswordToken: hashToken(token),
            resetPasswordExpires: { $gt: new Date() },
            status: 'active'
        });
        if (!user) {
            return res.status(400).json({ message: 'Lien ket dat lai mat khau da het han hoac khong hop le.' });
        }

        user.password = hashPassword(password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Dat lai mat khau thanh cong.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
