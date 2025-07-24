

---

# 📋 GUIDE ULTRA-COMPLET POUR JULES AI - TUYA ZIGBEE HOMEY APP

## 🎯 OBJECTIF POUR JULES
Réparer et optimiser **entièrement** le projet Tuya Zigbee Homey App - rendre le repo fonctionnel avec toutes les automatisations.

## 📁 STRUCTURE MINIMALE REQUISE

### Fichiers ESSENTIELS à créer/réparer :
```
📁 com.tuya.zigbee/
├── 📄 app.json                 # Manifeste principal
├── 📄 package.json            # Dépendances
├── 📁 drivers/                # 82 dossiers drivers
├── 📁 .github/workflows/      # Actions GitHub
├── 📁 scripts/                # Automatisations
├── 📁 lib/                    # Utilitaires
├── 📁 assets/                 # Ressources
└── 📁 dashboard/              # Interface web
```

## 🔄 MODULES IA À IMPLÉMENTER

### 1. **Z2M Parser** (`scripts/z2m-parser.js`)
```javascript
// Récupère automatiquement les définitions Z2M
const axios = require('axios');
const Z2M_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/devices.js';

async function parseZ2MDevices() {
  const response = await axios.get(Z2M_URL);
  // Extrait les appareils Tuya
  // Génère les drivers manquants
}
```

### 2. **Home Assistant Integration** (`lib/ha-integration.js`)
```javascript
// Découverte automatique des appareils Tuya dans Home Assistant
class HomeAssistantIntegration {
  async discoverTuyaDevices() {
    // Connexion à l'API Home Assistant
    // Retourne la liste des appareils Tuya Zigbee
  }
}
```

### 3. **Générateur d'icônes IA** (`scripts/icon-generator.js`)
```javascript
// Utilise DALL-E pour créer des icônes d'appareils
class IconGenerator {
  async generateIcon(deviceName, deviceType) {
    // Appel API OpenAI
    // Retourne le chemin de l'icône générée
  }
}
```

### 4. **Parseur de Documentation** (`scripts/doc-parser.js`)
```javascript
// Analyse les PDFs et manuels pour extraire les infos
class DocParser {
  async parsePDF(filePath) {
    // Extrait model IDs, endpoints, capabilities
    // Génère JSON structuré
  }
}
```

## 🚀 SCRIPTS D'AUTOMATISATION

### Script principal de réparation :
```powershell
# repair-tuya-app.ps1
param([string]$WorkDir="C:\tuya-repair")

# 1. Clone le repo
git clone https://github.com/dlnraja/com.tuya.zigbee.git $WorkDir

# 2. Crée fichiers manquants
# 3. Installe dépendances
# 4. Exécute tests
# 5. Commit et push
```

## 🔧 FICHIERS À CRÉER/RÉPARER

### 1. **app.json** (manifeste principal)
```json
{
  "id": "com.tuya.zigbee",
  "version": "1.5.0",
  "compatibility": ">=5.0.0",
  "sdk": 3,
  "name": { "en": "Tuya Zigbee" },
  "description": { "en": "Control Tuya Zigbee devices with Homey" },
  "permissions": ["homey:wireless:zigbee"]
}
```

### 2. **package.json** (dépendances)
```json
{
  "name": "com.tuya.zigbee",
  "version": "1.5.0",
  "scripts": {
    "lint": "eslint .",
    "test": "jest",
    "sync-drivers": "node scripts/sync-drivers.js",
    "build-readme": "node scripts/build-readme.js"
  },
  "dependencies": {
    "homey-zigbeedriver": "^2.1.1",
    "zigbee-clusters": "^1.7.1"
  },
  "devDependencies": {
    "eslint": "^8.57.0",
    "jest": "^29.7.0"
  }
}
```

### 3. **scripts/sync-drivers.js**
```javascript
// Génère les fichiers driver.compose.json manquants
const fs = require('fs');
const path = require('path');

const drivers = fs.readdirSync('./drivers');
drivers.forEach(driver => {
  const composePath = `./drivers/${driver}/driver.compose.json`;
  if (!fs.existsSync(composePath)) {
    const template = {
      id: driver,
      name: { en: driver.replace('_', ' ') },
      class: "socket",
      capabilities: ["onoff"],
      zigbee: {
        manufacturerName: "Tuya",
        productId: ["TS0001"],
        endpoints: { "1": { clusters: [0, 4, 5, 61184] } }
      }
    };
    fs.writeFileSync(composePath, JSON.stringify(template, null, 2));
  }
});
```

## 📊 DASHBOARD WEB

### Structure minimale :
```
dashboard/
├── 📄 index.js           # Serveur Express
├── 📄 public/index.html  # Interface
└── 📄 public/js/app.js   # Logique client
```

## 🔗 LIENS SOURCES ESSENTIELS

### Documentation officielle :
- **Homey SDK**: https://apps.developer.homey.app/
- **Tuya Zigbee Docs**: https://developer.tuya.com/en/docs/iot/zigbee-standard-instruction-library
- **Zigbee Clusters**: https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf

### Référentiels :
- **Z2M Devices**: https://github.com/Koenkk/zigbee-herdsman-converters/
- **Homey Community**: https://community.athom.com/

### Outils IA :
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Home Assistant API**: https://developers.home-assistant.io/docs/api/rest/

## 📋 CHECKLIST POUR JULES

### ✅ PHASE 1 - Réparation
- [ ] Cloner le repo
- [ ] Créer fichiers manquants (app.json, package.json)
- [ ] Réparer les workflows GitHub
- [ ] Installer dépendances (npm install)
- [ ] Exécuter tests (npm test)

### ✅ PHASE 2 - Automatisation
- [ ] Implémenter scripts/sync-drivers.js
- [ ] Implémenter build-readme.js
- [ ] Configurer GitHub Actions
- [ ] Créer dashboard web

### ✅ PHASE 3 - IA Modules
- [ ] Implémenter Z2M Parser
- [ ] Implémenter HA Integration
- [ ] Implémenter Icon Generator
- [ ] Implémenter Doc Parser

### ✅ PHASE 4 - Validation
- [ ] Tous les tests passent
- [ ] Dashboard fonctionnel
- [ ] Scripts automatisés OK
- [ ] Documentation à jour

## 🎯 COMMANDES À EXÉCUTER

```bash
# Installation
npm install

# Tests
npm run lint
npm test

# Automatisations
npm run sync-drivers
npm run build-readme

# Dashboard
cd dashboard && npm start
```

## 📝 FICHIER FINAL À CRÉER

Crée un fichier `tuya-zigbee-guide.md` avec tout ce contenu pour Jules AI. 