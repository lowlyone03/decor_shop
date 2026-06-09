const fs = require('fs');

const adminControllerCode = `
// ── Reports ──────────────────────────────────────
exports.getReports = async (req, res) => {
    try {
        const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const to = req.query.to || new Date().toISOString();
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        // Previous period for comparison
        const diffMs = toDate - fromDate;
        const prevFromDate = new Date(fromDate.getTime() - diffMs);
        const prevToDate = new Date(toDate.getTime() - diffMs);

        const currentMatch = { createdAt: { $gte: fromDate, $lte: toDate } };
        const prevMatch = { createdAt: { $gte: prevFromDate, $lte: prevToDate } };
        const revenueMatchCurrent = { ...currentMatch, orderStatus: { $in: ['completed', 'delivered'] } };
        const revenueMatchPrev = { ...prevMatch, orderStatus: { $in: ['completed', 'delivered'] } };

        // Basic Stats
        const [
            ordersCurrent, ordersPrev,
            revCurrent, revPrev,
            customersCurrent, customersPrev,
            returnCurrent, returnPrev,
            visitsCurrent, visitsPrev
        ] = await Promise.all([
            Order.countDocuments(currentMatch),
            Order.countDocuments(prevMatch),
            Order.aggregate([{ $match: revenueMatchCurrent }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
            Order.aggregate([{ $match: revenueMatchPrev }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
            User.countDocuments({ role: 'customer', createdAt: { $gte: fromDate, $lte: toDate } }),
            User.countDocuments({ role: 'customer', createdAt: { $gte: prevFromDate, $lte: prevToDate } }),
            Order.countDocuments({ ...currentMatch, orderStatus: 'returned' }),
            Order.countDocuments({ ...prevMatch, orderStatus: 'returned' }),
            Promise.resolve(100), // mock visits for conversion
            Promise.resolve(100)
        ]);

        const totalRevenue = revCurrent[0]?.total || 0;
        const prevRevenue = revPrev[0]?.total || 0;
        
        // Charts Data
        const revenueByDay = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } }, revenue: { $sum: '$totalAmount' } } },
            { $sort: { _id: 1 } }
        ]);

        const ordersByPayment = await Order.aggregate([
            { $match: currentMatch },
            { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
        ]);

        const revenueByCategory = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
            { $unwind: '$prod' },
            { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
            { $unwind: '$cat' },
            { $group: { _id: '$cat._id', categoryName: { $first: '$cat.name' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } }
        ]);

        const topProducts = await Order.aggregate([
            { $match: revenueMatchCurrent },
            { $unwind: '$items' },
            { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'prod' } },
            { $unwind: '$prod' },
            { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
            { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, name: '$prod.name', price: '$prod.price', categoryName: '$cat.name', totalSold: 1, totalRevenue: 1 } }
        ]);

        const hourlyOrders = await Order.aggregate([
            { $match: currentMatch },
            { $group: { _id: { $hour: { date: '$createdAt', timezone: '+07:00' } }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            period: { from, to },
            kpis: {
                revenue: { total: totalRevenue, prevTotal: prevRevenue, trend: prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0 },
                orders: { total: ordersCurrent, prevTotal: ordersPrev, trend: ordersPrev ? ((ordersCurrent - ordersPrev) / ordersPrev * 100) : 0 },
                conversion: { rate: (ordersCurrent / visitsCurrent) * 100, prevRate: (ordersPrev / visitsPrev) * 100, trend: 0 },
                aov: { value: ordersCurrent ? totalRevenue / ordersCurrent : 0, prevValue: ordersPrev ? prevRevenue / ordersPrev : 0, trend: 0 },
                newCustomers: { total: customersCurrent, prevTotal: customersPrev, trend: customersPrev ? ((customersCurrent - customersPrev) / customersPrev * 100) : 0 },
                returnRate: { rate: ordersCurrent ? (returnCurrent / ordersCurrent) * 100 : 0, prevRate: ordersPrev ? (returnPrev / ordersPrev) * 100 : 0, trend: 0 }
            },
            revenueByDay,
            ordersByPayment,
            revenueByCategory,
            topProducts,
            hourlyOrders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
`;

fs.appendFileSync('src/controllers/adminController.js', adminControllerCode);

let routesCode = fs.readFileSync('src/routes/adminRoutes.js', 'utf8');
if (!routesCode.includes('/reports')) {
    routesCode = routesCode.replace('module.exports = router;', `// Reports\nrouter.get('/reports', adminController.getReports);\n\nmodule.exports = router;`);
    fs.writeFileSync('src/routes/adminRoutes.js', routesCode);
}

console.log('Restored getReports successfully!');
