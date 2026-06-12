const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authRequired, adminOnlyStrict } = require('../middlewares/auth');
const { validateObjectId } = require('../utils/helpers');

// Middleware: validate :id param is a valid MongoDB ObjectId
function validateId(req, res, next) {
    const id = req.params.id;
    if (id && !validateObjectId(id)) {
        return res.status(400).json({ message: 'ID không hợp lệ.' });
    }
    next();
}

router.use(authRequired, adminOnlyStrict);


// Upload
router.post('/upload/product-image', adminController.uploadProductImage);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Orders
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', validateId, adminController.getOrderById);
router.patch('/orders/:id/status', validateId, adminController.updateOrderStatus);

// Staff
router.get('/staff', adminController.getStaff);
router.post('/staff', adminController.createStaff);
router.patch('/staff/:id', validateId, adminController.updateStaff);
router.delete('/staff/:id', validateId, adminController.deleteStaff);

router.post('/staff-shifts', adminController.createStaffShift);
router.patch('/staff-shifts/:id', validateId, adminController.updateStaffShift);
router.delete('/staff-shifts/:id', validateId, adminController.deleteStaffShift);
router.post('/staff-shifts/auto-assign', adminController.autoAssignShifts);
router.post('/staff-shifts/:id/force-checkout', validateId, adminController.forceCheckout);
router.post('/staff-shifts/:id/reassign', validateId, adminController.reassignShift);
router.post('/staff-shifts/:id/cancel', validateId, adminController.cancelShift);
router.post('/orders/:id/assign', validateId, adminController.assignOrder);
router.get('/payroll', adminController.getPayroll);

// Customers
router.get('/customers', adminController.getCustomers);
router.patch('/customers/:id/status', validateId, adminController.updateCustomerStatus);

// Reviews
router.get('/reviews', adminController.getReviews);
router.patch('/reviews/:id/status', validateId, adminController.updateReviewStatus);

// Contacts
router.get('/contacts', adminController.getContacts);
router.get('/contacts/:id', validateId, adminController.getContactById);
router.patch('/contacts/:id/status', validateId, adminController.updateContactStatus);
router.post('/contacts/:id/reply', validateId, adminController.replyContact);

// Products
router.get('/inventory', adminController.getInventory);
router.post('/inventory/transaction', adminController.createInventoryTransaction);
router.get('/inventory/transactions', adminController.getInventoryTransactions);
router.put('/inventory/product/:id', validateId, adminController.updateInventoryProduct);
router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);
router.patch('/products/:id', validateId, adminController.updateProduct);
router.delete('/products/:id', validateId, adminController.deleteProduct);

// Categories
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.patch('/categories/:id', validateId, adminController.updateCategory);
router.delete('/categories/:id', validateId, adminController.deleteCategory);

// Promotions
router.get('/promotions', adminController.getPromotions);
router.post('/promotions', adminController.createPromotion);
router.get('/promotions/:id', validateId, adminController.getPromotionById);
router.put('/promotions/:id', validateId, adminController.updatePromotion);
router.delete('/promotions/:id', validateId, adminController.deletePromotion);

// Banners
router.get('/banners', adminController.getBanners);
router.get('/banners/bod-status', adminController.getBannerBODStatus);
router.post('/banners/request-bod', adminController.requestBannerBOD);
router.post('/banners/approve-bod', adminController.approveBannerBOD);
router.post('/banners/lock-bod', adminController.lockBannerBOD);
router.post('/banners', adminController.createBanner);
router.patch('/banners/:id', validateId, adminController.updateBanner);
router.delete('/banners/:id', validateId, adminController.deleteBanner);

// Blogs
router.get('/blogs', adminController.getBlogs);
router.get('/blogs/bod-status', adminController.getBlogBODStatus);
router.post('/blogs/request-bod', adminController.requestBlogBOD);
router.post('/blogs/approve-bod', adminController.approveBlogBOD);
router.post('/blogs/lock-bod', adminController.lockBlogBOD);
router.post('/blogs', adminController.createBlog);
router.patch('/blogs/:id', validateId, adminController.updateBlog);
router.delete('/blogs/:id', validateId, adminController.deleteBlog);

// Reports
router.get('/reports', adminController.getReports);

// Backups
router.post('/backups', adminController.createBackup);
router.get('/backups', adminController.getBackups);
router.delete('/backups/:filename', adminController.deleteBackup);
router.post('/backups/:filename/restore', adminController.restoreBackup);

module.exports = router;

