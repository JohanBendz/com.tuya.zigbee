'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../app.json');
const luxConverter = require('../drivers/illuminance_sensor/measurements');
const root='motion_lux_hobeian_zg204zl';
const profiles=[
 {id:root,m:'HOBEIAN',p:'ZG-204ZL'},
 {id:'motion_lux_kb5noeto',m:'_TZE200_kb5noeto',p:'TS0601'},
];

test('#1481: exact IAS motion/lux profiles have no EF00 or Cartesian manufacturer/product collisions',()=>{
 for(const x of profiles){
  const c=require('../drivers/'+x.id+'/driver.compose.json');
  assert.equal(c.id,x.id);
  assert.deepEqual(c.zigbee.manufacturerName,[x.m]);
  assert.deepEqual(c.zigbee.productId,[x.p]);
  assert.deepEqual(c.zigbee.endpoints,{
   '1':{clusters:[0,1,3,1024,1280],bindings:[1,1024,1280]},
  });
  assert.deepEqual(c.capabilities,['alarm_motion','measure_luminance','measure_battery','alarm_battery']);
  assert.deepEqual(c.energy.batteries,['OTHER']);
  const matches=app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes(x.m)
   && d.zigbee?.productId?.includes(x.p));
  assert.deepEqual(matches.map(d=>d.id),[x.id]);
  assert.deepEqual(matches[0].energy.batteries,['OTHER']);
  assert.equal(matches[0].settings,undefined);
 }
 assert.deepEqual(app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes('HOBEIAN')
   && d.zigbee?.productId?.includes('TS0601')).map(d=>d.id),[]);
 assert.deepEqual(app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes('_TZE200_kb5noeto')
   && d.zigbee?.productId?.includes('ZG-204ZL')).map(d=>d.id),[]);
 assert.deepEqual(app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes('eWeLink')
   && d.zigbee?.productId?.includes('SNZB-03')).map(d=>d.id),[],
   'physical PIR/water shared SNZB-03 fingerprint (#1113/#1475) is NOT safe for naive matcher');
 assert.ok(!app.drivers.find(d=>d.id==='motion_sensor_2').zigbee.manufacturerName.includes('_TZE200_kb5noeto'),
   'do not put standard-only profile into frozen EF00 runtime');
 const own=fs.readFileSync(path.join(__dirname,'..','drivers',root,'device.js'),'utf8');
 const alias=fs.readFileSync(path.join(__dirname,'..','drivers','motion_lux_kb5noeto','device.js'),'utf8');
 assert.ok(alias.includes("module.exports = require('../"+root+"/device')"));
 assert.doesNotMatch(own,/TuyaDataPoints|TuyaSpecificCluster|sendFrame|writeAttributes|Cluster\.addCluster/);
});

function harness(firstInit=true,failReport=false){
 const code=fs.readFileSync(path.join(__dirname,'..','drivers',root,'device.js'),'utf8');
 const mod={exports:{}},cluster={
  IAS_ZONE:{NAME:'iasZone'},POWER_CONFIGURATION:{NAME:'powerConfiguration'},
  ILLUMINANCE_MEASUREMENT:{NAME:'illuminanceMeasurement'},
 };
 class MockZigBeeDevice{
  constructor(){this.values=[];this.reporting=[];this.logs=[];this.errors=[];
   this.error=(...args)=>this.errors.push(args);}
  setCapabilityValue(name,value){this.values.push([name,value]);return Promise.resolve();}
  isFirstInit(){return firstInit;}
  configureAttributeReporting(config){
   this.reporting.push(...config);
   return failReport?Promise.reject(new Error('sleepy device')):Promise.resolve();
  }
  log(...args){this.logs.push(args);}
 }
 const f=vm.runInNewContext('(function(require,module,exports){'+code+'\n})');
 f(name=>{
  if(name==='homey-zigbeedriver')return {ZigBeeDevice:MockZigBeeDevice};
  if(name==='zigbee-clusters')return {CLUSTER:cluster};
  if(name==='../illuminance_sensor/measurements')return luxConverter;
  throw Error('Unexpected runtime dependency '+name);
 },mod,mod.exports);
 const device=new mod.exports(),listeners={};
 function reg(type){return {on(name,callback){listeners[type+'.'+name]=callback;}};}
 const ias=reg('ias');ias.enrollments=[];
 ias.zoneEnrollResponse=value=>{ias.enrollments.push(value);return Promise.resolve();};
 const endpoint={clusters:{
  iasZone:ias,illuminanceMeasurement:reg('lux'),powerConfiguration:reg('power'),
 }};
 return {device,ias,listeners,zclNode:{endpoints:{1:endpoint}}};
}

test('IAS motion uses ONLY explicit status bits, reacts to enrollment and retains alarm on partial frame',async()=>{
 const {device,ias,listeners,zclNode}=harness();
 await device.onNodeInit({zclNode});
 assert.equal(device.reporting.length,2);
 assert.deepEqual(device.reporting.map(x=>x.cluster.NAME),['illuminanceMeasurement','powerConfiguration']);
 assert.deepEqual(ias.enrollments,[],'do not send unsolicited ZCL startup commands');
 ias.onZoneEnrollRequest();
 await Promise.resolve();await Promise.resolve();
 assert.equal(ias.enrollments.length,1);
 assert.equal(ias.enrollments[0].enrollResponseCode,0);
 assert.equal(ias.enrollments[0].zoneId,0);
 ias.onZoneStatusChangeNotification({zoneStatus:{alarm1:true,battery:false}});
 ias.onZoneStatusChangeNotification({zoneStatus:{}});
 ias.onZoneStatusChangeNotification({zoneStatus:null});
 listeners['ias.attr.zoneStatus']({alarm1:false,battery:true});
 ias.onZoneStatusChangeNotification({zoneStatus:{alarm1:true}});
 assert.deepEqual(device.values,[
  ['alarm_motion',true],['alarm_battery',false],
  ['alarm_motion',false],['alarm_battery',true],
  ['alarm_motion',true],
 ]);
 assert.deepEqual(device.errors,[]);
});

test('standard lux and battery reports filter unknown and out-of-range samples',async()=>{
 const {device,listeners,zclNode}=harness();
 await device.onNodeInit({zclNode});
 for(const v of [10001,20001,0,0xffff,-1,NaN,null,'10001',65536])
  listeners['lux.attr.measuredValue'](v);
 for(const v of [200,39,0,255,-1,NaN,null,'200',false,201])
  listeners['power.attr.batteryPercentageRemaining'](v);
 assert.deepEqual(device.values,[
  ['measure_luminance',10],['measure_luminance',100],['measure_luminance',0],
  ['measure_battery',100],['alarm_battery',false],
  ['measure_battery',19.5],['alarm_battery',true],
  ['measure_battery',0],['alarm_battery',true],
 ]);
 assert.deepEqual(device.errors,[]);
});

test('both optional sleepy reporting setups are nonfatal and not repeated after restart',async()=>{
 const a=harness(true,true);
 await a.device.onNodeInit({zclNode:a.zclNode});
 assert.equal(a.device.reporting.length,2);
 assert.equal(a.device.logs.length,2);
 assert.deepEqual(a.device.errors,[]);
 const restarted=harness(false,true);
 await restarted.device.onNodeInit({zclNode:restarted.zclNode});
 assert.deepEqual(restarted.device.reporting,[]);
 assert.equal(typeof restarted.ias.onZoneStatusChangeNotification,'function');
 assert.equal(typeof restarted.listeners['power.attr.batteryPercentageRemaining'],'function');
});
