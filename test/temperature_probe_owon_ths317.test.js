'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, ...args) {
  return request === 'homey' ? 'homey' : originalResolve.call(this, request, ...args);
};
require.cache.homey = { id: 'homey', loaded: true, exports: { Device: class {}, Driver: class {} } };
const Device = require('../drivers/temperature_probe_owon_ths317/device');
const app = require('../app.json');

test('the generated manifest has one exact THS317-ET owner for OWON', () => {
  const matches = app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes('OWON')
    && [].concat(d.zigbee?.productId || []).includes('THS317-ET'));
  assert.deepEqual(matches.map(d => d.id), ['temperature_probe_owon_ths317']);
  assert.deepEqual(matches[0].zigbee.manufacturerName, ['OWON']);
  assert.deepEqual(matches[0].zigbee.productId, ['THS317-ET']);
  assert.deepEqual(matches[0].capabilities, ["measure_temperature","measure_battery"]);
});

test('EP1 temperature and battery accept signed readings, reject unavailable reports', async () => {
  const device = Object.create(Device.prototype);
  const bindings = {};
  device.registerCapability = (id, cluster, options) => { bindings[id] = { cluster, ...options }; };
  await device.onNodeInit();
  const { CLUSTER } = require('zigbee-clusters');
  const temp = bindings.measure_temperature;
  const battery = bindings.measure_battery;
  assert.equal(temp.endpoint, 1);
  assert.equal(battery.endpoint, 1);
  assert.equal(temp.cluster, CLUSTER.TEMPERATURE_MEASUREMENT);
  assert.equal(battery.cluster, CLUSTER.POWER_CONFIGURATION);
  for (const [raw, expected] of [[-723, -7.23], [2320, 23.2], [0, 0], [-32768, null], [65535, null], [NaN, null]]) {
    assert.equal(temp.reportParser(raw), expected);
  }
  for (const [raw, expected] of [[0, 0], [151, 75.5], [200, 100], [201, null], [255, null], [-1, null]]) {
    assert.equal(battery.reportParser(raw), expected);
  }
});
