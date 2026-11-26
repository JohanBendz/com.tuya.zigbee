'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../app.json');
const historical = require('./fixtures/0.3.1-manifest-contract.json');

const DRIVER = 'thermostatic_radiator_valve_avatto';
const FROZEN_DRIVER_COUNT = 154;

test('AVATTO TRV is outside the frozen 0.4.0 acceptance matrix', () => {
  assert.equal(Object.keys(historical.drivers).length, 135);
  assert.equal(historical.drivers[DRIVER], undefined);

  const driver = app.drivers.find(entry => entry.id === DRIVER);
  assert.ok(driver, 'generated manifest must include the AVATTO TRV');
  assert.deepEqual(driver.zigbee.manufacturerName, ['_TZE204_vjpaih9f', '_TZE284_vjpaih9f']);
  assert.deepEqual(driver.zigbee.productId, ['TS0601']);
  assert.ok(app.drivers.length > FROZEN_DRIVER_COUNT);

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
