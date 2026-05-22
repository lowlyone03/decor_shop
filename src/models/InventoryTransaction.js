const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['import', 'export', 'check'], required: true },
    code: { type: String, required: true, unique: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantityChange: { type: Number, required: true }, // positive for import, negative for export
        price: { type: Number, default: 0 } // unit price for import/export
    }],
    reason: { type: String }, // Supplier name, or export reason
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
