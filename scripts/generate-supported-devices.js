'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'app.json');
const supportedPath = path.join(root, 'SUPPORTED_DEVICES.md');
const begin = '<!-- BEGIN GENERATED DEVICE INDEX -->';
const end = '<!-- END GENERATED DEVICE INDEX -->';

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|');
}

function formatList(values) {
  return values.length
    ? values.map(value => `\`${escapeCell(value)}\``).join('<br>')
    : '—';
}

function generateIndex(app) {
  const rows = (app.drivers || [])
    .filter(driver => driver.zigbee && driver.id !== 'tuya_dummy_device')
    .map(driver => ({
      id: driver.id,
      name: driver.name?.en || driver.id,
      products: [...new Set([].concat(driver.zigbee.productId || []))].sort(),
      manufacturers: [...new Set([].concat(driver.zigbee.manufacturerName || []))].sort(),
    }))
    .filter(row => row.products.length || row.manufacturers.length)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  return [
    begin,
    '## Manifest identity index',
    '',
    'This section is generated from the Homey manifest. It is the easiest place to check the Zigbee identities currently matched by the app. Retail brands and model names are intentionally not inferred: Tuya hardware is frequently rebranded and visually identical products can expose different Zigbee identities.',
    '',
    '| Driver | Product ID(s) | Manufacturer name(s) |',
    '| --- | --- | --- |',
    ...rows.map(row =>
      `| ${escapeCell(row.name)} (\`${row.id}\`) | ${formatList(row.products)} | ${formatList(row.manufacturers)} |`
    ),
    end,
  ].join('\n');
}

const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
const current = fs.readFileSync(supportedPath, 'utf8');
const generated = generateIndex(app);

let next;
if (current.includes(begin) && current.includes(end)) {
  next = current.replace(new RegExp(`${begin}[\\s\\S]*?${end}`), generated);
} else {
  const anchor = '## White-label brands seen in supported devices';
  if (!current.includes(anchor)) {
    throw new Error(`Could not find insertion anchor in ${supportedPath}`);
  }
  next = current.replace(anchor, `${generated}\\n\\n${anchor}`);
}

if (process.argv.includes('--check')) {
  if (next !== current) {
    console.error('SUPPORTED_DEVICES.md is out of sync. Run npm run update:supported-devices.');
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(supportedPath, next);
  console.log('Updated SUPPORTED_DEVICES.md from app.json.');
}
