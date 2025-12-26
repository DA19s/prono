const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function makeTeamsOptional() {
  const client = await pool.connect();
  try {
    console.log('🔄 Modification des colonnes homeTeamId et awayTeamId pour les rendre optionnelles...');
    
    // Modifier les colonnes pour permettre NULL
    await client.query(`
      ALTER TABLE "Match" 
      ALTER COLUMN "homeTeamId" DROP NOT NULL,
      ALTER COLUMN "awayTeamId" DROP NOT NULL;
    `);
    
    console.log('✅ Colonnes modifiées avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la modification:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

makeTeamsOptional();



