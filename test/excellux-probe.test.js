'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { CLUSTER, ZCLNode } = require('zigbee-clusters');
const compose = require('../drivers/temphumidsensor_excellux/driver.compose.json');
const settings = require('../drivers/temphumidsensor_excellux/driver.settings.compose.json');
const protocol = require('../drivers/temphumidsensor_excellux/protocol');
const fixtures = require('./fixtures/excellux-ntcht02.json');

function fixture() {
  class MockBase {
    constructor() { this.values = new Map(); this.settings = {}; this.store = {}; this.capabilities = new Set(compose.capabilities); }
    hasCapability(id) { return this.capabilities.has(id); }
    async addCapability(id) { this.capabilities.add(id); }
    getStoreValue(id) { return this.store[id]; }
    async setStoreValue(id, value) { this.store[id] = value; }
    getCapabilityValue(id) { return this.values.get(id); }
    getSetting(id) { return this.settings[id]; }
    async setSettings(value) { assert.equal(Boolean(this._samplingPending), false); Object.assign(this.settings, value); }
    async setEnergy(value) { this.energy = value; }
    async setCapabilityValue(id, value) { this.values.set(id, value); }
    log() {}
    error() {}
    onDeleted() { this.deleted = true; }
  }
  const source = file => fs.readFileSync(path.join(__dirname, '..', 'drivers', file, 'device.js'), 'utf8');
  const evaluate = (src, req) => {
    const out = { exports: {} };
    vm.runInThisContext('(function(require,module,exports){' + src + '\n})')(req, out, out.exports);
    return out.exports;
  };
  const req = id => {
    if (id === 'homey') return {};
    if (id === 'homey-zigbeedriver') return { ZigBeeDevice: MockBase };
    if (id === 'zigbee-clusters') return { CLUSTER };
    if (id === '../../lib/updateReportedValue') return require('../lib/updateReportedValue');
    if (id === './protocol') return protocol;
    if (id === '../temphumidsensor3/device') return Standard;
    throw Error('Unexpected dependency: ' + id);
  };
  const Standard = evaluate(source('temphumidsensor3'), req);
  const Device = evaluate(source('temphumidsensor_excellux'), req);
  const device = new Device(); const timers = new Map(); let nextTimer = 0;
  device.homey = { setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; }, clearTimeout: id => timers.delete(id) };
  const sent = []; const node = new EventEmitter();
  node.endpointDescriptors = [{ endpointId: 1, inputClusters: [0, 3, 1, 1026, 1029], outputClusters: [3, 61184] }];
  node.sendFrame = async (...args) => sent.push(args);
  const zclNode = new ZCLNode(node);
  const flushTimers = async () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); await Promise.resolve(); };
  return { device, node, zclNode, sent, timers, flushTimers };
}

test('NTCHT02 manifest preserves identity and existing capability ids, adds only onboard and scoped metadata', () => {
  assert.deepEqual(compose.zigbee.manufacturerName, ['NTCHT02']);
  assert.deepEqual(compose.zigbee.productId, ['Excellux']);
  assert.deepEqual(compose.zigbee.endpoints['1'].clusters, [0, 1, 1026, 1029]);
  assert.deepEqual(compose.zigbee.endpoints['1'].bindings, []);
  assert.deepEqual(compose.capabilities, ['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery', 'measure_temperature.internal']);
  assert.deepEqual(compose.energy.batteries, ['CR2450']);
  assert.match(compose.zigbee.learnmode.instruction.en, /5 seconds.*flashing.*Release/);
  assert.equal(settings.find(s => s.id === 'sampling_interval').attr.min, 5);
  const manifest = require('../app.json');
  const matches = manifest.drivers.filter(d => d.zigbee?.manufacturerName?.includes('NTCHT02') && d.zigbee?.productId?.includes('Excellux'));
  assert.deepEqual(matches.map(d => d.id), ['temphumidsensor_excellux']);
  assert.deepEqual(matches[0].energy.batteries, ['CR2450']);
});

