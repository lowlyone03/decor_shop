require('dotenv').config();

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Banner = require('../src/models/Banner');
const Promotion = require('../src/models/Promotion');
const Blog = require('../src/models/Blog');
const StaffShift = require('../src/models/StaffShift');
const { buildShiftWindow, localDateString } = require('../src/utils/staffShift');

const imageRoot = path.join(__dirname, '..', 'public', 'images');

const categories = [
    {
        name: 'Đèn decor',
        slug: 'den-decor',
        folder: 'den_decor',
        description: 'Các loại đèn trang trí phòng khách, phòng ngủ và góc làm việc.',
        image: '/images/den_decor/01-den-ban-gom-aurum-beige.jpg',
        basePrice: 950000,
        material: 'Gốm, gỗ, thủy tinh, kim loại',
        dimensions: '25 x 25 x 45 cm',
        color: 'Beige, nâu gỗ, trắng ấm',
        style: 'Japandi, Bắc Âu, tối giản'
    },
    {
        name: 'Tranh treo tường',
        slug: 'tranh-treo-tuong',
        folder: 'tranhtreotuong_decor',
        description: 'Tranh canvas, tranh nghệ thuật và tranh trang trí không gian sống.',
        image: '/images/tranhtreotuong_decor/tranhcanvas1.jpg',
        basePrice: 720000,
        material: 'Canvas, gỗ thông, khung composite',
        dimensions: '40 x 60 cm',
        color: 'Trung tính, vàng đất, xanh olive',
        style: 'Hiện đại, trừu tượng, vintage'
    },
    {
        name: 'Gối tựa',
        slug: 'goi-tua',
        folder: 'goitua_decor',
        description: 'Gối sofa, gối trang trí với chất liệu mềm và bảng màu ấm.',
        image: '/images/goitua_decor/goitua01.jpg',
        basePrice: 390000,
        material: 'Vải linen, cotton, ruột bông mềm',
        dimensions: '45 x 45 cm',
        color: 'Nâu đất, kem, be, cam gạch',
        style: 'Boho, Bắc Âu, tối giản'
    },
    {
        name: 'Lọ hoa',
        slug: 'lo-hoa',
        folder: 'lohoa_decor',
        description: 'Lọ hoa gốm, thủy tinh và bình trang trí tối giản.',
        image: '/images/lohoa_decor/lohoa01.jpg',
        basePrice: 560000,
        material: 'Gốm sứ, thủy tinh',
        dimensions: '18 x 18 x 32 cm',
        color: 'Trắng ngà, be, nâu nhạt',
        style: 'Tối giản, organic, Japandi'
    },
    {
        name: 'Nến thơm',
        slug: 'nen-thom',
        folder: 'nenthom_decor',
        description: 'Nến thư giãn, nến thơm và nến trang trí cho không gian ấm cúng.',
        image: '/images/nenthom_decor/nenthom01.jpg',
        basePrice: 320000,
        material: 'Sáp đậu nành, tinh dầu thiên nhiên, hũ thủy tinh',
        dimensions: '8 x 8 x 9 cm',
        color: 'Trắng sữa, amber, beige',
        style: 'Wellness, tối giản, hiện đại'
    },
    {
        name: 'Kệ trang trí',
        slug: 'ke-trang-tri',
        folder: 'ketrangtri_decor',
        description: 'Kệ gỗ, kệ treo tường và kệ decor cho phòng khách.',
        image: '/images/ketrangtri_decor/ketrangtri01.jpg',
        basePrice: 780000,
        material: 'Gỗ MDF, gỗ thông, kim loại sơn tĩnh điện',
        dimensions: '60 x 18 x 40 cm',
        color: 'Nâu gỗ, trắng, đen nhám',
        style: 'Hiện đại, Bắc Âu, tối giản'
    },
    {
        name: 'Đồng hồ treo tường',
        slug: 'dong-ho-treo-tuong',
        folder: 'donghotreotuong_decor',
        description: 'Đồng hồ treo tường decor cho phòng khách, phòng ngủ và văn phòng.',
        image: '/images/donghotreotuong_decor/donghotreotuong1.jpg',
        basePrice: 680000,
        material: 'Gỗ, đá nhân tạo, kim loại',
        dimensions: '30 x 30 cm',
        color: 'Nâu walnut, trắng đá, đen',
        style: 'Modern classic, tối giản'
    }
];

