'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const UnmappedDpLogLimiter = require('../drivers/wall_thermostat/unmapped-dp-log');

test('repeated unknown DP36 reports are summarized instead of flooding logs', () => {
  let timestamp = 1000;
  const messages = [];
  const limiter = new UnmappedDpLogLimiter(
    (...args) => messages.push(args),
    () => timestamp
  );

  limiter.record(36, 1);
  for (let i = 0; i < 1200; i += 1) limiter.record(36, 1);

  assert.deepEqual(messages, [['processReporting', 36, 1]]);

  timestamp += 60000;
  limiter.record(36, 1);

  assert.deepEqual(messages, [
    ['processReporting', 36, 1],
    ['Suppressed repeated unmapped Tuya DP reports', 36, 1200, 'previous value:', 1],
    ['processReporting', 36, 1],
  ]);
});

test('changed and distinct unmapped datapoint values remain visible', () => {
  let timestamp = 100;
  const messages = [];
  const limiter = new UnmappedDpLogLimiter(
    (...args) => messages.push(args),
    () => timestamp
  );

  limiter.record(36, 1);
  limiter.record(36, 1); // Duplicate: suppressed.
  limiter.record(36, 2); // New value: log immediately, including suppressed count.
  limiter.record(37, 1); // Distinct DP: first occurrence is always visible.
  timestamp += 10;
  limiter.record(36, 2); // Repeated again: suppressed.

  assert.deepEqual(messages, [
    ['processReporting', 36, 1],
    ['Suppressed repeated unmapped Tuya DP reports', 36, 1, 'previous value:', 1],
    ['processReporting', 36, 2],
    ['processReporting', 37, 1],
  ]);
});

test('identical Buffer payloads use content equality rather than object identity', () => {
  const messages = [];
  const limiter = new UnmappedDpLogLimiter((...args) => messages.push(args), () => 0);

  limiter.record(36, Buffer.from([0, 1]));
  limiter.record(36, Buffer.from([0, 1]));
  limiter.record(36, Buffer.from([0, 2]));

  assert.equal(messages.length, 3);
  assert.equal(messages[0][0], 'processReporting');
  assert.equal(messages[1][0], 'Suppressed repeated unmapped Tuya DP reports');
  assert.equal(messages[2][0], 'processReporting');
});

test('actual wall thermostat routes unknown DPs through limiter without changing mapped capabilities', async () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'drivers', 'wall_thermostat', 'device.js'),
    'utf8'
  );
  const moduleStub = { exports: {} };
  class BaseDevice {
    constructor() {
      this.messages = [];
      this.values = new Map();
    }
    log(...args) { this.messages.push(args); }
    hasCapability() { return true; }
    setCapabilityValue(key, value) {
      this.values.set(key, value);
      return Promise.resolve();
    }
    registerCapabilityListener() {}
  }
  const fakeRequire = name => {
    if (name === '../../lib/TuyaSpecificCluster') return class TuyaSpecificCluster {};
    if (name === '../../lib/TuyaOnOffCluster') return class TuyaOnOffCluster {};
    if (name === '../../lib/TuyaSpecificClusterDevice') return BaseDevice;
    if (name === './helpers') return { getDataValue: data => data.data };
    if (name === './unmapped-dp-log') return UnmappedDpLogLimiter;
    if (name === 'zigbee-clusters') return { Cluster: { addCluster() {} } };
    throw new Error('Unexpected import: ' + name);
  };
  const factory = vm.runInNewContext(
    '(function(require,module,exports){' + source + '\n})'
  );
  factory(fakeRequire, moduleStub, moduleStub.exports);

  const Device = moduleStub.exports;
  const device = new Device();
  const listeners = {};
  await device.onNodeInit({
    zclNode: { endpoints: { 1: { clusters: {
      tuya: { on(name, handler) { listeners[name] = handler; } },
    } } } },
  });
  assert.equal(typeof listeners.reporting, 'function');
  assert.equal(typeof listeners.response, 'function');

  await listeners.reporting({ dp: 36, data: 1 });
  await listeners.response({ dp: 36, data: 1 });
  await listeners.reporting({ dp: 36, data: 1 });
  const unknownMessages = device.messages.filter(([name]) => name === 'processReporting');
  assert.deepEqual(unknownMessages, [['processReporting', 36, 1]]);

  await listeners.reporting({ dp: 24, data: 235 });
  assert.equal(device.values.get('measure_temperature'), 23.5);
  await listeners.reporting({ dp: 36, data: 2 });
  assert.deepEqual(device.messages.at(-1), ['processReporting', 36, 2]);
});
