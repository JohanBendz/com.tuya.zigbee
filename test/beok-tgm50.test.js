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

const { ZCLStruct } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../lib/TuyaSpecificCluster');
const Device = require('../drivers/wall_thermostat_beok_tgm50/device');

const root = path.resolve(__dirname, '..');
const driverCompose = require('../drivers/wall_thermostat_beok_tgm50/driver.compose.json');
const wallThermostat = require('../drivers/wall_thermostat/driver.compose.json');
const sharedPreset = require('../.homeycompose/capabilities/thermostat_preset.json');
const heatingCapability = require('../.homeycompose/capabilities/thermostat_heating.json');
const deviceSource = fs.readFileSync(
  path.join(root, 'drivers', 'wall_thermostat_beok_tgm50', 'device.js'),
  'utf8'
);
const wallSource = fs.readFileSync(
  path.join(root, 'drivers', 'wall_thermostat', 'device.js'),
  'utf8'
);

const EXACT_MANUFACTURER = '_TZE204_cvub6xbb';
const EXCLUDED_MANUFACTURERS = ['_TZE284_cvub6xbb', '_TZE204_mwomyz5n'];

function valueFrame(raw) {
  const data = Buffer.alloc(4);
  data.writeUInt32BE(raw >>> 0, 0);
  return data;
}

function makeDevice(tuya = {}) {
  const device = Object.create(Device.prototype);
  device.values = new Map([
    ['onoff', false],
    ['target_temperature', 20],
    ['measure_temperature', null],
    ['beok_tgm50_preset', '0'],
    ['thermostat_heating', false],
    ['child_lock', false],
    ['temp_calibration', 0],
  ]);
  device.settings = {
    sensorSelect: '0',
    hysteresis: 1,
    maxTemperature: 60,
    frostProtection: false,
    backlightMode: '1',
    soundEnabled: false,
  };
  device.logs = [];
  device.calls = [];
  device.handlers = {};
  device.added = [];
  device._transactionID = 0;
  device.getCapabilityValue = id => (device.values.has(id) ? device.values.get(id) : null);
  device.setCapabilityValue = async (id, value) => {
    device.values.set(id, value);
  };
  device.getSetting = id => device.settings[id];
  device.setSettings = async settings => {
    Object.assign(device.settings, settings);
  };
  device.hasCapability = () => true;
  device.addCapability = async id => {
    device.added.push(id);
  };
  device.registerCapabilityListener = (id, listener) => {
    device.handlers[id] = listener;
  };
  device.log = (...args) => {
    device.logs.push(args.map(part => String(part)).join(' '));
  };
  device.error = (...args) => {
    device.logs.push(`error ${args.map(part => String(part)).join(' ')}`);
  };
  device.zclNode = {
    endpoints: {
      1: {
        clusters: {
          tuya: {
            async datapoint(frame) {
              device.calls.push({ type: 'datapoint', frame });
              if (tuya.datapoint) return tuya.datapoint(frame);
              return undefined;
            },
            async timeSync(args) {
              device.calls.push({ type: 'timeSync', ...args });
              if (tuya.timeSync) return tuya.timeSync(args);
              return undefined;
            },
            async dataQuery() {
              device.calls.push({ type: 'dataQuery' });
            },
            on(event, handler) {
              device.handlers[event] = handler;
            },
          },
        },
      },
    },
  };
  return device;
}

