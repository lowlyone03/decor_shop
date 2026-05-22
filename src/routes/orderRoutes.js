const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authRequired } = require('../middlewares/auth');

router.use(authRequired);

router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.post('/:id/vnpay-payment', orderController.createVnpayPayment);
router.patch('/:id/cancel', orderController.cancelOrder);
router.patch('/:id/return', orderController.returnOrder);

module.exports = router;
