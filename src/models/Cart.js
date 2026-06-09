const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String },
    priceAtAdding: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    itemTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const cartSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [cartItemSchema],
    subTotal: { type: Number, default: 0, min: 0 },
    crmClaimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    crmClaimExpires: { type: Date, default: null }
}, { timestamps: true });

cartSchema.index({ customer: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);
