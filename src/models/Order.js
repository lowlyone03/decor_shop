const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String },
    purchasePrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    itemTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const shippingInfoSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    ward: { type: String },
    district: { type: String },
    city: { type: String }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
    status: { type: String, required: true },
    note: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffShift' },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderCode: { type: String, unique: true, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // NVBH xử lý
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    recoveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },  // CRM attribution
    _staleAlerted: { type: Boolean, default: false },
    _staleAlertedAt: { type: Date, default: null },
    shippingInfo: shippingInfoSchema,
    items: [orderItemSchema],
    itemsTotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    promotionCode: { type: String, uppercase: true, trim: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cod', 'bank_transfer', 'vnpay'], required: true },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    orderStatus: {
        type: String,
        enum: [
            'pending', 'processing', 'shipping', 'completed', 
            'cancellation_requested', 'cancelled', 'return_requested', 'refunding', 'refunded'
        ],
        default: 'pending'
    },
    statusHistory: [statusHistorySchema],
    deliveredAt: { type: Date },
    returnRequest: {
        reason: { type: String },
        condition: { type: String },
        description: { type: String },
        images: [{ type: String }],
        status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
        requestedAt: { type: Date }
    },
    note: { type: String }
}, { timestamps: true });

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });
orderSchema.index({ orderStatus: 1, createdAt: 1 });
orderSchema.index({ processedBy: 1 });

module.exports = mongoose.model('Order', orderSchema);
