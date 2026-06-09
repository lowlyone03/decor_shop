const mongoose = require('mongoose');

const shiftReportSchema = new mongoose.Schema({
    content: { type: String, required: true },
    incidents: { type: String },
    handover: { type: String }
}, { _id: false });

const shiftStatsSchema = new mongoose.Schema({
    ordersProcessed: { type: Number, default: 0 },
    revenueInShift: { type: Number, default: 0 }
}, { _id: false });

const reassignInfoSchema = new mongoose.Schema({
    originalStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    reassignedAt: { type: Date }
}, { _id: false });

const staffShiftSchema = new mongoose.Schema({
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shiftName: { type: String, enum: ['Sáng', 'Chiều', 'Tối', 'Đêm'], required: true },
    shiftOrder: { type: Number, enum: [1, 2, 3, 4], required: true },
    shiftDate: { type: String, required: true },  // '2026-06-09'
    startTime: { type: String, required: true },   // '06:00'
    endTime: { type: String, required: true },     // '12:00'
    startMinute: { type: Number, required: true, min: 0, max: 1439 },
    endMinute: { type: Number, required: true, min: 1, max: 1440 },
    durationHours: { type: Number, required: true, default: 6 },
    payRate: { type: Number, required: true, default: 50000 },
    totalPay: { type: Number, required: true, default: 300000 },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'completed', 'auto_completed', 'absent', 'cancelled'],
        default: 'scheduled'
    },
    // Chấm công
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    isLateCheckIn: { type: Boolean, default: false },
    isForgotCheckOut: { type: Boolean, default: false },
    // Báo cáo
    report: shiftReportSchema,
    stats: { type: shiftStatsSchema, default: () => ({}) },
    // Reassign
    reassign: reassignInfoSchema,
    note: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

staffShiftSchema.index({ staff: 1, shiftDate: 1, startMinute: 1 });
staffShiftSchema.index({ shiftDate: 1, shiftOrder: 1 });
staffShiftSchema.index({ status: 1, shiftDate: 1 });

module.exports = mongoose.model('StaffShift', staffShiftSchema);
