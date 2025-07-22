# 🧠 com.tuya.zigbee — Intégration Homey + Tuya Zigbee + IA

[![CI](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci.yml)
[![Integrity](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/integrity-monitor.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/integrity-monitor.yml)
[![Backup](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/monthly-backup.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/monthly-backup.yml)
[🌐 Dashboard](https://dlnraja.github.io/com.tuya.zigbee/)

## Objectif
- Générer et maintenir automatiquement les drivers Tuya Zigbee pour Homey
- Automatiser la CI, la restauration, les tests, la sauvegarde et le bench IA
- Dashboard et scripts IA inclus

## Structure
- `drivers/` : tous les drivers Tuya
- `dashboard/` : HTML/JS statique
- `tools/` : scripts IA, réparation, parsing
- `.github/workflows/` : CI/CD, backup, intégrité
- `test/` : scripts de tests
- `deploy.ps1` : déploiement auto
- `repair_project.ps1` : restauration des fichiers critiques
- `mega_restore.ps1` : restauration avancée depuis une sauvegarde
- `merge_manufacturers.py` : fusionne les identifiants fabricants depuis Z2M et Home Assistant
- `data/manufacturer_ids.json` : identifiants fabricants fusionnés

## Commandes utiles
```powershell
# Déploiement
./deploy.ps1

# Restauration
./tools/repair_project.ps1

# Restauration complète
./tools/mega_restore.ps1

# Tests

npm test
```

## IA/Automatisation

* Bench IA mensuel (Claude, GPT, DALL·E…)
* Parsing Z2M → Homey automatisé
* Backup Google Drive automatique
* Traitement quotidien de 5 PR et issues via GitHub Actions
* Fusion automatique des PR validées vers master chaque nuit

## Crédits

* Dylan Rajasekaram (dlnraja)
* Kimi.AI — automations/IA
* Homey, Z2M & open-source community
