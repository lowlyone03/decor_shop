const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
    url: { type: String, required: true },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false }
}, { _id: false });

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    images: [productImageSchema],
    shortDescription: { type: String, trim: true },
    description: { type: String },
    material: { type: String, trim: true },
    dimensions: { type: String, trim: true },
    color: { type: String, trim: true },
    style: { type: String, trim: true },
    searchName: { type: String, trim: true },
    searchText: { type: String, trim: true },
    stock: { type: Number, default: 0, min: 0 },
    sold: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isNewProduct: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'hidden', 'out_of_stock'], default: 'active' }
}, { timestamps: true });

productSchema.index({ category: 1, status: 1 });
productSchema.index({ name: 'text', shortDescription: 'text', description: 'text' });
productSchema.index({ searchName: 1 });
productSchema.index({ searchText: 1 });
productSchema.index({ isFeatured: 1, isNewProduct: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
productSchema.index({ status: 1, sold: -1, createdAt: -1 });
productSchema.index({ status: 1, rating: -1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
