'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === 'homey') return 'homey';
  return originalResolve.call(this, request, parent, isMain, options);
};
require.cache.homey = {
  id: 'homey',
  filename: 'homey',
  loaded: true,
  exports: {
    Device: class Device {},
    Driver: class Driver {},
  },
};

const { Cluster, ZCLStruct } = require('zigbee-clusters');
const zigbeeClustersPackage = require('zigbee-clusters/package.json');
const TuyaSpecificCluster = require('../lib/TuyaSpecificCluster');
const Device = require('../drivers/thermostatic_radiator_valve_avatto/device');

Cluster.addCluster(TuyaSpecificCluster);

const root = path.resolve(__dirname, '..');
const driverCompose = require('../drivers/thermostatic_radiator_valve_avatto/driver.compose.json');
const otherTrv = require('../drivers/thermostatic_radiator_valve/driver.compose.json');
const sharedWindow = require('../.homeycompose/capabilities/window_open.json');
const windowStatus = require('../.homeycompose/capabilities/window_open_status.json');
const deviceSource = fs.readFileSync(
  path.join(root, 'drivers', 'thermostatic_radiator_valve_avatto', 'device.js'),
  'utf8',
);

function makeDevice(tuya = {}) {
  const device = Object.create(Device.prototype);
  device.values = new Map([['target_temperature', 20]]);
  device.settings = { debugLogging: false };
  device.logs = [];
  device.calls = [];
  device._transactionID = 0;
  device._lastStableTarget = 20;
  device.useRealTimers = false;
  device.getCapabilityValue = id => (device.values.has(id) ? device.values.get(id) : null);
  device.setCapabilityValue = async (id, value) => {
    device.values.set(id, value);
  };
  device.getSetting = id => device.settings[id];
  device.setSettings = async settings => {
    Object.assign(device.settings, settings);
  };
  device.hasCapability = () => true;
  device.addCapability = async () => {};
  device.log = (...args) => {
    device.logs.push(args.map(part => String(part)).join(' '));
  };
  device.error = (...args) => {
    device.logs.push(`error ${args.map(part => String(part)).join(' ')}`);
  };
  device.homey = {
    setTimeout(fn, ms) {
      if (!device.useRealTimers) return { fn, ms };
      return setTimeout(fn, ms);
    },
    clearTimeout(timer) {
      if (device.useRealTimers) clearTimeout(timer);
    },
    flow: {
      getDeviceTriggerCard() {
        return { trigger: async () => {} };
      },
    },
  };
  device.zclNode = {
    endpoints: {
      1: {
        clusters: {
          tuya: {
            async datapoint(frame) {
              device.calls.push(frame);
              if (tuya.datapoint) return tuya.datapoint(frame);
              return undefined;
            },
            async timeSync(args) {
              device.calls.push(args);
              if (tuya.timeSync) return tuya.timeSync(args);
              return undefined;
            },
            async dataQuery() {},
            on() {},
          },
        },
        bind() {},
      },
    },
  };
  return device;
}

function waitUntil(predicate, timeout = 1000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error('timed out waiting for condition'));
        return;
      }
      setTimeout(tick, 5);
    };
    tick();
  });
}

function valueFrame(raw) {
  const data = Buffer.alloc(4);
  data.writeUInt32BE(raw >>> 0, 0);
  return data;
}

test('documented time cooldown is the 20-second constant', () => {
  assert.match(deviceSource, /TIME_ANSWER_COOLDOWN_MS = 20 \* 1000/);
  assert.match(deviceSource, /every 20 seconds/);
  assert.doesNotMatch(deviceSource, /per minute/);
});

