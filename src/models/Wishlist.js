const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }
}, { timestamps: true });

wishlistSchema.index({ customer: 1, product: 1 }, { unique: true });
wishlistSchema.index({ product: 1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);
