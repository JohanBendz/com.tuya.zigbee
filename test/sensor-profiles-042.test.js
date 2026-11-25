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
const { ZCLStruct, CLUSTER } = require('zigbee-clusters');
const Frame = ZCLStruct('sensor.tuya', require('../lib/TuyaSpecificCluster').COMMANDS.reporting.args);
const app = require('../app.json');
const flush = () => new Promise(resolve => setImmediate(resolve));

const identities = [
  ["_TZE200_ghynnvos","TS0601","motion_conecto_cozigpms",["alarm_motion","measure_luminance"]],
  ["_TZ321C_fkzihax8","TS0225","presence_wenzhi_ts0225",["alarm_generic"]],
  ["_TZ3000_1o6x1bl0","TS0201","temperature_ts0201_e002",["measure_temperature","measure_battery"]],
  ["_TZE204_kyhbrfyl","TS0601","presence_neo_nas_ps09b2",["alarm_generic"]],
  ["HOBEIAN","ZG-223Z","rain_lux_hobeian_zg223z",["alarm_water","measure_luminance","measure_battery"]],
  ["_TZE200_u6x1zyv2","TS0601","rain_lux_tuya_u6x1zyv2",["alarm_water","measure_luminance","measure_battery"]],
];

test('each of six interviews pairs uniquely and the two rain identities cannot cross-match', () => {
  function matches(m, p) {
    return app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes(m)
      && [].concat(d.zigbee?.productId || []).includes(p));
  }
  for (const [manufacturer, product, id, capabilities] of identities) {
    const owners = matches(manufacturer, product);
    assert.deepEqual(owners.map(d => d.id), [id]);
    assert.deepEqual(owners[0].zigbee.manufacturerName, [manufacturer]);
    assert.deepEqual(owners[0].zigbee.productId, [product]);
    assert.deepEqual(owners[0].capabilities, capabilities);
  }
  for (const [m, p] of [['HOBEIAN', 'TS0601'], ['_TZE200_u6x1zyv2', 'ZG-223Z']]) {
    assert.ok(matches(m, p).every(d => !d.id.startsWith('rain_lux_')));
  }
});

async function start(id, beforeWrite) {
  const Device = require('../drivers/' + id + '/device');
  const device = Object.create(Device.prototype);
  const tuya = new EventEmitter(), zone = new EventEmitter();
  const values = new Map(), writes = [];
  device.getCapabilityValue = key => values.get(key);
  device.setCapabilityValue = async (key, value) => {
    writes.push([key, value]);
    if (beforeWrite) await beforeWrite();
    values.set(key, value);
  };
  device.error = assert.fail;
  const clusters = { tuya, [CLUSTER.IAS_ZONE.NAME]: zone };
  await device.onNodeInit({ zclNode: { endpoints: { 1: { clusters } } } });
  return { values, writes, zone, emit: (hex, event = 'reporting') =>
    tuya.emit(event, Frame.fromBuffer(Buffer.from('0001' + hex, 'hex'))) };
}

test('Conecto and NEO use opposite occupancy polarities, ignore unrelated DPs and use physical clear reports', async () => {
  const pir = await start('motion_conecto_cozigpms'), neo = await start('presence_neo_nas_ps09b2');
  for (const unit of [pir, neo]) {
    unit.emit('0104000100');
    unit.emit('0104000100', 'response');
    unit.emit('0104000101');
    unit.emit('0104000102');
    unit.emit('650200040000012c');
    unit.emit('0402000400000050');
  }
  await flush();
  assert.deepEqual(pir.writes.filter(([key]) => key === 'alarm_motion'), [['alarm_motion', true], ['alarm_motion', false]]);
  assert.equal(pir.values.get('measure_luminance'), 300);
  assert.equal(pir.values.size, 2);
  assert.deepEqual(neo.writes, [['alarm_generic', false], ['alarm_generic', true]]);
  neo.emit('0101000100');
  await flush();
  assert.equal(neo.values.get('alarm_generic'), false);
});

test('Wenzhi accepts IAS notifications and attributes, with one ordered Flow edge per state change', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const unit = await start('presence_wenzhi_ts0225', () => blocked);
  unit.zone.onZoneStatusChangeNotification({ zoneStatus: { alarm1: true } });
  unit.zone.emit('attr.zoneStatus', { alarm1: true });
  unit.zone.emit('attr.zoneStatus', { tamper: true });
  unit.zone.emit('attr.zoneStatus', { alarm1: false });
  unit.zone.onZoneStatusChangeNotification({ zoneStatus: { alarm1: false } });
  unit.zone.emit('attr.zoneStatus', { alarm1: true });
  assert.equal(unit.writes.length, 1);
  release();
  await flush();
  assert.deepEqual(unit.writes, [['alarm_generic', true], ['alarm_generic', false], ['alarm_generic', true]]);
  let enrolled;
  unit.zone.zoneEnrollResponse = async response => { enrolled = response; };
  await unit.zone.onZoneEnrollRequest();
  assert.deepEqual(enrolled, { enrollResponseCode: 0, zoneId: 0 });
});

test('TS0201 E002 binds only EP1 temperature and battery and ignores ZCL unknown values', async () => {
  const Device = require('../drivers/temperature_ts0201_e002/device');
  const unit = Object.create(Device.prototype), parsers = {};
  unit.registerCapability = (id, cluster, opts) => {
    assert.equal(opts.endpoint, 1);
    parsers[id] = opts.reportParser;
  };
  await unit.onNodeInit();
  assert.deepEqual(Object.keys(parsers), ['measure_temperature', 'measure_battery']);
  assert.equal(parsers.measure_temperature(-710), -7.1);
  assert.equal(parsers.measure_battery(150), 75);
  assert.equal(parsers.measure_temperature(-32768), null);
  assert.equal(parsers.measure_battery(255), null);
});

test('both ZG-223Z profiles deliver one dry/wet/dry cycle with a single source for rain, lux and battery', async () => {
  for (const id of ['rain_lux_hobeian_zg223z', 'rain_lux_tuya_u6x1zyv2']) {
    const unit = await start(id);
    unit.emit('010400010066020004000003e86802000400000000');
    unit.emit('0104000101');
    unit.emit('0104000101', 'response');
    unit.zone.emit('attr.zoneStatus', { alarm1: true });
    unit.emit('0104000100');
    unit.emit('0104000102');
    unit.emit('6802000400000065');
    await flush();
    assert.deepEqual(unit.writes.filter(([key]) => key === 'alarm_water'), [
      ['alarm_water', false], ['alarm_water', true], ['alarm_water', false],
    ]);
    assert.equal(unit.values.get('measure_luminance'), 1000);
    assert.equal(unit.values.get('measure_battery'), 0);
  }
});