test('redacted physical frames decode exact probe, onboard, humidity, battery and sampling datapoints', () => {
  assert.equal(fixtures.frames.length, 5);
  for (const frame of fixtures.frames) assert.deepEqual(protocol.measurements(protocol.inspect(Buffer.from(frame.frame, 'hex'))), frame.expected);
  assert.deepEqual(protocol.measurements(protocol.inspect(Buffer.from('190102010005020004ffffff9c', 'hex'))), {internal: -1});
  assert.deepEqual(protocol.measurements(protocol.inspect(Buffer.from('19010201000502000400', 'hex'))), {});
  assert.equal(protocol.samplingFrame(5, 1).toString('hex'), '11010001006502000400000005');
  for (const seconds of [0, 6, 1205, NaN]) assert.throws(() => protocol.samplingFrame(seconds));
});

test('passive initialization sends no requests; real ZCL reports retain formatting, offsets and low battery', async () => {
  const f = fixture(); await f.device.onNodeInit(f);
  assert.deepEqual(f.sent, []); assert.deepEqual(f.device.energy.batteries, ['CR2450']);
  f.device.settings.temperature_offset = 1;
  f.device.settings.temperature_decimals = '2';
  f.device.settings.humidity_decimals = '2';
  await f.node.handleFrame(1, 1026, Buffer.from('18010a0000292509', 'hex'), {});
  await f.node.handleFrame(1, 1029, Buffer.from('18020a0000212812', 'hex'), {});
  await f.node.handleFrame(1, 1, Buffer.from('18030a21002012', 'hex'), {});
  assert.equal(f.device.values.get('measure_temperature'), 24.41);
  assert.equal(f.device.values.get('measure_humidity'), 46.48);
  assert.equal(f.device.values.get('measure_battery'), 9);
  assert.equal(f.device.values.get('alarm_battery'), true);
  await f.node.handleFrame(1, 1026, Buffer.from('18040a0000290080', 'hex'), {});
  assert.equal(f.device.values.get('measure_temperature'), 24.41);
});

test('raw EF00 output frames update independent onboard capability without disturbing probe or shared drivers', async () => {
  const f = fixture(); await f.device.onNodeInit(f);
  for (const frame of fixtures.frames) await f.node.handleFrame(1, 61184, Buffer.from(frame.frame, 'hex'), {});
  assert.equal(f.device.values.get('measure_temperature'), 24.5);
  assert.equal(f.device.values.get('measure_temperature.internal'), 23.4);
  assert.equal(f.device.values.get('measure_humidity'), 44.4);
  assert.equal(f.device.values.get('measure_battery'), 90);
  await f.flushTimers(); assert.equal(f.device.settings.sampling_confirmation, 'Sensor reported 5 seconds');
});

test('sampling writes only on explicit settings change and does not invent device confirmation', async () => {
  const f = fixture(); await f.device.onNodeInit(f);
  await f.device.onSettings({newSettings:{sampling_interval:5},changedKeys:['sampling_interval']});
  assert.equal(f.sent.length, 1); assert.deepEqual(f.sent[0].slice(0, 2), [1,61184]);
  assert.equal(f.sent[0][2].toString('hex'), '11010001006502000400000005');
  await f.flushTimers();
  assert.equal(f.device.settings.sampling_confirmation, undefined);
  const report = fixtures.frames.find(frame => frame.datapoint === 101);
  await f.node.handleFrame(1, 61184, Buffer.from(report.frame, 'hex'), {});
  await f.flushTimers();
  await f.device.onSettings({newSettings:{sampling_interval:60},changedKeys:['sampling_interval']});
  await f.flushTimers();
  assert.equal(f.device.settings.sampling_confirmation, 'Sensor reported 5 seconds');
  await assert.rejects(f.device.onSettings({newSettings:{sampling_interval:6},changedKeys:['sampling_interval']}));
  assert.equal(f.sent.length, 2);
});

