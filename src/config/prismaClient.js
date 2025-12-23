const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

// Créer le pool PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Créer l'adapter Prisma
const adapter = new PrismaPg(pool);

// Créer le client Prisma avec l'adapter
const prisma = new PrismaClient({
  adapter,
});

// Gestion de la fermeture propre
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});

module.exports = prisma;

