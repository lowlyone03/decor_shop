const express = require('express');
const router = express.Router();
const otherController = require('../controllers/otherController');
const { authRequired } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/reviews', authRequired, upload.array('images', 5), otherController.createReview);

router.get('/wishlist', authRequired, otherController.getWishlist);
router.post('/wishlist/:productId', authRequired, otherController.addWishlist);
router.delete('/wishlist/:productId', authRequired, otherController.removeWishlist);

router.get('/promotions', otherController.getPromotions);
router.post('/promotions/validate', authRequired, otherController.validatePromotion);

router.get('/blogs', otherController.getBlogs);
router.get('/blogs/:slug', otherController.getBlogBySlug);

router.get('/banners', otherController.getBanners);

router.post('/contact', otherController.createContact);
router.get('/contact/tickets', otherController.getTickets);
router.post('/contact/:id/reply', otherController.replyTicket);

router.post('/newsletter', otherController.subscribeNewsletter);

router.get('/notifications', authRequired, otherController.getNotifications);
router.patch('/notifications/read-all', authRequired, otherController.markAllNotificationsRead);
router.patch('/notifications/:id/read', authRequired, otherController.markNotificationRead);

module.exports = router;
