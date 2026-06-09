const mongoose = require('mongoose');

const scheduleRotationSchema = new mongoose.Schema({
    staffList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    currentOffset: { type: Number, default: 0 },
    lastScheduledDate: { type: String },  // '2026-06-30'
    lastScheduledMonth: { type: String }  // '2026-06'
}, { timestamps: true });

module.exports = mongoose.model('ScheduleRotation', scheduleRotationSchema);
