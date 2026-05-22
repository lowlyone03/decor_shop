const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' }
}, { timestamps: true });

categorySchema.index({ status: 1 });

module.exports = mongoose.model('Category', categorySchema);
