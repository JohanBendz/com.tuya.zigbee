// scripts/merge_enrich_drivers.js
const fs = require('fs');
const path = require('path');

const manufacturerDB = JSON.parse(fs.readFileSync('data/manufacturer_ids.json', 'utf8'));
const driversDir = 'drivers';
const log = [];

function enrichDriver(driverFolder, productId) {
  const composePath = path.join(driversDir, driverFolder, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

  // Enrichir manufacturerName
  const existing = compose.zigbee.manufacturerName || [];
  const enriched = Array.from(new Set([...existing, ...Object.keys(manufacturerDB)]));
  const addedManufacturers = enriched.filter(x => !existing.includes(x));
  compose.zigbee.manufacturerName = enriched;

  // Enrichir productId
  if (!compose.zigbee.productId.includes(productId)) {
    compose.zigbee.productId.push(productId);
  }

  // Log des ajouts
  log.push({
    driver: driverFolder,
    addedManufacturers,
    productId,
    enriched: addedManufacturers.length > 0
  });

  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
}

// Liste des drivers à enrichir (à compléter dynamiquement si besoin)
const drivers = [
  { dir: 'curtain_module', productId: 'TS130F' },
  { dir: 'rain_sensor', productId: 'TS0207' },
  { dir: 'multi_sensor', productId: 'TS0601' },
  { dir: 'smart_plug', productId: 'TS011F' },
  { dir: 'remote_control', productId: 'TS004F' }
];

drivers.forEach(({ dir, productId }) => enrichDriver(dir, productId));

if (!fs.existsSync('logs')) fs.mkdirSync('logs');
fs.writeFileSync('logs/merge_enrich_drivers.log', JSON.stringify(log, null, 2));
console.log('Fusion/enrichissement terminé. Voir logs/merge_enrich_drivers.log'); 