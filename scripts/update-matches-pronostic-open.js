const prisma = require('../src/config/prismaClient');

async function updateMatches() {
  try {
    console.log('🔄 Mise à jour des matchs pour ouvrir les pronostics...\n');

    // Mettre à jour tous les matchs à venir pour avoir isPronosticOpen = true
    const result = await prisma.match.updateMany({
      where: {
        status: {
          in: ['SCHEDULED', 'LIVE']
        }
      },
      data: {
        isPronosticOpen: true
      }
    });

    console.log(`✅ ${result.count} match(s) mis à jour avec isPronosticOpen = true\n`);

    // Afficher les matchs mis à jour
    const matches = await prisma.match.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'LIVE']
        }
      },
      select: {
        id: true,
        date: true,
        status: true,
        isPronosticOpen: true,
        pronosticDeadline: true,
        homeTeam: {
          select: { name: true }
        },
        awayTeam: {
          select: { name: true }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log('📋 Matchs mis à jour:');
    matches.forEach(match => {
      console.log(`   - ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      console.log(`     Date: ${new Date(match.date).toLocaleString('fr-FR')}`);
      console.log(`     isPronosticOpen: ${match.isPronosticOpen}`);
      console.log(`     Deadline: ${match.pronosticDeadline ? new Date(match.pronosticDeadline).toLocaleString('fr-FR') : 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateMatches();

