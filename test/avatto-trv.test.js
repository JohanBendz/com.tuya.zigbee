'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');

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
  device.getName = () => 'AVATTO TRV';
  device.registerCapabilityListener = () => {};
  device.timezone = 'UTC';
  device.listeners = [];
  device.binds = [];
  device.unbinds = [];
  device.queries = 0;
  device.homey = {
    setTimeout(fn, ms) {
      if (!device.useRealTimers) return { fn, ms };
      return setTimeout(fn, ms);
    },
    clearTimeout(timer) {
      if (device.useRealTimers) clearTimeout(timer);
    },
    clock: {
      getTimezone() {
        return device.timezone;
      },
    },
    flow: {
      getDeviceTriggerCard() {
        return { trigger: async () => {} };
      },
    },
  };
  const tuyaCluster = {
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
    async dataQuery() {
      device.queries += 1;
    },
    on(event, fn) {
      device.listeners.push({ event, fn });
    },
    removeListener(event, fn) {
      device.listeners = device.listeners.filter(item => item.event !== event || item.fn !== fn);
    },
  };
  device.zclNode = {
    endpoints: {
      1: {
        clusters: {
          tuya: tuyaCluster,
        },
        bind(cluster, handler) {
          device.binds.push({ cluster, handler });
        },
        unbind(cluster, handler) {
          device.unbinds.push({ cluster, handler });
        },
      },
    },
  };
  return device;
}

