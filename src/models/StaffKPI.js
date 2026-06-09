const mongoose = require('mongoose');

const staffKPISchema = new mongoose.Schema({
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true },  // '2026-06'
    // Đơn hàng
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    returnedOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    avgProcessingTime: { type: Number, default: 0 },  // phút
    // Ca trực
    totalShifts: { type: Number, default: 0 },
    completedShifts: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    totalSalary: { type: Number, default: 0 },  // completedShifts * 300000
    // CSKH
    reviewsHandled: { type: Number, default: 0 },
    contactsHandled: { type: Number, default: 0 },
    interactionsLogged: { type: Number, default: 0 },
    ordersRescued: { type: Number, default: 0 }  // CRM
}, { timestamps: true });

staffKPISchema.index({ staff: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('StaffKPI', staffKPISchema);
