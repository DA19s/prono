const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { requireAuth } = require('../middleware/authMiddleware');

// Classement général (public)
router.get('/', leaderboardController.getLeaderboard);

// Position de l'utilisateur connecté (protégé)
router.get('/my-rank', requireAuth, leaderboardController.getUserRank);

module.exports = router;

