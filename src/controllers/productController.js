const Category = require('../models/Category');
const Product = require('../models/Product');
const Review = require('../models/Review');
const appCache = require('../utils/cache');
const { escapeRegex, normalizeSearch, positiveInt, generateFuzzyRegex } = require('../utils/helpers');

exports.getCategories = async (req, res) => {
    try {
        let categories = appCache.get('categories');
        if (!categories) {
            categories = await Category.find({ status: 'active' }).sort({ name: 1 }).lean();
            appCache.set('categories', categories);
        }
        res.json({ categories });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const { q, category, minPrice, maxPrice, color, material, sort, featured, newest, limit = 10, page = 1 } = req.query;
        const filter = { status: 'active' };

        if (q && String(q).trim()) {
            const keyword = String(q).trim();
            const directRegex = new RegExp(escapeRegex(keyword), 'i');
            const normalizedRegex = new RegExp(escapeRegex(normalizeSearch(keyword)), 'i');
            const directTokenRegex = new RegExp(`(^|\\s)${escapeRegex(keyword)}`, 'i');
            const normalizedTokenRegex = new RegExp(`(^|\\s)${escapeRegex(normalizeSearch(keyword))}`, 'i');
            
            // Generate fuzzy regex for typo tolerance
            const fuzzyRegex = generateFuzzyRegex(keyword);
            const normalizedFuzzyRegex = generateFuzzyRegex(normalizeSearch(keyword));

            const matchedCategoryIds = await Category.find({
                $or: [
                    { name: directRegex },
                    { name: fuzzyRegex },
                    { slug: normalizedRegex },
                    { slug: normalizedFuzzyRegex }
                ],
                status: 'active'
            }).distinct('_id');

            const primarySearch = [
                { name: directTokenRegex },
                { searchName: normalizedTokenRegex }
            ];
            if (matchedCategoryIds.length) primarySearch.push({ category: { $in: matchedCategoryIds } });

            const broadSearch = [
                { name: directRegex },
                { name: fuzzyRegex },
                { shortDescription: directRegex },
                { description: directRegex },
                { material: directRegex },
                { color: directRegex },
                { style: directRegex },
                { searchName: normalizedRegex },
                { searchName: normalizedFuzzyRegex },
                { searchText: normalizedRegex }
            ];
            if (matchedCategoryIds.length) broadSearch.push({ category: { $in: matchedCategoryIds } });

            const primaryTotal = await Product.countDocuments({ status: 'active', $or: primarySearch });
            filter.$or = primaryTotal ? primarySearch : broadSearch;
        }

        if (category) {
            const cat = await Category.findOne({ slug: category, status: 'active' }).lean();
            filter.category = cat?._id || category;
        }
        if (featured === 'true') filter.isFeatured = true;
        if (newest === 'true') filter.isNewProduct = true;
        if (color) filter.color = new RegExp(escapeRegex(color), 'i');
        if (material) filter.material = new RegExp(escapeRegex(material), 'i');

        const min = Number(minPrice);
        const max = Number(maxPrice);
        const pageNumber = positiveInt(page, 1);
        const pageSize = Math.min(positiveInt(limit, 10), 10);
        const priceMatch = {};

        if (Number.isFinite(min)) priceMatch.$gte = min;
        if (Number.isFinite(max)) priceMatch.$lte = max;

        const sorters = {
            price_asc: { effectivePrice: 1, createdAt: -1 },
            price_desc: { effectivePrice: -1, createdAt: -1 },
            newest: { createdAt: -1 },
            best_selling: { sold: -1, createdAt: -1 },
            rating: { rating: -1, createdAt: -1 }
        };

        const pipeline = [
            { $match: filter },
            {
                $addFields: {
                    effectivePrice: {
                        $cond: [
                            { $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$price'] }] },
                            '$salePrice',
                            '$price'
                        ]
                    }
                }
            }
        ];

        if (Object.keys(priceMatch).length) pipeline.push({ $match: { effectivePrice: priceMatch } });

        pipeline.push({
            $facet: {
                metadata: [{ $count: 'total' }],
                products: [
                    { $sort: sorters[sort] || { isFeatured: -1, createdAt: -1 } },
                    { $skip: (pageNumber - 1) * pageSize },
                    { $limit: pageSize },
                    {
                        $lookup: {
                            from: 'categories',
                            localField: 'category',
                            foreignField: '_id',
                            as: 'category'
                        }
                    },
                    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            effectivePrice: 0,
                            'category.description': 0,
                            'category.image': 0,
                            'category.status': 0,
                            'category.createdAt': 0,
                            'category.updatedAt': 0,
                            'category.__v': 0
                        }
                    }
                ]
            }
        });

        const [result = {}] = await Product.aggregate(pipeline);
        const total = result.metadata?.[0]?.total || 0;
        const products = result.products || [];

        res.json({ products, total, page: pageNumber, pages: Math.ceil(total / pageSize) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug, status: 'active' }).populate('category', 'name slug').lean();
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        
        const related = await Product.find({ category: product.category._id, _id: { $ne: product._id }, status: 'active' }).limit(6).lean();
        const reviews = await Review.find({ product: product._id, status: 'active' }).populate('customer', 'name avatar').sort({ createdAt: -1 }).lean();
        
        res.json({ product, related, reviews });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
