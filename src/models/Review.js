const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    images: [{ type: String }],
    video: { type: String },
    videoStatus: { type: String, enum: ['active', 'hidden'], default: 'active' },
    status: { type: String, enum: ['active', 'hidden', 'pending'], default: 'pending' }
}, { timestamps: true });

reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ customer: 1, product: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
