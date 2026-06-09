const mongoose = require('mongoose');
const Order = require('./src/models/Order');
const Product = require('./src/models/Product');

mongoose.connect('mongodb://127.0.0.1:27017/decor_shop').then(async () => {
    const topProductsRows = await Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.product', sold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.itemTotal' } } },
        { $sort: { sold: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }
    ]);
    console.log(JSON.stringify(topProductsRows.map(item => ({
        name: item.product?.name,
        image: item.product?.images?.[0]?.url
    })), null, 2));
    process.exit(0);
});