test('Tuya timeSync serializes an 8-byte payload with length 8 on zigbee-clusters 2.4.1', () => {
  assert.equal(zigbeeClustersPackage.version, '2.4.1');
  const TimeSync = ZCLStruct('tuya.timeSync', TuyaSpecificCluster.COMMANDS.timeSync.args);
  const payload = Buffer.from([0x6a, 0xde, 0x41, 0x44, 0x6a, 0xde, 0x41, 0x44]);

  const withSize = new TimeSync({ payloadSize: payload.length, payload }).toBuffer();
  const withoutSize = new TimeSync({ payload }).toBuffer();

  assert.equal(withSize.readUInt16LE(0), 8);
  assert.equal(withSize.subarray(2).length, 8);
  assert.deepEqual(withSize.subarray(2), payload);
  assert.equal(withoutSize.readUInt16LE(0), 0);
});

test('a time burst sends one reply, then another only after 20 seconds', async () => {
  const device = makeDevice();
  const sent = [];
  device.zclNode.endpoints[1].clusters.tuya.timeSync = async args => {
    sent.push(args);
  };
  const realNow = Date.now;
  let now = 1700000000000;
  Date.now = () => now;
  try {
    await device.onTuyaTimeSync({ payload: Buffer.from([0x01, 0x00]) });
    await device.onTuyaTimeSync({ payload: Buffer.from([0x02, 0x00]) });
    await device.onTuyaTimeSync({ payload: Buffer.from([0x03, 0x00]) });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].payloadSize, 8);
    assert.equal(sent[0].payload.length, 8);

    now += 19999;
    await device.onTuyaTimeSync({ payload: Buffer.from([0x04, 0x00]) });
    assert.equal(sent.length, 1);

    now += 1;
    await device.onTuyaTimeSync({ payload: Buffer.from([0x05, 0x00]) });
    assert.equal(sent.length, 2);
    assert.equal(sent[1].payloadSize, sent[1].payload.length);
  } finally {
    Date.now = realNow;
  }
});

test('an in-flight time reply absorbs the rest of the burst', async () => {
  const device = makeDevice();
  let release;
  let calls = 0;
  device.zclNode.endpoints[1].clusters.tuya.timeSync = () => {
    calls += 1;
    return new Promise(resolve => {
      release = resolve;
    });
  };

  const first = device.onTuyaTimeSync({ payload: Buffer.from([0x01, 0x00]) });
  const second = device.onTuyaTimeSync({ payload: Buffer.from([0x02, 0x00]) });
  assert.equal(calls, 1);
  release();
  await first;
  await second;
  assert.equal(calls, 1);
});

test('a rejected DP 4 write restores the previous target and rejects the caller', async () => {
  const device = makeDevice({
    datapoint: async () => {
      throw new Error('radio rejected');
    },
  });

  await assert.rejects(device.setTargetTemperature(22), /radio rejected/);
  assert.equal(device.values.get('target_temperature'), 20);
  assert.equal(device.setpointState, 'failed');
});

test('a late DP 4 write after the timeout does not put the failed setpoint back', async () => {
  let release;
  const device = makeDevice({
    datapoint: () => new Promise(resolve => {
      release = resolve;
    }),
  });
  device.useRealTimers = true;
  device.setpointWriteTimeoutMs = 30;

  await assert.rejects(device.setTargetTemperature(22), /timed out/);
  assert.equal(device.values.get('target_temperature'), 20);
  assert.equal(device.setpointState, 'failed');

  release();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(device.values.get('target_temperature'), 20);
  assert.equal(device.setpointState, 'failed');
});

test('a successful DP 4 write stays pending until the valve reports the same value', async () => {
  const device = makeDevice();
  await device.setTargetTemperature(22);
  assert.equal(device.setpointState, 'pending');
  assert.equal(device.values.get('target_temperature'), 22);
  assert.equal(device.calls[0].data.readUInt32BE(0), 220);

  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(210),
  });
  assert.equal(device.setpointState, 'pending');
  assert.equal(device.values.get('target_temperature'), 21);

  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(220),
  });
  assert.equal(device.setpointState, 'acknowledged');
  assert.equal(device.values.get('target_temperature'), 22);
});

