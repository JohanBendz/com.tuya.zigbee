'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../app.json');

// #1339 and #1401 were consolidated into #1338 as tracking duplicates only;
// these are two DIFFERENT physical identities, not a wildcard TS0001/TS0726.
const expected = [
  { id: 'switch_1_gang_bseed_ts0001', name: '_TZ3000_blhvsaqf', product: 'TS0001', gang: 1 },
  { id: 'switch_4_gang_bseed_ts0726', name: '_TZ3002_pzao9ls1', product: 'TS0726', gang: 4 },
];

test('exact BSEED one and four gang pairings and independent OnOff endpoints', () => {
  for (const row of expected) {
    const profile = require('../drivers/' + row.id + '/driver.compose.json');
    const generated = app.drivers.find(d => d.id === row.id);
    assert.ok(generated);
    assert.deepEqual(profile.zigbee.manufacturerName, [row.name]);
    assert.deepEqual(profile.zigbee.productId, [row.product]);
    assert.deepEqual(generated.zigbee.manufacturerName, [row.name]);
    assert.deepEqual(generated.zigbee.productId, [row.product]);
    assert.equal(profile.settings, undefined);
    assert.equal(generated.settings, undefined);
    assert.deepEqual(profile.capabilities, ['onoff']);
    assert.deepEqual(Object.keys(profile.zigbee.endpoints), Array.from({length:row.gang}, (_,i)=>String(i+1)));
    assert.deepEqual(Object.keys(profile.zigbee.devices || {}).length, row.gang-1);
    for (let i=1;i<=row.gang;i++) assert.deepEqual(profile.zigbee.endpoints[i], {
      clusters: i === 1 ? [0, 4, 5, 6] : [4, 5, 6], bindings: [6],
    });
    assert.doesNotMatch(JSON.stringify(profile), /57344|57345|1794|2820|meter_power|relay_status/);
    const matched = app.drivers.filter(d =>
      [].concat(d.zigbee?.manufacturerName || []).includes(row.name) &&
      [].concat(d.zigbee?.productId || []).includes(row.product));
    assert.deepEqual(matched.map(d => d.id), [row.id]);
  }
  assert.ok(!app.drivers.find(d=>d.id==='switch_4_gang_ts0004').zigbee.manufacturerName.includes('_TZ3002_pzao9ls1'),
    'TS0726 cannot be merged into non-metering TS0004');
});

test('runtime performs only exact independent standard OnOff registration, no startup writes', async () => {
  for (const row of expected) {
    const source=fs.readFileSync(path.join(__dirname,'..','drivers',row.id,'device.js'),'utf8');
    assert.doesNotMatch(source,/writeAttributes|readAttributes|relayStatus|TuyaOnOffCluster/);
    const mod={exports:{}};
    const ON_OFF={NAME:'onOff'};
    class Stub {
      constructor(subDeviceId){this.subDeviceId=subDeviceId;this.calls=[];}
      getData(){return this.subDeviceId?{subDeviceId:this.subDeviceId}:{};}
      registerCapability(capability,cluster,options){this.calls.push({capability,cluster,endpoint:options.endpoint});}
    }
    const fakeRequire=s=>{
      if(s==='homey-zigbeedriver')return {ZigBeeDevice:Stub};
      if(s==='zigbee-clusters')return {CLUSTER:{ON_OFF}};
      throw new Error('Unexpected dependency '+s);
    };
    vm.runInNewContext('(function(require,module,exports){'+source+'\n})')(fakeRequire,mod,mod.exports);
    const Device=mod.exports;
    const channels=[undefined,'secondSwitch','thirdSwitch','fourthSwitch'].slice(0,row.gang);
    for(let ep=1;ep<=row.gang;ep++){
      const instance=new Device(channels[ep-1]);
      await instance.onNodeInit();
      assert.deepEqual(instance.calls.map(c=>[c.capability,c.endpoint]),[['onoff',ep]]);
      assert.equal(instance.calls[0].cluster,ON_OFF);
    }
    if(row.gang===4){
      await assert.rejects(new Device('unexpectedChild').onNodeInit(),/Unknown TS0726 subdevice/);
    }
  }
});