const productNames = new Map([
    ['01-den-ban-gom-aurum-beige.jpg', 'Đèn bàn gốm Aurum Beige'],
    ['03-den-nen-thuy-tinh-amber-glow.jpg', 'Đèn nến thủy tinh Amber Glow'],
    ['04-den-ban-may-tre-boho-aura.jpg', 'Đèn bàn mây tre Boho Aura'],
    ['05-den-ban-nam-japandi-sand.jpg', 'Đèn bàn nấm Japandi Sand'],
    ['06-den-tuong-go-walnut-halo.jpg', 'Đèn tường gỗ Walnut Halo'],
    ['07-den-tha-tran-wood-veil.jpg', 'Đèn thả trần Wood Veil'],
    ['08-den-cay-brass-serenity.jpg', 'Đèn cây Brass Serenity'],
    ['10-den-long-decor-terra-lantern.jpg', 'Đèn lồng decor Terra Lantern'],
    ['2-den-ban-marble-globe-brass.jpg', 'Đèn bàn Marble Globe Brass'],
    ['9-den-tuong-walnut-led-curve.jpg', 'Đèn tường Walnut LED Curve'],
    ['den-ban-trang-tri-nha-hang-huta-light-for-life-ma-codien.jpg', 'Đèn bàn cổ điển Huta Light'],
    ['den-cay-dung-decor-la-bach-qua.jpg', 'Đèn cây lá bạch quả'],
    ['den-trang-tri-hoa-hong.jpg', 'Đèn trang trí hoa hồng'],
    ['dendecor.jpg', 'Đèn bàn gốm Linen Cream'],
    ['dendecor2.jpg', 'Đèn bàn Ceramic Pearl'],
    ['dendecor3.jpg', 'Đèn ngủ Nordic Shade'],
    ['dendecor4.jpg', 'Đèn bàn Grace Amber'],
    ['dendecor5.jpg', 'Đèn trang trí Opal Glow'],
    ['dendecor6.jpg', 'Đèn decor Moonlit Beige'],
    ['dendecor7.jpg', 'Đèn bàn Warm Nest'],

    ['01-dong-ho-pebble-travertine-walnut.jpg', 'Đồng hồ Pebble Travertine Walnut'],
    ['06-dong-ho-double-circle-travertine.jpg', 'Đồng hồ Double Circle Travertine'],
    ['donghotreotuong1.jpg', 'Đồng hồ treo tường Nordic Oak'],
    ['donghotreotuong2.jpg', 'Đồng hồ treo tường Marble Line'],
    ['donghotreotuong3.jpg', 'Đồng hồ treo tường Minimal Beige'],
    ['donghotreotuong4.jpg', 'Đồng hồ treo tường Walnut Ring'],
    ['donghotreotuong5.jpg', 'Đồng hồ treo tường Modern Stone'],
    ['donghotreotuong6.jpg', 'Đồng hồ treo tường Classic Brass'],
    ['donghotreotuong7.jpg', 'Đồng hồ treo tường Silent Arch'],
    ['donghotreotuong8.jpg', 'Đồng hồ treo tường Terra Circle'],
    ['donghotreotuong9.jpg', 'Đồng hồ treo tường Shadow Wood'],
    ['donghotreotuong10.jpg', 'Đồng hồ treo tường Urban Sand'],

    ['goitua01.jpg', 'Gối tựa Linen Nâu Đất'],
    ['goitua02.jpg', 'Gối tựa Cotton Kem Sữa'],
    ['goitua03.jpg', 'Gối tựa Boho Stripe'],
    ['goitua04.jpg', 'Gối tựa Olive Calm'],
    ['goitua05.jpg', 'Gối tựa Terracotta Soft'],
    ['goitua06.jpg', 'Gối tựa Nordic Texture'],
    ['goitua07.jpg', 'Gối tựa Waffle Beige'],
    ['goitua08.jpg', 'Gối tựa Velvet Mocha'],
    ['goitua09.jpg', 'Gối tựa Linen Caramel'],
    ['goitua10.jpg', 'Gối tựa Minimal Taupe'],
    ['goitua11.jpg', 'Gối tựa Ivory Stitch'],
    ['goitua12.jpg', 'Gối tựa Cozy Sand'],

    ['ketrangtri01.jpg', 'Kệ gỗ treo tường Walnut'],
    ['ketrangtri02.jpg', 'Kệ trang trí Nordic Shelf'],
    ['ketrangtri03.jpg', 'Kệ gỗ mini Casa Oak'],
    ['ketrangtri04.jpg', 'Kệ treo tường Minimal Line'],
    ['ketrangtri05.jpg', 'Kệ decor Corner Warm'],
    ['ketrangtri06.jpg', 'Kệ trang trí Floating Beige'],
    ['ketrangtri07.jpg', 'Kệ gỗ đa tầng Natural'],
    ['ketrangtri08.jpg', 'Kệ trang trí Iron Wood'],
    ['ketrangtri09.jpg', 'Kệ treo tường Arc Shelf'],
    ['ketrangtri10.jpg', 'Kệ gỗ Sofa Console'],
    ['ketrangtri11.jpg', 'Kệ trang trí Slim Walnut'],
    ['ketrangtri12.jpg', 'Kệ decor Gallery Oak'],

    ['lohoa01.jpg', 'Lọ hoa gốm sứ trắng Lohas'],
    ['lohoa02.jpg', 'Lọ hoa Ceramic Ivory'],
    ['lohoa03.jpg', 'Lọ hoa thủy tinh Amber'],
    ['lohoa04.jpg', 'Lọ hoa gốm Rustic Glow'],
    ['lohoa05.jpg', 'Lọ hoa Stoneware Sand'],
    ['lohoa06.jpg', 'Lọ hoa Minimal Cream'],
    ['lohoa07.jpg', 'Lọ hoa Olive Branch'],
    ['lohoa08.jpg', 'Lọ hoa Japandi Curve'],
    ['lohoa09.jpg', 'Lọ hoa Terra Matte'],
    ['lohoa10.jpg', 'Lọ hoa Nordic Tall'],
    ['lohoa11.jpg', 'Lọ hoa Glass Dew'],
    ['lohoa12.jpg', 'Lọ hoa Ceramic Cloud'],
    ['lohoa13.jpg', 'Lọ hoa Beige Bloom'],
    ['lohoa14.jpg', 'Lọ hoa Warm Clay'],
    ['lohoa15.jpg', 'Lọ hoa Pearl Vase'],

    ['nenthom01.jpg', 'Nến thơm Lavender Calm'],
    ['nenthom02.jpg', 'Nến thơm Vanilla Sand'],
    ['nenthom03.jpg', 'Nến thơm Amber Wood'],
    ['nenthom04.jpg', 'Nến thơm Fig Garden'],
    ['nenthom05.jpg', 'Nến thơm Citrus Linen'],
    ['nenthom06.jpg', 'Nến thơm Cedar Night'],
    ['nenthom07.jpg', 'Nến thơm Jasmine Pearl'],
    ['nenthom08.jpg', 'Nến thơm Cozy Musk'],
    ['nenthom09.jpg', 'Nến thơm Rose Dusk'],
    ['nenthom10.jpg', 'Nến thơm Tea Blossom'],
    ['nenthom11.jpg', 'Nến thơm Sage Morning'],
    ['nenthom12.jpg', 'Nến thơm Warm Cotton'],

    ['tranhcanvas1.jpg', 'Tranh Canvas Trừu Tượng Terra'],
    ['tranhcanvas2.jpg', 'Tranh Canvas Warm Neutral'],
    ['tranhcanvas3.jpg', 'Tranh Canvas Botanical Beige'],
    ['tranhcanvas4.jpg', 'Tranh Canvas Modern Arch'],
    ['tranhtrangguongmau1.jpg', 'Tranh tráng gương Golden Leaf'],
    ['tranhtrangguongmau2.jpg', 'Tranh tráng gương Soft Bloom'],
    ['tranhtrangguongmau4.jpg', 'Tranh tráng gương Ocean Sand'],
    ['tranhtrangguongmau5.jpg', 'Tranh tráng gương Abstract Clay'],
    ['tranhtrangguongmau6.jpg', 'Tranh tráng gương Nordic Vase'],
    ['tranhtrangguongmau7.jpg', 'Tranh tráng gương Minimal Garden'],
    ['treotuongpkmau2.jpg', 'Tranh treo tường phòng khách Calm Home'],
    ['treotuongpkmau3.jpg', 'Tranh treo tường phòng khách Cozy Art']
]);