test('only the latest queued setpoint is written after the in-flight one', async () => {
  let release;
  const device = makeDevice({
    datapoint: () => {
      if (device.calls.length === 1) {
        return new Promise(resolve => {
          release = resolve;
        });
      }
      return undefined;
    },
  });

  const first = device.setTargetTemperature(21);
  await waitUntil(() => device.calls.length === 1);
  const superseded = device.setTargetTemperature(22);
  const latest = device.setTargetTemperature(23);

  await assert.rejects(superseded, /Superseded by a newer target temperature/);
  release();
  await first;
  await latest;

  assert.deepEqual(
    device.calls.map(frame => frame.data.readUInt32BE(0)),
    [210, 230],
  );
  assert.equal(device.values.get('target_temperature'), 23);
  assert.equal(device.setpointState, 'pending');
});

test('negative DP 47 calibration is written as uint32 two\'s complement and read back signed', async () => {
  const device = makeDevice();
  await device.onSettings({
    newSettings: { temperatureCalibration: -2.5 },
    changedKeys: ['temperatureCalibration'],
  });

  assert.equal(device.calls.length, 1);
  const frame = device.calls[0];
  assert.equal(frame.dp, 47);
  assert.equal(frame.datatype, 2);
  assert.equal(frame.length, 4);
  assert.deepEqual([...frame.data], [0xff, 0xff, 0xff, 0xe7]);

  await device.processDatapoint('reporting', {
    dp: 47,
    datatype: 2,
    data: Buffer.from([0xff, 0xff, 0xff, 0xe7]),
  });
  assert.equal(device.settings.temperatureCalibration, -2.5);
});

test('raw datapoint logging stays off unless the debug setting is enabled', async () => {
  const device = makeDevice();
  await device.processDatapoint('reporting', {
    dp: 5,
    datatype: 2,
    data: valueFrame(200),
  });
  assert.equal(device.logs.length, 0);
  assert.equal(device.values.get('measure_temperature'), 20);

  device.settings.debugLogging = true;
  await device.processDatapoint('reporting', {
    dp: 5,
    datatype: 2,
    data: valueFrame(205),
  });
  assert.ok(device.logs.some(line => line.includes('dp=5')));
});

test('DP 15 uses the read-only window status and does not use shared window_open', async () => {
  assert.equal(sharedWindow.setable, true);
  assert.equal(windowStatus.getable, true);
  assert.equal(windowStatus.setable, false);
  assert.ok(driverCompose.capabilities.includes('window_open_status'));
  assert.equal(driverCompose.capabilities.includes('window_open'), false);

  const device = makeDevice();
  await device.processDatapoint('reporting', {
    dp: 15,
    datatype: 4,
    data: Buffer.from([1]),
  });
  assert.equal(device.values.get('window_open_status'), true);
  assert.equal(device.values.has('window_open'), false);
});

test('_TZE204_vjpaih9f is an exact AVATTO TRV identity on its own', () => {
  assertManufacturer('_TZE204_vjpaih9f');
});

test('_TZE284_vjpaih9f is an exact AVATTO TRV identity on its own', () => {
  assertManufacturer('_TZE284_vjpaih9f');
});

function assertManufacturer(manufacturer) {
  assert.equal(driverCompose.zigbee.manufacturerName.includes(manufacturer), true);
  assert.equal(driverCompose.zigbee.productId.includes('TS0601'), true);
  assert.equal(otherTrv.zigbee.manufacturerName.includes(manufacturer), false);

  const app = require('../app.json');
  const matches = app.drivers.filter(driver =>
    [].concat(driver.zigbee?.manufacturerName || []).includes(manufacturer)
    && [].concat(driver.zigbee?.productId || []).includes('TS0601'));
  assert.deepEqual(matches.map(driver => driver.id), ['thermostatic_radiator_valve_avatto']);
}
