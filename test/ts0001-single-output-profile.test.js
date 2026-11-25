'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const app = require('../app.json');
const profile = require('../drivers/switch_1_gang_ts0001/driver.compose.json');

const id = 'switch_1_gang_ts0001';
const physical = [
  ['_TZ3000_0t4zjtia', 1366],
  ['_TZ3000_p26flek3', 1172],
  ['_TZ3000_hyarhbyx', 1395],
  ['_TZ3000_y4che4dc', 674],
];

test('four physically interviewed single-output TS0001 identifiers have unique exact pairing', () => {
  assert.equal(profile.id, id);
  assert.deepEqual(profile.zigbee.manufacturerName, physical.map(x => x[0]));
  assert.deepEqual(profile.zigbee.productId, ['TS0001']);
  assert.deepEqual(profile.capabilities, ['onoff']);
  assert.deepEqual(profile.zigbee.endpoints, {
    '1': { clusters: [0, 4, 5, 6], bindings: [6] },
  });
  assert.equal(profile.zigbee.devices, undefined);
  assert.equal(profile.settings, undefined);
  const generated = app.drivers.find(d => d.id === id);
  assert.ok(generated);
  assert.deepEqual(generated.zigbee.manufacturerName, profile.zigbee.manufacturerName);
  assert.deepEqual(generated.zigbee.productId, ['TS0001']);
  assert.equal(generated.settings, undefined, 'No unverified momentary/power-on settings');
  for (const [manufacturer, issue] of physical) {
    const matching = app.drivers.filter(d =>
      [].concat(d.zigbee?.manufacturerName || []).includes(manufacturer)
      && [].concat(d.zigbee?.productId || []).includes('TS0001'));
    assert.deepEqual(matching.map(d=>d.id), [id], 'Issue #' + issue + ' must have exactly one match');
  }
});

test('metered, un-interviewed and separate BSEED TS0001 identities are excluded', () => {
  for (const excluded of [
    '_TZ3000_fdxihpp7', // #963: EP1 includes 0x0702/0x0B04
    '_TZ3000_e8cquwdk', // #160: no Homey Zigbee interview yet
    '_TZ3000_blhvsaqf', // #1339: own isolated BSEED profile
  ]) assert.ok(!profile.zigbee.manufacturerName.includes(excluded), excluded);
  assert.deepEqual(app.drivers.find(d=>d.id==='switch_1_gang_bseed_ts0001').zigbee.manufacturerName,
    ['_TZ3000_blhvsaqf'], 'Do not widen the BSEED-only profile');
  assert.doesNotMatch(JSON.stringify(profile), /1794|2820|57344|57345|meter_power|relay_status/);
});

test('new TS0001 runtime binds only one standard onoff capability on EP1', async () => {
  const src=fs.readFileSync(path.join(__dirname,'..','drivers',id,'device.js'),'utf8');
  assert.doesNotMatch(src,/readAttributes|writeAttributes|TuyaOnOffCluster|TuyaRelayStatus/);
  const moduleStub={exports:{}}, ON_OFF={NAME:'onOff'};
  class MockDevice {
    constructor(){this.registered=[];}
    registerCapability(capability,cluster,options){this.registered.push({capability,cluster,endpoint:options.endpoint});}
  }
  const resolver=dependency=>{
    if(dependency==='homey-zigbeedriver')return {ZigBeeDevice:MockDevice};
    if(dependency==='zigbee-clusters')return {CLUSTER:{ON_OFF}};
    throw new Error('Unexpected dependency: '+dependency);
  };
  vm.runInNewContext('(function(require,module,exports){'+src+'\n})')(resolver,moduleStub,moduleStub.exports);
  const unit=new moduleStub.exports();
  await unit.onNodeInit();
  assert.deepEqual(unit.registered.map(x=>[x.capability,x.endpoint]),[['onoff',1]]);
  assert.equal(unit.registered[0].cluster,ON_OFF);
});