test('datapoint reports scale temperatures and map the preset enum', async () => {
  const device = makeDevice();

  await device.processDatapoint({ dp: 2, datatype: 2, data: valueFrame(215) });
  await device.processDatapoint({ dp: 3, datatype: 2, data: valueFrame(186) });
  await device.processDatapoint({
    dp: 19,
    datatype: 2,
    data: Buffer.from([0xff, 0xff, 0xff, 0xe7]),
  });
  await device.processDatapoint({ dp: 15, datatype: 2, data: valueFrame(600) });
  await device.processDatapoint({ dp: 107, datatype: 2, data: valueFrame(10) });
  await device.processDatapoint({ dp: 1, datatype: 1, data: Buffer.from([1]) });
  await device.processDatapoint({ dp: 9, datatype: 1, data: Buffer.from([0]) });
  await device.processDatapoint({ dp: 101, datatype: 4, data: Buffer.from([1]) });

  assert.equal(device.values.get('target_temperature'), 21.5);
  assert.equal(device.values.get('measure_temperature'), 18.6);
  assert.equal(device.values.get('temp_calibration'), -2.5);
  assert.equal(device.settings.maxTemperature, 60);
  assert.equal(device.settings.hysteresis, 1);
  assert.equal(device.values.get('onoff'), true);
  assert.equal(device.values.get('child_lock'), false);
  assert.equal(device.values.get('thermostat_heating'), true);

  for (const [raw, preset] of [[0, '0'], [1, '1'], [3, '3']]) {
    await device.processDatapoint({ dp: 4, datatype: 4, data: Buffer.from([raw]) });
    assert.equal(device.values.get('beok_tgm50_preset'), preset, `preset ${raw}`);
  }

  await device.processDatapoint({ dp: 106, datatype: 4, data: Buffer.from([2]) });
  await device.processDatapoint({ dp: 110, datatype: 4, data: Buffer.from([3]) });
  await device.processDatapoint({ dp: 102, datatype: 1, data: Buffer.from([1]) });
  await device.processDatapoint({ dp: 105, datatype: 1, data: Buffer.from([1]) });
  assert.equal(device.settings.sensorSelect, '2');
  assert.equal(device.settings.backlightMode, '3');
  assert.equal(device.settings.frostProtection, true);
  assert.equal(device.settings.soundEnabled, true);
  assert.equal(device.calls.length, 0);
});

test('writes encode 21.5 °C as 215 and map enums without touching factory reset', async () => {
  const device = makeDevice();

  await device.setTargetTemperature(21.5);
  await device.setPreset('3');
  await device.setPreset('1');
  await device.setPreset('0');
  await device.setOnOff(false);
  await device.setChildLock(true);
  await device.setCalibration(-2.5);
  await device.onSettings({
    newSettings: {
      sensorSelect: '1',
      hysteresis: 2,
      maxTemperature: 45,
      frostProtection: true,
      backlightMode: '2',
      soundEnabled: true,
    },
    changedKeys: [
      'sensorSelect',
      'hysteresis',
      'maxTemperature',
      'frostProtection',
      'backlightMode',
      'soundEnabled',
    ],
  });

  const frames = device.calls.map(call => call.frame);
  assert.deepEqual(frames.map(frame => frame.dp), [2, 4, 4, 4, 1, 9, 19, 106, 107, 15, 102, 110, 105]);

  const setpoint = frames[0];
  assert.equal(setpoint.datatype, 2);
  assert.equal(setpoint.length, 4);
  assert.equal(setpoint.data.readUInt32BE(0), 215);
  assert.equal(device.values.get('target_temperature'), 21.5);

  assert.deepEqual(frames.slice(1, 4).map(frame => frame.data[0]), [3, 1, 0]);
  assert.ok(frames.slice(1, 4).every(frame => frame.datatype === 4 && frame.dp === 4));

  const calibration = frames[6];
  assert.equal(calibration.dp, 19);
  assert.equal(calibration.datatype, 2);
  assert.deepEqual([...calibration.data], [0xff, 0xff, 0xff, 0xe7]);
  assert.equal(device.values.get('temp_calibration'), -2.5);

  assert.equal(frames[7].dp, 106);
  assert.equal(frames[7].data[0], 1);
  assert.equal(frames[8].data.readUInt32BE(0), 20);
  assert.equal(frames[9].data.readUInt32BE(0), 450);
  assert.equal(frames[10].datatype, 1);
  assert.equal(frames[10].data[0], 1);
  assert.equal(frames[11].data[0], 2);
  assert.equal(frames[12].dp, 105);
  assert.equal(frames[12].data[0], 1);

  assert.ok(!frames.some(frame => frame.dp === 103 || frame.dp === 111));
  assert.doesNotMatch(deviceSource, /write(?:Bool|Data32|Enum|Raw)\([^)]*\b(?:103|111)\b/);
});

