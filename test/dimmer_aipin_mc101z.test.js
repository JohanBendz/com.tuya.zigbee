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
const Device = require('../drivers/dimmer_aipin_mc101z/device');
const app = require('../app.json');

test('the generated manifest has one exact TS0601 owner for _TZE28C1000000_sinxpbrl', () => {
  const matches = app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes('_TZE28C1000000_sinxpbrl')
    && [].concat(d.zigbee?.productId || []).includes('TS0601'));
  assert.deepEqual(matches.map(d => d.id), ['dimmer_aipin_mc101z']);
  assert.deepEqual(matches[0].zigbee.manufacturerName, ['_TZE28C1000000_sinxpbrl']);
  assert.deepEqual(matches[0].zigbee.productId, ['TS0601']);
  assert.deepEqual(matches[0].capabilities, ["onoff","dim"]);
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
  device._transactionID = 0;
  await device.onNodeInit({ zclNode: device.zclNode });
  return { device, tuya, updates, handlers };
}

test('PWM writes serialize DP1 and DP3 with exact lengths, values and command failure propagation', async () => {
  const { tuya, handlers } = await initialize();
  const { ZCLStruct } = require('zigbee-clusters');
  const cluster = require('../lib/TuyaSpecificCluster');
  const Command = ZCLStruct('test.pwm', cluster.COMMANDS.datapoint.args);
  const sent = [];
  tuya.datapoint = async frame => { sent.push(new Command(frame).toBuffer().toString('hex')); };
  await handlers.onoff(true);
  await handlers.onoff(false);
  for (const level of [0, 0.5, 1]) await handlers.dim(level);
  assert.deepEqual(sent, ['00000101000101', '00010101000100', '00020302000400000000',
    '000303020004000001f4', '000403020004000003e8']);
  await assert.rejects(handlers.dim(1.2));
  await assert.rejects(handlers.dim(NaN));
  await assert.rejects(handlers.onoff('false'));
  assert.equal(sent.length, 5);
  tuya.datapoint = async () => { throw new Error('offline'); };
  await assert.rejects(handlers.dim(0.5), /offline/);
});

test('physical button and dim reports restore state after initialization without outbound writes', async () => {
  const { tuya, updates } = await initialize();
  function report(dp, datatype, hex, event = 'reporting') {
    const data = Buffer.from(hex, 'hex');
    tuya.emit(event, { dp, datatype, length: data.length, data });
  }
  report(1, 1, '01');
  report(3, 2, '00000000');
  report(3, 2, '000001f4', 'response');
  report(3, 2, '000003e8');
  report(1, 1, '00');
  report(2, 4, '01');
  report(102, 1, '01');
  report(3, 2, '000003e9');
  report(3, 2, '00');
  report(1, 1, '02');
  report(3, 1, '00000007');
  tuya.emit('reporting', { dp: 1, datatype: 1, length: 4, data: Buffer.from([1]) });
  assert.deepEqual(updates, [['onoff', true], ['dim', 0], ['dim', 0.5], ['dim', 1], ['onoff', false]]);
});
