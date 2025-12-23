const tokenService = require('../services/tokenService');
const prisma = require('../config/prismaClient');

/**
 * Middleware d'authentification (requireAuth)
 * Vérifie le token JWT et ajoute l'utilisateur à req.user
 * Utilisez ce middleware pour protéger les routes qui nécessitent une authentification
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Token d\'authentification manquant',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Décoder et vérifier le token
    let decoded;
    try {
      decoded = tokenService.decodeAccessToken(token);
    } catch (error) {
      return res.status(401).json({ 
        message: 'Token invalide ou expiré',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Vérifier que le token contient userId
    if (!decoded.userId) {
      return res.status(401).json({ 
        message: 'Token invalide: userId manquant',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        totalPoints: true,
      }
    });

    if (!user) {
      return res.status(401).json({ 
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Votre compte n\'est pas actif',
        code: 'USER_INACTIVE'
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur dans requireAuth:', error);
    return res.status(500).json({ 
      message: 'Erreur d\'authentification',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware d'authentification optionnelle
 * Ajoute l'utilisateur à req.user si un token est présent, mais ne bloque pas la requête
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = tokenService.decodeAccessToken(token);
        
        if (decoded.userId) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              totalPoints: true,
            }
          });

          if (user && user.isActive) {
            req.user = user;
          }
        }
      } catch (error) {
        // Ignorer les erreurs de token pour l'auth optionnelle
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans utilisateur
    next();
  }
};

/**
 * Middleware pour vérifier le rôle admin
 * Doit être utilisé après requireAuth
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentification requise',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      message: 'Accès refusé: droits administrateur requis',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Alias pour compatibilité
const authenticate = requireAuth;

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  authenticate, // Alias pour compatibilité avec le code existant
};

