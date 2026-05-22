const mongoose = require('mongoose');

const staffShiftSchema = new mongoose.Schema({
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shiftDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    startMinute: { type: Number, required: true, min: 0, max: 1439 },
    endMinute: { type: Number, required: true, min: 1, max: 1440 },
    durationHours: { type: Number, enum: [4, 8], required: true },
    status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
    note: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

staffShiftSchema.index({ staff: 1, shiftDate: 1, startMinute: 1 });
staffShiftSchema.index({ shiftDate: 1, startMinute: 1 });

module.exports = mongoose.model('StaffShift', staffShiftSchema);
