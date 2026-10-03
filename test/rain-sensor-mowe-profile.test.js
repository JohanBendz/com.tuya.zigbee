'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const id = 'rain_sensor_mowe';
const profile = require('../drivers/' + id + '/driver.compose.json');
const app = require('../app.json');

test('#1288/#473 MOWE uses only its physically interviewed standard IAS identity', () => {
  assert.equal(profile.id, id);
  assert.deepEqual(profile.zigbee.manufacturerName, ['_TZ3000_o9f2zqln']);
  assert.deepEqual(profile.zigbee.productId, ['TS0207']);
  assert.deepEqual(profile.zigbee.endpoints, {
    '1': { clusters: [0, 1, 3, 1280], bindings: [1, 1280] },
  });
  assert.deepEqual(profile.capabilities, ['alarm_water', 'measure_battery', 'alarm_battery']);
  assert.deepEqual(profile.energy.batteries, ['OTHER'], 'actual physical battery type/count is still unknown');
  const matches = app.drivers.filter(d =>
    d.zigbee?.manufacturerName?.includes('_TZ3000_o9f2zqln') &&
    d.zigbee?.productId?.includes('TS0207'));
  assert.deepEqual(matches.map(d => d.id), [id]);
  assert.deepEqual(matches[0].capabilities, profile.capabilities);
  assert.deepEqual(matches[0].energy, profile.energy);
  assert.equal(matches[0].settings, undefined);
  const solar = app.drivers.find(d => d.id === 'rain_sensor');
  assert.deepEqual(solar.zigbee.manufacturerName, ['_TZ3210_tgvtvdoc']);
  assert.ok(!JSON.stringify(profile).includes('61184'), 'MW815R does not announce Tuya EF00');
  for (const unused of ['measure_luminance', 'measure_voltage.rain', 'alarm_cleaning']) {
    assert.ok(!profile.capabilities.includes(unused), 'no unsupported solar/DP105 capability: ' + unused);
  }
});

function loadRuntime() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'drivers', id, 'device.js'), 'utf8');
  const fakeModule = { exports: {} };
  class MockZigBeeDevice {
    constructor() {
      this.values = [];
      this.errors = [];
      this.error = (...args) => this.errors.push(args);
    }
    setCapabilityValue(capability, value) {
      this.values.push([capability, value]);
      return Promise.resolve();
    }
  }
  const loader = vm.runInNewContext('(function(require,module,exports){' + source + '\n})');
  loader(name => {
    if (name === 'homey-zigbeedriver') return { ZigBeeDevice: MockZigBeeDevice };
    if (name === 'zigbee-clusters') return { CLUSTER: {
      IAS_ZONE: { NAME: 'iasZone' },
      POWER_CONFIGURATION: { NAME: 'powerConfiguration' },
    } };
    throw new Error('Unexpected dependency: ' + name);
  }, fakeModule, fakeModule.exports);
  return { Device: fakeModule.exports, source };
}

test('isolated MW815R runtime registers IAS enrollment, wet/dry and normal battery listeners without startup traffic', async () => {
  const { Device, source } = loadRuntime();
  const events = {};
  const enrollments = [];
  const iasZone = {
    zoneEnrollResponse(payload) { enrollments.push(payload); return Promise.resolve(); },
  };
  const powerConfiguration = {
    on(name, callback) { events[name] = callback; },
  };
  const device = new Device();
  await device.onNodeInit({ zclNode: { endpoints: { 1: {
    clusters: { iasZone, powerConfiguration },
  } } } });
  assert.equal(typeof iasZone.onZoneEnrollRequest, 'function');
  assert.equal(typeof iasZone.onZoneStatusChangeNotification, 'function');
  assert.equal(typeof events['attr.batteryPercentageRemaining'], 'function');
  assert.deepEqual(enrollments, [], 'no unsolicited Zigbee commands during startup');

  iasZone.onZoneEnrollRequest();
  assert.equal(enrollments.length, 1);
  assert.equal(enrollments[0].enrollResponseCode, 0);
  assert.equal(enrollments[0].zoneId, 0);

  iasZone.onZoneStatusChangeNotification({
    zoneStatus: { alarm1: true, battery: false },
  });
  iasZone.onZoneStatusChangeNotification({
    zoneStatus: { alarm1: false, battery: true },
  });
  assert.deepEqual(device.values.slice(0, 4), [
    ['alarm_water', true], ['alarm_battery', false],
    ['alarm_water', false], ['alarm_battery', true],
  ]);
  events['attr.batteryPercentageRemaining'](200);
  events['attr.batteryPercentageRemaining'](105);
  events['attr.batteryPercentageRemaining'](0);
  events['attr.batteryPercentageRemaining'](255);
  events['attr.batteryPercentageRemaining'](-1);
  events['attr.batteryPercentageRemaining'](false);
  assert.deepEqual(device.values.slice(4), [
    ['measure_battery', 100], ['measure_battery', 52.5], ['measure_battery', 0],
  ]);
  assert.equal(device.errors.length, 0);
  assert.doesNotMatch(source, /TuyaSpecific|sendFrame|readAttributes|writeAttributes|DP105|Cluster\\.addCluster/);
});

test('missing IAS flags do not turn a previously active rain alarm off', async () => {
  const { Device } = loadRuntime();
  const iasZone = {};
  const powerConfiguration = { on() {} };
  const device = new Device();
  await device.onNodeInit({ zclNode: { endpoints: { 1: {
    clusters: { iasZone, powerConfiguration },
  } } } });
  iasZone.onZoneStatusChangeNotification({ zoneStatus: {} });
  iasZone.onZoneStatusChangeNotification({ zoneStatus: null });
  assert.deepEqual(device.values, []);
});
