# Documentation d'Authentification

## Vue d'ensemble

L'authentification est complètement implémentée avec JWT (JSON Web Tokens). Toutes les routes protégées utilisent le middleware `requireAuth` pour garantir la sécurité.

## Endpoints d'authentification

### POST `/api/auth/register`
Inscription d'un nouvel utilisateur.

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890"
}
```

**Réponse (201):**
```json
{
  "message": "Inscription réussie",
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "USER",
    "totalPoints": 0
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### POST `/api/auth/login`
Connexion d'un utilisateur.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Réponse (200):**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "USER",
    "totalPoints": 0
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### POST `/api/auth/refresh`
Rafraîchir le token d'accès.

**Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Réponse (200):**
```json
{
  "token": "new_jwt_access_token"
}
```

### GET `/api/auth/me` 🔒
Récupérer les informations de l'utilisateur connecté.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Réponse (200):**
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "USER",
  "totalPoints": 0,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### PUT `/api/auth/change-password` 🔒
Changer le mot de passe.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password123",
  "confirmPassword": "new_password123"
}
```

**Réponse (200):**
```json
{
  "message": "Mot de passe modifié avec succès"
}
```

## Middleware d'authentification

### `requireAuth`
Protège les routes qui nécessitent une authentification. Vérifie le token JWT et ajoute l'utilisateur à `req.user`.

**Utilisation:**
```javascript
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/protected-route', requireAuth, controller.handler);
```

### `optionalAuth`
Ajoute l'utilisateur à `req.user` si un token est présent, mais ne bloque pas la requête si absent.

### `requireAdmin`
Vérifie que l'utilisateur est administrateur. Doit être utilisé après `requireAuth`.

**Utilisation:**
```javascript
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.post('/admin-route', requireAuth, requireAdmin, controller.handler);
```

## Routes protégées

### Routes d'authentification
- ✅ `GET /api/auth/me` - Protégée avec `requireAuth`
- ✅ `PUT /api/auth/change-password` - Protégée avec `requireAuth`

### Routes de matchs
- ✅ `POST /api/matches/sync` - Protégée avec `requireAuth`
- ✅ `GET /api/matches` - Publique
- ✅ `GET /api/matches/finished` - Publique
- ✅ `GET /api/matches/:id` - Publique

### Routes de pronostics
- ✅ **Toutes les routes** - Protégées avec `requireAuth` via `router.use(requireAuth)`
  - `POST /api/predictions`
  - `GET /api/predictions/my-predictions`
  - `GET /api/predictions/match/:matchId`
  - `GET /api/predictions/match/:matchId/my-prediction`
  - `DELETE /api/predictions/match/:matchId`

### Routes de classement
- ✅ `GET /api/leaderboard` - Publique
- ✅ `GET /api/leaderboard/my-rank` - Protégée avec `requireAuth`

## Utilisation dans Flutter

### Exemple de connexion
```dart
final response = await ApiService().post('/api/auth/login', data: {
  'email': email,
  'password': password,
});

if (response.statusCode == 200) {
  final token = response.data['token'];
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('auth_token', token);
}
```

### Ajout du token aux requêtes
Le `ApiService` ajoute automatiquement le token dans les headers :
```dart
headers: {
  'Authorization': 'Bearer $token'
}
```

## Sécurité

1. **Tokens JWT** : Les tokens d'accès expirent après 1 heure
2. **Refresh Tokens** : Valides pendant 7 jours
3. **Hash des mots de passe** : Utilisation de bcrypt avec 10 rounds de salt
4. **Validation** : Vérification de l'utilisateur actif avant chaque authentification
5. **Codes d'erreur** : Codes d'erreur spécifiques pour faciliter le debugging

## Codes d'erreur

- `AUTH_TOKEN_MISSING` : Token d'authentification manquant
- `AUTH_TOKEN_INVALID` : Token invalide ou expiré
- `USER_NOT_FOUND` : Utilisateur non trouvé
- `USER_INACTIVE` : Compte utilisateur inactif
- `AUTH_REQUIRED` : Authentification requise
- `ADMIN_REQUIRED` : Droits administrateur requis

## Variables d'environnement requises

```env
ACCESS_TOKEN_SECRET=votre_secret_jwt
REFRESH_TOKEN_SECRET=votre_refresh_secret
```

## Notes importantes

- Les tokens sont stockés côté client (Flutter) dans `SharedPreferences`
- Le middleware `requireAuth` vérifie automatiquement la validité du token
- Les utilisateurs inactifs ne peuvent pas se connecter
- Les mots de passe sont hashés avec bcrypt avant stockage




