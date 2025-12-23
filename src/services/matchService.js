const prisma = require('../config/prismaClient');

class MatchService {

  /**
   * Crée ou met à jour une équipe
   */
  async upsertTeam(teamData) {
    // Si apiId est fourni, utiliser upsert, sinon créer
    if (teamData.apiId) {
      return await prisma.team.upsert({
        where: { apiId: teamData.apiId },
        update: {
          name: teamData.name,
          logo: teamData.logo,
          code: teamData.code,
          country: teamData.country
        },
        create: {
          apiId: teamData.apiId,
          name: teamData.name,
          logo: teamData.logo,
          code: teamData.code,
          country: teamData.country
        }
      });
    } else {
      // Créer une nouvelle équipe sans apiId (pour gestion manuelle)
      return await prisma.team.create({
        data: {
          apiId: Math.floor(Math.random() * 1000000), // Générer un ID temporaire
          name: teamData.name,
          logo: teamData.logo,
          code: teamData.code,
          country: teamData.country
        }
      });
    }
  }

  /**
   * Calcule les points pour tous les pronostics d'un match
   */
  async calculatePointsForMatch(match) {
    if (match.homeScore === null || match.awayScore === null) {
      return;
    }

    // Déterminer le résultat du match
    let actualResult = null;
    if (match.homeScore !== null && match.awayScore !== null) {
      if (match.homeScore > match.awayScore) {
        actualResult = 'HOME_WIN';
      } else if (match.awayScore > match.homeScore) {
        actualResult = 'AWAY_WIN';
      } else {
        // Match nul, le vainqueur est déterminé par les tirs au but
        if (match.homePenalties !== null && match.awayPenalties !== null) {
          if (match.homePenalties > match.awayPenalties) {
            actualResult = 'HOME_WIN';
          } else {
            actualResult = 'AWAY_WIN';
          }
        } else {
          actualResult = 'DRAW';
        }
      }
    }

    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
      include: {
        user: {
          select: {
            id: true,
            totalPoints: true
          }
        }
      }
    });

    for (const prediction of predictions) {
      // Ne recalculer que si les points n'ont pas encore été attribués
      if (prediction.pointsEarned > 0) {
        continue;
      }

      const predictedResult = prediction.predictedResult;
      const isScoreCorrect = 
        prediction.predictedHomeScore === match.homeScore &&
        prediction.predictedAwayScore === match.awayScore;
      
      // Vérifier aussi les tirs au but si le match est nul
      let isPenaltiesCorrect = false;
      if (isScoreCorrect && match.homeScore === match.awayScore) {
        // Match nul, vérifier les tirs au but
        if (match.homePenalties !== null && match.awayPenalties !== null &&
            prediction.predictedHomePenalties !== null && prediction.predictedAwayPenalties !== null) {
          isPenaltiesCorrect = 
            prediction.predictedHomePenalties === match.homePenalties &&
            prediction.predictedAwayPenalties === match.awayPenalties;
        }
      }
      
      const isResultCorrect = predictedResult === actualResult;

      let pointsEarned = 0;
      if (isScoreCorrect && (match.homeScore !== match.awayScore || isPenaltiesCorrect)) {
        // Si le score exact est correct (et les tirs au but si match nul), le résultat est forcément correct aussi
        pointsEarned = 3;
      } else if (isResultCorrect) {
        // Si seul le résultat est correct (mais pas le score exact)
        pointsEarned = 1;
      }

      // Mettre à jour le pronostic
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: {
          pointsEarned,
          isScoreCorrect,
          isResultCorrect
        }
      });

      // Mettre à jour le total de points de l'utilisateur
      await prisma.user.update({
        where: { id: prediction.userId },
        data: { 
          totalPoints: {
            increment: pointsEarned
          }
        }
      });
    }
  }

  /**
   * Met à jour le statut des matchs (ouvrir/fermer les pronostics)
   */
  async updateMatchStatuses() {
    try {
      const now = new Date();
      
      // Fermer les pronostics pour les matchs dont la deadline est passée
      await prisma.match.updateMany({
        where: {
          isPronosticOpen: true,
          pronosticDeadline: { lt: now }
        },
        data: {
          isPronosticOpen: false
        }
      });

      console.log('✅ Statuts des matchs mis à jour');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des statuts:', error);
      throw error;
    }
  }
}

module.exports = new MatchService();

