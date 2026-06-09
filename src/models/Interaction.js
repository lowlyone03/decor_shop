const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffShift' },
    channel: { type: String, enum: ['call', 'zalo', 'email', 'note', 'sms'], required: true },
    source: { type: String, enum: ['abandoned_cart', 'follow_up', 'manual'], default: 'manual' },
    result: { type: String, enum: ['order_placed', 'callback', 'no_answer', 'declined', 'following'], default: 'following' },
    note: { type: String, trim: true },
    followUpDate: { type: Date },
    relatedCart: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

interactionSchema.index({ customer: 1, createdAt: -1 });
interactionSchema.index({ staff: 1, createdAt: -1 });
interactionSchema.index({ source: 1, result: 1 });

module.exports = mongoose.model('Interaction', interactionSchema);
