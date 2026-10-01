'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Cluster, CLUSTER, ColorControlCluster } = require('zigbee-clusters');
const TuyaColorControlCluster = require('../lib/TuyaColorControlCluster');
const {
  requireVerifiedRange, homeyToMired, miredToHomey,
} = require('../lib/StandardCctRange');

const physicalAttributes = [
  ['colorCapabilities', 0x400a],
  ['colorTempPhysicalMinMireds', 0x400b],
  ['colorTempPhysicalMaxMireds', 0x400c],
];

test('installed zigbee-clusters 2.4.1 exposes required standard CCT metadata', () => {
  const app = require('../package.json');
  assert.equal(app.dependencies['zigbee-clusters'], '2.4.1');
  for (const [name, id] of physicalAttributes) {
    assert.equal(ColorControlCluster.ATTRIBUTES[name].id, id);
  }
});

test('current Tuya Color Control override removes standard CCT metadata, not merely extends it', () => {
  for (const [name] of physicalAttributes) {
    assert.equal(TuyaColorControlCluster.ATTRIBUTES[name], undefined, name);
  }
  const source = fs.readFileSync(
    path.resolve(__dirname, '..', 'lib', 'TuyaZigBeeLightDevice.js'), 'utf8'
  );
  assert.match(source, /Cluster\.addCluster\(TuyaColorControlCluster\)/);
});

test('actual 2.4.1 cluster rejects unavailable physical attributes before any Zigbee traffic', async () => {
  const previouslyRegistered = Cluster.getCluster(CLUSTER.COLOR_CONTROL.ID);
  assert.ok(previouslyRegistered);
  let sent = 0;
  try {
    Cluster.addCluster(TuyaColorControlCluster);
    assert.equal(Cluster.getCluster(CLUSTER.COLOR_CONTROL.ID), TuyaColorControlCluster);
    const color = new TuyaColorControlCluster({
      sendFrame() {
        sent += 1;
        throw new Error('Unexpected outbound Zigbee frame');
      },
    });
    for (const [name] of physicalAttributes) {
      await assert.rejects(
        color.readAttributes([name]),
        new RegExp(name + ' is not a valid attribute')
      );
    }
    assert.equal(sent, 0);
  } finally {
    // Node's test-file process is isolated; restore anyway.
    Cluster.addCluster(previouslyRegistered);
  }
});

test('isolated mapper fails closed without confirmed per-device physical CCT metadata', () => {
  assert.throws(() => requireVerifiedRange(undefined), /not confirmed/);
  assert.throws(() => requireVerifiedRange({ colorCapabilities: { colorTemperature: false } }), /not confirmed/);
  assert.throws(() => requireVerifiedRange({ colorCapabilities: { colorTemperature: true } }), /not verified/);
  for (const [min, max] of [[0,500], [153,153], [500,153], [153,0xffff], [-1,500], [153.5,500]]) {
    assert.throws(
      () => requireVerifiedRange({
        colorCapabilities: { colorTemperature: true },
        colorTempPhysicalMinMireds: min,
        colorTempPhysicalMaxMireds: max,
      }), /not verified/,
      'rejected invalid physical range: ' + min + '/' + max
    );
  }
  assert.throws(() => homeyToMired(0.5, undefined), /Verified CCT range/);
  assert.throws(() => miredToHomey(200, undefined), /Verified CCT range/);
});

test('isolated mapper matches Homey 2.1.4 orientation and round trips verified 153–500 EXAMPLE bounds', () => {
  // #178 observed this range, but is a DIFFERENT family: never default #113 or #271 to it.
  const range = requireVerifiedRange({
    colorCapabilities: { colorTemperature: true },
    colorTempPhysicalMinMireds: 153,
    colorTempPhysicalMaxMireds: 500,
  });
  assert.deepEqual(range, { min: 153, max: 500 });
  assert.ok(Object.isFrozen(range));
  assert.equal(homeyToMired(0, range), 153);
  assert.equal(homeyToMired(1, range), 500);
  assert.equal(miredToHomey(153, range), 0);
  assert.equal(miredToHomey(500, range), 1);
  for (const requested of [0, .1, .25, .5, .75, .9, 1]) {
    const mired = homeyToMired(requested, range);
    assert.ok(mired >= range.min && mired <= range.max);
    assert.ok(
      Math.abs(miredToHomey(mired, range) - requested) <= 0.5 / (range.max - range.min) + Number.EPSILON,
      'round trip bounded by half one mired'
    );
  }
  assert.equal(miredToHomey(1, range), 0);
  assert.equal(miredToHomey(1000, range), 1);
});

test('isolated mapper rejects invalid writes and Zigbee sentinel reports without issuing commands', () => {
  const range = Object.freeze({ min: 200, max: 400 });
  for (const value of [-.1, 1.1, NaN, Infinity, -Infinity, undefined]) {
    assert.throws(() => homeyToMired(value, range), /0–1/);
  }
  for (const value of [0, 0xffff, -1, NaN, 153.5, null, undefined]) {
    assert.throws(() => miredToHomey(value, range), /invalid/);
  }
  assert.equal(homeyToMired(.5, range), 300);
  assert.equal(miredToHomey(300, range), .5);
});

test('new standalone mapper is NOT imported by existing lights or the Homey app', () => {
  const app = require('../app.json');
  const oldIds = [
    'dimmable_led_strip', 'dimmable_recessed_led', 'rgb_bulb_E14',
    'rgb_bulb_E27', 'rgb_ceiling_led_light', 'rgb_floor_led_light',
    'rgb_led_light_bar', 'rgb_led_strip', 'rgb_mood_light',
    'rgb_spot_GU10', 'rgb_spot_GardenLight', 'rgb_wall_led_light',
    'tunable_bulb_E14', 'tunable_bulb_E27', 'tunable_spot_GU10',
  ];
  const actual = app.drivers.filter(d =>
    d.class === 'light' && d.capabilities?.includes('light_temperature')
  ).map(d => d.id);
  assert.deepEqual([...actual].sort(), [...oldIds].sort());
  assert.ok(!app.drivers.some(d => /standard_cct|ts0501a_new|ts0502a_new/i.test(d.id)));
  const common = fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'TuyaZigBeeLightDevice.js'), 'utf8');
  assert.ok(!common.includes("require('./StandardCctRange')"));
  for (const id of oldIds) {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'drivers', id, 'device.js'), 'utf8');
    assert.ok(!src.includes('StandardCctRange'));
  }
});