test('onboard capability migrates once; reinitialization and deletion detach owned callbacks and timers', async () => {
  const f = fixture(); f.device.capabilities.delete('measure_temperature.internal');
  const before = f.node.handleFrame;
  await f.device.onNodeInit(f); assert.ok(f.device.hasCapability('measure_temperature.internal'));
  await f.device.onNodeInit(f);
  assert.equal(f.zclNode.endpoints[1].clusters.temperatureMeasurement.listenerCount('attr.measuredValue'), 1);
  f.device.onUninit(); assert.equal(f.node.handleFrame, before);
  assert.equal(f.zclNode.endpoints[1].clusters.temperatureMeasurement.listenerCount('attr.measuredValue'), 0);
  await f.device.onNodeInit(f); f.device.onDeleted(); assert.equal(f.node.handleFrame, before); assert.equal(f.device.deleted,true);
});

test('interleaved standard and Tuya reports keep the external probe and onboard temperature independent', async () => {
  const f = fixture();
  await f.device.onNodeInit(f);
  f.device.settings.temperature_offset = 1;
  f.device.settings.temperature_decimals = '2';
  const report = id => Buffer.from(fixtures.frames.find(frame => frame.datapoint === id).frame, 'hex');
  await f.node.handleFrame(1, 1026, Buffer.from('18010a0000292509', 'hex'), {});
  await f.node.handleFrame(1, 61184, report(5), {});
  assert.equal(f.device.values.get('measure_temperature'), 24.41);
  assert.equal(f.device.values.get('measure_temperature.internal'), 23.36);
  await f.node.handleFrame(1, 61184, report(1), {});
  assert.equal(f.device.values.get('measure_temperature'), 25.5);
  await f.node.handleFrame(1, 1026, Buffer.from('18020a00002938ff', 'hex'), {});
  assert.equal(f.device.values.get('measure_temperature'), 25.5);
  assert.equal(f.device.values.get('measure_temperature.internal'), 23.36);
});

test('NTCHT02 mixed-scale standard reports cannot replace a verified DP1 after restart', async () => {
  const f = fixture();
  await f.device.onNodeInit(f);
  const standard = (unit, raw) => {
    const frame = Buffer.from('18010a0000290000', 'hex');
    frame.writeInt16LE(raw, 6);
    return unit.node.handleFrame(1, 1026, frame, {});
  };
  const dp1 = (unit, raw) => {
    const frame = Buffer.from(fixtures.frames.find(row => row.datapoint === 1).frame, 'hex');
    frame.writeInt32BE(raw, frame.length - 4);
    return unit.node.handleFrame(1, 61184, frame, {});
  };
  await dp1(f, 99999);
  await standard(f, 1440);
  assert.equal(f.device.values.get('measure_temperature'), 14.4);
  await dp1(f, 144);
  await standard(f, 144);
  assert.equal(f.device.values.get('measure_temperature'), 14.4);

  const restart = fixture();
  restart.device.store = { ...f.device.store };
  restart.device.values = new Map(f.device.values);
  await restart.device.onNodeInit(restart);
  await standard(restart, 144);
  assert.equal(restart.device.values.get('measure_temperature'), 14.4);
  await dp1(restart, -12);
  assert.equal(restart.device.values.get('measure_temperature'), -1.2);
  await dp1(restart, 0);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(restart.device.values.get('measure_temperature'), 0);
});

test('a slow Homey write for the standard probe finishes before a newer DP1 write', async () => {
  const f = fixture();
  await f.device.onNodeInit(f);
  const writes = [];
  let release;
  f.device.setCapabilityValue = async (id, value) => {
    writes.push(value);
    if (writes.length === 1) await new Promise(resolve => { release = resolve; });
    f.device.values.set(id, value);
  };
  await f.node.handleFrame(1, 1026, Buffer.from('18010a0000299000', 'hex'), {});
  const probe = fixtures.frames.find(row => row.datapoint === 1);
  await f.node.handleFrame(1, 61184, Buffer.from(probe.frame, 'hex'), {});
  assert.deepEqual(writes, [1.4]);
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(writes, [1.4, 24.5]);
  assert.equal(f.device.getCapabilityValue('measure_temperature'), 24.5);
});
