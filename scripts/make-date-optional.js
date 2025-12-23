const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function makeDateOptional() {
  const client = await pool.connect();
  try {
    console.log('🔄 Modification de la colonne date pour la rendre optionnelle...');
    
    // Modifier la colonne pour permettre NULL
    await client.query(`
      ALTER TABLE "Match" 
      ALTER COLUMN "date" DROP NOT NULL;
    `);
    
    console.log('✅ Colonne date modifiée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la modification:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

makeDateOptional();