const featuredNames = new Set([
    '01-den-ban-gom-aurum-beige.jpg',
    'tranhcanvas1.jpg',
    'goitua01.jpg',
    'lohoa01.jpg',
    'nenthom01.jpg',
    'ketrangtri01.jpg'
]);

function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

function normalizeSearch(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function titleFromFilename(filename, categoryName) {
    if (productNames.has(filename)) return productNames.get(filename);

    const rawName = path.parse(filename).name
        .replace(/^\d+-/, '')
        .replace(/\d+$/g, '')
        .replace(/[-_]+/g, ' ')
        .trim();

    const title = rawName
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return title ? `${categoryName} ${title}` : categoryName;
}

function priceFor(basePrice, index) {
    const step = (index % 6) * 45000;
    return Math.round((basePrice + step) / 10000) * 10000;
}

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

async function seedUsers() {
    await User.updateOne(
        { email: 'admin@casadecor.vn' },
        {
            $setOnInsert: {
                name: 'Casa Decor Admin',
                email: 'admin@casadecor.vn',
                phone: '1900123456',
                password: hashPassword('Admin@123'),
                role: 'admin',
                status: 'active'
            }
        },
        { upsert: true }
    );

    const staffAccounts = [
        { name: 'Nguyen Thi Phuong Anh', email: 'staff01@casadecor.vn', phone: '0901000001' },
        { name: 'Huynh Quyen', email: 'staff02@casadecor.vn', phone: '0901000002' },
        { name: 'Tran Minh Duc', email: 'staff03@casadecor.vn', phone: '0901000003' },
        { name: 'Le Hoang Nam', email: 'staff04@casadecor.vn', phone: '0901000004' }
    ];

    for (const staff of staffAccounts) {
        await User.updateOne(
            { email: staff.email },
            {
                $setOnInsert: {
                    ...staff,
                    password: hashPassword('Staff@123'),
                    role: 'staff',
                    status: 'active'
                }
            },
            { upsert: true }
        );
    }
}

async function seedStaffShifts() {
    const admin = await User.findOne({ email: 'admin@casadecor.vn' });
    const staff = await User.find({ email: { $in: ['staff01@casadecor.vn', 'staff02@casadecor.vn', 'staff03@casadecor.vn', 'staff04@casadecor.vn'] } });
    const today = localDateString();
    const starts = ['08:00', '12:00', '16:00', '20:00'];

    for (let i = 0; i < staff.length; i += 1) {
        const window = buildShiftWindow({
            shiftDate: today,
            startTime: starts[i] || '08:00',
            durationHours: i === 0 ? 8 : 4
        });
        if (window.error) continue;
        await StaffShift.updateOne(
            { staff: staff[i]._id, shiftDate: today },
            {
                $setOnInsert: {
                    staff: staff[i]._id,
                    ...window,
                    note: 'Ca truc demo duoc tao tu seed.',
                    createdBy: admin?._id
                }
            },
            { upsert: true }
        );
    }
}

async function seedCategories() {
    const categoryBySlug = new Map();

    for (const item of categories) {
        const category = await Category.findOneAndUpdate(
            { slug: item.slug },
            {
                name: item.name,
                slug: item.slug,
                description: item.description,
                image: item.image,
                status: 'active'
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
        categoryBySlug.set(item.slug, category);
    }

    return categoryBySlug;
}

async function seedProducts(categoryBySlug) {
    let count = 0;

    for (const categoryConfig of categories) {
        const category = categoryBySlug.get(categoryConfig.slug);
        const folderPath = path.join(imageRoot, categoryConfig.folder);
        if (!fs.existsSync(folderPath)) continue;

        const files = fs.readdirSync(folderPath)
            .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
            .sort((a, b) => a.localeCompare(b, 'vi'));

        for (const [index, file] of files.entries()) {
            const name = titleFromFilename(file, categoryConfig.name);
            const slug = slugify(`${categoryConfig.slug}-${path.parse(file).name}`);
            const price = priceFor(categoryConfig.basePrice, index);
            const isFeatured = index < 2 || featuredNames.has(file);
            const isNewProduct = index < 4;
            const stock = 12 + ((index * 7) % 40);
            const imageUrl = `/images/${categoryConfig.folder}/${file}`;
            const shortDescription = `${name} mang tông màu ấm, phù hợp trang trí phòng khách và phòng ngủ.`;
            const description = `${name} thuộc nhóm ${categoryConfig.name.toLowerCase()}, được chọn theo phong cách ấm áp, hiện đại và dễ phối với nội thất Casa Decor.`;
            const searchText = normalizeSearch([
                name,
                categoryConfig.name,
                shortDescription,
                description,
                categoryConfig.material,
                categoryConfig.color,
                categoryConfig.style
            ].join(' '));
            const searchName = normalizeSearch([name, categoryConfig.name].join(' '));

            await Product.findOneAndUpdate(
                { slug },
                {
                    name,
                    slug,
                    category: category._id,
                    price,
                    salePrice: index % 5 === 0 ? Math.round(price * 0.9 / 10000) * 10000 : undefined,
                    images: [{ url: imageUrl, alt: name, isPrimary: true }],
                    shortDescription,
                    description,
                    material: categoryConfig.material,
                    dimensions: categoryConfig.dimensions,
                    color: categoryConfig.color,
                    style: categoryConfig.style,
                    searchName,
                    searchText,
                    stock,
                    sold: (index * 9) % 120,
                    rating: Number((4.6 + ((index % 4) * 0.1)).toFixed(1)),
                    numReviews: 18 + ((index * 5) % 110),
                    isFeatured,
                    isNewProduct,
                    status: stock > 0 ? 'active' : 'out_of_stock'
                },
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );

            count += 1;
        }
    }

    return count;
}

async function seedBanners() {
    await Banner.findOneAndUpdate(
        { position: 'hero', displayOrder: 1 },
        {
            title: 'Nâng tầm không gian sống của bạn',
            description: 'Khám phá bộ sưu tập decor tinh tế mang đến vẻ đẹp và cảm hứng cho ngôi nhà của bạn.',
            image: '/images/banner1png.png',
            buttonText: 'Mua ngay',
            link: '/customers/index.html#products',
            position: 'hero',
            displayOrder: 1,
            status: 'active'
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
}

async function seedPromotions(categoryBySlug) {
    const promotionConfigs = [
        {
            code: 'CASA10',
            name: 'Giảm 10% đơn decor đầu tiên',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValue: 799000,
            maxUsage: 800,
            categorySlugs: ['den-decor', 'lo-hoa', 'nen-thom']
        },
        {
            code: 'CASA20',
            name: 'Giảm 20% góc nhà ấm áp',
            discountType: 'percentage',
            discountValue: 20,
            minOrderValue: 1499000,
            maxUsage: 650,
            categorySlugs: ['den-decor', 'tranh-treo-tuong', 'goi-tua', 'lo-hoa']
        },
        {
            code: 'CASA30',
            name: 'Giảm 30% bộ sưu tập mới',
            discountType: 'percentage',
            discountValue: 30,
            minOrderValue: 2499000,
            maxUsage: 500,
            categorySlugs: ['den-decor', 'lo-hoa', 'nen-thom', 'ke-trang-tri']
        },
        {
            code: 'NEW15',
            name: 'Giảm 15% cho khách hàng mới',
            discountType: 'percentage',
            discountValue: 15,
            minOrderValue: 599000,
            maxUsage: 700,
            categorySlugs: ['goi-tua', 'nen-thom', 'ke-trang-tri']
        },
        {
            code: 'FREESHIP',
            name: 'Miễn phí vận chuyển toàn quốc',
            discountType: 'fixed',
            discountValue: 30000,
            minOrderValue: 1000000,
            maxUsage: 1000,
            categorySlugs: []
        },
        {
            code: 'MEMBER50',
            name: 'Giảm 50.000đ cho thành viên',
            discountType: 'fixed',
            discountValue: 50000,
            minOrderValue: 699000,
            maxUsage: 900,
            categorySlugs: ['den-decor', 'lo-hoa', 'ke-trang-tri']
        }
    ];

    for (const promo of promotionConfigs) {
        const applicableCategories = promo.categorySlugs
            .map((slug) => categoryBySlug.get(slug)?._id)
            .filter(Boolean);

        await Promotion.findOneAndUpdate(
            { code: promo.code },
            {
                name: promo.name,
                code: promo.code,
                discountType: promo.discountType,
                discountValue: promo.discountValue,
                startDate: new Date('2026-05-01T00:00:00.000Z'),
                endDate: new Date('2026-12-31T23:59:59.999Z'),
                applicableCategories,
                minOrderValue: promo.minOrderValue,
                maxUsage: promo.maxUsage,
                status: 'active'
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
    }
}

async function seedBlogs() {
    const admin = await User.findOne({ email: 'admin@casadecor.vn' });
    await Blog.findOneAndUpdate(
        { slug: 'meo-phoi-decor-tong-am' },
        {
            title: 'Mẹo phối decor tông ấm cho căn hộ hiện đại',
            slug: 'meo-phoi-decor-tong-am',
            thumbnail: '/images/banner1png.png',
            summary: 'Gợi ý kết hợp đèn, gối tựa, tranh và lọ hoa để tạo cảm giác ấm cúng.',
            content: 'Ưu tiên bảng màu be, nâu gỗ, trắng ngà và điểm nhấn cam gốm để không gian mềm mại hơn.',
            author: admin?._id,
            status: 'active'
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
}

async function main() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/decor_shop';
    await mongoose.connect(mongoUri);

    await seedUsers();
    await seedStaffShifts();
    const categoryBySlug = await seedCategories();
    const productCount = await seedProducts(categoryBySlug);
    await seedBanners();
    await seedPromotions(categoryBySlug);
    await seedBlogs();

    console.log(`Seed completed: ${categories.length} categories, ${productCount} products.`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
