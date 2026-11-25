'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function resolveHomey(request, ...args) {
  return request === 'homey' ? 'homey' : resolve.call(this, request, ...args);
};
require.cache.homey = { id: 'homey', loaded: true, exports: { Device: class {}, Driver: class {} } };
const Motor = require('../drivers/blind_motor_gm25teq/device');
const app = require('../app.json');
const Frame = require('zigbee-clusters').ZCLStruct('motor.report', require('../lib/TuyaSpecificCluster').COMMANDS.reporting.args);

test('only the interviewed GM25TEQ matches the two native Homey cover controls', () => {
  const owners = app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes('_TZE204_xtrnjaoz')
    && [].concat(d.zigbee?.productId || []).includes('TS0601'));
  assert.deepEqual(owners.map(d => d.id), ['blind_motor_gm25teq']);
  assert.deepEqual(owners[0].zigbee.manufacturerName, ['_TZE204_xtrnjaoz']);
  assert.deepEqual(owners[0].zigbee.productId, ['TS0601']);
  assert.deepEqual(owners[0].capabilities, ['windowcoverings_set', 'windowcoverings_state']);
  assert.equal(owners[0].settings, undefined);
});

test('commands and position reports invert once, and target echoes do not report travel', async () => {
  const device = Object.create(Motor.prototype);
  const tuya = new EventEmitter();
  const writes = [], updates = [], handlers = {};
  device._transactionID = 0;
  device.zclNode = { endpoints: { 1: { clusters: { tuya } } } };
  device.setCapabilityValue = async (id, value) => { updates.push([id, value]); };
  device.registerCapabilityListener = (id, fn) => { handlers[id] = fn; };
  device.error = assert.fail;
  await device.onNodeInit({ zclNode: device.zclNode });
  tuya.datapoint = async frame => { writes.push(new Frame(frame).toBuffer().toString('hex')); };
  for (const state of ['up', 'idle', 'down']) await handlers.windowcoverings_state(state);
  for (const position of [0, 0.5, 1]) await handlers.windowcoverings_set(position);
  assert.deepEqual(writes, ['00000104000100', '00010104000101', '00020104000102',
    '00030802000400000064', '00040802000400000032', '00050802000400000000']);
  const emit = (hex, event = 'reporting') => tuya.emit(event, Frame.fromBuffer(Buffer.from('0001' + hex, 'hex')));
  emit('0802000400000000', 'response');
  emit('0104000103');
  emit('0b04000101');
  emit('0902000400000065');
  emit('0901000100');
  assert.deepEqual(updates, []);
  for (const raw of ['00', '01', '02']) emit('01040001' + raw);
  for (const raw of ['64', '32', '00']) emit('09020004000000' + raw);
  assert.deepEqual(updates, [['windowcoverings_state', 'up'], ['windowcoverings_state', 'idle'],
    ['windowcoverings_state', 'down'], ['windowcoverings_set', 0], ['windowcoverings_set', 0.5],
    ['windowcoverings_set', 1]]);
  await assert.rejects(handlers.windowcoverings_state('continue'));
  await assert.rejects(handlers.windowcoverings_set(-1));
  tuya.datapoint = async () => { throw new Error('motor offline'); };
  await assert.rejects(handlers.windowcoverings_set(0.5), /motor offline/);
});
