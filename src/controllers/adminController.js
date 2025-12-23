const prisma = require('../config/prismaClient');
const matchService = require('../services/matchService');

/**
 * Créer un match manuellement
 */
const createMatch = async (req, res, next) => {
  try {
    const { homeTeamId, awayTeamId, date, round, venue, city } = req.body;

    // Validation
    if (!homeTeamId || !awayTeamId || !date) {
      return res.status(400).json({
        message: 'Équipes et date sont obligatoires'
      });
    }

    // Vérifier que les équipes existent
    const homeTeam = await prisma.team.findUnique({ where: { id: homeTeamId } });
    const awayTeam = await prisma.team.findUnique({ where: { id: awayTeamId } });

    if (!homeTeam || !awayTeam) {
      return res.status(404).json({
        message: 'Une ou plusieurs équipes non trouvées'
      });
    }

    // Vérifier que ce n'est pas le même match
    if (homeTeamId === awayTeamId) {
      return res.status(400).json({
        message: 'Les deux équipes doivent être différentes'
      });
    }

    // Calculer la deadline (72h avant le match)
    const matchDate = new Date(date);
    const deadline = new Date(matchDate);
    deadline.setHours(deadline.getHours() - 72);

    // Générer un apiId unique (temporaire pour gestion manuelle)
    const maxApiId = await prisma.match.findFirst({
      orderBy: { apiId: 'desc' },
      select: { apiId: true }
    });
    const newApiId = (maxApiId?.apiId || 0) + 1;

    // Les pronostics sont ouverts par défaut (on permet dans les 72h avant le match)
    const now = new Date();
    const hours72BeforeMatch = new Date(matchDate.getTime() - (72 * 60 * 60 * 1000));
    const isIn72hWindow = now >= hours72BeforeMatch && now < matchDate;
    
    // Créer le match
    const match = await prisma.match.create({
      data: {
        apiId: newApiId,
        date: matchDate,
        status: 'SCHEDULED',
        homeTeamId,
        awayTeamId,
        round: round || null,
        venue: venue || null,
        city: city || null,
        pronosticDeadline: deadline,
        isPronosticOpen: true // Toujours ouvert, on vérifie les 72h dans la logique
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    res.status(201).json({
      message: 'Match créé avec succès',
      match
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mettre à jour un match (score, statut)
 */
const updateMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore, status, homeScoreHalfTime, awayScoreHalfTime, homePenalties, awayPenalties } = req.body;

    // Trouver le match
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match) {
      return res.status(404).json({
        message: 'Match non trouvé'
      });
    }

    // Empêcher la modification d'un match de bracket terminé
    if (match.status === 'FINISHED' && match.bracketRound) {
      return res.status(400).json({
        message: 'Impossible de modifier un match de bracket terminé'
      });
    }

    // Préparer les données de mise à jour
    const updateData = {};

    if (status) {
      updateData.status = status;
    }

    if (homeScore !== undefined && awayScore !== undefined) {
      // Vérifier que les deux équipes sont présentes avant de permettre la finalisation
      if (!match.homeTeamId || !match.awayTeamId) {
        return res.status(400).json({
          message: 'Impossible de terminer un match dont les deux équipes ne sont pas encore déterminées'
        });
      }
      
      // Vérifier que les deux équipes sont présentes
      if (!match.homeTeamId || !match.awayTeamId) {
        return res.status(400).json({
          message: 'Impossible de terminer un match dont les deux équipes ne sont pas encore déterminées'
        });
      }
      
      // Vérifier que la date est définie (pas null et pas la date par défaut 2099)
      if (!match.date) {
        return res.status(400).json({
          message: 'Impossible de terminer un match qui n\'a pas encore de date programmée'
        });
      }
      
      const defaultDate = new Date('2099-12-31T00:00:00Z');
      const isDefaultDate = Math.abs(match.date.getTime() - defaultDate.getTime()) < 1000;
      if (isDefaultDate) {
        return res.status(400).json({
          message: 'Impossible de terminer un match qui n\'a pas encore de date programmée'
        });
      }
      
      updateData.homeScore = homeScore;
      updateData.awayScore = awayScore;
      updateData.status = 'FINISHED';
      updateData.isPronosticOpen = false;
    }

    if (homeScoreHalfTime !== undefined) {
      updateData.homeScoreHalfTime = homeScoreHalfTime;
    }

    if (awayScoreHalfTime !== undefined) {
      updateData.awayScoreHalfTime = awayScoreHalfTime;
    }

    if (homePenalties !== undefined) {
      updateData.homePenalties = homePenalties;
    }

    if (awayPenalties !== undefined) {
      updateData.awayPenalties = awayPenalties;
    }

    // Mettre à jour le match
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    // Si le match vient d'être terminé, calculer les points et avancer le vainqueur si c'est un match bracket
    if (match.status !== 'FINISHED' && updatedMatch.status === 'FINISHED' && 
        updatedMatch.homeScore !== null && updatedMatch.awayScore !== null) {
      // Avancer le vainqueur si c'est un match de bracket
      if (updatedMatch.bracketRound) {
        await advanceWinnerToNextRound(updatedMatch);
      }
      
      await matchService.calculatePointsForMatch(updatedMatch);
    }

    res.json({
      message: 'Match mis à jour avec succès',
      match: updatedMatch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un match
 */
const deleteMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({ where: { id } });

    if (!match) {
      return res.status(404).json({
        message: 'Match non trouvé'
      });
    }

    // Empêcher la suppression des matchs bracket à partir des quarts de finale
    if (match.bracketRound && match.bracketRound !== 'ROUND_OF_16') {
      return res.status(400).json({
        message: 'Impossible de supprimer un match de bracket à partir des quarts de finale'
      });
    }

    // Vérifier s'il y a des pronostics
    const predictionsCount = await prisma.prediction.count({
      where: { matchId: id }
    });

    if (predictionsCount > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer ce match car ${predictionsCount} pronostic(s) y sont associés`
      });
    }

    await prisma.match.delete({
      where: { id }
    });

    res.json({
      message: 'Match supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer tous les matchs (pour admin)
 */
const getAllMatches = async (req, res, next) => {
  try {
    const matches = await prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        _count: {
          select: { predictions: true }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Inclure bracketRound dans la réponse
    res.json(matches);
  } catch (error) {
    next(error);
  }
};

/**
 * Créer une équipe
 */
const createTeam = async (req, res, next) => {
  try {
    const { name, code, logo, country, countryCode } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: 'Le nom de l\'équipe est obligatoire'
      });
    }

    // Vérifier l'unicité du nom
    const existingName = await prisma.team.findFirst({
      where: { name: name.trim() }
    });

    if (existingName) {
      return res.status(400).json({
        message: 'Une équipe avec ce nom existe déjà'
      });
    }

    // Vérifier l'unicité du code (si fourni)
    if (code?.trim()) {
      const existingCode = await prisma.team.findFirst({
        where: { code: code.trim() }
      });

      if (existingCode) {
        return res.status(400).json({
          message: 'Une équipe avec ce code existe déjà'
        });
      }
    }

    // Déterminer l'URL du logo
    let logoUrl = logo?.trim() || null;
    
    // Si un fichier a été uploadé, utiliser son chemin
    if (req.file) {
      logoUrl = `/uploads/${req.file.filename}`;
    } 
    // Si un code pays est fourni, utiliser le drapeau correspondant
    else if (countryCode?.trim()) {
      logoUrl = `/uploads/flags/${countryCode.trim().toLowerCase()}.png`;
    }

    // Générer un apiId unique
    const maxApiId = await prisma.team.findFirst({
      orderBy: { apiId: 'desc' },
      select: { apiId: true }
    });
    const newApiId = (maxApiId?.apiId || 0) + 1;

    const team = await prisma.team.create({
      data: {
        apiId: newApiId,
        name: name.trim(),
        code: code?.trim() || null,
        logo: logoUrl,
        country: country?.trim() || null
      }
    });

    res.status(201).json({
      message: 'Équipe créée avec succès',
      team
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer toutes les équipes
 */
const getAllTeams = async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    res.json(teams);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer une équipe par ID
 */
const getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id }
    });

    if (!team) {
      return res.status(404).json({
        message: 'Équipe non trouvée'
      });
    }

    res.json(team);
  } catch (error) {
    next(error);
  }
};

/**
 * Mettre à jour une équipe
 */
const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, logo, country, countryCode } = req.body;

    // Vérifier que l'équipe existe
    const existingTeam = await prisma.team.findUnique({
      where: { id }
    });

    if (!existingTeam) {
      return res.status(404).json({
        message: 'Équipe non trouvée'
      });
    }

    // Validation du nom
    if (name?.trim()) {
      // Vérifier l'unicité du nom (sauf pour l'équipe actuelle)
      const existingName = await prisma.team.findFirst({
        where: {
          name: name.trim(),
          id: { not: id }
        }
      });

      if (existingName) {
        return res.status(400).json({
          message: 'Une équipe avec ce nom existe déjà'
        });
      }
    }

    // Validation du code (si fourni)
    if (code?.trim()) {
      const existingCode = await prisma.team.findFirst({
        where: {
          code: code.trim(),
          id: { not: id }
        }
      });

      if (existingCode) {
        return res.status(400).json({
          message: 'Une équipe avec ce code existe déjà'
        });
      }
    }

    // Déterminer l'URL du logo
    let logoUrl = logo?.trim() || existingTeam.logo;
    
    // Si un fichier a été uploadé, utiliser son chemin
    if (req.file) {
      logoUrl = `/uploads/${req.file.filename}`;
    } 
    // Si un code pays est fourni, utiliser le drapeau correspondant
    else if (countryCode?.trim()) {
      logoUrl = `/uploads/flags/${countryCode.trim().toLowerCase()}.png`;
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (name?.trim()) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code?.trim() || null;
    if (logoUrl !== undefined) updateData.logo = logoUrl;
    if (country !== undefined) updateData.country = country?.trim() || null;

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Équipe mise à jour avec succès',
      team: updatedTeam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer une équipe
 */
const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            homeMatches: true,
            awayMatches: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        message: 'Équipe non trouvée'
      });
    }

    // Vérifier si l'équipe est utilisée dans des matchs
    const totalMatches = team._count.homeMatches + team._count.awayMatches;
    if (totalMatches > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer cette équipe car elle est utilisée dans ${totalMatches} match(s)`
      });
    }

    await prisma.team.delete({
      where: { id }
    });

    res.json({
      message: 'Équipe supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un match de 8ème de finale
 */
const createBracketMatch = async (req, res, next) => {
  try {
    const { homeTeamId, awayTeamId, date, bracketPosition } = req.body;

    // Validation
    if (!homeTeamId || !awayTeamId || !date || !bracketPosition) {
      return res.status(400).json({
        message: 'Équipes, date et position dans le bracket sont obligatoires'
      });
    }

    if (bracketPosition < 1 || bracketPosition > 8) {
      return res.status(400).json({
        message: 'La position dans le bracket doit être entre 1 et 8 pour les 8èmes de finale'
      });
    }

    // Vérifier que les équipes existent
    const homeTeam = await prisma.team.findUnique({ where: { id: homeTeamId } });
    const awayTeam = await prisma.team.findUnique({ where: { id: awayTeamId } });

    if (!homeTeam || !awayTeam) {
      return res.status(404).json({
        message: 'Une ou plusieurs équipes non trouvées'
      });
    }

    // Vérifier qu'il n'y a pas déjà un match à cette position
    const existingMatch = await prisma.match.findFirst({
      where: {
        bracketRound: 'ROUND_OF_16',
        bracketPosition: bracketPosition
      }
    });

    if (existingMatch) {
      return res.status(400).json({
        message: `Un match existe déjà à la position ${bracketPosition} des 8èmes de finale`
      });
    }

    // Calculer la deadline (72h avant le match)
    const matchDate = new Date(date);
    const deadline = new Date(matchDate);
    deadline.setHours(deadline.getHours() - 72);

    // Générer un apiId unique
    const maxApiId = await prisma.match.findFirst({
      orderBy: { apiId: 'desc' },
      select: { apiId: true }
    });
    const newApiId = (maxApiId?.apiId || 0) + 1;

    // Déterminer le statut : PENDING si les deux équipes ne sont pas présentes ou si la date n'est pas définie
    const hasBothTeams = homeTeamId && awayTeamId;
    const hasValidDate = matchDate && matchDate.getFullYear() !== 2099;
    const matchStatus = (hasBothTeams && hasValidDate) ? 'SCHEDULED' : 'PENDING';
    
    // Créer le match
    const match = await prisma.match.create({
      data: {
        apiId: newApiId,
        date: matchDate,
        status: matchStatus,
        homeTeamId,
        awayTeamId,
        bracketRound: 'ROUND_OF_16',
        bracketPosition: bracketPosition,
        pronosticDeadline: deadline,
        isPronosticOpen: hasBothTeams && hasValidDate // Ouvrir seulement si les deux équipes et la date sont définies
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    res.status(201).json({
      message: 'Match de 8ème de finale créé avec succès',
      match
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer tous les matchs de bracket
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

/**
 * Mettre à jour un match de bracket et générer automatiquement les matchs suivants si nécessaire
 */
const updateBracketMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { homeTeamId, awayTeamId, date, homeScore, awayScore, status, homeScoreHalfTime, awayScoreHalfTime } = req.body;

    // Trouver le match
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match) {
      return res.status(404).json({
        message: 'Match non trouvé'
      });
    }

    if (!match.bracketRound) {
      return res.status(400).json({
        message: 'Ce match n\'est pas un match de bracket'
      });
    }

    // Empêcher la modification d'un match terminé
    if (match.status === 'FINISHED') {
      return res.status(400).json({
        message: 'Impossible de modifier un match terminé'
      });
    }

    // Pour les matchs de 8ème de finale, on peut modifier les équipes et la date
    // Pour les autres phases, on peut modifier la date (quand les deux équipes sont présentes)
    const canModifyTeams = match.bracketRound === 'ROUND_OF_16';
    const wasFinished = match.status === 'FINISHED';
    const updateData = {};

    if (canModifyTeams) {
      if (homeTeamId) {
        // Vérifier que l'équipe existe
        const homeTeam = await prisma.team.findUnique({ where: { id: homeTeamId } });
        if (!homeTeam) {
          return res.status(404).json({ message: 'Équipe domicile non trouvée' });
        }
        updateData.homeTeamId = homeTeamId;
      }

      if (awayTeamId) {
        // Vérifier que l'équipe existe
        const awayTeam = await prisma.team.findUnique({ where: { id: awayTeamId } });
        if (!awayTeam) {
          return res.status(404).json({ message: 'Équipe extérieure non trouvée' });
        }
        updateData.awayTeamId = awayTeamId;
      }
    }

    // Pour tous les matchs bracket, on peut modifier la date (surtout quand les deux équipes sont présentes)
    if (date) {
      const matchDate = new Date(date);
      updateData.date = matchDate;
      // Recalculer la deadline
      const deadline = new Date(matchDate);
      deadline.setHours(deadline.getHours() - 72);
      updateData.pronosticDeadline = deadline;
      
      // Vérifier si les deux équipes seront présentes après la mise à jour
      const willHaveBothTeams = (homeTeamId ? true : match.homeTeamId) && (awayTeamId ? true : match.awayTeamId);
      const hasValidDate = matchDate.getFullYear() !== 2099;
      
      if (willHaveBothTeams && hasValidDate) {
        updateData.status = 'SCHEDULED';
        updateData.isPronosticOpen = true; // Ouvrir les pronostics quand tout est prêt
      } else {
        updateData.status = 'PENDING';
        updateData.isPronosticOpen = false; // Fermer les pronostics si les conditions ne sont pas remplies
      }
    }
    
    // Si on modifie les équipes (pour les 8èmes de finale), vérifier aussi le statut
    if (canModifyTeams && (homeTeamId || awayTeamId)) {
      const willHaveBothTeams = (homeTeamId ? true : match.homeTeamId) && (awayTeamId ? true : match.awayTeamId);
      const hasValidDate = match.date && match.date.getFullYear() !== 2099;
      
      if (willHaveBothTeams && hasValidDate) {
        updateData.status = 'SCHEDULED';
        updateData.isPronosticOpen = true;
      } else {
        updateData.status = 'PENDING';
        updateData.isPronosticOpen = false;
      }
    }

    if (homeScore !== undefined) updateData.homeScore = homeScore;
    if (awayScore !== undefined) updateData.awayScore = awayScore;
    if (homeScoreHalfTime !== undefined) updateData.homeScoreHalfTime = homeScoreHalfTime;
    if (awayScoreHalfTime !== undefined) updateData.awayScoreHalfTime = awayScoreHalfTime;
    if (status) updateData.status = status;

    // Si on essaie de terminer le match, vérifier que les deux équipes sont présentes ET que la date est définie
    if (status === 'FINISHED' || (homeScore !== undefined && awayScore !== undefined && status !== 'FINISHED')) {
      if (!match.homeTeamId || !match.awayTeamId) {
        return res.status(400).json({
          message: 'Impossible de terminer un match dont les deux équipes ne sont pas encore déterminées'
        });
      }
      
      // Vérifier que la date est définie (pas null et pas la date par défaut 2099)
      if (!match.date) {
        return res.status(400).json({
          message: 'Impossible de terminer un match qui n\'a pas encore de date programmée'
        });
      }
      
      const defaultDate = new Date('2099-12-31T00:00:00Z');
      const isDefaultDate = Math.abs(match.date.getTime() - defaultDate.getTime()) < 1000;
      if (isDefaultDate) {
        return res.status(400).json({
          message: 'Impossible de terminer un match qui n\'a pas encore de date programmée'
        });
      }
    }

    // Mettre à jour le match
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    // Si le match vient d'être terminé, avancer le vainqueur vers le match suivant
    if (!wasFinished && updatedMatch.status === 'FINISHED' && updatedMatch.homeScore !== null && updatedMatch.awayScore !== null) {
      // Avancer le vainqueur immédiatement
      await advanceWinnerToNextRound(updatedMatch);
      
      // Recalculer les points pour ce match
      await matchService.calculatePointsForMatch(updatedMatch);
    }

    res.json({
      message: 'Match mis à jour avec succès',
      match: updatedMatch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Générer automatiquement les matchs de la phase suivante
 */
const generateNextRoundMatches = async (match) => {
  try {
    let nextRound, nextPosition, parent1Position, parent2Position;

    // Déterminer la phase suivante et les positions
    if (match.bracketRound === 'ROUND_OF_16') {
      nextRound = 'QUARTER_FINAL';
      // Matchs 1-2 → Quart 1, Matchs 3-4 → Quart 2, etc.
      nextPosition = Math.ceil(match.bracketPosition / 2);
      parent1Position = (nextPosition - 1) * 2 + 1;
      parent2Position = (nextPosition - 1) * 2 + 2;
    } else if (match.bracketRound === 'QUARTER_FINAL') {
      nextRound = 'SEMI_FINAL';
      // Matchs 1-2 → Demi 1, Matchs 3-4 → Demi 2
      nextPosition = Math.ceil(match.bracketPosition / 2);
      parent1Position = (nextPosition - 1) * 2 + 1;
      parent2Position = (nextPosition - 1) * 2 + 2;
    } else if (match.bracketRound === 'SEMI_FINAL') {
      nextRound = 'FINAL';
      nextPosition = 1;
      parent1Position = 1;
      parent2Position = 2;
    } else {
      // C'est la finale, pas de phase suivante
      return;
    }

    // Trouver les deux matchs parents
    const parent1 = await prisma.match.findFirst({
      where: {
        bracketRound: match.bracketRound,
        bracketPosition: parent1Position
      }
    });

    const parent2 = await prisma.match.findFirst({
      where: {
        bracketRound: match.bracketRound,
        bracketPosition: parent2Position
      }
    });

    // Vérifier que les deux matchs parents existent et sont terminés
    if (!parent1 || !parent2) {
      console.log(`⏳ Match suivant pas encore généré: les deux matchs parents doivent exister`);
      return;
    }

    if (parent1.status !== 'FINISHED' || parent2.status !== 'FINISHED') {
      console.log(`⏳ Match suivant pas encore généré: les deux matchs parents doivent être terminés`);
      return;
    }

    // Déterminer les vainqueurs
    const winner1 = await getWinner(parent1);
    const winner2 = await getWinner(parent2);

    if (!winner1 || !winner2) {
      console.log(`⚠️ Impossible de déterminer les vainqueurs des matchs parents`);
      return;
    }

    // Vérifier si le match suivant existe déjà
    const existingNextMatch = await prisma.match.findFirst({
      where: {
        bracketRound: nextRound,
        bracketPosition: nextPosition
      }
    });

    if (existingNextMatch) {
      // Mettre à jour les équipes si nécessaire
      await prisma.match.update({
        where: { id: existingNextMatch.id },
        data: {
          homeTeamId: winner1,
          awayTeamId: winner2
        }
      });
      console.log(`✅ Match ${nextRound} position ${nextPosition} mis à jour avec les vainqueurs`);
    } else {
      // Créer le nouveau match
      const maxApiId = await prisma.match.findFirst({
        orderBy: { apiId: 'desc' },
        select: { apiId: true }
      });
      const newApiId = (maxApiId?.apiId || 0) + 1;

      // Date par défaut: 2 jours après le dernier match parent
      const latestDate = parent1.date > parent2.date ? parent1.date : parent2.date;
      const nextMatchDate = new Date(latestDate);
      nextMatchDate.setDate(nextMatchDate.getDate() + 2);
      const deadline = new Date(nextMatchDate);
      deadline.setHours(deadline.getHours() - 72);

      await prisma.match.create({
        data: {
          apiId: newApiId,
          date: nextMatchDate,
          status: 'SCHEDULED',
          homeTeamId: winner1,
          awayTeamId: winner2,
          bracketRound: nextRound,
          bracketPosition: nextPosition,
          parentMatch1Id: parent1.id,
          parentMatch2Id: parent2.id,
          pronosticDeadline: deadline,
          isPronosticOpen: true // Toujours ouvert, on vérifie les 72h dans la logique
        }
      });
      console.log(`✅ Match ${nextRound} position ${nextPosition} créé avec les vainqueurs`);
    }

    // Récursivement générer la phase suivante si nécessaire
    if (nextRound !== 'FINAL') {
      // Vérifier si tous les matchs de la phase actuelle sont terminés
      const allMatchesInRound = await prisma.match.findMany({
        where: {
          bracketRound: match.bracketRound
        }
      });

      const allFinished = allMatchesInRound.every(m => m.status === 'FINISHED');
      if (allFinished) {
        // Tous les matchs de cette phase sont terminés, vérifier si on peut générer la phase suivante
        const nextRoundMatches = await prisma.match.findMany({
          where: {
            bracketRound: nextRound
          }
        });

        // Si tous les matchs de la phase suivante sont terminés, générer la phase d'après
        if (nextRoundMatches.length > 0 && nextRoundMatches.every(m => m.status === 'FINISHED')) {
          for (const nextMatch of nextRoundMatches) {
            await generateNextRoundMatches(nextMatch);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la génération des matchs suivants:', error);
    throw error;
  }
};

/**
 * Déterminer le vainqueur d'un match
 */
const getWinner = async (match) => {
  if (match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
    return null;
  }

  if (match.homeScore > match.awayScore) {
    return match.homeTeamId;
  } else if (match.awayScore > match.homeScore) {
    return match.awayTeamId;
  } else {
    // Match nul, le vainqueur est déterminé par les tirs au but
    if (match.homePenalties !== null && match.awayPenalties !== null) {
      if (match.homePenalties > match.awayPenalties) {
        return match.homeTeamId;
      } else {
        return match.awayTeamId;
      }
    }
    return null;
  }
};

/**
 * Avancer le vainqueur d'un match vers le match suivant du bracket
 */
const advanceWinnerToNextRound = async (match) => {
  try {
    if (!match.bracketRound) {
      return; // Ce n'est pas un match de bracket
    }

    const winner = await getWinner(match);
    if (!winner) {
      console.log(`⚠️ Impossible de déterminer le vainqueur du match ${match.id}`);
      return;
    }

    // Déterminer la phase suivante et la position
    let nextRound, nextPosition, isHomePosition;
    
    if (match.bracketRound === 'ROUND_OF_16') {
      nextRound = 'QUARTER_FINAL';
      // Matchs 1-2 → Quart 1, Matchs 3-4 → Quart 2, etc.
      nextPosition = Math.ceil(match.bracketPosition / 2);
      // Position impaire (1, 3, 5, 7) → homeTeam, position paire (2, 4, 6, 8) → awayTeam
      isHomePosition = match.bracketPosition % 2 === 1;
    } else if (match.bracketRound === 'QUARTER_FINAL') {
      nextRound = 'SEMI_FINAL';
      nextPosition = Math.ceil(match.bracketPosition / 2);
      isHomePosition = match.bracketPosition % 2 === 1;
    } else if (match.bracketRound === 'SEMI_FINAL') {
      nextRound = 'FINAL';
      nextPosition = 1;
      isHomePosition = match.bracketPosition === 1;
    } else {
      // C'est la finale, pas de phase suivante
      return;
    }

    // Trouver ou créer le match suivant
    let nextMatch = await prisma.match.findFirst({
      where: {
        bracketRound: nextRound,
        bracketPosition: nextPosition
      }
    });

    if (!nextMatch) {
      // Créer le match suivant
      const maxApiId = await prisma.match.findFirst({
        orderBy: { apiId: 'desc' },
        select: { apiId: true }
      });
      const newApiId = (maxApiId?.apiId || 0) + 1;

      // Ne pas créer de date automatiquement - l'admin devra la définir dans le backoffice
      // La date sera null jusqu'à ce que l'admin la définisse

      // Déterminer les IDs des matchs parents
      let parentMatch1Id = null;
      let parentMatch2Id = null;
      
      if (match.bracketRound === 'ROUND_OF_16') {
        const parent1Position = (nextPosition - 1) * 2 + 1;
        const parent2Position = (nextPosition - 1) * 2 + 2;
        const parent1 = await prisma.match.findFirst({
          where: { bracketRound: 'ROUND_OF_16', bracketPosition: parent1Position }
        });
        const parent2 = await prisma.match.findFirst({
          where: { bracketRound: 'ROUND_OF_16', bracketPosition: parent2Position }
        });
        if (parent1) parentMatch1Id = parent1.id;
        if (parent2) parentMatch2Id = parent2.id;
      } else if (match.bracketRound === 'QUARTER_FINAL') {
        const parent1Position = (nextPosition - 1) * 2 + 1;
        const parent2Position = (nextPosition - 1) * 2 + 2;
        const parent1 = await prisma.match.findFirst({
          where: { bracketRound: 'QUARTER_FINAL', bracketPosition: parent1Position }
        });
        const parent2 = await prisma.match.findFirst({
          where: { bracketRound: 'QUARTER_FINAL', bracketPosition: parent2Position }
        });
        if (parent1) parentMatch1Id = parent1.id;
        if (parent2) parentMatch2Id = parent2.id;
      } else if (match.bracketRound === 'SEMI_FINAL') {
        const parent1 = await prisma.match.findFirst({
          where: { bracketRound: 'SEMI_FINAL', bracketPosition: 1 }
        });
        const parent2 = await prisma.match.findFirst({
          where: { bracketRound: 'SEMI_FINAL', bracketPosition: 2 }
        });
        if (parent1) parentMatch1Id = parent1.id;
        if (parent2) parentMatch2Id = parent2.id;
      }

      // Date par défaut pour pronosticDeadline (sera recalculée quand la date sera définie)
      const defaultDeadline = new Date('2099-12-31T00:00:00Z');

      const nextMatchData = {
        apiId: newApiId,
        date: null, // Pas de date - l'admin devra la définir dans le backoffice
        status: 'PENDING', // En attente de programmation (équipes ou date non définies)
        bracketRound: nextRound,
        bracketPosition: nextPosition,
        parentMatch1Id,
        parentMatch2Id,
        pronosticDeadline: defaultDeadline, // Sera recalculé quand la date sera définie
        isPronosticOpen: false // Fermé par défaut jusqu'à ce que la date soit définie
      };

      if (isHomePosition) {
        nextMatchData.homeTeamId = winner;
        nextMatchData.awayTeamId = null; // L'autre équipe sera ajoutée plus tard
      } else {
        nextMatchData.homeTeamId = null; // L'autre équipe sera ajoutée plus tard
        nextMatchData.awayTeamId = winner;
      }

      nextMatch = await prisma.match.create({
        data: nextMatchData,
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });
      console.log(`✅ Match ${nextRound} position ${nextPosition} créé avec le vainqueur en position ${isHomePosition ? 'haute' : 'basse'}`);
    } else {
      // Le match existe déjà, mettre à jour la position appropriée
      const updateData = {};
      if (isHomePosition) {
        updateData.homeTeamId = winner;
      } else {
        updateData.awayTeamId = winner;
      }

      // Vérifier si les deux équipes sont maintenant présentes et si la date est définie
      const willHaveBothTeams = (isHomePosition ? winner : nextMatch.homeTeamId) && 
                                (isHomePosition ? nextMatch.awayTeamId : winner);
      const hasDate = nextMatch.date && nextMatch.date.getFullYear() !== 2099;
      
      // Si les deux équipes sont présentes et la date est définie, passer à SCHEDULED
      if (willHaveBothTeams && hasDate && nextMatch.status === 'PENDING') {
        updateData.status = 'SCHEDULED';
      } else if (!willHaveBothTeams || !hasDate) {
        // Si les conditions ne sont pas remplies, rester ou passer à PENDING
        updateData.status = 'PENDING';
      }

      await prisma.match.update({
        where: { id: nextMatch.id },
        data: updateData
      });
      console.log(`✅ Match ${nextRound} position ${nextPosition} mis à jour avec le vainqueur en position ${isHomePosition ? 'haute' : 'basse'}`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'avancement du vainqueur:', error);
    throw error;
  }
};

module.exports = {
  createMatch,
  updateMatch,
  deleteMatch,
  getAllMatches,
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  createBracketMatch,
  getBracketMatches,
  updateBracketMatch
};

