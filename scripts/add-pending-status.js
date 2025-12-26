const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addPendingStatus() {
  const client = await pool.connect();
  try {
    console.log('🔄 Ajout du statut PENDING à l\'enum MatchStatus...');
    
    // Ajouter PENDING à l'enum
    await client.query(`
      ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'PENDING';
    `);
    
    console.log('✅ Statut PENDING ajouté avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du statut:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addPendingStatus();



