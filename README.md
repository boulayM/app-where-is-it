# WHERE IS IT ?

Application mobile Android (Expo / React Native) pour enregistrer des emplacements importants et les retrouver rapidement.

## Aperçu

`WHERE IS IT ?` permet d'enregistrer plusieurs emplacements personnalisés (voiture, spot, point de repère, etc.) avec:

- un nom (obligatoire)
- une description (optionnelle)
- une photo (optionnelle)
- un guidage pour y retourner

## Fonctionnalités

- Création de plusieurs emplacements
- Édition d'un emplacement: nom, description, photo
- Suppression d'un emplacement
- Photo par emplacement via la caméra du téléphone
- Écran "Emplacement actif" avec infos détaillées
- Carte affichable à la demande (`Afficher la carte` par défaut sur `false`)
- Guidage vers l'emplacement
- Partage d'un emplacement
- Écran d'introduction animé
- Menu burger avec pages "À propos" et "Mentions légales"

## Stack technique

- Expo SDK 54
- React Native 0.81
- Expo Router
- Expo Camera
- Expo Location
- React Native Maps
- AsyncStorage (stockage local)

## Structure du projet

- `app/` routes Expo Router
- `src/components/` composants UI et écrans
- `src/hooks/` logique métier (spots, caméra, guidage)
- `src/types/` types TypeScript
- `assets/` icônes, images, logo

## Démarrage rapide

### Prérequis

- Node.js 20+
- npm
- Expo Go (Android)

### Installation

```bash
npm install
```

### Lancer en développement

```bash
npx expo start --tunnel
```

Ensuite, scanner le QR code avec Expo Go.

## Scripts utiles

```bash
npm run start
npm run android
npm run lint
npm run typecheck
npm run format:check
```

## Build Android (EAS)

### Build APK preview

```bash
npx --yes eas-cli build -p android --profile preview
```

Version non bloquante du terminal:

```bash
npx --yes eas-cli build -p android --profile preview --non-interactive --no-wait
```

## Installation APK

- Dernière release APK:
  `https://github.com/boulayM/app-where-is-it/releases/latest/download/where-is-it-v1.0.0.apk`
- Dépôt GitHub:
  `https://github.com/boulayM/app-where-is-it.git`

## Vérification d'intégrité

SHA-256 (APK v1.0.0):

`A6661F107E894FCF993F802013AF60560DDFBA9D8047ABEFD1088039D1072579`

## Permissions utilisées

- Localisation: enregistrement et guidage
- Caméra: prise de photo de l'emplacement

## Distribution

L'application est distribuée hors Play Store via APK (GitHub Releases).

## Roadmap

- Amélioration du guidage "flèche + distance" sans carte
- Meilleure expérience de partage multi-canal
- Historique des emplacements récents

## Auteur

Marc Boulay  
Développeur Web  
Site: https://mabdev.onrender.com
