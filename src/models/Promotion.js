const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxUsage: { type: Number, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'expired', 'disabled'], default: 'active' }
}, { timestamps: true });

promotionSchema.index({ code: 1 }, { unique: true, sparse: true });
promotionSchema.index({ status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
