'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'drivers', 'lcdtemphumidsensor_3', 'device.js'),
  'utf8'
);
const helpers = require('../lib/TuyaHelpers');

// Tenth-percent identities stay /10. Every other identity in this driver stays raw.
const PROFILES = [
  ['_TZE200_bjawzodf', 10],
  ['_TZE200_zl1kmjqx', 10],
  ['_TZE200_locansqn', 1],
  ['_TZE200_bq5c8xfe', 1],
  ['_TZE200_qyflbnbj', 1],
  ['_TZE200_vs0skpuc', 1],
  ['_TZE200_44af8vyi', 1],
];

function loadDevice() {
  class MockDevice {
    constructor() {
      this.values = new Map();
      this.errors = [];
    }

    log() {}
    error(...args) { this.errors.push(args.map(String).join(' ')); }
    getSetting() { return undefined; }
    getData() { return {}; }
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
    if (name === '../../lib/TuyaHelpers') return helpers;
    throw new Error('Unexpected dependency: ' + name);
  };

  const sandbox = { Buffer, console };
  vm.createContext(sandbox);
  const factory = vm.runInContext(
    '(function (require, module, exports) {' + source + '\n})',
    sandbox
  );
  factory(fakeRequire, exportsModule, exportsModule.exports);
  return exportsModule.exports;
}

const Device = loadDevice();
const flush = () => new Promise(resolve => setImmediate(resolve));

async function settlesWithoutBlocking(promise) {
  let timer;
  const status = await Promise.race([
    promise.then(() => 'done'),
    new Promise(resolve => {
      timer = setTimeout(() => resolve('blocked'), 50);
    }),
  ]);
  clearTimeout(timer);
  return status;
}

function frame(dp, value) {
  return {
    dp,
    datatype: 2,
    data: [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ],
  };
}

function setup(options = {}) {
  const device = new Device();
  const settings = { ...(options.settings || {}) };
  const data = { ...(options.data || {}) };
  const timeSyncs = [];
  let basicReads = 0;
  let resolveBasic;
  const basicPending = new Promise(resolve => {
    resolveBasic = resolve;
  });

  device.getSetting = name => {
    if (options.settingThrows && name === 'zb_manufacturer_name') {
      throw new Error('settings unavailable');
    }
    return settings[name];
  };
  device.getData = () => {
    if (options.dataThrows) throw new Error('data unavailable');
    return data;
  };

  const basic = {
    attributes: { ...(options.attributes || {}) },
    manufacturerName: options.basicProperty,
    readAttributes() {
      basicReads += 1;
      if (options.basicRead) return options.basicRead();
      if (options.basicFails) {
        return Promise.reject(new Error('Sleepy device did not answer Basic read'));
      }
      if (options.basicHangs || options.basicDeferred) return basicPending;
      return Promise.resolve({ manufacturerName: options.basicManufacturer });
    },
  };
  const tuya = new EventEmitter();
  tuya.timeSync = async payload => {
    timeSyncs.push(payload);
  };

  const zclNode = {
    manufacturerName: options.zclManufacturer,
    endpoints: {
      1: {
        clusters: {
          basic: options.basicMissing ? undefined : basic,
          tuya,
        },
      },
    },
  };
  const node = Object.prototype.hasOwnProperty.call(options, 'node')
    ? options.node
    : (options.nodeManufacturer ? { manufacturerName: options.nodeManufacturer } : undefined);

  return {
    device,
    settings,
    data,
    basic,
    tuya,
    zclNode,
    node,
    timeSyncs,
    resolveBasic,
    basicReads: () => basicReads,
  };
}

async function init(ctx) {
  const status = await settlesWithoutBlocking(
    ctx.device.onNodeInit({ zclNode: ctx.zclNode, node: ctx.node })
  );
  assert.equal(status, 'done');
  return status;
}

