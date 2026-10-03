'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');
const lock = require('../package-lock.json');
const compose = require('../.homeycompose/app.json');
const app = require('../app.json');
const changelog = require('../.homeychangelog.json');
const historical = require('./fixtures/0.3.1-manifest-contract.json');

const read = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
const matrixStart = '<!-- BEGIN EXACT-IDENTITY ACCEPTANCE MATRIX -->';
const matrixEnd = '<!-- END EXACT-IDENTITY ACCEPTANCE MATRIX -->';

test('final 0.4 Test artifact version agrees across source, lockfile, generated manifest and changelog', () => {
  for (const [source, value] of Object.entries({
    package: pkg.version,
    lockfile: lock.version,
    lockfileRoot: lock.packages[''].version,
    compose: compose.version,
    generatedManifest: app.version,
  })) assert.equal(value, '0.4.0', source + ' drifted from release candidate');
  assert.match(changelog['0.4.0']?.en || '', /Test release/i,
    'Homey App Store notes must describe this as an unverified public Test release');
  assert.equal(app.compatibility, '>=5.0.0',
    'New devices must not silently increase the legacy Homey firmware floor');
  assert.equal(compose.compatibility, app.compatibility);
});

test('release instructions enumerate the actual 19 additions and 33 exact independently pending identities', () => {
  const prev = new Set(Object.keys(historical.drivers));
  assert.equal(prev.size, 135);
  const newer = app.drivers.filter(d => !prev.has(d.id));
  assert.equal(app.drivers.length, 154);
  assert.equal(newer.length, 19);

  const acceptance = read('docs/0.4.0_PHYSICAL_ACCEPTANCE.md');
  const begin = acceptance.indexOf(matrixStart), end = acceptance.indexOf(matrixEnd);
  assert.ok(begin >= 0 && end > begin, 'physical acceptance matrix must be present');
  const rows = acceptance.slice(begin + matrixStart.length, end).split('\n')
    .filter(x => x.startsWith('| `'));
  assert.equal(rows.length, 33);
  assert.ok(rows.every(row => row.includes('Pending 0.4 physical')),
    'a new exact identity cannot be marked physically passed before public Test');

  const guidance = read('docs/0.4.0_TEST_READINESS.md');
  const maintaining = read('MAINTAINING.md');
  const preflight = read('docs/0.4.0_RELEASE_PREFLIGHT.md');
  assert.match(guidance, /33 distinct Zigbee manufacturerName \+ modelId pairs/);
  assert.match(guidance, /33 new identities/);
  assert.match(maintaining, /33 individually testable/);
  assert.match(preflight, /0\.4\.1/);
  assert.match(preflight, /PENDING explicit maintainer decision/);
  assert.match(preflight, /NOT SUBMITTED/);
  assert.match(preflight, /public\s+0\.4 Test/i);
});
