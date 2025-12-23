const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { requireAuth } = require('../middleware/authMiddleware');

// Routes publiques
router.get('/', matchController.getUpcomingMatches);
router.get('/finished', matchController.getFinishedMatches);
router.get('/bracket', matchController.getBracketMatches);
router.get('/:id', matchController.getMatchById);

// Route protégée (pour admin ou test)
router.post('/sync', requireAuth, matchController.syncMatches);

module.exports = router;

