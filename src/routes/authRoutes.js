const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/verify-code', authController.verifyCode);
router.post('/resend-code', authController.resendVerificationCode);

// Routes protégées
router.get('/me', requireAuth, authController.getMe);
router.put('/change-password', requireAuth, authController.changePassword);

module.exports = router;

