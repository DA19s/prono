const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Liste de tous les pays d'Afrique avec leurs codes ISO
const africanCountries = [
  { name: 'Algeria', code: 'dz', iso: 'DZ' },
  { name: 'Angola', code: 'ao', iso: 'AO' },
  { name: 'Benin', code: 'bj', iso: 'BJ' },
  { name: 'Botswana', code: 'bw', iso: 'BW' },
  { name: 'Burkina Faso', code: 'bf', iso: 'BF' },
  { name: 'Burundi', code: 'bi', iso: 'BI' },
  { name: 'Cape Verde', code: 'cv', iso: 'CV' },
  { name: 'Cameroon', code: 'cm', iso: 'CM' },
  { name: 'Central African Republic', code: 'cf', iso: 'CF' },
  { name: 'Chad', code: 'td', iso: 'TD' },
  { name: 'Comoros', code: 'km', iso: 'KM' },
  { name: 'Congo', code: 'cg', iso: 'CG' },
  { name: 'DR Congo', code: 'cd', iso: 'CD' },
  { name: 'Cote d\'Ivoire', code: 'ci', iso: 'CI' },
  { name: 'Djibouti', code: 'dj', iso: 'DJ' },
  { name: 'Egypt', code: 'eg', iso: 'EG' },
  { name: 'Equatorial Guinea', code: 'gq', iso: 'GQ' },
  { name: 'Eritrea', code: 'er', iso: 'ER' },
  { name: 'Eswatini', code: 'sz', iso: 'SZ' },
  { name: 'Ethiopia', code: 'et', iso: 'ET' },
  { name: 'Gabon', code: 'ga', iso: 'GA' },
  { name: 'Gambia', code: 'gm', iso: 'GM' },
  { name: 'Ghana', code: 'gh', iso: 'GH' },
  { name: 'Guinea', code: 'gn', iso: 'GN' },
  { name: 'Guinea-Bissau', code: 'gw', iso: 'GW' },
  { name: 'Kenya', code: 'ke', iso: 'KE' },
  { name: 'Lesotho', code: 'ls', iso: 'LS' },
  { name: 'Liberia', code: 'lr', iso: 'LR' },
  { name: 'Libya', code: 'ly', iso: 'LY' },
  { name: 'Madagascar', code: 'mg', iso: 'MG' },
  { name: 'Malawi', code: 'mw', iso: 'MW' },
  { name: 'Mali', code: 'ml', iso: 'ML' },
  { name: 'Mauritania', code: 'mr', iso: 'MR' },
  { name: 'Mauritius', code: 'mu', iso: 'MU' },
  { name: 'Morocco', code: 'ma', iso: 'MA' },
  { name: 'Mozambique', code: 'mz', iso: 'MZ' },
  { name: 'Namibia', code: 'na', iso: 'NA' },
  { name: 'Niger', code: 'ne', iso: 'NE' },
  { name: 'Nigeria', code: 'ng', iso: 'NG' },
  { name: 'Rwanda', code: 'rw', iso: 'RW' },
  { name: 'Sao Tome and Principe', code: 'st', iso: 'ST' },
  { name: 'Senegal', code: 'sn', iso: 'SN' },
  { name: 'Seychelles', code: 'sc', iso: 'SC' },
  { name: 'Sierra Leone', code: 'sl', iso: 'SL' },
  { name: 'Somalia', code: 'so', iso: 'SO' },
  { name: 'South Africa', code: 'za', iso: 'ZA' },
  { name: 'South Sudan', code: 'ss', iso: 'SS' },
  { name: 'Sudan', code: 'sd', iso: 'SD' },
  { name: 'Tanzania', code: 'tz', iso: 'TZ' },
  { name: 'Togo', code: 'tg', iso: 'TG' },
  { name: 'Tunisia', code: 'tn', iso: 'TN' },
  { name: 'Uganda', code: 'ug', iso: 'UG' },
  { name: 'Zambia', code: 'zm', iso: 'ZM' },
  { name: 'Zimbabwe', code: 'zw', iso: 'ZW' },
];

// Créer le dossier de destination s'il n'existe pas
const outputDir = path.join(__dirname, '../public/uploads/flags');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Fonction pour télécharger une image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ Téléchargé: ${path.basename(filepath)}`);
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Suivre les redirections
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      } else {
        console.error(`❌ Erreur ${response.statusCode} pour ${url}`);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      console.error(`❌ Erreur réseau pour ${url}:`, err.message);
      reject(err);
    });
  });
}

// Télécharger tous les drapeaux
async function downloadAllFlags() {
  console.log('🚀 Début du téléchargement des drapeaux...\n');
  
  for (const country of africanCountries) {
    // Essayer plusieurs sources
    const sources = [
      // Flagpedia (recommandé)
      `https://flagpedia.net/data/flags/w160/${country.code}.png`,
      // Alternative: RestCountries
      `https://flagcdn.com/w320/${country.code}.png`,
      // Alternative: Country flags API
      `https://countryflagsapi.com/png/${country.code}`,
    ];
    
    const filepath = path.join(outputDir, `${country.code}.png`);
    
    let downloaded = false;
    for (const url of sources) {
      try {
        await downloadImage(url, filepath);
        downloaded = true;
        break;
      } catch (error) {
        // Essayer la source suivante
        continue;
      }
    }
    
    if (!downloaded) {
      console.warn(`⚠️  Impossible de télécharger le drapeau pour ${country.name} (${country.code})`);
    }
    
    // Petite pause pour ne pas surcharger les serveurs
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ Téléchargement terminé!');
  console.log(`📁 Drapeaux sauvegardés dans: ${outputDir}`);
  console.log('\n⚠️  Note: Les drapeaux doivent être redimensionnés à 159×192px (ratio 0.828:1)');
  console.log('   Utilisez un outil comme Photopea.com ou un script de redimensionnement.');
}

// Lancer le téléchargement
downloadAllFlags().catch(console.error);

