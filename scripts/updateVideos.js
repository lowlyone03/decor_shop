require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../src/models/Product');

const sourceDir = path.join(__dirname, '..', 'VideoSPdecorCaSaDecor');
const destDir = path.join(__dirname, '..', 'public', 'uploads', 'videos');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const videoMap = [
    { file: 'Lọ hoa Warm Clay.mp4', keyword: 'Warm Clay' },
    { file: 'denaurum.mp4', keyword: 'Aurum' },
    { file: 'dennenthuytinh.mp4', keyword: 'nến thủy tinh' },
    { file: 'lohoagomsutrang.mp4', keyword: 'gốm sứ trắng' },
    { file: 'nenthomlavender.mp4', keyword: 'Lavender' },
    { file: 'Đèn bàn gốm Linen Cream.mp4', keyword: 'Linen Cream' }
];

async function updateVideos() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        for (const item of videoMap) {
            const sourceFile = path.join(sourceDir, item.file);
            // preserve original extension
            const ext = path.extname(item.file);
            const safeName = 'vid-' + Date.now() + Math.random().toString(36).substr(2, 5) + ext;
            const destFile = path.join(destDir, safeName);
            const videoUrl = '/uploads/videos/' + safeName;

            if (fs.existsSync(sourceFile)) {
                fs.copyFileSync(sourceFile, destFile);
                
                // Find product by keyword
                const product = await Product.findOne({ name: { $regex: item.keyword, $options: 'i' } });
                if (product) {
                    product.videoUrl = videoUrl;
                    await product.save();
                    console.log(`Updated product: ${product.name} with video: ${item.file}`);
                } else {
                    console.log(`Product not found for keyword: ${item.keyword}`);
                }
            } else {
                console.log(`Source file not found: ${item.file}`);
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        mongoose.connection.close();
    }
}

updateVideos();
