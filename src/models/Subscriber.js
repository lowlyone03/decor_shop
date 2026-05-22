const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
