const prisma = require('../config/prismaClient');

/**
 * Récupère le classement des pronostiqueurs
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;

    const users = await prisma.user.findMany({
      where: {
        role: 'USER',
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pseudo: true,
        email: true,
        totalPoints: true,
        _count: {
          select: {
            predictions: true
          }
        }
      },
      orderBy: {
        totalPoints: 'desc'
      },
      take: parseInt(limit)
    });

    // Ajouter le rang
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      ...user,
      predictionsCount: user._count.predictions
    }));

    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère la position d'un utilisateur dans le classement
 */
const getUserRank = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pseudo: true,
        totalPoints: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Compter combien d'utilisateurs ont plus de points
    const rank = await prisma.user.count({
      where: {
        role: 'USER',
        isActive: true,
        totalPoints: {
          gt: user.totalPoints
        }
      }
    }) + 1;

    res.json({
      ...user,
      rank
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeaderboard,
  getUserRank
};




