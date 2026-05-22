const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRequired } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authRequired, authController.getMe);
router.patch('/profile', authRequired, authController.updateProfile);
router.post('/avatar', authRequired, authController.updateAvatar);
router.patch('/password', authRequired, authController.updatePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
