const prisma = require('../config/prismaClient');
const matchService = require('../services/matchService');

/**
 * Récupère tous les matchs à venir
 */
const getUpcomingMatches = async (req, res, next) => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'LIVE']
        }
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        _count: {
          select: { predictions: true }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`📋 Total matchs trouvés: ${matches.length}`);
    matches.forEach(m => {
      console.log(`  - ${m.homeTeam?.name || 'null'} vs ${m.awayTeam?.name || 'null'} (${m.status}, bracket: ${m.bracketRound || 'non'}, date: ${m.date.toISOString()})`);
    });

    // Filtrer les matchs :
    // 1. Doivent avoir les DEUX équipes (même pour les matchs bracket)
    // 2. Doivent avoir une date valide (pas la date par défaut 2099)
    const now = new Date();
    const validMatches = matches.filter(match => {
      // Vérifier que les deux équipes sont présentes
      if (!match.homeTeam || !match.awayTeam) {
        return false;
      }

      // Vérifier que la date est définie (pas null et pas la date par défaut 2099)
      if (!match.date) {
        return false; // Pas de date = pas programmé
      }
      
      const defaultDate = new Date('2099-12-31T00:00:00Z');
      const isDefaultDate = Math.abs(match.date.getTime() - defaultDate.getTime()) < 1000; // Tolérance de 1 seconde
      if (isDefaultDate) {
        return false; // Date par défaut = pas programmé
      }
      
      const isFutureDate = match.date > now;
      
      // Un match est programmé s'il a une date valide et est dans le futur
      return isFutureDate;
    });

    console.log(`✅ Matchs programmés retournés: ${validMatches.length}`);

    res.json(validMatches);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère un match par son ID
 */
const getMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ message: 'Match non trouvé' });
    }

    res.json(match);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les matchs terminés
 */
const getFinishedMatches = async (req, res, next) => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        status: 'FINISHED'
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: {
        date: 'desc'
      },
      take: 50
    });

    res.json(matches);
  } catch (error) {
    next(error);
  }
};

/**
 * Synchronise manuellement les matchs (pour test ou admin)
 */
const syncMatches = async (req, res, next) => {
  try {
    console.log('🔄 Synchronisation manuelle des matchs CAN demandée...');
    
    // Synchroniser les matchs à venir
    const upcomingResult = await matchService.syncUpcomingMatches();
    
    // Mettre à jour les statuts
    await matchService.updateMatchStatuses();
    
    // Synchroniser les matchs terminés
    const finishedResult = await matchService.updateFinishedMatches();
    
    res.json({
      message: 'Synchronisation terminée',
      upcoming: upcomingResult,
      finished: finishedResult
    });
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    next(error);
  }
};

/**
 * Récupérer tous les matchs de bracket (route publique)
 */
const getBracketMatches = async (req, res, next) => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        bracketRound: {
          not: null
        }
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        parentMatch1: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        },
        parentMatch2: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      },
      orderBy: [
        { bracketRound: 'asc' },
        { bracketPosition: 'asc' }
      ]
    });

    res.json(matches);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUpcomingMatches,
  getMatchById,
  getFinishedMatches,
  syncMatches,
  getBracketMatches
};

