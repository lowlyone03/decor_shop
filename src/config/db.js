const mongoose = require('mongoose');

async function connectDB() {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        return conn;
    } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', `🚨 MongoDB connection failed: ${err.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;
