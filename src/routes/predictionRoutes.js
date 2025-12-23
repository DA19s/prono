const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { requireAuth } = require('../middleware/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(requireAuth);

// Créer ou mettre à jour un pronostic
router.post('/', predictionController.createOrUpdatePrediction);

// Récupérer les pronostics de l'utilisateur connecté
router.get('/my-predictions', predictionController.getUserPredictions);

// Récupérer les pronostics d'un match spécifique
router.get('/match/:matchId', predictionController.getMatchPredictions);

// Récupérer le pronostic de l'utilisateur pour un match
router.get('/match/:matchId/my-prediction', predictionController.getUserMatchPrediction);

// Supprimer un pronostic
router.delete('/match/:matchId', predictionController.deletePrediction);

module.exports = router;