test('init registers listeners and does not write datapoints or time', async () => {
  const device = makeDevice();
  device.hasCapability = () => false;

  await device.onNodeInit({ zclNode: device.zclNode });

  assert.deepEqual(device.calls, []);
  assert.deepEqual(device.added, [
    'onoff',
    'target_temperature',
    'measure_temperature',
    'beok_tgm50_preset',
    'thermostat_heating',
    'child_lock',
    'temp_calibration',
  ]);
  assert.equal(typeof device.handlers.reporting, 'function');
  assert.equal(typeof device.handlers.timeSync, 'function');
  assert.equal(typeof device.handlers.target_temperature, 'function');
  assert.equal(device.handlers.measure_temperature, undefined);
  assert.equal(device.handlers.thermostat_heating, undefined);
});

test('a rejected setpoint write restores the previous target temperature', async () => {
  const device = makeDevice({
    datapoint: async () => {
      throw new Error('radio rejected');
    },
  });

  await assert.rejects(device.setTargetTemperature(21.5), /radio rejected/);
  assert.equal(device.values.get('target_temperature'), 20);
  assert.equal(device.calls.length, 1);
  assert.equal(device.calls[0].frame.data.readUInt32BE(0), 215);
});

test('a rejected setting write restores the previous hysteresis', async () => {
  const device = makeDevice({
    datapoint: async () => {
      throw new Error('radio rejected');
    },
  });

  await assert.rejects(device.onSettings({
    newSettings: { hysteresis: 2 },
    changedKeys: ['hysteresis'],
  }), /radio rejected/);

  assert.equal(device.settings.hysteresis, 1);
  assert.equal(device.calls[0].frame.dp, 107);
  assert.equal(device.calls[0].frame.data.readUInt32BE(0), 20);
});

test('Tuya timeSync answers with an 8-byte 1970 payload and explicit length', async () => {
  const TimeSync = ZCLStruct('tuya.timeSync', TuyaSpecificCluster.COMMANDS.timeSync.args);
  const device = makeDevice();
  const realNow = Date.now;
  const now = 1700000000000;
  Date.now = () => now;

  try {
    await device.onTuyaTimeSync({ payload: Buffer.from([0x01, 0x00]) });
  } finally {
    Date.now = realNow;
  }

  assert.equal(device.calls.length, 1);
  const sent = device.calls[0];
  assert.equal(sent.type, 'timeSync');
  assert.equal(sent.payloadSize, 8);
  assert.equal(sent.payload.length, 8);

  const utcSeconds = Math.floor(now / 1000);
  const localSeconds = utcSeconds - (new Date(now).getTimezoneOffset() * 60);
  assert.equal(sent.payload.readUInt32BE(0), utcSeconds >>> 0);
  assert.equal(sent.payload.readUInt32BE(4), localSeconds >>> 0);

  const wire = new TimeSync({ payloadSize: sent.payload.length, payload: sent.payload }).toBuffer();
  assert.equal(wire.readUInt16LE(0), 8);
  assert.deepEqual(wire.subarray(2), sent.payload);
  const missingLength = new TimeSync({ payload: sent.payload }).toBuffer();
  assert.equal(missingLength.readUInt16LE(0), 0);
});

