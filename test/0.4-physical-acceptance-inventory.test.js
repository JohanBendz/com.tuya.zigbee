'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../app.json');

const driverIds = [
  'temphumidsensor_ewelink',
  'temphumidsensor_excellux',
  'switch_1_gang_bseed_ts0001',
  'switch_1_gang_ts0001',
  'switch_2_gang_ts0002',
  'switch_3_gang_ts0003',
  'switch_4_gang_bseed_ts0726',
  'switch_4_gang_ts0004',
  'rain_sensor_mowe',
  'flood_sensor_unverified_battery',
  'contact_lux_hobeian',
  'contact_lux_pay2byax',
  'temphumidsensor_aubess_qoy0ekbd',
  'temphumidsensor_tsgqxdb4',
];

const document = fs.readFileSync(path.resolve(__dirname, '..', 'docs', '0.4.0_PHYSICAL_ACCEPTANCE.md'), 'utf8');
const begin = '<!-- BEGIN EXACT-IDENTITY ACCEPTANCE MATRIX -->';
const end = '<!-- END EXACT-IDENTITY ACCEPTANCE MATRIX -->';
const quote = String.fromCharCode(96);

function inventory() {
  const start = document.indexOf(begin), stop = document.indexOf(end);
  assert.ok(start >= 0 && stop > start, 'Hardware acceptance markers missing');
  return document.slice(start + begin.length, stop).split('\n')
    .filter(line => line.startsWith('| ' + quote)).map(line => {
      const cells = line.split('|').slice(1, -1).map(c => c.trim().replaceAll(quote, ''));
      assert.equal(cells.length, 6, 'Malformed acceptance row: ' + line);
      const [manufacturer, product, driver, issue, tiles, status] = cells;
      assert.match(issue, /^\[#[0-9]+\]\(https:\/\/github\.com\/JohanBendz\/com\.tuya\.zigbee\/issues\/[0-9]+\)$/);
      assert.ok(status, 'Physical state may not be empty');
      return {manufacturer, product, driver, tiles: Number(tiles), status};
    });
}

test('the physical gate enumerates exactly all 28 pairing identities from fourteen new profiles', () => {
  const rows = inventory();
  assert.equal(driverIds.length, 14);
  assert.equal(rows.length, 28);
  const seen = new Set();
  for (const row of rows) {
    assert.ok(driverIds.includes(row.driver), 'Undeclared new profile ' + row.driver);
    const key = row.manufacturer + '/' + row.product;
    assert.ok(!seen.has(key), 'Duplicate physical identity: ' + key);
    seen.add(key);
    const matches = app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes(row.manufacturer)
      && [].concat(d.zigbee?.productId || []).includes(row.product));
    assert.deepEqual(matches.map(d => d.id), [row.driver], 'Unique exact Homey matching: ' + key);
    assert.equal(row.tiles, 1 + Object.keys(matches[0].zigbee.devices || {}).length,
      'Homey tile count must be correct for ' + key);
  }
  const generated = driverIds.flatMap(id => {
    const d = app.drivers.find(x => x.id === id);
    assert.ok(d, 'New driver must exist in generated Homey manifest: ' + id);
    return d.zigbee.manufacturerName.flatMap(m => d.zigbee.productId.map(p => m + '/' + p));
  });
  assert.deepEqual([...seen].sort(), generated.sort(),
    'An addition or removal of a 0.4 manufacturer/model pairing REQUIRES acceptance inventory update');
});

test('separate metering or un-interviewed TS000x variants must not be accidentally accepted here', () => {
  const keys = new Set(inventory().map(x => x.manufacturer + '/' + x.product));
  for (const excluded of [
    '_TZ3000_fdxihpp7/TS0001', // metering #963
    '_TZ3000_ly9apzky/TS0003', // metering canonical #408
    '_TZ3000_e8cquwdk/TS0001', // no physical Homey interview #160
  ]) assert.ok(!keys.has(excluded), 'Wrong profile accidentally included: ' + excluded);
  const four = inventory().find(x => x.manufacturer === '_TZ3002_pzao9ls1');
  assert.equal(four.product, 'TS0726');
  assert.equal(four.driver, 'switch_4_gang_bseed_ts0726');
});
