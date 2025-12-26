const prisma = require('./prismaClient');

const connectDB = async () => {
  try {
    // Test de la connexion à la base de données
    await prisma.$connect();
    console.log('✅ PostgreSQL connecté via Prisma');
    
    // Vérification de la connexion avec une requête simple
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connexion à la base de données vérifiée');
    
    return prisma;
  } catch (error) {
    console.error('❌ Erreur lors de la connexion à PostgreSQL:', error.message);
    process.exit(1);
  }
};

// Gestion propre de la fermeture
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('PostgreSQL déconnecté suite à l\'arrêt de l\'application');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('PostgreSQL déconnecté suite à l\'arrêt de l\'application');
  process.exit(0);
});

module.exports = connectDB;




