# Pronocan - Application Flutter

Application mobile Flutter pour les pronostics de la Coupe d'Afrique des Nations (CAN).

## Fonctionnalités

- ✅ Authentification utilisateur
- ✅ Liste des matchs à venir et terminés
- ✅ Création et modification de pronostics
- ✅ Classement des pronostiqueurs
- ✅ Profil utilisateur avec statistiques
- ✅ Interface moderne et intuitive

## Installation

1. Assurez-vous d'avoir Flutter installé (version 3.0.0 ou supérieure)

2. Installer les dépendances :
```bash
cd flutter_app
flutter pub get
```

3. Configurer l'URL de l'API dans `lib/main.dart` :
```dart
ApiService().init(
  baseUrl: 'http://VOTRE_IP:3000', // Remplacez par l'URL de votre backend
);
```

4. Pour Android, ajoutez dans `android/app/src/main/AndroidManifest.xml` :
```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

5. Pour iOS, ajoutez dans `ios/Runner/Info.plist` :
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## Lancement

```bash
flutter run
```

## Structure du projet

```
lib/
├── models/          # Modèles de données
├── services/        # Services API
├── screens/         # Écrans de l'application
├── widgets/         # Widgets réutilisables
├── theme/           # Thème de l'application
└── main.dart        # Point d'entrée
```

## Configuration

### URL de l'API

Modifiez l'URL dans `lib/main.dart` pour pointer vers votre backend Node.js.

Pour tester sur un appareil physique :
- Android : Utilisez `http://10.0.2.2:3000` pour l'émulateur
- iOS : Utilisez l'IP locale de votre machine (ex: `http://192.168.1.100:3000`)

## Notes

- L'application nécessite une connexion Internet pour fonctionner
- Assurez-vous que le backend est démarré et accessible
- Les pronostics se ferment automatiquement 72h avant chaque match


