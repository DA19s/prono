const prisma = require('../config/prismaClient');

/**
 * Crée ou met à jour un pronostic
 */
const createOrUpdatePrediction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { matchId, predictedHomeScore, predictedAwayScore, predictedHomePenalties, predictedAwayPenalties } = req.body;

    // Validation
    if (!matchId || predictedHomeScore === undefined || predictedAwayScore === undefined) {
      return res.status(400).json({ 
        message: 'Données manquantes: matchId, predictedHomeScore, predictedAwayScore requis' 
      });
    }

    if (predictedHomeScore < 0 || predictedAwayScore < 0) {
      return res.status(400).json({ 
        message: 'Les scores doivent être positifs' 
      });
    }

    // Si match nul, vérifier les tirs au but
    const isDraw = predictedHomeScore === predictedAwayScore;
    if (isDraw) {
      if (predictedHomePenalties === undefined || predictedAwayPenalties === undefined) {
        return res.status(400).json({ 
          message: 'En cas de match nul, les scores des tirs au but sont requis' 
        });
      }
      if (predictedHomePenalties < 0 || predictedAwayPenalties < 0) {
        return res.status(400).json({ 
          message: 'Les scores des tirs au but doivent être positifs' 
        });
      }
      if (predictedHomePenalties === predictedAwayPenalties) {
        return res.status(400).json({ 
          message: 'Les scores des tirs au but ne peuvent pas être égaux' 
        });
      }
    }

    // Vérifier que le match existe et que les pronostics sont ouverts
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match) {
      return res.status(404).json({ message: 'Match non trouvé' });
    }

    const now = new Date();
    const matchDate = new Date(match.date);
    
    // Vérifier si on est dans les 72h avant le match (en millisecondes: 72 * 60 * 60 * 1000)
    const hours72BeforeMatch = new Date(matchDate.getTime() - (72 * 60 * 60 * 1000));
    const canPredictIn72h = now >= hours72BeforeMatch && now < matchDate;
    
    // Logs pour débogage
    console.log('🔍 Vérification pronostic:');
    console.log('   Match date:', matchDate.toISOString());
    console.log('   Now:', now.toISOString());
    console.log('   72h avant:', hours72BeforeMatch.toISOString());
    console.log('   Deadline:', match.pronosticDeadline ? new Date(match.pronosticDeadline).toISOString() : 'null');
    console.log('   isPronosticOpen:', match.isPronosticOpen);
    console.log('   canPredictIn72h:', canPredictIn72h);
    console.log('   now >= deadline:', match.pronosticDeadline ? now >= new Date(match.pronosticDeadline) : 'N/A');
    
    // Vérifier si les pronostics sont ouverts ET (soit avant la deadline, soit dans les 72h avant le match)
    // Si on est dans les 72h, on permet toujours (peu importe la deadline)
    // Sinon, on vérifie la deadline normale
    const canPredict = match.isPronosticOpen && (canPredictIn72h || now < new Date(match.pronosticDeadline));
    
    if (!canPredict) {
      console.log('❌ Pronostic refusé');
      return res.status(400).json({ 
        message: 'Les pronostics sont fermés pour ce match',
        debug: {
          isPronosticOpen: match.isPronosticOpen,
          canPredictIn72h,
          nowBeforeDeadline: match.pronosticDeadline ? now < new Date(match.pronosticDeadline) : null,
          matchDate: matchDate.toISOString(),
          now: now.toISOString()
        }
      });
    }
    
    console.log('✅ Pronostic autorisé');

    // Déterminer le résultat prédit
    let predictedResult;
    if (predictedHomeScore > predictedAwayScore) {
      predictedResult = 'HOME_WIN';
    } else if (predictedAwayScore > predictedHomeScore) {
      predictedResult = 'AWAY_WIN';
    } else {
      // Match nul, le vainqueur est déterminé par les tirs au but
      if (predictedHomePenalties > predictedAwayPenalties) {
        predictedResult = 'HOME_WIN';
      } else {
        predictedResult = 'AWAY_WIN';
      }
    }

    // Créer ou mettre à jour le pronostic
    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId
        }
      },
      update: {
        predictedHomeScore,
        predictedAwayScore,
        predictedHomePenalties: isDraw ? predictedHomePenalties : null,
        predictedAwayPenalties: isDraw ? predictedAwayPenalties : null,
        predictedResult
      },
      create: {
        userId,
        matchId,
        predictedHomeScore,
        predictedAwayScore,
        predictedHomePenalties: isDraw ? predictedHomePenalties : null,
        predictedAwayPenalties: isDraw ? predictedAwayPenalties : null,
        predictedResult
      },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      }
    });

    res.json(prediction);
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime un pronostic
 */
const deletePrediction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;

    const prediction = await prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId,
          matchId
        }
      },
      include: {
        match: true
      }
    });

    if (!prediction) {
      return res.status(404).json({ message: 'Pronostic non trouvé' });
    }

    const now = new Date();
    if (!prediction.match.isPronosticOpen || now >= prediction.match.pronosticDeadline) {
      return res.status(400).json({ 
        message: 'Impossible de supprimer un pronostic après la deadline' 
      });
    }

    await prisma.prediction.delete({
      where: {
        userId_matchId: {
          userId,
          matchId
        }
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les pronostics d'un utilisateur
 */
const getUserPredictions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const predictions = await prisma.prediction.findMany({
      where: { userId },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      },
      orderBy: {
        match: {
          date: 'asc'
        }
      }
    });

    res.json(predictions);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les pronostics pour un match spécifique
 */
const getMatchPredictions = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const predictions = await prisma.prediction.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            totalPoints: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(predictions);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère le pronostic d'un utilisateur pour un match
 */
const getUserMatchPrediction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;

    const prediction = await prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId,
          matchId
        }
      },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      }
    });

    if (!prediction) {
      // Retourner 200 avec null au lieu de 404 pour éviter les erreurs côté client
      return res.status(200).json(null);
    }

    res.json(prediction);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdatePrediction,
  deletePrediction,
  getUserPredictions,
  getMatchPredictions,
  getUserMatchPrediction
};


