'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { CLUSTER } = require('zigbee-clusters');
const app = require('../app.json');

const profiles = [
  ['temphumid_th01', 'TH01', ['zbeacon', 'Zbeacon']],
  ['switch_1_gang_ts000f', 'TS000F', ['_TZ3000_hdc8bbha', '_TZ3000_skueekg3']],
  ['switch_1_gang_ts0011', 'TS0011', ['_TZ3000_prd023wy', '_TZ3000_5ftkaulg', '_TZ3000_aetquff4', '_TYZB01_gr6rozze']],
];

function matches(manufacturer, model) {
  return app.drivers.filter(({ zigbee }) =>
    [].concat(zigbee?.manufacturerName || []).includes(manufacturer)
    && [].concat(zigbee?.productId || []).includes(model)).map(driver => driver.id);
}

for (const [id, model, manufacturers] of profiles) {
  test(model + ' matches the exact interviewed pairs on endpoint 1', () => {
    const driver = app.drivers.find(entry => entry.id === id);
    assert.deepEqual(driver.zigbee.manufacturerName, manufacturers);
    assert.deepEqual(driver.zigbee.productId, [model]);
    for (const manufacturer of manufacturers) assert.deepEqual(matches(manufacturer, model), [id]);
    const sensor = model === 'TH01';
    assert.deepEqual(driver.capabilities, sensor ? ['measure_temperature', 'measure_humidity', 'measure_battery'] : ['onoff']);
    assert.deepEqual(driver.zigbee.endpoints, {
      '1': sensor ? { clusters: [0, 1, 3, 32, 1026, 1029], bindings: [1, 1026, 1029] }
        : { clusters: [0, 4, 5, 6], bindings: [6] },
    });
  });
}

test('TS0001 keeps its original match and unverified variants stay out', () => {
  assert.deepEqual(matches('_TZ3000_skueekg3', 'TS0001'), ['switch_1_gang_ts0001']);
  assert.deepEqual(matches('_TZ3000_etx8inrk', 'TS0011'), []);
  assert.deepEqual(matches('ZBEACON', 'TH01'), []);
  assert.deepEqual(matches('_TZ3000_hafsqare', 'TS0011'), ['wall_switch_1_gang']);
});

test('the three profiles register standard capabilities and correctly scale the two TH01 interviews', async () => {
  // Load the real device classes with only the Homey hardware boundary replaced.
  class ZigBeeDevice {
    constructor() { this.registrations = new Map(); }
    registerCapability(id, cluster, options) {
      this.registrations.set(id, { cluster, ...options });
    }
  }
  const sdk = require.resolve('homey-zigbeedriver');
  const original = require.cache[sdk];
  require.cache[sdk] = { id: sdk, filename: sdk, loaded: true, exports: { ZigBeeDevice } };
  try {
    const Sensor = require('../drivers/temphumid_th01/device');
    const sensor = new Sensor();
    await sensor.onNodeInit();
    const temperature = sensor.registrations.get('measure_temperature');
    const humidity = sensor.registrations.get('measure_humidity');
    const battery = sensor.registrations.get('measure_battery');
    for (const registration of [temperature, humidity, battery]) assert.equal(registration.endpoint, 1);
    assert.equal(temperature.cluster, CLUSTER.TEMPERATURE_MEASUREMENT);
    assert.equal(humidity.cluster, CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT);
    assert.equal(battery.cluster, CLUSTER.POWER_CONFIGURATION);
    for (const [rawT, rawH, t, h] of [[3316, 4826, 33.16, 48.26], [2791, 4694, 27.91, 46.94]]) {
      assert.equal(temperature.reportParser(rawT), t);
      assert.equal(humidity.reportParser(rawH), h);
    }
    assert.equal(battery.reportParser(200), 100);
    assert.equal(temperature.reportParser(-125), -1.25);
    assert.equal(temperature.reportParser(-32768), null);
    assert.equal(humidity.reportParser(65535), null);
    assert.equal(battery.reportParser(255), null);
    for (const [id] of profiles.slice(1)) {
      const Switch = require('../drivers/' + id + '/device');
      const relay = new Switch();
      await relay.onNodeInit();
      assert.deepEqual([...relay.registrations], [['onoff', { cluster: CLUSTER.ON_OFF, endpoint: 1 }]]);
    }
  } finally {
    if (original) require.cache[sdk] = original;
    else delete require.cache[sdk];
  }
});
