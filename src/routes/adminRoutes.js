const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Toutes les routes admin nécessitent une authentification et le rôle ADMIN
router.use(requireAuth);
router.use(requireAdmin);

// Gestion des administrateurs
router.post('/admins', userController.createAdmin);
router.get('/admins', async (req, res, next) => {
  try {
    const prisma = require('../config/prismaClient');
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(admins);
  } catch (error) {
    next(error);
  }
});

// Gestion des équipes
router.get('/teams', adminController.getAllTeams);
router.get('/teams/:id', adminController.getTeamById);
router.post('/teams', upload.single('logo'), adminController.createTeam);
router.put('/teams/:id', upload.single('logo'), adminController.updateTeam);
router.delete('/teams/:id', adminController.deleteTeam);

// Gestion des matchs
router.get('/matches', adminController.getAllMatches);
router.post('/matches', adminController.createMatch);
router.put('/matches/:id', adminController.updateMatch);
router.delete('/matches/:id', adminController.deleteMatch);

// Gestion des brackets (élimination directe)
router.get('/bracket/matches', adminController.getBracketMatches);
router.post('/bracket/matches', adminController.createBracketMatch);
router.put('/bracket/matches/:id', adminController.updateBracketMatch);

module.exports = router;

