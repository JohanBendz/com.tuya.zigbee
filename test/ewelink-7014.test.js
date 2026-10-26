'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const driverId = 'temphumidsensor_ewelink';
const exactProduct = 'CK-TLSR8656-SS5-01(7014)';
const compose = require('../drivers/temphumidsensor_ewelink/driver.compose.json');
const generated = require('../app.json');

test('eWeLink (7014) exact physical Homey identity, endpoint and battery metadata', () => {
  assert.equal(compose.id, driverId);
  assert.deepEqual(compose.zigbee.manufacturerName, ['eWeLink']);
  assert.deepEqual(compose.zigbee.productId, [exactProduct]);
  assert.deepEqual(compose.energy.batteries, ['AAA', 'AAA']);
  assert.deepEqual(compose.zigbee.endpoints['1'].clusters, [0, 1, 1026, 1029]);
  assert.deepEqual(compose.zigbee.endpoints['1'].bindings, [1, 1026, 1029]);
  assert.deepEqual(compose.capabilities, [
    'measure_temperature',
    'measure_humidity',
    'measure_battery',
    'alarm_battery',
  ]);
  assert.ok(!JSON.stringify(compose.zigbee).includes('61184'), 'This is a standard-cluster device, not Tuya EF00');

  const match = generated.drivers.find(item => item.id === driverId);
  assert.ok(match);
  assert.deepEqual(match.zigbee.manufacturerName, ['eWeLink']);
  assert.deepEqual(match.zigbee.productId, [exactProduct]);
  assert.deepEqual(match.energy.batteries, ['AAA', 'AAA']);

  const found = generated.drivers.filter(item =>
    (item.zigbee?.manufacturerName || []).includes('eWeLink')
    && (item.zigbee?.productId || []).includes(exactProduct)
  );
  assert.deepEqual(found.map(item => item.id), [driverId]);
});

test('eWeLink 7014 delegates to existing, standard-cluster runtime', () => {
  const deviceSource = fs.readFileSync(
    path.join(root, 'drivers', driverId, 'device.js'),
    'utf8'
  );
  assert.match(deviceSource, /module.exports = require\('\.\.\/temphumidsensor2\/device'\)/);
  assert.doesNotMatch(deviceSource, /TuyaSpecificCluster|DP[0-9]/);
});

test('standard runtime maps physical interview scaling (temperature /100, RH /100, battery /2)', async () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'temphumidsensor2', 'device.js'),
    'utf8'
  );
  const mockModule = { exports: {} };
  const CLUSTER = {
    TEMPERATURE_MEASUREMENT: { NAME: 'temperatureMeasurement' },
    RELATIVE_HUMIDITY_MEASUREMENT: { NAME: 'relativeHumidity' },
    POWER_CONFIGURATION: { NAME: 'powerConfiguration' },
  };
  class MockZigBeeDevice {
    constructor() {
      this.values = new Map();
    }
    getSetting() { return undefined; }
    log() {}
    error() {}
    setCapabilityValue(key, value) {
      this.values.set(key, value);
      return Promise.resolve();
    }
  }
  const fakeRequire = dependency => {
    if (dependency === 'homey') return {};
    if (dependency === 'homey-zigbeedriver') return { ZigBeeDevice: MockZigBeeDevice };
    if (dependency === 'zigbee-clusters') return { debug() {}, CLUSTER };
    throw new Error('Unexpected dependency: ' + dependency);
  };
  const load = vm.runInNewContext(
    '(function(require,module,exports){' + source + '\n})'
  );
  load(fakeRequire, mockModule, mockModule.exports);

  const sensor = new mockModule.exports();
  const events = {};
  const makeCluster = key => ({
    on(name, callback) { events[key + '.' + name] = callback; },
  });
  await sensor.onNodeInit({
    zclNode: { endpoints: { 1: { clusters: {
      temperatureMeasurement: makeCluster('temperature'),
      relativeHumidity: makeCluster('humidity'),
      powerConfiguration: makeCluster('battery'),
    } } } },
  });

  events['temperature.attr.measuredValue'](2650); // #1284 full physical interview.
  events['humidity.attr.measuredValue'](6230);
  events['battery.attr.batteryPercentageRemaining'](166); // Standard half-percent.
  assert.equal(sensor.values.get('measure_temperature'), 26.5);
  assert.equal(sensor.values.get('measure_humidity'), 62.3);
  assert.equal(sensor.values.get('measure_battery'), 83);
  assert.equal(sensor.values.get('alarm_battery'), false);

  events['battery.attr.batteryPercentageRemaining'](18);
  assert.equal(sensor.values.get('measure_battery'), 9);
  assert.equal(sensor.values.get('alarm_battery'), true);
});
