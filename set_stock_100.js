const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(uri).then(async () => {
    const Product = require('./src/models/Product');
    const result = await Product.updateMany({}, { $set: { stock: 100 } });
    console.log('Updated:', result.modifiedCount, 'products to stock=100');
    mongoose.disconnect();
}).catch(e => {
    console.error(e.message);
    process.exit(1);
});
