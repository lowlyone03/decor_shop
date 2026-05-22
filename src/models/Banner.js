const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String, required: true },
    buttonText: { type: String, trim: true },
    link: { type: String, default: '#' },
    position: { type: String, enum: ['hero', 'sale', 'lookbook'], required: true },
    displayOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' }
}, { timestamps: true });

bannerSchema.index({ position: 1, status: 1, displayOrder: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
