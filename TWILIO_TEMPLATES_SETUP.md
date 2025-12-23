# Configuration des Templates WhatsApp Twilio

Pour envoyer des messages WhatsApp business-initiated, vous devez créer des Content Templates dans Twilio.

## Étape 1 : Créer un Content Template pour le code de vérification

1. Allez sur [Twilio Console](https://console.twilio.com/)
2. Naviguez vers **Messaging** > **Content Template Builder**
3. Cliquez sur **Create new template**
4. Configurez le template :

   **Template Name:** `verification_code_pronocan`
   
   **Category:** `AUTHENTICATION` ou `UTILITY`
   
   **Language:** `French (fr)` ou `English (en)`
   
   **Content:**
   ```
   Bonjour {{1}}, votre code de vérification Pronocan est {{2}}. Ce code expire dans 10 minutes. Utilisez-le pour activer votre compte.
   ```
   
   **Variables:**
   - `{{1}}` = Prénom (firstName)
   - `{{2}}` = Code de vérification (verificationCode)

5. Soumettez le template pour approbation
6. Une fois approuvé, copiez le **Content SID** (commence par `HX...`)

## Étape 2 : Créer un Content Template pour l'activation

1. Créez un nouveau template dans Content Template Builder
2. Configurez :

   **Template Name:** `account_activated_pronocan`
   
   **Category:** `UTILITY`
   
   **Language:** `French (fr)` ou `English (en)`
   
   **Content:**
   ```
   Bonjour {{1}}, votre compte Pronocan a été activé avec succès ! Vous pouvez maintenant vous connecter et commencer à faire vos pronostics sur la CAN 2024.
   ```
   
   **Variables:**
   - `{{1}}` = Prénom (firstName)

3. Soumettez pour approbation
4. Copiez le **Content SID**

## Étape 3 : Configurer dans votre `.env`

Ajoutez les Content SIDs dans votre fichier `.env` :

```env
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
TWILIO_VERIFICATION_CONTENT_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_ACTIVATED_CONTENT_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Remplacez les `HX...` par vos vrais Content SIDs.

## Étape 4 : Tester

Une fois les templates approuvés et configurés, testez l'inscription d'un utilisateur. Le code de vérification sera envoyé via le template.

## Notes importantes

- ⚠️ Les templates doivent être **approuvés par Twilio** avant de pouvoir être utilisés
- ⚠️ Le temps d'approbation peut prendre quelques heures à quelques jours
- ⚠️ En attendant l'approbation, les messages peuvent échouer
- ⚠️ Les variables du template doivent correspondre exactement à celles utilisées dans le code

## Alternative : Utiliser le sandbox Twilio (pour tests)

Pour tester rapidement sans créer de templates :

1. Utilisez le numéro sandbox : `whatsapp:+14155238886`
2. Ajoutez votre numéro au sandbox en envoyant le code fourni par Twilio
3. Les messages simples fonctionneront dans le sandbox

## Structure des variables dans le code

Le code utilise actuellement :
- `{{1}}` = firstName
- `{{2}}` = verificationCode

Si votre template utilise d'autres variables, ajustez le code dans `sendVerificationCodeWhatsApp`.


