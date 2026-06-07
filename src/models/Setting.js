const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    // ===== 1. Thông tin cửa hàng =====
    store: {
        name: { type: String, default: 'Casa Decor', trim: true },
        hotline: { type: String, default: '1900 1234', trim: true },
        email: { type: String, default: 'support@casadecor.vn', trim: true },
        address: { type: String, default: '', trim: true },
        logo: { type: String, default: '/images/logo/logo1.jpg' }
    },

    // ===== 2. Tài khoản & phân quyền =====
    requireApproval: { type: Boolean, default: false },

    // ===== 3. Thanh toán (bật/tắt từng phương thức) =====
    payment: {
        cod: { type: Boolean, default: true },
        bankTransfer: { type: Boolean, default: true },
        ewallet: { type: Boolean, default: false },   // ZaloPay / MoMo
        vnpay: { type: Boolean, default: true },
        paypal: { type: Boolean, default: false },
        installment: { type: Boolean, default: false }
    },

    // ===== 4. Vận chuyển =====
    shipping: {
        partners: { type: [String], default: ['GHN', 'GHTK', 'ViettelPost'] },
        baseFee: { type: Number, default: 30000 },         // phí mặc định (VND)
        freeFrom: { type: Number, default: 500000 },       // miễn phí từ (VND)
        estimatedDays: { type: String, default: '1-3' },   // 1-3 / 3-5 / 5-7
        region: { type: String, default: 'nationwide' }    // nationwide / city / region
    },

    // ===== 5. Thông báo =====
    notifyAdminEmail: { type: Boolean, default: true },
    notifyNewOrder: { type: Boolean, default: true },
    notifyNewContact: { type: Boolean, default: true },
    notifyLowStock: { type: Boolean, default: true },
    notifySms: { type: Boolean, default: false },
    notifyPush: { type: Boolean, default: true },

    // ===== 6. Bảo mật =====
    sessionTimeout: { type: Number, default: 4 },          // hours
    logRetentionDays: { type: Number, default: 90 },       // days
    twoFactorAuth: { type: Boolean, default: false },
    loginLimitEnabled: { type: Boolean, default: true },
    maxLoginAttempts: { type: Number, default: 5 },
    activityLog: { type: Boolean, default: true },

    // ===== 7. Giao diện website =====
    appearance: {
        primaryColor: { type: String, default: '#9e6b50' },
        bannerStyle: { type: String, default: 'slider' },  // slider / static / grid
        bannerCount: { type: Number, default: 3 },
        showFeaturedReviews: { type: Boolean, default: true },
        showColorPicker: { type: Boolean, default: false }
    },

    // ===== 8. Sao lưu & hệ thống =====
    backup: {
        schedule: { type: String, default: 'daily' },      // daily / weekly / monthly / off
        maintenanceDays: { type: Number, default: 30 },
        maxBackups: { type: Number, default: 7 }
    },
    systemVersion: { type: String, default: 'v2.4.1' },

    // ===== Last Update =====
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

settingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Singleton: chỉ có 1 document settings
settingSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('Setting', settingSchema);
