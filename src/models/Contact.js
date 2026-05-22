const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    sender: { type: String, enum: ['customer', 'admin'], required: true },
    senderName: { type: String },
    senderAvatar: { type: String },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const contactSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerAvatar: { type: String },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    subject: { type: String },
    message: { type: String, required: true },
    source: { type: String, enum: ['website', 'facebook', 'zalo', 'email', 'phone'], default: 'website' },
    priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
    category: { type: String, enum: ['general', 'order', 'consulting', 'complaint', 'warranty', 'feedback'], default: 'general' },
    status: { type: String, enum: ['pending', 'processing', 'resolved'], default: 'pending' },
    assignedTo: { type: String },
    internalNote: { type: String },
    replies: [replySchema],
    relatedOrderCode: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
