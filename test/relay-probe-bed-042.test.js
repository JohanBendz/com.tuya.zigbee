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

const app = require('../app.json');
const { ZCLStruct } = require('zigbee-clusters');
const cluster = require('../lib/TuyaSpecificCluster');
const Frame = ZCLStruct('test.tuya.report', cluster.COMMANDS.reporting.args);
const Switch = require('../drivers/wall_switch_moes_star_3/device');
const Probe = require('../drivers/sensor_zt01_probe/device');
const Bed = require('../drivers/sensor_bed_pressure/device');

async function pair(Device, tuya = new EventEmitter(), subDeviceId, sharedNode) {
  const device = Object.create(Device.prototype);
  const values = new Map();
  const updates = [];
  const commands = {};
  device.zclNode = sharedNode || { endpoints: { 1: { clusters: { tuya } } } };
  device.getData = () => ({ subDeviceId });
  device.getCapabilityValue = id => values.get(id);
  device.setCapabilityValue = async (id, value) => { values.set(id, value); updates.push([id, value]); };
  device.registerCapabilityListener = (id, fn) => { commands[id] = fn; };
  device.error = assert.fail;
  await device.onNodeInit({ zclNode: device.zclNode });
  return { device, values, updates, commands, tuya };
}

function emit(tuya, records, event = 'reporting') {
  tuya.emit(event, Frame.fromBuffer(Buffer.from('0001' + records, 'hex')));
}

test('three uniquely matched TS0601 interviews have the expected tile and capability contracts', () => {
  const expected = [
    ['_TZE200_zo0cfekv', 'wall_switch_moes_star_3', ['onoff'], 3],
    ['_TZE284_8se38w3c', 'sensor_zt01_probe',
      ['measure_temperature', 'measure_temperature.probe', 'measure_humidity', 'battery_level_state'], 1],
    ['_TZE200_seq9cm6u', 'sensor_bed_pressure', ['alarm_generic', 'measure_battery'], 1],
  ];
  for (const [manufacturer, id, capabilities, tiles] of expected) {
    const matches = app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes(manufacturer)
      && [].concat(d.zigbee?.productId || []).includes('TS0601'));
    assert.deepEqual(matches.map(d => d.id), [id]);
    const [driver] = matches;
    assert.deepEqual(driver.zigbee.manufacturerName, [manufacturer]);
    assert.deepEqual(driver.zigbee.productId, ['TS0601']);
    assert.deepEqual(driver.capabilities, capabilities);
    assert.equal(Object.keys(driver.zigbee.devices || {}).length + 1, tiles);
    assert.equal(driver.settings, undefined);
  }
});

test('MOES routes three Flow writes and local reports independently on a shared EP1 cluster', async () => {
  const tuya = new EventEmitter();
  const sharedNode = { endpoints: { 1: { clusters: { tuya } } } };
  const parent = await pair(Switch, tuya, undefined, sharedNode);
  const second = await pair(Switch, tuya, 'secondGang', sharedNode);
  const third = await pair(Switch, tuya, 'thirdGang', sharedNode);
  const writes = [];
  tuya.datapoint = async frame => writes.push(new Frame(frame).toBuffer().toString('hex'));
  await Promise.all([third.commands.onoff(false), parent.commands.onoff(true), second.commands.onoff(true)]);
  assert.deepEqual(writes, ['00000301000100', '00010101000101', '00020201000101']);
  emit(tuya, '02010001010301000100');
  assert.deepEqual(parent.updates, []);
  assert.deepEqual(second.updates, [['onoff', true]]);
  assert.deepEqual(third.updates, [['onoff', false]]);
  emit(tuya, '0101000101', 'response');
  assert.deepEqual(parent.updates, [['onoff', true]]);
  second.device.onDeleted();
  emit(tuya, '02010001000301000101');
  emit(tuya, '0301000102');
  emit(tuya, '0304000100');
  assert.equal(second.updates.length, 1);
  assert.deepEqual(third.updates, [['onoff', false], ['onoff', true]]);
  assert.equal(writes.length, 3);
  await assert.rejects(pair(Switch, tuya, 'unknown', sharedNode));
  await assert.rejects(parent.commands.onoff(1));
  tuya.datapoint = async () => { throw new Error('radio offline'); };
  await assert.rejects(third.commands.onoff(true), /radio offline/);
});

test('ZT01 reports ambient and probe independently, including sub-zero and out-of-range samples', async () => {
  const { tuya, values, updates, commands } = await pair(Probe);
  emit(tuya, '01020004000000e726020004ffffffc80202000400000032');
  assert.deepEqual([...values], [['measure_temperature', 23.1], ['measure_temperature.probe', -5.6], ['measure_humidity', 50]]);
  emit(tuya, '2602000400007fff');
  emit(tuya, '26020004ffff8000');
  emit(tuya, '0202000400000065');
  emit(tuya, '2604000100');
  assert.equal(updates.length, 3);
  emit(tuya, '2602000400000000', 'response');
  assert.equal(values.get('measure_temperature.probe'), 0);
  for (const [raw, state] of [['00', 'low'], ['01', 'medium'], ['02', 'high']]) {
    emit(tuya, '03040001' + raw);
    assert.equal(values.get('battery_level_state'), state);
  }
  emit(tuya, '03040001ff');
  assert.equal(values.get('battery_level_state'), 'high');
  assert.deepEqual(commands, {});
});

test('bed sensor reports occupied and vacant once per change and accepts zero battery', async () => {
  const { tuya, updates, commands } = await pair(Bed);
  emit(tuya, '01040001000402000400000000');
  emit(tuya, '0104000100', 'response');
  emit(tuya, '0104000101');
  emit(tuya, '0104000102');
  emit(tuya, '0101000100');
  emit(tuya, '0402000400000065');
  emit(tuya, '0c02000400000064');
  assert.deepEqual(updates, [['alarm_generic', true], ['measure_battery', 0], ['alarm_generic', false]]);
  assert.deepEqual(commands, {});
});
