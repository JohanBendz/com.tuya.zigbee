'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'drivers', 'temphumidsensor4', 'device.js'),
  'utf8'
);

// Exercise the actual driver with lightweight Homey/Zigbee stubs. This catches
// failures caused by a sleeping sensor's Basic read, not just source changes.
function loadDevice() {
  class MockDevice {
    constructor() {
      this.capabilities = new Set(['measure_temperature', 'measure_humidity', 'measure_battery']);
      this.values = new Map();
    }

    hasCapability(name) { return this.capabilities.has(name); }
    async addCapability(name) { this.capabilities.add(name); }
    getSetting() { return undefined; }
    log() {}
    error() {}
    setCapabilityValue(name, value) {
      this.values.set(name, value);
      return Promise.resolve();
    }
  }

  const exportsModule = { exports: {} };
  const fakeRequire = name => {
    if (name === 'zigbee-clusters') return { Cluster: { addCluster() {} } };
    if (name === '../../lib/TuyaSpecificCluster') return class TuyaCluster {};
    if (name === '../../lib/TuyaSpecificClusterDevice') return MockDevice;
    throw new Error('Unexpected dependency: ' + name);
  };

  const factory = vm.runInNewContext(
    '(function (require, module, exports) {' + source + '})'
  );
  factory(fakeRequire, exportsModule, exportsModule.exports);
  return exportsModule.exports;
}

async function setup({ nodeManufacturer, basicManufacturer, basicFails = false, alarm = false }) {
  const Device = loadDevice();
  const device = new Device();
  if (alarm) device.capabilities.add('alarm_battery');
  const listeners = {};
  let basicReads = 0;

  const zclNode = {
    endpoints: {
      1: {
        clusters: {
          basic: {
            async readAttributes() {
              basicReads += 1;
              if (basicFails) throw new Error('Sleepy device did not answer Basic read');
              return { manufacturerName: basicManufacturer };
            },
          },
          tuya: {
            on(name, listener) { listeners[name] = listener; },
          },
        },
      },
    },
  };

  await device.onNodeInit({
    zclNode,
    node: nodeManufacturer ? { manufacturerName: nodeManufacturer, productId: 'TS0601' } : undefined,
  });

  return { device, listeners, basicReads: () => basicReads };
}

function frame(dp, value, datatype = 2) {
  return {
    dp,
    datatype,
    data: datatype === 4 ? [value] : [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ],
  };
}

test('TH05Z battery DP4 works from cached node identity without any Basic read', async () => {
  const { device, listeners, basicReads } = await setup({
    nodeManufacturer: '_TZE200_vvmbj46n',
    basicFails: true,
  });

  assert.equal(device.isVvmbj46n, true);
  assert.equal(basicReads(), 0, 'must not query a potentially sleepy device for its identity');

  await listeners.response(frame(4, 49)); // From the 0.3.0 diagnostic report.
  assert.equal(device.values.get('measure_battery'), 49);
  await listeners.reporting(frame(4, 48));
  assert.equal(device.values.get('measure_battery'), 48);

  await listeners.reporting(frame(3, 2, 4));
  assert.equal(device.values.get('measure_battery'), 48, 'TH05Z must not use DP3 battery state');
});

test('already paired legacy profile can fall back to Basic identity when node is missing', async () => {
  const { device, listeners, basicReads } = await setup({
    basicManufacturer: '_TZE200_vvmbj46n',
  });

  assert.equal(basicReads(), 1);
  assert.equal(device.isVvmbj46n, true);
  await listeners.response(frame(4, 49));
  assert.equal(device.values.get('measure_battery'), 49);
});

test('other temperature/humidity profiles preserve DP3 battery state mapping', async () => {
  const { device, listeners, basicReads } = await setup({
    nodeManufacturer: '_TZE200_yjjdcqsq',
    basicFails: true,
    alarm: true,
  });

  assert.equal(basicReads(), 0);
  assert.equal(device.isVvmbj46n, false);
  await listeners.response(frame(3, 1, 4));
  assert.equal(device.values.get('measure_battery'), 50);
  assert.equal(device.values.get('alarm_battery'), false);
  await listeners.response(frame(4, 49));
  assert.equal(device.values.get('measure_battery'), 50, 'unverified DP4 must not leak into generic profile');
});