async function report(tuya, dp, value, event = 'reporting') {
  const handlers = tuya.listeners(event);
  assert.equal(handlers.length, 1, event);
  await handlers[0](frame(dp, value));
}

test('#1554 uses zb_manufacturer_name when Basic manufacturerName is missing', async () => {
  const ctx = setup({
    settings: {
      zb_manufacturer_name: '_TZE200_bjawzodf',
      humidity_offset: 2,
      temperature_offset: 0.5,
    },
    basicHangs: true,
  });

  await init(ctx);
  assert.equal(ctx.basicReads(), 0, 'must not query a sleeping device');
  assert.equal(ctx.device.manufacturerName, '_TZE200_bjawzodf');
  assert.equal(ctx.device.humidityDivisor, 10);
  assert.equal(ctx.device.requiresTuyaTimeSync, false);
  assert.equal(ctx.tuya.listeners('timeSync').length, 0);

  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.device.values.get('measure_humidity'), 43.5);
  await report(ctx.tuya, 2, 415, 'response');
  assert.equal(ctx.device.values.get('measure_humidity'), 43.5);

  await report(ctx.tuya, 1, 215);
  assert.equal(ctx.device.values.get('measure_temperature'), 22);
  await report(ctx.tuya, 1, 65515);
  assert.equal(ctx.device.values.get('measure_temperature'), -1.5);
  await report(ctx.tuya, 4, 10);
  assert.equal(ctx.device.values.get('measure_battery'), 10);
  assert.equal(ctx.device.values.get('alarm_battery'), true);

  ctx.settings.zb_manufacturer_name = '_TZE200_qyflbnbj';
  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.device.values.get('measure_humidity'), 43.5, 'resolved divisor stays cached');
  assert.equal(ctx.basicReads(), 0);
});

test('#1554 recomputes the divisor on the first humidity report when the name arrives later', async () => {
  const ctx = setup({ basicHangs: true });

  await init(ctx);
  assert.equal(ctx.basicReads(), 1);
  assert.equal(ctx.device.humidityDivisor, 1);

  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.device.values.get('measure_humidity'), 415);

  ctx.settings.zb_manufacturer_name = '_TZE200_bjawzodf';
  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.device.values.get('measure_humidity'), 41.5);
  assert.equal(ctx.device.humidityDivisor, 10);

  ctx.settings.zb_manufacturer_name = '_TZE200_qyflbnbj';
  ctx.basic.attributes.manufacturerName = '_TZE200_qyflbnbj';
  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.device.values.get('measure_humidity'), 41.5, 'later reports keep the cached divisor');
  assert.equal(ctx.basicReads(), 1, 'a resolved name does not read Basic again');
});

test('a Basic read that finishes after init updates the cached divisor before humidity is handled', async () => {
  const ctx = setup({ basicDeferred: true });

  await init(ctx);
  assert.equal(ctx.device.humidityDivisor, 1);
  ctx.resolveBasic({ manufacturerName: '_TZE200_zl1kmjqx' });
  await flush();
  await flush();

  assert.equal(ctx.device.manufacturerName, '_TZE200_zl1kmjqx');
  assert.equal(ctx.device.humidityDivisor, 10);
  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.device.values.get('measure_humidity'), 41.5);
  assert.equal(ctx.basicReads(), 1);
});

test('a failed init read is retried once from a later report, then the name is cached', async () => {
  let calls = 0;
  const ctx = setup({
    basicRead() {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('asleep during init'));
      return Promise.resolve({ manufacturerName: '_TZE200_bjawzodf' });
    },
  });

  await init(ctx);
  await flush();
  assert.equal(ctx.basicReads(), 1);
  assert.ok(ctx.device.errors.some(message => message.includes('Failed to read manufacturerName')));

  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.device.values.get('measure_humidity'), 415, 'the in-flight retry does not delay this sample');
  await flush();
  await flush();

  assert.equal(ctx.basicReads(), 2);
  assert.equal(ctx.device.humidityDivisor, 10);
  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.device.values.get('measure_humidity'), 41.5);
  await report(ctx.tuya, 2, 415);
  assert.equal(ctx.basicReads(), 2);
});

