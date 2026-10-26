'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const profile = require('../drivers/switch_3_gang_ts0003/driver.compose.json');
const manifest = require('../app.json');

// #1500: physical Homey interview in the FIRST comment of #1152,
// independently extracted because #1152's BODY is a different metering TS0003.
test('issue #1500 exact non-metering TS0003 has independent EP1/EP2/EP3', () => {
  const m = '_TZ3000_iol4bl2y';
  const matches = manifest.drivers.filter(d =>
    [].concat(d.zigbee?.manufacturerName || []).includes(m) &&
    [].concat(d.zigbee?.productId || []).includes('TS0003'));
  assert.deepEqual(matches.map(d => d.id), ['switch_3_gang_ts0003']);
  assert.ok(profile.zigbee.manufacturerName.includes(m));
  assert.deepEqual(profile.zigbee.productId, ['TS0003']);
  assert.deepEqual(profile.zigbee.endpoints, {
    '1': { clusters: [0, 4, 5, 6], bindings: [6] },
    '2': { clusters: [4, 5, 6], bindings: [6] },
    '3': { clusters: [4, 5, 6], bindings: [6] },
  });
  assert.deepEqual(Object.keys(profile.zigbee.devices).sort(), ['secondSwitch', 'thirdSwitch']);
  assert.deepEqual(profile.capabilities, ['onoff']);
  assert.equal(profile.settings, undefined);
  for (const child of Object.values(profile.zigbee.devices)) assert.deepEqual(child.capabilities, ['onoff']);
  assert.doesNotMatch(JSON.stringify(profile), /1794|2820|57344|57345|meter_power|measure_power|relay_status/);
});

test('the separate metering fingerprint from #1152/#408 is NOT accidentally included', () => {
  assert.ok(!profile.zigbee.manufacturerName.includes('_TZ3000_ly9apzky'));
  assert.ok(!manifest.drivers.find(d => d.id === profile.id).zigbee.manufacturerName.includes('_TZ3000_ly9apzky'));
  assert.deepEqual(profile.zigbee.productId, ['TS0003']);
});
