'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const driverId = 'temphumidsensor_excellux';
const compose = require('../drivers/temphumidsensor_excellux/driver.compose.json');
const manifest = require('../app.json');

test('physical Excellux C3007 matches only its exact Homey Zigbee identity', () => {
  assert.equal(compose.id, driverId);
  assert.deepEqual(compose.zigbee.manufacturerName, ['NTCHT02']);
  assert.deepEqual(compose.zigbee.productId, ['Excellux']);
  assert.deepEqual(compose.zigbee.endpoints['1'].clusters, [0, 1, 1026, 1029]);
  assert.deepEqual(compose.zigbee.endpoints['1'].bindings, [1, 1026, 1029]);
  assert.deepEqual(compose.capabilities, [
    'measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery',
  ]);
  assert.equal(compose.capabilities.filter(name => name === 'measure_temperature').length, 1);
  assert.deepEqual(compose.energy.batteries, ['OTHER'], 'Homey requires energy.batteries for measure_battery; physical AAA cell count awaits verification');
  assert.ok(!JSON.stringify(compose.zigbee).includes('61184'), 'EF00 is OUTPUT/client only in the interview, not an input cluster');

  const found = manifest.drivers.filter(d =>
    d.zigbee?.manufacturerName?.includes('NTCHT02')
    && d.zigbee?.productId?.includes('Excellux')
  );
  assert.deepEqual(found.map(d => d.id), [driverId]);
  assert.deepEqual(found[0].energy.batteries, ['OTHER']);
});

test('dedicated profile reuses the existing standard Zigbee sensor runtime only', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', 'drivers', driverId, 'device.js'), 'utf8');
  assert.match(content, /module\.exports = require\('\.\.\/temphumidsensor3\/device'\)/);
  assert.doesNotMatch(content, /TuyaSpecificCluster|TuyaDataPoints/);
});

test('real standard-cluster runtime keeps probe scaling and battery/low-battery updates', async () => {
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'drivers', 'temphumidsensor3', 'device.js'), 'utf8');
  const CLUSTER = {
    POWER_CONFIGURATION: { NAME: 'powerConfiguration' },
    TEMPERATURE_MEASUREMENT: { NAME: 'temperatureMeasurement' },
    RELATIVE_HUMIDITY_MEASUREMENT: { NAME: 'relativeHumidity' },
  };
  const out = { exports: {} };
  class MockZigBeeDevice {
    constructor() {
      this.reportConfigs = [];
      this.values = new Map();
      this.settings = {};
    }
    isFirstInit() { return true; }
    configureAttributeReporting(configs) {
      this.reportConfigs.push(...configs);
      return Promise.resolve();
    }
    getSetting(key) { return this.settings[key]; }
    setCapabilityValue(key, value) {
      this.values.set(key, value);
      return Promise.resolve();
    }
    log() {}
    error(err) { throw err; }
  }
  const fakeRequire = dependency => {
    if (dependency === 'homey') return {};
    if (dependency === 'homey-zigbeedriver') return { ZigBeeDevice: MockZigBeeDevice };
    if (dependency === 'zigbee-clusters') return { debug() {}, CLUSTER };
    throw new Error('Unexpected dependency: ' + dependency);
  };
  const factory = vm.runInNewContext('(function(require,module,exports){' + src + '\n})');
  factory(fakeRequire, out, out.exports);
  const device = new out.exports();
  const events = {};
  const cluster = id => ({ on(name, handler) { events[id + '.' + name] = handler; } });
  await device.onNodeInit({ zclNode: { endpoints: { 1: { clusters: {
    temperatureMeasurement: cluster('temperature'),
    relativeHumidity: cluster('humidity'),
    powerConfiguration: cluster('battery'),
  } } } } });
  assert.deepEqual(device.reportConfigs.map(c => [c.cluster.NAME, c.attributeName]), [
    ['temperatureMeasurement', 'measuredValue'],
    ['relativeHumidity', 'measuredValue'],
    ['powerConfiguration', 'batteryPercentageRemaining'],
  ]);

  events['temperature.attr.measuredValue'](2340); // Reporter physical probe reading, 23.4 C.
  events['humidity.attr.measuredValue'](4648);
  events['battery.attr.batteryPercentageRemaining'](166);
  assert.equal(device.values.get('measure_temperature'), 23.4);
  assert.equal(device.values.get('measure_humidity'), 46.5); // Default 1-decimal setting.
  assert.equal(device.values.get('measure_battery'), 83); // Zigbee reports half-percent units.
  assert.equal(device.values.get('alarm_battery'), false);
  device.settings.temperature_decimals = '2';
  device.settings.humidity_decimals = '2';
  events['temperature.attr.measuredValue'](2341);
  events['humidity.attr.measuredValue'](4648);
  assert.equal(device.values.get('measure_temperature'), 23.41);
  assert.equal(device.values.get('measure_humidity'), 46.48);
  events['battery.attr.batteryPercentageRemaining'](18);
  assert.equal(device.values.get('measure_battery'), 9);
  assert.equal(device.values.get('alarm_battery'), true);
  assert.equal(device.values.has('measure_temperature.ambient'), false);
});
