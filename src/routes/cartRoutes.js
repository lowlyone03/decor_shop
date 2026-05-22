const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authRequired } = require('../middlewares/auth');

router.use(authRequired);

router.get('/', cartController.getCart);
router.post('/items', cartController.addCartItem);
router.patch('/items/:productId', cartController.updateCartItem);
router.delete('/items/:productId', cartController.removeCartItem);

module.exports = router;
