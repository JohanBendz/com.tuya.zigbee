'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const manifest = require('../app.json');
const profiles = [
  { id: 'temphumidsensor_aubess_qoy0ekbd', m: '_TZE200_qoy0ekbd', p: 'TS0601' },
  { id: 'temphumidsensor_tsgqxdb4', m: '_TZ3000_tsgqxdb4', p: 'TS0201' },
];

test('#797 / #1246 are two separate exact standard-cluster temp/RH profiles, never a manufacturer/model cross product', () => {
  for (const s of profiles) {
    const c = require('../drivers/' + s.id + '/driver.compose.json');
    assert.equal(c.id, s.id);
    assert.deepEqual(c.zigbee.manufacturerName, [s.m]);
    assert.deepEqual(c.zigbee.productId, [s.p]);
    assert.deepEqual(c.zigbee.endpoints, {
      '1': { clusters: [0,1,1026,1029], bindings: [1,1026,1029] },
    });
    assert.deepEqual(c.energy.batteries, ['OTHER']);
    assert.deepEqual(c.capabilities, [
      'measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery',
    ]);
    assert.equal(c.zigbee.endpoints['1'].clusters.includes(61184), false, 'no EF00 input');
    assert.equal(c.capabilities.some(x => x.includes('soil') || x.includes('moisture')), false);
    const matches=manifest.drivers.filter(d => d.zigbee?.manufacturerName?.includes(s.m)
      && d.zigbee?.productId?.includes(s.p));
    assert.deepEqual(matches.map(d=>d.id), [s.id]);
    assert.deepEqual(matches[0].settings, require('../drivers/' + s.id + '/driver.settings.compose.json'));
    const source=fs.readFileSync(path.join(__dirname,'..','drivers',s.id,'device.js'),'utf8');
    assert.match(source, /module\.exports = require\('\.\.\/temphumidsensor3\/device'\)/);
    assert.doesNotMatch(source, /TuyaSpecificCluster|TuyaDataPoints|Cluster\.addCluster/);
  }
  for (const s of profiles) for (const other of profiles) {
    if (s===other) continue;
    assert.deepEqual(manifest.drivers.filter(d => d.zigbee?.manufacturerName?.includes(s.m)
      && d.zigbee?.productId?.includes(other.p)).map(d=>d.id), []);
  }
});

function runtime(firstInit) {
  const src=fs.readFileSync(path.join(__dirname,'..','drivers','temphumidsensor3','device.js'),'utf8');
  const names={POWER_CONFIGURATION:{NAME:'powerConfiguration'},
    TEMPERATURE_MEASUREMENT:{NAME:'temperatureMeasurement'},
    RELATIVE_HUMIDITY_MEASUREMENT:{NAME:'relativeHumidity'}};
  const out={exports:{}};
  class MockZigBeeDevice {
    constructor(){this.events={};this.configs=[];this.values={};this.settings={};this.errors=[];}
    isFirstInit(){return firstInit;}
    configureAttributeReporting(arr){this.configs.push(...arr);return Promise.resolve();}
    getSetting(name){return this.settings[name];}
    setCapabilityValue(name,value){this.values[name]=value;return Promise.resolve();}
    log(){}
    error(...args){this.errors.push(args);}
  }
  const factory=vm.runInNewContext('(function(require,module,exports){'+src+'\n})');
  factory(name=>{
    if(name==='homey')return {};
    if(name==='homey-zigbeedriver')return {ZigBeeDevice:MockZigBeeDevice};
    if(name==='zigbee-clusters')return {debug(){},CLUSTER:names};
    throw Error('Unrecognized module '+name);
  },out,out.exports);
  const d=new out.exports();
  const cluster=(name)=>({on(event,fn){d.events[name+'.'+event]=fn;}});
  return {device:d,zclNode:{endpoints:{1:{clusters:{
    powerConfiguration:cluster('battery'),
    temperatureMeasurement:cluster('temperature'),
    relativeHumidity:cluster('humidity'),
  }}}}};
}

test('actual inherited standard runtime gives physical source #1246 centidegree and centipercent values', async()=>{
  const {device,zclNode}=runtime(true);
  await device.onNodeInit({zclNode});
  assert.deepEqual(device.configs.map(x=>[x.cluster.NAME,x.attributeName]),[
    ['temperatureMeasurement','measuredValue'],
    ['relativeHumidity','measuredValue'],
    ['powerConfiguration','batteryPercentageRemaining'],
  ]);
  device.events['temperature.attr.measuredValue'](2271);
  device.events['humidity.attr.measuredValue'](7003);
  device.events['battery.attr.batteryPercentageRemaining'](200);
  assert.equal(device.values.measure_temperature,22.7);
  assert.equal(device.values.measure_humidity,70);
  assert.equal(device.values.measure_battery,100);
  assert.equal(device.values.alarm_battery,false);
  device.settings.temperature_decimals='2';device.settings.humidity_decimals='2';
  device.events['temperature.attr.measuredValue'](2271);
  device.events['humidity.attr.measuredValue'](7003);
  assert.equal(device.values.measure_temperature,22.71);
  assert.equal(device.values.measure_humidity,70.03);
  device.events['battery.attr.batteryPercentageRemaining'](18);
  assert.equal(device.values.measure_battery,9);
  assert.equal(device.values.alarm_battery,true);
  assert.equal(device.errors.length,0);
});

test('restart attaches standard reports without reconfiguring sleeping devices',async()=>{
  const {device,zclNode}=runtime(false);
  await device.onNodeInit({zclNode});
  assert.deepEqual(device.configs,[]);
  assert.deepEqual(Object.keys(device.events).sort(),[
    'battery.attr.batteryPercentageRemaining',
    'humidity.attr.measuredValue',
    'temperature.attr.measuredValue',
  ]);
});
