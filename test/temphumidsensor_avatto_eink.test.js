'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, ...args) {
  return request === 'homey' ? 'homey' : originalResolve.call(this, request, ...args);
};
require.cache.homey = { id: 'homey', loaded: true, exports: { Device: class {}, Driver: class {} } };
const Device = require('../drivers/temphumidsensor_avatto_eink/device');
const app = require('../app.json');

test('the generated manifest has one exact TS0601 owner for _TZE204_s139roas', () => {
  const matches = app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes('_TZE204_s139roas')
    && [].concat(d.zigbee?.productId || []).includes('TS0601'));
  assert.deepEqual(matches.map(d => d.id), ['temphumidsensor_avatto_eink']);
  assert.deepEqual(matches[0].zigbee.manufacturerName, ['_TZE204_s139roas']);
  assert.deepEqual(matches[0].zigbee.productId, ['TS0601']);
  assert.deepEqual(matches[0].capabilities, ["measure_temperature","measure_humidity","measure_battery"]);
});

async function initialize() {
  const device = Object.create(Device.prototype);
  const tuya = new EventEmitter();
  const updates = [];
  const values = new Map();
  const handlers = {};
  device.getCapabilityValue = id => values.get(id);
  device.setCapabilityValue = async (id, value) => {
    values.set(id, value);
    updates.push([id, value]);
  };
  device.registerCapabilityListener = (id, handle) => { handlers[id] = handle; };
  device.error = error => { throw error; };
  device.zclNode = { endpoints: { 1: { clusters: { tuya } } } };
  await device.onNodeInit({ zclNode: device.zclNode });
  return { device, tuya, updates, handlers };
}

test('passive E-ink reports support bundled values, sub-zero temperatures and repeat wakeups', async () => {
  const { device, tuya, updates } = await initialize();
  function value(dp, raw) {
    const data = Buffer.alloc(4);
    data.writeInt32BE(raw);
    return { dp, datatype: 2, length: 4, data };
  }
  const temp = value(1, 231);
  temp.data = Buffer.concat([temp.data, Buffer.from('02020004000000270402000400000053', 'hex')]);
  tuya.emit('reporting', temp);
  assert.deepEqual(updates, [['measure_temperature', 23.1], ['measure_humidity', 39], ['measure_battery', 83]]);
  tuya.emit('response', temp);
  assert.equal(updates.length, 3);
  tuya.emit('response', value(1, -47));
  tuya.emit('reporting', value(2, 0));
  tuya.emit('reporting', value(4, 100));
  assert.equal(device.getCapabilityValue('measure_temperature'), -4.7);
  assert.equal(device.getCapabilityValue('measure_humidity'), 0);
  assert.equal(device.getCapabilityValue('measure_battery'), 100);
  for (const frame of [value(1, -32768), value(2, 101), value(4, -1), value(3, 30),
    { ...value(2, 13), datatype: 1 }, { ...value(2, 13), length: 2 }, { ...temp, data: temp.data.subarray(0, -1) }]) {
    tuya.emit('reporting', frame);
  }
  assert.equal(updates.length, 6);
});