test('stored manufacturer sources keep every lcdtemphumidsensor_3 divisor and skip Basic', async () => {
  const sources = [
    name => ({ settings: { zb_manufacturer_name: name } }),
    name => ({ data: { manufacturerName: name } }),
    name => ({ data: { zb_manufacturer_name: name } }),
    name => ({ nodeManufacturer: name }),
    name => ({ attributes: { manufacturerName: name } }),
    name => ({ basicProperty: name }),
    name => ({ zclManufacturer: name }),
  ];

  for (const source of sources) {
    for (const [name, divisor] of PROFILES) {
      const ctx = setup({ ...source(name), basicHangs: true });
      await init(ctx);
      assert.equal(ctx.basicReads(), 0, name);
      assert.equal(ctx.device.humidityDivisor, divisor, name);
      await report(ctx.tuya, 2, 415);
      assert.equal(ctx.device.values.get('measure_humidity'), 415 / divisor, name);
      await report(ctx.tuya, 1, 215);
      assert.equal(ctx.device.values.get('measure_temperature'), 21.5, name);
      assert.equal(
        ctx.tuya.listeners('timeSync').length,
        name === '_TZE200_locansqn' ? 1 : 0,
        name
      );
    }
  }
});

test('manufacturer resolution prefers settings, then device data, then the interviewed node, then the Basic cache', async () => {
  const settingsWin = setup({
    settings: { zb_manufacturer_name: '_TZE200_qyflbnbj' },
    data: { manufacturerName: '_TZE200_bjawzodf' },
    nodeManufacturer: '_TZE200_bjawzodf',
    attributes: { manufacturerName: '_TZE200_zl1kmjqx' },
    basicHangs: true,
  });
  await init(settingsWin);
  await report(settingsWin.tuya, 2, 415);
  assert.equal(settingsWin.device.values.get('measure_humidity'), 415);
  assert.equal(settingsWin.basicReads(), 0);

  const dataWins = setup({
    data: { manufacturerName: '_TZE200_bjawzodf' },
    nodeManufacturer: '_TZE200_qyflbnbj',
    attributes: { manufacturerName: '_TZE200_qyflbnbj' },
    basicHangs: true,
  });
  await init(dataWins);
  await report(dataWins.tuya, 2, 415);
  assert.equal(dataWins.device.values.get('measure_humidity'), 41.5);
  assert.equal(dataWins.basicReads(), 0);

  const nodeWins = setup({
    nodeManufacturer: '_TZE200_zl1kmjqx',
    attributes: { manufacturerName: '_TZE200_qyflbnbj' },
    basicProperty: '_TZE200_qyflbnbj',
    basicHangs: true,
  });
  await init(nodeWins);
  await report(nodeWins.tuya, 2, 415);
  assert.equal(nodeWins.device.values.get('measure_humidity'), 41.5);
  assert.equal(nodeWins.basicReads(), 0);

  const attributeWins = setup({
    attributes: { manufacturerName: '_TZE200_bjawzodf' },
    basicProperty: '_TZE200_qyflbnbj',
    basicHangs: true,
  });
  await init(attributeWins);
  await report(attributeWins.tuya, 2, 415);
  assert.equal(attributeWins.device.values.get('measure_humidity'), 41.5);
  assert.equal(attributeWins.basicReads(), 0);
});

