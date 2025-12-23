# Pronocan - Backoffice Admin

Interface d'administration Next.js pour gérer manuellement les matchs, équipes et administrateurs.

## Installation

```bash
cd backoffice
npm install
```

## Configuration

Créez un fichier `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Démarrage

```bash
npm run dev
```

Le backoffice sera accessible sur http://localhost:3001

## Fonctionnalités

### Authentification
- Connexion admin avec email et mot de passe
- Vérification automatique du rôle ADMIN
- Gestion des tokens JWT

### Gestion des Matchs
- ✅ Créer un nouveau match (équipes, date, phase, stade)
- ✅ Modifier un match existant
- ✅ Terminer un match (scores finaux et mi-temps)
- ✅ Voir tous les matchs avec leurs statuts

### Gestion des Équipes
- ✅ Créer une nouvelle équipe
- ✅ Voir toutes les équipes

### Gestion des Administrateurs
- ✅ Créer un nouvel administrateur (avec mot de passe)
- ✅ Voir tous les administrateurs

## Structure

```
backoffice/
├── app/
│   ├── login/          # Page de connexion
│   ├── dashboard/      # Dashboard principal
│   │   ├── matches/    # Gestion des matchs
│   │   ├── teams/      # Gestion des équipes
│   │   └── admins/     # Gestion des administrateurs
│   └── layout.tsx      # Layout principal
├── lib/
│   └── api.ts          # Configuration API
└── package.json
```

## API Endpoints utilisés

- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Informations utilisateur
- `GET /api/admin/matches` - Liste des matchs
- `POST /api/admin/matches` - Créer un match
- `PUT /api/admin/matches/:id` - Modifier un match
- `GET /api/admin/teams` - Liste des équipes
- `POST /api/admin/teams` - Créer une équipe
- `GET /api/admin/admins` - Liste des admins
- `POST /api/admin/admins` - Créer un admin
