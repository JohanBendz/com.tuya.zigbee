'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app.json');
const dual = require('../drivers/switch_2_gang_ts0002/driver.compose.json');
const triple = require('../drivers/switch_3_gang_ts0003/driver.compose.json');

// Full Homey interviews: #1337 contains TWO distinct devices; #1338/#1375
// independently confirm the three-gang variant. Neither is a four-gang TS0726.
const bseed = [
  { manufacturer: '_TZ3000_l9brjwau', model: 'TS0002', driver: 'switch_2_gang_ts0002', profile: dual, ep: [1, 2] },
  { manufacturer: '_TZ3000_qkixdnon', model: 'TS0003', driver: 'switch_3_gang_ts0003', profile: triple, ep: [1, 2, 3] },
];

test('two BSEED neutral switches add ONLY their interviewed exact identity, no wildcard', () => {
  for (const row of bseed) {
    assert.deepEqual(row.profile.zigbee.productId, [row.model]);
    assert.ok(row.profile.zigbee.manufacturerName.includes(row.manufacturer));
    const matches = app.drivers.filter(d =>
      [].concat(d.zigbee?.manufacturerName || []).includes(row.manufacturer)
      && [].concat(d.zigbee?.productId || []).includes(row.model)
    );
    assert.deepEqual(matches.map(d => d.id), [row.driver]);
    assert.equal(row.profile.settings, undefined, 'no guessed Tuya power-on/vendor setting');
    assert.equal(matches[0].settings, undefined);
  }
});

test('interviewed two and three gang BSEED switches use standard OnOff on independent EPs', () => {
  for (const row of bseed) {
    assert.deepEqual(Object.keys(row.profile.zigbee.endpoints), row.ep.map(String));
    for (const ep of row.ep) {
      assert.deepEqual(row.profile.zigbee.endpoints[ep], {
        clusters: ep === 1 ? [0, 4, 5, 6] : [4, 5, 6],
        bindings: [6],
      });
    }
    assert.equal(Object.keys(row.profile.zigbee.devices).length, row.ep.length - 1);
    assert.deepEqual(row.profile.capabilities, ['onoff']);
    assert.ok(!JSON.stringify(row.profile).includes('57344'),
      '0xE000/E001 are optional in the physical interview, not required at pairing');
    assert.ok(!JSON.stringify(row.profile).includes('57345'));
    assert.ok(!JSON.stringify(row.profile).includes('meter_power'), 'no invented metering');
  }
  const bseedTripleMatches = app.drivers.filter(d =>
    [].concat(d.zigbee?.manufacturerName || []).includes('_TZ3000_qkixdnon'));
  assert.deepEqual(bseedTripleMatches.map(d => d.id), ['switch_3_gang_ts0003'],
    'historic third-party switch_4gang mapping conflicts with this three-endpoint physical interview');
  assert.ok(!JSON.stringify(dual).includes('TS0726'));
  assert.ok(!JSON.stringify(triple).includes('TS0726'));
});
