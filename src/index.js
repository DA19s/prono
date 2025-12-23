require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const prisma = require('./config/prismaClient');
// Jobs cron désactivés - gestion manuelle via backoffice
// const cron = require('node-cron');
// const matchService = require('./services/matchService');

// Initialisation de l'application Express
const app = express();

// Configuration CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    // Flutter Web - ports dynamiques
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (uploads)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Connexion à la base de données PostgreSQL via Prisma
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Pronocan - Backend pour pronostics de football',
    version: '1.0.0',
    database: 'PostgreSQL connecté via Prisma'
  });
});

// Route de santé
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK',
      database: 'PostgreSQL connecté'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      error: error.message 
    });
  }
});

// Import des routes
const authRoutes = require('./routes/authRoutes');
const matchRoutes = require('./routes/matchRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Utilisation des routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur non gérée:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Erreur Prisma
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      message: 'Erreur de base de données',
      error: 'DATABASE_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { 
        details: err.meta?.cause || err.message,
        code: err.code
      })
    });
  }

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Données invalides',
      error: 'VALIDATION_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { details: err.message })
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: err.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide',
      error: 'AUTH_ERROR',
      code: err.name
    });
  }

  // Erreur par défaut
  res.status(err.status || 500).json({
    message: err.message || 'Erreur serveur',
    error: 'SERVER_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err.message
    })
  });
});

// Jobs Cron désactivés - gestion manuelle via backoffice admin
// La gestion des matchs se fait maintenant via le backoffice Next.js

// Configuration du port
const PORT = process.env.PORT || 3000;

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
});

