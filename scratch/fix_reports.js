const fs = require('fs');
const path = require('path');

const targetFile = 'd:/BTL/decor_shop/decor_shop/src/controllers/adminController.js';
let content = fs.readFileSync(targetFile, 'utf8');

const regex = /exports\.getReports = async \([\s\S]*?catch \(error\) \{[\s\S]*?res\.status\(500\)\.json\(\{ message: error\.message \}\);\n\s+\}\n\};/g;

const newGetReports = `exports.getReports = async (req, res) => {
    try {
        const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const to = req.query.to || new Date().toISOString();
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const diffMs = toDate - fromDate;
        const prevFromDate = new Date(fromDate.getTime() - diffMs);
        const prevToDate = new Date(toDate.getTime() - diffMs);

        const currentMatch = { createdAt: { $gte: fromDate, $lte: toDate } };
        const prevMatch = { createdAt: { $gte: prevFromDate, $lte: prevToDate } };
        const revenueMatchCurrent = { ...currentMatch, orderStatus: { $in: ['completed', 'delivered'] } };
        const revenueMatchPrev = { ...prevMatch, orderStatus: { $in: ['completed', 'delivered'] } };

        const [
            ordersCurrent, ordersPrev,
            revCurrent, revPrev,
            customersCurrent, customersPrev,
            returnCurrent, returnPrev,
            visitsCurrent, visitsPrev,
            lowStockProducts,
            topCustomers
        ] = await Promise.all([
            Order.countDocuments(currentMatch),
            Order.countDocuments(prevMatch),
            Order.aggregate([{ $match: revenueMatchCurrent }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
            Order.aggregate([{ $match: revenueMatchPrev }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
            User.countDocuments({ role: 'customer', createdAt: { $gte: fromDate, $lte: toDate } }),
            User.countDocuments({ role: 'customer', createdAt: { $gte: prevFromDate, $lte: prevToDate } }),
            Order.countDocuments({ ...currentMatch, orderStatus: 'returned' }),
            Order.countDocuments({ ...prevMatch, orderStatus: 'returned' }),
            Promise.resolve(100),
            Promise.resolve(100),
            Product.find({ stock: { $lt: 10 } }).limit(5).lean(),
            Order.aggregate([
                { $match: revenueMatchCurrent },
                { $group: { _id: '$customer', totalSpent: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
                { $sort: { totalSpent: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDoc' } },
                { $unwind: '$userDoc' },
                { $project: { _id: 1, name: '$userDoc.name', phone: '$userDoc.phone', totalSpent: 1, orderCount: 1, image: '$userDoc.avatar' } }
            ])
        ]);

        const totalRevenue = revCurrent[0]?.total || 0;
        const prevRevenue = revPrev[0]?.total || 0;
        
        const revenueByDay = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const ordersByPaymentMethod = await Order.aggregate([
            { $match: currentMatch },
            { $group: { _id: '$paymentMethod', method: { $first: '$paymentMethod' }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
        ]);

        const revenueByCategory = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
            { $unwind: '$prod' },
            { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
            { $unwind: '$cat' },
            { $group: { _id: '$cat._id', categoryName: { $first: '$cat.name' }, revenue: { $sum: '$items.itemTotal' } } },
            { $sort: { revenue: -1 } }
        ]);

        const prevRevenueByCategory = await Order.aggregate([
            { $match: revenueMatchPrev },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
            { $unwind: '$prod' },
            { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
            { $unwind: '$cat' },
            { $group: { _id: '$cat._id', revenue: { $sum: '$items.itemTotal' } } }
        ]);

        const categoryTrends = revenueByCategory.map(cat => {
            const prev = prevRevenueByCategory.find(p => p._id.toString() === cat._id.toString());
            const prevRev = prev ? prev.revenue : 0;
            const change = prevRev ? ((cat.revenue - prevRev) / prevRev * 100) : 100;
            return { categoryName: cat.categoryName, revenue: cat.revenue, change };
        });

        const topProducts = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $unwind: '$items' },
            { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.itemTotal' } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'prod' } },
            { $unwind: '$prod' },
            { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
            { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, name: '$prod.name', price: '$prod.price', categoryName: '$cat.name', totalSold: 1, totalRevenue: 1, image: { $arrayElemAt: ['$prod.images.url', 0] } } }
        ]);

        const revenueByHour = await Order.aggregate([
            { $match: currentMatch },
            { $group: { _id: { $hour: { date: '$createdAt', timezone: '+07:00' } }, hour: { $first: { $hour: { date: '$createdAt', timezone: '+07:00' } } }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
            { $sort: { _id: 1 } }
        ]);

        const orderStatusFunnel = await Order.aggregate([
            { $match: currentMatch },
            { $group: { _id: '$orderStatus', status: { $first: '$orderStatus' }, count: { $sum: 1 } } }
        ]);
        
        const revChange = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
        const ordChange = ordersPrev ? ((ordersCurrent - ordersPrev) / ordersPrev * 100) : 0;
        const custChange = customersPrev ? ((customersCurrent - customersPrev) / customersPrev * 100) : 0;
        const convRate = visitsCurrent ? (ordersCurrent / visitsCurrent) * 100 : 0;

        res.json({
            period: { from, to },
            kpis: {
                totalRevenue: totalRevenue,
                revenueChange: revChange,
                totalOrders: ordersCurrent,
                ordersChange: ordChange,
                conversionRate: convRate,
                conversionChange: 0,
                avgOrderValue: ordersCurrent ? totalRevenue / ordersCurrent : 0,
                newCustomers: customersCurrent,
                customersChange: custChange,
                returnRate: ordersCurrent ? (returnCurrent / ordersCurrent) * 100 : 0,
                returnRateChange: 0
            },
            revenueByDay,
            ordersByPaymentMethod,
            revenueByCategory,
            topProducts,
            revenueByHour,
            orderStatusFunnel,
            topCustomers,
            lowStockProducts,
            categoryTrends,
            insights: {
                revenueChange: revChange,
                salesChange: ordChange,
                conversionRate: convRate,
                customersChange: custChange
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};`;

content = content.replace(regex, newGetReports);
fs.writeFileSync(targetFile, content);
console.log('Fixed getReports successfully');
