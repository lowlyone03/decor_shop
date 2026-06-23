const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const adminController = require('../controllers/adminController');
const { authRequired, staffOrAdmin, requireActiveShift } = require('../middlewares/auth');
const { validateObjectId } = require('../utils/helpers');

function validateId(req, res, next) {
    const id = req.params.id;
    if (id && !validateObjectId(id)) {
        return res.status(400).json({ message: 'ID không hợp lệ.' });
    }
    next();
}

router.use(authRequired, staffOrAdmin);

// Dashboard
router.get('/dashboard', staffController.getDashboard);

// Ca trực
router.get('/my-shifts', staffController.getMyShifts);
router.post('/shifts/:id/check-in', validateId, staffController.checkIn);
router.post('/shifts/:id/check-out', validateId, staffController.checkOut);

// Đơn hàng
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', validateId, adminController.getOrderById);
router.post('/orders/:id/claim', validateId, requireActiveShift, staffController.claimOrder);
router.patch('/orders/:id/status', validateId, requireActiveShift, staffController.updateOrderStatus);

// Khách hàng (read-only)
router.get('/customers', adminController.getCustomers);
router.get('/customers/:id', validateId, staffController.getCustomerDetail);

// Sản phẩm / Danh mục / Tồn kho (Staff có thể thêm sửa theo yêu cầu)
router.post('/upload/product-image', adminController.uploadProductImage);
router.get('/products', adminController.getProducts);
router.get('/products/:id', validateId, adminController.getProductById);
router.post('/products', adminController.createProduct);
router.patch('/products/:id', validateId, adminController.updateProduct);
router.delete('/products/:id', validateId, adminController.deleteProduct);

router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.patch('/categories/:id', validateId, adminController.updateCategory);
router.delete('/categories/:id', validateId, adminController.deleteCategory);

router.get('/inventory', adminController.getInventory);
router.post('/inventory/transaction', adminController.createInventoryTransaction);
router.get('/inventory/transactions', adminController.getInventoryTransactions);
router.put('/inventory/product/:id', validateId, adminController.updateInventoryProduct);

// Khuyến mãi (chỉ active)
router.get('/promotions', adminController.getPromotions);

// Đánh giá
router.get('/reviews', adminController.getReviews);
router.post('/reviews/:id/reply', validateId, requireActiveShift, staffController.replyReview);

// Liên hệ
router.get('/contacts', adminController.getContacts);
router.get('/contacts/:id', validateId, adminController.getContactById);
router.post('/contacts/:id/reply', validateId, requireActiveShift, staffController.replyContact);
router.patch('/contacts/:id/status', validateId, requireActiveShift, staffController.updateContactStatus);

// CRM
router.get('/crm/abandoned-carts', staffController.getAbandonedCarts);
router.post('/crm/abandoned-carts/:id/claim', validateId, requireActiveShift, staffController.claimAbandonedCart);
router.get('/crm/follow-ups', staffController.getFollowUps);
router.get('/crm/interactions', staffController.getInteractions);
router.post('/crm/interactions', requireActiveShift, staffController.createInteraction);

// KPI & Lương
router.get('/my-kpi', staffController.getMyKPI);
router.get('/my-salary', staffController.getMySalary);

// Hồ sơ
router.get('/profile', staffController.getProfile);
router.patch('/profile', staffController.updateProfile);

module.exports = router;
