'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');
const lock = require('../package-lock.json');
const compose = require('../.homeycompose/app.json');
const app = require('../app.json');
const historical = require('./fixtures/0.3.1-manifest-contract.json');

const DRIVER = 'thermostatic_radiator_valve_avatto';
const FROZEN_DRIVER_COUNT = 154;

test('0.4.1 candidate version metadata stays at the inherited 0.4.0 until a coordinated bump', () => {
  for (const [source, value] of Object.entries({
    package: pkg.version,
    lockfile: lock.version,
    lockfileRoot: lock.packages[''].version,
    compose: compose.version,
    generatedManifest: app.version,
  })) {
    assert.equal(value, '0.4.0', source);
  }
});

test('0.4.1 inventory adds the AVATTO TRV outside the frozen 0.4.0 acceptance matrix', () => {
  assert.equal(Object.keys(historical.drivers).length, 135);
  assert.equal(historical.drivers[DRIVER], undefined);

  const driver = app.drivers.find(entry => entry.id === DRIVER);
  assert.ok(driver, 'generated manifest must include the AVATTO TRV');
  assert.deepEqual(driver.zigbee.manufacturerName, ['_TZE204_vjpaih9f', '_TZE284_vjpaih9f']);
  assert.deepEqual(driver.zigbee.productId, ['TS0601']);
  assert.equal(app.drivers.length, FROZEN_DRIVER_COUNT + 1);

  const acceptance = fs.readFileSync(
    path.resolve(__dirname, '..', 'docs', '0.4.0_PHYSICAL_ACCEPTANCE.md'),
    'utf8',
  );
  assert.equal(acceptance.includes('_TZE204_vjpaih9f'), false);
  assert.equal(acceptance.includes('_TZE284_vjpaih9f'), false);
  assert.equal(acceptance.includes(DRIVER), false);
  assert.equal(fs.existsSync(path.resolve(__dirname, 'fixtures', '0.3.1-manifest-contract.json')), true);
  assert.equal(fs.existsSync(path.resolve(__dirname, 'fixtures', '0.3.1-protected-runtime-blobs.json')), true);
});
