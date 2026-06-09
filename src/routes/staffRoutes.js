const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
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
router.get('/orders', staffController.getOrders);
router.get('/orders/:id', validateId, staffController.getOrderDetail);
router.post('/orders/:id/claim', validateId, requireActiveShift, staffController.claimOrder);
router.patch('/orders/:id/status', validateId, requireActiveShift, staffController.updateOrderStatus);

// Khách hàng (read-only)
router.get('/customers', staffController.getCustomers);
router.get('/customers/:id', validateId, staffController.getCustomerDetail);

// Sản phẩm / Danh mục / Tồn kho (read-only)
router.get('/products', staffController.getProducts);
router.get('/categories', staffController.getCategories);
router.get('/inventory', staffController.getInventory);

// Khuyến mãi (chỉ active)
router.get('/promotions', staffController.getPromotions);

// Đánh giá
router.get('/reviews', staffController.getReviews);
router.post('/reviews/:id/reply', validateId, requireActiveShift, staffController.replyReview);

// Liên hệ
router.get('/contacts', staffController.getContacts);
router.get('/contacts/:id', validateId, staffController.getContactDetail);
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
