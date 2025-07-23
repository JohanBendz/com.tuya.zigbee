# 🔄 AUTOMATISATION README - Tuya Zigbee Project

## 🎯 Objectif

Automatiser la mise à jour du README à chaque commit avec les métriques actualisées.

## 🛠️ Configuration

### Scripts
- **update-readme.ps1** : Script principal de mise à jour
- **setup-auto-readme.ps1** : Script de configuration

### Hook Git
- **pre-commit** : Hook automatique avant chaque commit

## 📊 Fonctionnalités

### Analyse Automatique
- **Devices supportés** : Comptage des drivers
- **Langues supportées** : Analyse des fichiers de langue
- **Métriques de performance** : Taille et nombre de fichiers

### Mise à Jour Intelligente
- **Badges** : Mise à jour automatique
- **Métriques** : Actualisation des statistiques
- **Rapports** : Génération de rapports détaillés

## 🔄 Utilisation

### Configuration Initiale
`powershell
.\scripts\setup-auto-readme.ps1
`

### Mise à Jour Manuelle
`powershell
.\scripts\update-readme.ps1
`

### Test en Mode DryRun
`powershell
.\scripts\update-readme.ps1 -DryRun
`

## 📈 Métriques Surveillées

- **Drivers supportés** : Nombre de fichiers .js dans drivers/
- **Langues supportées** : Nombre de fichiers dans locales/
- **Taille du repo** : Taille totale en MB
- **Nombre de fichiers** : Comptage total

## 🚀 Mode YOLO Intelligent

- **Automatisation complète** : Mise à jour à chaque commit
- **Métriques en temps réel** : Données toujours à jour
- **Rapports détaillés** : Documentation automatique
- **Mode DryRun** : Test sans modification

---

*Configuration automatique - Mode YOLO Intelligent*
