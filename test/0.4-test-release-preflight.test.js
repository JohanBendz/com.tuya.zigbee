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

test('0.4.3 development version agrees across source, lockfile and generated manifest', () => {
  for (const [source, value] of Object.entries({
    package: pkg.version,
    lockfile: lock.version,
    lockfileRoot: lock.packages[''].version,
    compose: compose.version,
    generatedManifest: app.version,
  })) assert.equal(value, '0.4.3', source + ' drifted from release candidate');
  assert.match(changelog['0.4.2']?.en || '', /pairing profiles/i,
    'Homey App Store notes must describe the user-visible additions');
  assert.doesNotMatch(changelog['0.4.2']?.en || '', /\b(?:Test|Live|beta) (?:release|version|candidate)\b/i,
    'release-channel status belongs in maintainer documentation');
  assert.equal(app.compatibility, '>=5.0.0',
    'New devices must not silently increase the legacy Homey firmware floor');
  assert.equal(compose.compatibility, app.compatibility);
});

test('inherited 0.4.0 release instructions enumerate the actual 19 additions and 33 exact independently pending identities', () => {
  const prev = new Set(Object.keys(historical.drivers));
  assert.equal(prev.size, 135);
  const newer = app.drivers.filter(d => !prev.has(d.id));
  // The frozen 0.4.0 inventory stays 154 drivers / 19 additions.
  // Later profiles are counted apart from that acceptance matrix.
  const postFreezeIds = new Set([
    'thermostatic_radiator_valve_avatto',
    'wall_thermostat_beok_tgm50',
    'motion_conecto_cozigpms',
    'presence_wenzhi_ts0225',
    'temperature_ts0201_e002',
    'presence_neo_nas_ps09b2',
    'rain_lux_hobeian_zg223z',
    'rain_lux_tuya_u6x1zyv2',
    'radiator_nedis_zbhtr20wt',
    'radiator_trv602z',
    'blind_motor_gm25teq',
    'dimmer_avatto_zdms16_2',
    'temperature_probe_owon_ths317',
    'temphumidsensor_avatto_eink',
    'dimmer_aipin_mc101z',
    'wall_switch_moes_star_3',
    'sensor_zt01_probe',
    'sensor_bed_pressure',
    'tank_monitor_epttech_tlc2206',
    'temphumid_th01',
    'socket_moes_ts011f_dual',
    'switch_1_gang_ts000f',
    'switch_1_gang_ts0011',
    'switch_module_2_gang_tuya',
    'switch_module_3_gang_tuya',
    'switch_module_4_gang_tuya',
  ]);
  const frozenNewer = newer.filter(d => !postFreezeIds.has(d.id));
  assert.equal(frozenNewer.length, 19);
  assert.equal(newer.length, 19 + postFreezeIds.size);
  assert.equal(app.drivers.length, 154 + postFreezeIds.size);

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
  assert.match(preflight, /CONFIRMED: 0\.3\.2 Live BEFORE 0\.4\.0 Test/);
  assert.match(guidance, /0\.3\.2 Live BEFORE 0\.4\.0 Test/);
  assert.match(acceptance, /0\.3\.2 Live BEFORE 0\.4\.0 Test/);
  assert.match(preflight, /`main` = 0\.3\.3 Live; `dev` = 0\.3\.4 Test/);
  assert.match(preflight, /BRANCHES\.md/);
  assert.match(preflight, /NOT SUBMITTED/);
  assert.match(preflight, /public\s+0\.4 Test/i);
});

// Current release routing is checked separately from the immutable 0.4.0
// acceptance snapshot. Update these assertions only on a real channel change.
test('current release policy distinguishes Live, published Test and frozen candidates', () => {
  const branchPolicy = read('docs/BRANCHES.md');
  const maintaining = read('MAINTAINING.md');
  assert.match(branchPolicy, /130854f4c6d1b5a3537e956d941eb2e3caec9a9a/);
  assert.match(branchPolicy, /21b60ce07d91421aeba08357960c8fc910d87593/);
  assert.match(branchPolicy, /\| `main` \| Live 0\.3\.3 \|/);
  assert.match(branchPolicy, /\| `dev` \| Test 0\.4\.1 \| `46a4a6b8ac8806d65530667e7c8341d57ca7491c`/);
  assert.match(branchPolicy, /\| `develop-0\.4\.3` \| Frozen candidate for Test 0\.4\.3 \|/);
  assert.match(maintaining, /main = 0\.3\.3 Live and dev = 0\.4\.1 Test/);
  assert.match(maintaining, /develop-0\.4\.3` is feature-frozen for Test/);
  assert.match(read('.github/workflows/validate.yml'), /develop-0\.4\.3/);
  assert.match(maintaining, /Physical checks take place through the published 0\.4 Test version/);
});
