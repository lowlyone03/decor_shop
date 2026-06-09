const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    street: { type: String, trim: true },
    ward: { type: String, trim: true },
    district: { type: String, trim: true },
    city: { type: String, trim: true },
    isDefault: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    role: { type: String, enum: ['customer', 'admin', 'staff'], default: 'customer' },
    avatar: { type: String },
    addresses: [addressSchema],
    status: { type: String, enum: ['active', 'locked'], default: 'active' },
    // === Fields dành cho staff ===
    staffCode: { type: String, unique: true, sparse: true },  // NV01, NV02...
    baseSalaryPerHour: { type: Number, default: 50000 }       // 50.000₫/h, admin sửa
}, { timestamps: true });

userSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model('User', userSchema);
