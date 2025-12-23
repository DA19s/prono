const fs = require('fs');
const path = require('path');

// Dimensions cibles : 159×192px (ratio 0.828:1)
const TARGET_WIDTH = 159;
const TARGET_HEIGHT = 192;

const flagsDir = path.join(__dirname, '../public/uploads/flags');

console.log('📐 Redimensionnement des drapeaux...\n');
console.log('⚠️  Ce script nécessite une bibliothèque de traitement d\'image.');
console.log('   Options:');
console.log('   1. Installer sharp: npm install sharp');
console.log('   2. Utiliser un outil en ligne: https://photopea.com');
console.log('   3. Utiliser ImageMagick: magick convert input.png -resize 159x192 output.png\n');

// Vérifier si sharp est disponible
let sharp;
try {
  sharp = require('sharp');
  console.log('✅ Sharp détecté, redimensionnement automatique...\n');
} catch (error) {
  console.log('❌ Sharp non installé. Installez-le avec: npm install sharp\n');
  console.log('📋 Instructions manuelles:');
  console.log('   1. Ouvrez https://photopea.com');
  console.log('   2. Ouvrez chaque drapeau téléchargé');
  console.log('   3. Image > Canvas Size > 159px × 192px');
  console.log('   4. Exportez en PNG');
  process.exit(1);
}

// Fonction pour redimensionner une image
async function resizeFlag(inputPath, outputPath) {
  try {
    // Lire l'image, la redimensionner en mémoire, puis écrire
    // Utiliser 'cover' pour remplir complètement l'espace 159×192px
    // Cela va couper l'image si nécessaire pour remplir exactement l'espace
    const buffer = await sharp(inputPath)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover', // Remplir complètement l'espace (coupe si nécessaire)
        position: 'center' // Centrer l'image lors du recadrage
      })
      .png()
      .toBuffer();
    
    // Écrire le buffer dans le fichier de sortie
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✅ Redimensionné: ${path.basename(inputPath)} → ${TARGET_WIDTH}×${TARGET_HEIGHT}px`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur pour ${path.basename(inputPath)}:`, error.message);
    return false;
  }
}

// Redimensionner tous les drapeaux
async function resizeAllFlags() {
  if (!fs.existsSync(flagsDir)) {
    console.error(`❌ Dossier non trouvé: ${flagsDir}`);
    console.log('   Exécutez d\'abord: node scripts/download-flags.js');
    return;
  }

  const files = fs.readdirSync(flagsDir).filter(file => file.endsWith('.png'));
  
  if (files.length === 0) {
    console.error('❌ Aucun drapeau trouvé dans le dossier flags/');
    console.log('   Exécutez d\'abord: node scripts/download-flags.js');
    return;
  }

  console.log(`📁 ${files.length} drapeau(x) trouvé(s)\n`);

  for (const file of files) {
    // Ignorer les fichiers déjà redimensionnés
    if (file.startsWith('resized_')) continue;
    
    const inputPath = path.join(flagsDir, file);
    const tempPath = path.join(flagsDir, `temp_${file}`);
    const outputPath = path.join(flagsDir, file);
    
    // Redimensionner vers un fichier temporaire
    const success = await resizeFlag(inputPath, tempPath);
    
    if (success) {
      // Remplacer l'original par le fichier redimensionné
      fs.unlinkSync(inputPath);
      fs.renameSync(tempPath, outputPath);
    } else if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  console.log('\n✅ Redimensionnement terminé!');
  console.log(`📁 Drapeaux redimensionnés dans: ${flagsDir}`);
}

resizeAllFlags().catch(console.error);

