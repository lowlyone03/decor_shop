const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
require('dotenv').config({ path: '../.env' });

const categories = [
    {
        name: 'Đèn decor',
        slug: 'den-decor',
        material: 'Gốm, gỗ, thủy tinh, kim loại',
        dimensions: '25 x 25 x 45 cm',
        color: 'Beige, nâu gỗ, trắng ấm',
        style: 'Japandi, Bắc Âu, tối giản'
    },
    {
        name: 'Tranh treo tường',
        slug: 'tranh-treo-tuong',
        material: 'Canvas, gỗ thông, khung composite',
        dimensions: '40 x 60 cm',
        color: 'Trung tính, vàng đất, xanh olive',
        style: 'Hiện đại, trừu tượng, vintage'
    },
    {
        name: 'Gối tựa',
        slug: 'goi-tua',
        material: 'Vải linen, cotton, ruột bông mềm',
        dimensions: '45 x 45 cm',
        color: 'Nâu đất, kem, be, cam gạch',
        style: 'Boho, Bắc Âu, tối giản'
    },
    {
        name: 'Lọ hoa',
        slug: 'lo-hoa',
        material: 'Gốm sứ, thủy tinh',
        dimensions: '18 x 18 x 32 cm',
        color: 'Trắng ngà, be, nâu nhạt',
        style: 'Tối giản, organic, Japandi'
    },
    {
        name: 'Nến thơm',
        slug: 'nen-thom',
        material: 'Sáp đậu nành, tinh dầu thiên nhiên, hũ thủy tinh',
        dimensions: '8 x 8 x 9 cm',
        color: 'Trắng sữa, amber, beige',
        style: 'Wellness, tối giản, hiện đại'
    },
    {
        name: 'Kệ trang trí',
        slug: 'ke-trang-tri',
        material: 'Gỗ MDF, gỗ thông, kim loại sơn tĩnh điện',
        dimensions: '60 x 18 x 40 cm',
        color: 'Nâu gỗ, trắng, đen nhám',
        style: 'Hiện đại, Bắc Âu, tối giản'
    },
    {
        name: 'Đồng hồ treo tường',
        slug: 'dong-ho-treo-tuong',
        material: 'Gỗ, đá nhân tạo, kim loại',
        dimensions: '30 x 30 cm',
        color: 'Nâu walnut, trắng đá, đen',
        style: 'Modern classic, tối giản'
    }
];

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/decor_shop');
    let count = 0;
    for (const catConf of categories) {
        const cat = await Category.findOne({ slug: catConf.slug });
        if (!cat) continue;
        
        const products = await Product.find({ category: cat._id });
        for (const p of products) {
            let updated = false;
            
            if (!p.material || p.material === '-' || p.material === '') { p.material = catConf.material; updated = true; }
            if (!p.dimensions || p.dimensions === '-' || p.dimensions === '') { p.dimensions = catConf.dimensions; updated = true; }
            if (!p.color || p.color === '-' || p.color === '') { p.color = catConf.color; updated = true; }
            if (!p.style || p.style === '-' || p.style === '') { p.style = catConf.style; updated = true; }
            
            if (!p.shortDescription || p.shortDescription === '') {
                p.shortDescription = `${p.name} mang tông màu ấm, phù hợp trang trí phòng khách và phòng ngủ.`;
                updated = true;
            }
            if (!p.description || p.description === '') {
                p.description = `${p.name} thuộc nhóm ${catConf.name.toLowerCase()}, được chọn theo phong cách ấm áp, hiện đại và dễ phối với nội thất Casa Decor.`;
                updated = true;
            }
            
            if (updated) {
                await p.save();
                count++;
                console.log('Restored: ' + p.name);
            }
        }
    }
    console.log(`Finished restoring ${count} products.`);
    process.exit(0);
}

run();