test('unknown, factory-reset and relay-invert datapoints are logged and not written', async () => {
  const device = makeDevice();

  await device.processDatapoint({ dp: 200, datatype: 2, data: valueFrame(1234) });
  await device.processDatapoint({ dp: 200, datatype: 2, data: valueFrame(1234) });
  await device.processDatapoint({ dp: 103, datatype: 1, data: Buffer.from([1]) });
  await device.processDatapoint({ dp: 111, datatype: 1, data: Buffer.from([0]) });
  await device.processDatapoint({ dp: 4, datatype: 4, data: Buffer.from([2]) });
  await device.processDatapoint({ dp: 50, datatype: 99, data: Buffer.from([1, 2, 3]) });

  assert.equal(device.calls.length, 0);
  assert.equal(device.values.get('beok_tgm50_preset'), '0');
  assert.equal(device.logs.filter(line => line.startsWith('processReporting 200')).length, 1);
  assert.ok(device.logs.some(line => line.startsWith('processReporting 103')));
  assert.ok(device.logs.some(line => line.startsWith('processReporting 111')));
  assert.ok(device.logs.some(line => line.includes('unknown BEOK preset')));
  assert.ok(device.logs.some(line => line.startsWith('processReporting 50')));
});

test('manifest matches only _TZE204_cvub6xbb / TS0601 and leaves wall_thermostat unchanged', () => {
  assert.deepEqual(driverCompose.zigbee.manufacturerName, [EXACT_MANUFACTURER]);
  assert.deepEqual(driverCompose.zigbee.productId, ['TS0601']);
  assert.equal(driverCompose.class, 'thermostat');
  assert.deepEqual(driverCompose.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);
  assert.ok(driverCompose.zigbee.endpoints['1'].bindings.includes(10));
  assert.equal(driverCompose.capabilities.includes('thermostat_preset'), false);
  assert.equal(driverCompose.capabilities.includes('thermostat_programming'), false);
  assert.ok(driverCompose.capabilities.includes('thermostat_heating'));
  assert.ok(driverCompose.capabilities.includes('child_lock'));
  assert.ok(driverCompose.capabilities.includes('temp_calibration'));

  for (const manufacturer of EXCLUDED_MANUFACTURERS) {
    assert.equal(driverCompose.zigbee.manufacturerName.includes(manufacturer), false);
    assert.equal(deviceSource.includes(manufacturer), true);
  }

  assert.deepEqual(wallThermostat.zigbee.manufacturerName, [
    '_TZE200_aoclfnxz',
    '_TZE204_aoclfnxz',
    '_TZE200_2ekuz3dz',
  ]);
  assert.equal(wallThermostat.zigbee.manufacturerName.includes(EXACT_MANUFACTURER), false);
  assert.match(wallSource, /mode:\s*2/);
  assert.match(wallSource, /targetTemperature:\s*16/);
  assert.doesNotMatch(wallSource, /cvub6xbb/);

  assert.deepEqual(sharedPreset.values.map(value => value.id), ['0', '1', '3']);
  assert.equal(sharedPreset.values[0].title.en, 'Automatic');
  assert.equal(sharedPreset.values[2].title.en, 'Holiday');
  assert.equal(heatingCapability.setable, false);
  assert.equal(heatingCapability.getable, true);

  const app = require('../app.json');
  const generated = app.drivers.filter(driver =>
    [].concat(driver.zigbee?.manufacturerName || []).includes(EXACT_MANUFACTURER));
  assert.deepEqual(generated.map(driver => driver.id), ['wall_thermostat_beok_tgm50']);
  assert.deepEqual(generated[0].zigbee.productId, ['TS0601']);
  assert.equal(
    app.drivers.some(driver =>
      driver.id === 'wall_thermostat'
      && [].concat(driver.zigbee?.manufacturerName || []).includes(EXACT_MANUFACTURER)),
    false
  );

  for (const manufacturer of EXCLUDED_MANUFACTURERS) {
    assert.equal(
      app.drivers.some(driver =>
        [].concat(driver.zigbee?.manufacturerName || []).includes(manufacturer)),
      false
    );
  }
});
