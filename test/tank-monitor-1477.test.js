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
const Tank = require('../drivers/tank_monitor_epttech_tlc2206/device');
const app = require('../app.json');
const Frame = require('zigbee-clusters').ZCLStruct('test.tank', require('../lib/TuyaSpecificCluster').COMMANDS.reporting.args);
const flush = () => new Promise(resolve => setImmediate(resolve));

async function start(write) {
  const unit = Object.create(Tank.prototype);
  const tuya = new EventEmitter();
  const values = new Map(), writes = [], errors = [];
  unit.getCapabilityValue = id => values.get(id);
  unit.setCapabilityValue = async (id, value) => {
    writes.push([id, value]);
    if (write) await write(id, value);
    values.set(id, value);
  };
  unit.error = (...args) => errors.push(args);
  await unit.onNodeInit({ zclNode: { endpoints: { 1: { clusters: { tuya } } } } });
  return { unit, tuya, writes, values, errors };
}

function emit(tuya, hex, event = 'reporting') {
  tuya.emit(event, Frame.fromBuffer(Buffer.from('0001' + hex, 'hex')));
}

test('one TLC2206-ZB profile exposes read-only state, depth in centimetres and percentage', () => {
  const matches = app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes('_TZE200_lvkk0hdg')
    && [].concat(d.zigbee?.productId || []).includes('TS0601'));
  assert.deepEqual(matches.map(d => d.id), ['tank_monitor_epttech_tlc2206']);
  assert.deepEqual(matches[0].zigbee.manufacturerName, ['_TZE200_lvkk0hdg']);
  assert.deepEqual(matches[0].zigbee.productId, ['TS0601']);
  assert.deepEqual(matches[0].capabilities, ['liquid_level', 'liquid_level_fill', 'tank_state']);
  for (const cap of matches[0].capabilities) assert.equal(app.capabilities[cap].setable, false);
  assert.equal(app.capabilities.liquid_level.units.en, 'cm');
  assert.equal(app.capabilities.liquid_level_fill.units.en, '%');
  assert.equal(matches[0].settings, undefined);
});

test('bundled reports retain units and boundaries and ignore configuration DPs and malformed data', async () => {
  const { tuya, writes, values } = await start();
  emit(tuya, '010400010002020004000001901602000400000064');
  await flush();
  assert.deepEqual([...values], [['tank_state', 'normal'], ['liquid_level', 400], ['liquid_level_fill', 100]]);
  emit(tuya, '0104000101', 'response');
  await flush();
  emit(tuya, '010400010202020004000000001602000400000000');
  await flush();
  assert.deepEqual([...values], [['tank_state', 'high'], ['liquid_level', 0], ['liquid_level_fill', 0]]);
  for (const hex of ['0104000103', '0202000400000191', '1602000400000065', '02020004ffffffff',
    '0702000400000001', '1302000400000001', '0201000101', '02020004000000010104']) emit(tuya, hex);
  await flush();
  assert.equal(writes.length, 7);
});

test('a burst of 10,000 repeated frames causes one Homey write and preserves the latest changed value', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const { tuya, writes, values } = await start(() => blocked);
  const frame = Frame.fromBuffer(Buffer.from('00010202000400000032', 'hex'));
  for (let i = 0; i < 10000; i++) tuya.emit('reporting', frame);
  assert.deepEqual(writes, [['liquid_level', 50]]);
  emit(tuya, '0202000400000033');
  emit(tuya, '0202000400000034');
  release();
  await flush();
  assert.deepEqual(writes, [['liquid_level', 50], ['liquid_level', 52]]);
  assert.equal(values.get('liquid_level'), 52);
  emit(tuya, '0202000400000034');
  assert.equal(writes.length, 2);
});

test('the next report retries a failed Homey update', async () => {
  let fail = true;
  const { tuya, writes, values, errors } = await start(async () => {
    if (fail) throw new Error('Homey unavailable');
  });
  emit(tuya, '1602000400000019');
  await flush();
  assert.equal(errors.length, 1);
  fail = false;
  emit(tuya, '1602000400000019');
  await flush();
  assert.equal(writes.length, 2);
  assert.equal(values.get('liquid_level_fill'), 25);
});
