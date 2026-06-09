const mongoose = require('mongoose');
const Product = require('../src/models/Product');
mongoose.connect('mongodb://127.0.0.1/decor_shop').then(async () => {
    const p = await Product.find({ stock: { $lt: 20 } }).select('name stock').lean();
    console.log("Low stock products:", p);
    process.exit();
});