test('empty settings and a thrown settings read fall through without blocking init', async () => {
  const blank = setup({
    settings: { zb_manufacturer_name: '   ' },
    nodeManufacturer: '_TZE200_bjawzodf',
    basicHangs: true,
  });
  await init(blank);
  assert.equal(blank.device.humidityDivisor, 10);
  assert.equal(blank.basicReads(), 0);

  const thrown = setup({
    settingThrows: true,
    dataThrows: true,
    nodeManufacturer: '_TZE200_zl1kmjqx',
    basicHangs: true,
  });
  await init(thrown);
  assert.equal(thrown.device.humidityDivisor, 10);
  assert.equal(thrown.basicReads(), 0);
  assert.ok(thrown.device.errors.some(message => message.includes('zb_manufacturer_name')));
  assert.ok(thrown.device.errors.some(message => message.includes('device data')));
});

test('an unanswered or unknown Basic identity keeps the raw humidity divisor', async () => {
  const failed = setup({ basicFails: true });
  await init(failed);
  await flush();
  await report(failed.tuya, 2, 415);
  await flush();
  await report(failed.tuya, 2, 415);
  assert.equal(failed.device.values.get('measure_humidity'), 415);
  assert.equal(failed.device.humidityDivisor, 1);
  assert.equal(failed.tuya.listeners('timeSync').length, 0);
  assert.ok(failed.basicReads() <= 2);

  const unknown = setup({
    settings: { zb_manufacturer_name: '_TZE200_not_in_this_driver' },
    basicHangs: true,
  });
  await init(unknown);
  await report(unknown.tuya, 2, 50);
  await report(unknown.tuya, 1, 215);
  assert.equal(unknown.device.values.get('measure_humidity'), 50);
  assert.equal(unknown.device.values.get('measure_temperature'), 21.5);
  assert.equal(unknown.basicReads(), 0);
});

test('live Basic read is the last resort and does not change the other identities', async () => {
  const tenth = setup({ basicDeferred: true });
  await init(tenth);
  assert.equal(tenth.basicReads(), 1);
  tenth.resolveBasic({ manufacturerName: '_TZE200_bjawzodf' });
  await flush();
  await flush();
  await report(tenth.tuya, 2, 415);
  assert.equal(tenth.device.values.get('measure_humidity'), 41.5);

  const raw = setup({ basicManufacturer: '_TZE200_qyflbnbj' });
  await init(raw);
  await flush();
  await report(raw.tuya, 2, 415);
  await report(raw.tuya, 1, 215);
  assert.equal(raw.device.humidityDivisor, 1);
  assert.equal(raw.device.values.get('measure_humidity'), 415);
  assert.equal(raw.device.values.get('measure_temperature'), 21.5);
  assert.equal(raw.tuya.listeners('timeSync').length, 0);
});

test('_TZE200_locansqn time sync follows the same stored-name fallback', async () => {
  const fromSettings = setup({
    settings: { zb_manufacturer_name: '_TZE200_locansqn' },
    basicHangs: true,
  });
  await init(fromSettings);
  assert.equal(fromSettings.basicReads(), 0);
  assert.equal(fromSettings.device.requiresTuyaTimeSync, true);
  assert.equal(fromSettings.device.humidityDivisor, 1);
  await fromSettings.tuya.listeners('timeSync')[0]();
  assert.equal(fromSettings.timeSyncs.length, 1);
  assert.equal(fromSettings.timeSyncs[0].payloadSize, 8);
  assert.equal(fromSettings.timeSyncs[0].payload.length, 8);

  const later = setup({ basicDeferred: true });
  await init(later);
  assert.equal(later.tuya.listeners('timeSync').length, 0);
  later.resolveBasic({ manufacturerName: '_TZE200_locansqn' });
  await flush();
  await flush();
  assert.equal(later.device.requiresTuyaTimeSync, true);
  assert.equal(later.device.humidityDivisor, 1);
  assert.equal(later.tuya.listeners('timeSync').length, 1);
  await later.tuya.listeners('timeSync')[0]();
  assert.equal(later.timeSyncs[0].payload.length, 8);

  await report(later.tuya, 2, 41);
  assert.equal(later.device.values.get('measure_humidity'), 41);
});
