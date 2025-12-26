const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Application de la migration pour les tirs au but...');
    
    // Ajouter les colonnes à la table Match
    await client.query(`
      ALTER TABLE "Match" 
      ADD COLUMN IF NOT EXISTS "homePenalties" INTEGER,
      ADD COLUMN IF NOT EXISTS "awayPenalties" INTEGER;
    `);
    console.log('✅ Colonnes ajoutées à la table Match');
    
    // Ajouter les colonnes à la table Prediction
    await client.query(`
      ALTER TABLE "Prediction" 
      ADD COLUMN IF NOT EXISTS "predictedHomePenalties" INTEGER,
      ADD COLUMN IF NOT EXISTS "predictedAwayPenalties" INTEGER;
    `);
    console.log('✅ Colonnes ajoutées à la table Prediction');
    
    console.log('✅ Migration appliquée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();



