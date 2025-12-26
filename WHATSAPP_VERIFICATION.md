# Documentation - Vérification WhatsApp avec Twilio

## Vue d'ensemble

Le système d'inscription utilise maintenant WhatsApp via Twilio pour envoyer un code de vérification à 6 chiffres. L'utilisateur doit vérifier ce code pour activer son compte.

## Flux d'inscription

1. **Inscription** (`POST /api/auth/register`)
   - L'utilisateur fournit ses informations (nom, prénom, email, téléphone, mot de passe)
   - Un code de vérification à 6 chiffres est généré
   - Le code est envoyé par WhatsApp via Twilio
   - Le compte est créé mais reste **inactif** (`isActive: false`)

2. **Vérification** (`POST /api/auth/verify-code`)
   - L'utilisateur entre son email et le code reçu
   - Le code est vérifié (expiration 10 minutes)
   - Le compte est activé (`isActive: true`)
   - Les tokens JWT sont générés et retournés
   - Une notification WhatsApp de confirmation est envoyée

3. **Renvoyer le code** (`POST /api/auth/resend-code`)
   - Permet de demander un nouveau code si le précédent a expiré

## Endpoints

### POST `/api/auth/register`
Inscription d'un nouvel utilisateur.

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+221771234567"
}
```

**Réponse (201):**
```json
{
  "message": "Inscription réussie. Un code de vérification a été envoyé sur WhatsApp.",
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "isActive": false
  },
  "requiresVerification": true
}
```

### POST `/api/auth/verify-code`
Vérifier le code WhatsApp et activer le compte.

**Body:**
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

**Réponse (200):**
```json
{
  "message": "Compte activé avec succès",
  "user": {
    "id": "uuid",
    "firstName": "John",
    "isActive": true
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### POST `/api/auth/resend-code`
Renvoyer un nouveau code de vérification.

**Body:**
```json
{
  "email": "john@example.com"
}
```

**Réponse (200):**
```json
{
  "message": "Un nouveau code de vérification a été envoyé sur WhatsApp"
}
```

## Configuration Twilio

### Variables d'environnement requises

Ajoutez dans votre fichier `.env` :

```env
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Format des numéros de téléphone

Le service normalise automatiquement les numéros :
- `+221771234567` → `whatsapp:+221771234567`
- `0771234567` → `whatsapp:+221771234567`
- `221771234567` → `whatsapp:+221771234567`
- `771234567` → `whatsapp:+221771234567`

## Sécurité

- ✅ Code à 6 chiffres généré aléatoirement
- ✅ Expiration après 10 minutes
- ✅ Compte inactif jusqu'à vérification
- ✅ Vérification du numéro de téléphone unique
- ✅ Hash des mots de passe avec bcrypt

## Messages WhatsApp

### Code de vérification
```
🔐 *Code de vérification Pronocan*

Bonjour [Prénom],

Bienvenue sur Pronocan ! Votre code de vérification est : *[CODE]*

Ce code expire dans 10 minutes.

Utilisez ce code pour activer votre compte et commencer à faire vos pronostics sur la CAN 2024.

💬 Besoin d'aide ? Répondez à ce message.
_Pronocan - Pronostics CAN 2024_
```

### Compte activé
```
✅ *Compte activé - Pronocan*

Bonjour [Prénom],

Votre compte Pronocan a été activé avec succès ! 🎉

Vous pouvez maintenant vous connecter et commencer à faire vos pronostics sur la Coupe d'Afrique des Nations 2024.

Bonne chance avec vos pronostics ! ⚽

_Pronocan - Pronostics CAN 2024_
```

## Gestion des erreurs

### Code expiré
```json
{
  "message": "Code de vérification expiré. Veuillez demander un nouveau code."
}
```

### Code incorrect
```json
{
  "message": "Code de vérification incorrect"
}
```

### Compte déjà actif
```json
{
  "message": "Ce compte est déjà activé"
}
```

## Application Flutter

### Écrans créés

1. **RegisterScreen** (`register_screen.dart`)
   - Formulaire d'inscription complet
   - Validation des champs
   - Redirection vers la vérification

2. **VerifyCodeScreen** (`verify_code_screen.dart`)
   - Saisie du code à 6 chiffres
   - Bouton pour renvoyer le code
   - Activation du compte après vérification

### Flux dans Flutter

1. L'utilisateur s'inscrit → Redirection vers `VerifyCodeScreen`
2. L'utilisateur entre le code → Compte activé → Redirection vers `HomeScreen`
3. Si le code expire → Bouton "Renvoyer le code"

## Notes importantes

- Le compte reste **inactif** jusqu'à la vérification du code
- Le code expire après **10 minutes**
- Un nouveau code peut être demandé via `/api/auth/resend-code`
- Le numéro de téléphone doit être unique dans la base de données
- En cas d'échec d'envoi WhatsApp, le code est quand même stocké en base (pour tests)

## Tests

### Test d'inscription
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "password123",
  "phone": "+221771234567"
}
```

### Test de vérification
```bash
POST http://localhost:3000/api/auth/verify-code
Content-Type: application/json

{
  "email": "test@example.com",
  "code": "123456"
}
```

## Dépannage

### WhatsApp ne fonctionne pas
- Vérifiez vos credentials Twilio dans `.env`
- Vérifiez que le numéro est dans le format correct
- En mode développement, vérifiez les logs pour voir le code généré

### Code non reçu
- Vérifiez que le numéro est correct
- Utilisez `/api/auth/resend-code` pour obtenir un nouveau code
- Vérifiez les logs du serveur pour les erreurs Twilio




