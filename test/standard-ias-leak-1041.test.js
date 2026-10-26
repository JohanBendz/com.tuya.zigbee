'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../app.json');
const id = 'flood_sensor_unverified_battery';
const compose = require('../drivers/' + id + '/driver.compose.json');
const names = [
  { manufacturer: '_TZ3000_bzt33cyu', original: 1041 },
  { manufacturer: '_TZ3000_4qaowtdo', original: 1032 },
  { manufacturer: '_TZ3000_qhozxs2b', original: 952 },
];

test('#1041 exact physically interviewed TS0207 standard-IAS family retains separate battery metadata', () => {
  assert.equal(compose.id, id);
  assert.deepEqual(compose.zigbee.manufacturerName, names.map(x=>x.manufacturer));
  assert.deepEqual(compose.zigbee.productId, ['TS0207']);
  assert.deepEqual(compose.zigbee.endpoints, {'1': {
    clusters: [0,1,3,1280], bindings: [1,1280],
  }});
  assert.deepEqual(compose.capabilities, ['alarm_water','alarm_battery']);
  assert.deepEqual(compose.energy.batteries, ['OTHER']);
  assert.ok(!JSON.stringify(compose).includes('61184'), 'no Tuya EF00/DP parsing');
  for (const {manufacturer} of names) {
    const matches=app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes(manufacturer)
      && d.zigbee?.productId?.includes('TS0207'));
    assert.deepEqual(matches.map(d=>d.id),[id]);
    assert.deepEqual(matches[0].energy.batteries,['OTHER']);
  }
  assert.deepEqual(app.drivers.filter(d=>d.id===id).length,1);
  const legacy=app.drivers.find(d=>d.id==='flood_sensor');
  const legacy2=app.drivers.find(d=>d.id==='flood_sensor_2');
  assert.ok(legacy.zigbee.manufacturerName.includes('_TZ3000_bfopm9ga'));
  assert.deepEqual(legacy.energy.batteries,['CR2032']);
  assert.deepEqual(legacy2.zigbee.manufacturerName,['_TZ3000_baeiitad']);
  assert.deepEqual(legacy2.energy.batteries,['AAA','AAA']);
  const rain=app.drivers.find(d=>d.id==='rain_sensor_mowe');
  assert.deepEqual(rain.zigbee.manufacturerName,['_TZ3000_o9f2zqln']);
  const src=fs.readFileSync(path.join(__dirname,'..','drivers',id,'device.js'),'utf8');
  assert.match(src,/module\.exports = require\('\.\.\/flood_sensor\/device'\)/);
  assert.doesNotMatch(src,/TuyaSpecificCluster|TuyaDataPoints|readAttributes|writeAttributes/);
});

test('inherited IAS water runtime registers reports and maps wet/dry + low battery without startup commands',async()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','drivers','flood_sensor','device.js'),'utf8');
  const out={exports:{}};
  class ZigBeeDevice{
    constructor(){this.values=[];this.error=e=>{throw e};this.log=()=>{};}
    setCapabilityValue(id,value){this.values.push([id,value]);return Promise.resolve();}
  }
  const f=vm.runInNewContext('(function(require,module,exports){'+src+'\n})');
  f(name=>{
    if(name==='homey-zigbeedriver')return {ZigBeeDevice};
    if(name==='zigbee-clusters')return {CLUSTER:{IAS_ZONE:{NAME:'iasZone'}}};
    throw Error('Unexpected dependency: '+name);
  },out,out.exports);
  const d=new out.exports();
  const iasZone={};
  await d.onNodeInit({zclNode:{endpoints:{1:{clusters:{iasZone}}}}});
  assert.equal(typeof iasZone.onZoneStatusChangeNotification,'function');
  assert.deepEqual(d.values,[],'no unsolicited startup read/write');
  iasZone.onZoneStatusChangeNotification({zoneStatus:{alarm1:false,battery:false}});
  iasZone.onZoneStatusChangeNotification({zoneStatus:{alarm1:true,battery:true}});
  iasZone.onZoneStatusChangeNotification({zoneStatus:{alarm1:false,battery:false}});
  assert.deepEqual(d.values,[
    ['alarm_water',false],['alarm_battery',false],
    ['alarm_water',true],['alarm_battery',true],
    ['alarm_water',false],['alarm_battery',false],
  ]);
  assert.equal(d.values.some(([name])=>name==='measure_battery'),false,
    'existing legacy runtime has no battery percentage listener: no phantom capability');
});