function flushTimers(device, kind) {
  const ready = (device._timers || []).filter(timer => !kind || timer.kind === kind);
  device._timers = (device._timers || []).filter(timer => kind && timer.kind !== kind);
  for (const timer of ready) timer.fn();
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

test('pair instructions describe the 5°C knob hold in every locale', () => {
  const instruction = driverCompose.zigbee.learnmode.instruction;
  assert.deepEqual(Object.keys(instruction).sort(), ['de', 'en', 'nl']);
  assert.match(instruction.en, /5°C/);
  assert.match(instruction.en, /large rotary knob/);
  assert.match(instruction.en, /5 seconds/);
  assert.doesNotMatch(instruction.en, /pairing button/);
  assert.match(instruction.nl, /5°C/);
  assert.match(instruction.nl, /draaiknop/);
  assert.match(instruction.de, /5°C/);
  assert.match(instruction.de, /Drehknopf/);
});

test('full manifest lists these manufacturers only on the AVATTO driver', () => {
  // Steven paired this valve on a Homey Pro (2023) by turning it to 5°C until
  // it switched off, then holding the large knob for 5 seconds. After the
  // client cluster list included 10 and 25, generic Zigbee add selected
  // thermostatic_radiator_valve_avatto. That is a physical observation.
  // A simulated overlap score is not Homey's pairing algorithm, and this
  // pairing is not an entry in the public Test acceptance matrix.
  assertManufacturer('_TZE204_vjpaih9f');
  assertManufacturer('_TZE284_vjpaih9f');
  assert.deepEqual(driverCompose.zigbee.endpoints['1'].clusters, [0, 4, 5, 10, 25, 61184]);
  assert.deepEqual(otherTrv.zigbee.endpoints['1'].clusters, [0, 4, 5, 10, 25, 61184]);
  assert.equal(deviceSource.includes('zigbeeMatchScore'), false);
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

test('local offset follows Homey timezone while the process stays on UTC', () => {
  const script = `
    const Module = require('node:module');
    const assert = require('node:assert/strict');
    const originalResolve = Module._resolveFilename;
    Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
      if (request === 'homey') return 'homey';
      return originalResolve.call(this, request, parent, isMain, options);
    };
    require.cache.homey = {
      id: 'homey', filename: 'homey', loaded: true,
      exports: { Device: class Device {}, Driver: class Driver {} },
    };
    const Device = require(${JSON.stringify(path.join(root, 'drivers/thermostatic_radiator_valve_avatto/device.js'))});
    assert.equal(new Date().getTimezoneOffset(), 0, 'process TZ must be UTC');
    const winter = new Date('2026-01-15T12:00:00Z');
    const summer = new Date('2026-07-15T12:00:00Z');
    assert.equal(Device.localOffsetSeconds('Europe/Stockholm', winter), 3600);
    assert.equal(Device.localOffsetSeconds('Europe/Stockholm', summer), 7200);
    assert.equal(Device.localOffsetSeconds('America/New_York', winter), -18000);
    assert.equal(Device.localOffsetSeconds('Asia/Kolkata', winter), 19800);
    const epoch2000 = Device.ZIGBEE_EPOCH_MS / 1000;
    assert.equal(Math.floor(winter.getTime() / 1000) - Math.floor((winter.getTime() - Device.ZIGBEE_EPOCH_MS) / 1000), epoch2000);
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    env: { ...process.env, TZ: 'UTC' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('Tuya Unix local time and Zigbee epoch 2000 use the Homey offset', async () => {
  const device = makeDevice();
  device.timezone = 'Europe/Stockholm';
  const instant = new Date('2026-01-15T12:00:00Z');
  const realNow = Date.now;
  Date.now = () => instant.getTime();
  try {
    await device.sendTuyaTime('test');
    const payload = device.calls[0].payload;
    const utc = payload.readUInt32BE(0);
    const local = payload.readUInt32BE(4);
    assert.equal(utc, Math.floor(instant.getTime() / 1000));
    assert.equal(local - utc, 3600);

    const cluster = new Device.AvattoTimeBoundCluster(device._timezoneProvider(device._generation));
    device._alive = true;
    const read = await cluster.readAttributes({ attributes: [0x0000, 0x0007, 0x0002] });
    const zigbeeUtc = read.attributes.readUInt32LE(4);
    const zigbeeLocal = read.attributes.readUInt32LE(12);
    const zone = read.attributes.readInt32LE(20);
    assert.equal(utc - zigbeeUtc, Device.ZIGBEE_EPOCH_MS / 1000);
    assert.equal(zigbeeLocal - zigbeeUtc, 3600);
    assert.equal(zone, 3600);
  } finally {
    Date.now = realNow;
  }
});

test('a transport accept without a report does not become the rollback value', async () => {
  const device = makeDevice({
    datapoint: async frame => {
      if (frame.data.readUInt32BE(0) === 220) throw new Error('radio rejected');
    },
  });
  await device.setTargetTemperature(21);
  assert.equal(device.setpointState, 'pending');
  assert.equal(device.values.get('target_temperature'), 21);
  assert.equal(device._deviceTarget, 20);

  await assert.rejects(device.setTargetTemperature(22), /radio rejected/);
  assert.equal(device.values.get('target_temperature'), 20);
  assert.equal(device.setpointState, 'failed');
});

test('a rejected second write rolls back to the last report, not the optimistic target', async () => {
  const device = makeDevice({
    datapoint: async frame => {
      if (frame.data.readUInt32BE(0) === 220) throw new Error('radio rejected');
    },
  });
  await device.setTargetTemperature(21);
  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(210),
  });
  assert.equal(device.setpointState, 'acknowledged');

  await assert.rejects(device.setTargetTemperature(22), /radio rejected/);
  assert.equal(device.values.get('target_temperature'), 21);
  assert.equal(device._deviceTarget, 21);
  assert.equal(device.setpointState, 'failed');
});

test('a late physical report after timeout updates the UI and leaves the request failed', async () => {
  let release;
  const device = makeDevice({
    datapoint: () => new Promise(resolve => {
      release = resolve;
    }),
  });
  const pending = device.setTargetTemperature(22);
  await waitUntil(() => device.calls.length === 1);
  flushTimers(device, 'setpoint-timeout');
  await assert.rejects(pending, /timed out/);
  assert.equal(device.values.get('target_temperature'), 20);
  assert.equal(device.setpointState, 'failed');
  assert.equal(device.calls.length, 1);

  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(device.calls.length, 1, 'a timed-out write is not retried');
  assert.equal(device.setpointState, 'failed');

  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(220),
  });
  assert.equal(device.values.get('target_temperature'), 22);
  assert.equal(device._deviceTarget, 22);
  assert.equal(device.setpointState, 'failed');
});

test('a report during a write that later rejects does not acknowledge the request', async () => {
  let rejectWrite;
  const device = makeDevice({
    datapoint: () => new Promise((resolve, reject) => {
      rejectWrite = reject;
    }),
  });
  const pending = device.setTargetTemperature(22);
  await waitUntil(() => device.calls.length === 1);
  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(220),
  });
  assert.equal(device.values.get('target_temperature'), 22);
  assert.equal(device.setpointState, 'pending');

  rejectWrite(new Error('radio rejected'));
  await assert.rejects(pending, /radio rejected/);
  assert.equal(device.values.get('target_temperature'), 22);
  assert.equal(device._deviceTarget, 22);
  assert.equal(device.setpointState, 'failed');
});

test('out-of-order reports follow the latest valid setpoint and ack only a match', async () => {
  const device = makeDevice();
  await device.setTargetTemperature(22);
  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(200),
  });
  assert.equal(device.values.get('target_temperature'), 20);
  assert.equal(device.setpointState, 'pending');

  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(220),
  });
  assert.equal(device.values.get('target_temperature'), 22);
  assert.equal(device.setpointState, 'acknowledged');
});

test('confirmation expiry does not turn a later matching report into an acknowledgement', async () => {
  const device = makeDevice();
  device.confirmationExpiryMs = 5;
  await device.setTargetTemperature(22);
  assert.equal(device.setpointState, 'pending');
  flushTimers(device, 'confirm-expiry');
  assert.equal(device.setpointState, 'expired');

  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(220),
  });
  assert.equal(device.values.get('target_temperature'), 22);
  assert.equal(device.setpointState, 'expired');
});

test('a queued write waits until the unresolved timed-out write settles', async () => {
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
  flushTimers(device, 'setpoint-timeout');
  await assert.rejects(first, /timed out/);

  const second = device.setTargetTemperature(22);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(device.calls.length, 1);
  assert.deepEqual(device.calls.map(frame => frame.data.readUInt32BE(0)), [210]);

  release();
  await second;
  assert.deepEqual(device.calls.map(frame => frame.data.readUInt32BE(0)), [210, 220]);
  assert.equal(device.values.get('target_temperature'), 22);
});

test('malformed DP 4 and DP 15 do not invent a setpoint or a closed window', async () => {
  const device = makeDevice();
  device.values.set('window_open_status', true);

  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    length: 2,
    data: Buffer.from([0x00, 0xc8]),
  });
  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 1,
    data: Buffer.from([1]),
  });
  await device.processDatapoint('reporting', {
    dp: 4,
    datatype: 2,
    data: valueFrame(0),
  });
  assert.equal(device.values.get('target_temperature'), 20);

  await device.processDatapoint('reporting', {
    dp: 15,
    datatype: 2,
    data: valueFrame(0),
  });
  await device.processDatapoint('reporting', {
    dp: 15,
    datatype: 4,
    data: Buffer.from([7]),
  });
  assert.equal(device.values.get('window_open_status'), true);

  await device.processDatapoint('reporting', {
    dp: 15,
    datatype: 4,
    data: Buffer.from([0]),
  });
  assert.equal(device.values.get('window_open_status'), false);
});

test('deletion and reinit drop listeners, timers and queued DP 4 work', async () => {
  let release;
  const device = makeDevice({
    datapoint: () => new Promise(resolve => {
      release = resolve;
    }),
  });
  await device.onNodeInit({ zclNode: device.zclNode });
  assert.ok(device.listeners.length >= 5);
  assert.equal(device.binds.length, 1);
  const firstListeners = device.listeners.map(item => item.fn);

  const active = device.setTargetTemperature(21);
  await waitUntil(() => device.calls.length === 1);
  const queued = device.setTargetTemperature(23);
  const query = (device._timers || []).find(timer => timer.kind === 'query');
  assert.ok(query);

  device.onDeleted();
  await assert.rejects(active, /removed/);
  await assert.rejects(queued, /removed/);
  assert.equal(device.listeners.length, 0);
  assert.equal(device.unbinds.length, 1);
  query.fn();
  assert.equal(device.queries, 0);
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(device.calls.length, 1);

  await device.onNodeInit({ zclNode: device.zclNode });
  assert.ok(device.listeners.length >= 5);
  assert.ok(device.listeners.every(item => !firstListeners.includes(item.fn)));
  await device.onUninit();
  assert.equal(device.listeners.length, 0);
  await assert.rejects(device.setTargetTemperature(22), /stopped/);
});
