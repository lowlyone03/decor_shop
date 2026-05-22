const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/categories', productController.getCategories);
router.get('/products', productController.getProducts);
router.get('/products/:slug', productController.getProductBySlug);

module.exports = router;
