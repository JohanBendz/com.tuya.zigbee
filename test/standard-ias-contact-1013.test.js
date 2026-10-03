'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../app.json');
const root='contact_sensor_elivco_x8q36xwf';
const profiles=[
 {id:root,m:'_TZ3000_x8q36xwf',p:'TS0203',poll:true,cells:['OTHER']},
 {id:'contact_sensor_ewelink_snzb04',m:'eWeLink',p:'SNZB-04',poll:true,cells:['OTHER']},
 {id:'contact_sensor_n8dljorx',m:'_TZE200_n8dljorx',p:'TS0601',poll:false,cells:['CR2032']},
];

test('three physical #1013 standard IAS contacts have three independent exact matcher contracts',()=>{
 for(const x of profiles){
  const c=require('../drivers/'+x.id+'/driver.compose.json');
  assert.equal(c.id,x.id);
  assert.deepEqual(c.zigbee.manufacturerName,[x.m]);
  assert.deepEqual(c.zigbee.productId,[x.p]);
  assert.deepEqual(c.zigbee.endpoints,{
   '1':{clusters:x.poll?[0,1,3,32,1280]:[0,1,3,1280],bindings:[1,1280]},
  });
  assert.deepEqual(c.capabilities,['alarm_contact','measure_battery','alarm_battery']);
  assert.deepEqual(c.energy.batteries,x.cells);
  assert.ok(!c.zigbee.endpoints['1'].clusters.includes(61184),'no EF00 merely due to TS0601');
  assert.ok(!c.capabilities.includes('measure_luminance'),'plain contact, not #1298 contact+lux');
  const matches=app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes(x.m)
   && d.zigbee?.productId?.includes(x.p));
  assert.deepEqual(matches.map(d=>d.id),[x.id]);
  assert.deepEqual(matches[0].energy.batteries,x.cells);
  assert.equal(matches[0].settings,undefined);
 }
 const existing=app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes('zbeacon')
  && d.zigbee?.productId?.includes('DS01'));
 assert.deepEqual(existing.map(d=>d.id),['doorwindowsensor_4'],'#832 already supported, no cloned driver');
 const old=app.drivers.find(d=>d.id==='doorwindowsensor');
 assert.ok(old.zigbee.productId.includes('SNZB-04'),'shared legacy driver remains intact');
 assert.equal(old.zigbee.manufacturerName.includes('eWeLink'),false,
  'do not extend old Cartesian matcher with unrelated eWeLink product IDs');
 for(const a of profiles)for(const b of profiles)if(a!==b) {
  const cross=app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes(a.m)
   && d.zigbee?.productId?.includes(b.p));
  assert.deepEqual(cross.map(d=>d.id),[],'no accidental cross pairing');
 }
 for(const x of profiles.slice(1)){
  const code=fs.readFileSync(path.join(__dirname,'..','drivers',x.id,'device.js'),'utf8');
  assert.ok(code.includes("module.exports = require('../"+root+"/device')"));
 }
 const own=fs.readFileSync(path.join(__dirname,'..','drivers',root,'device.js'),'utf8');
 assert.doesNotMatch(own,/TuyaDataPoints|TuyaSpecificCluster|sendFrame|readAttributes|writeAttributes|Cluster\.addCluster/);
});

function harness(){
 const code=fs.readFileSync(path.join(__dirname,'..','drivers',root,'device.js'),'utf8');
 const mod={exports:{}},errors=[];
 class ZigBeeDevice {
  constructor(){this.values=[];this.error=e=>errors.push(e);}
  setCapabilityValue(cap,value){this.values.push([cap,value]);return Promise.resolve();}
 }
 const cluster={IAS_ZONE:{NAME:'iasZone'},POWER_CONFIGURATION:{NAME:'powerConfiguration'}};
 const factory=vm.runInNewContext('(function(require,module,exports){'+code+'\n})');
 factory(name=>{
  if(name==='homey-zigbeedriver')return {ZigBeeDevice};
  if(name==='zigbee-clusters')return {CLUSTER:cluster};
  throw Error('Unexpected dependency '+name);
 },mod,mod.exports);
 const device=new mod.exports();
 const subscriptions={};
 const ias={
  response:[],
  zoneEnrollResponse(payload){this.response.push(payload);return Promise.resolve();},
 };
 const battery={on(event,callback){subscriptions[event]=callback;}};
 return {device,ias,subscriptions,errors,zclNode:{endpoints:{1:{clusters:{iasZone:ias,powerConfiguration:battery}}}}};
}

test('isolated standard IAS contact runtime supports open/closed and low-battery without startup reads',async()=>{
 const {device,ias,subscriptions,errors,zclNode}=harness();
 await device.onNodeInit({zclNode});
 assert.equal(typeof ias.onZoneStatusChangeNotification,'function');
 assert.equal(typeof ias.onZoneEnrollRequest,'function');
 assert.equal(typeof subscriptions['attr.batteryPercentageRemaining'],'function');
 assert.deepEqual(device.values,[]);
 assert.deepEqual(ias.response,[]);
 ias.onZoneEnrollRequest();
 await Promise.resolve();await Promise.resolve();
 assert.equal(ias.response.length,1);
 assert.equal(ias.response[0].enrollResponseCode,0);
 assert.equal(ias.response[0].zoneId,0);
 ias.onZoneStatusChangeNotification({zoneStatus:{alarm1:true,battery:false}});
 ias.onZoneStatusChangeNotification({zoneStatus:{alarm1:false,battery:true}});
 ias.onZoneStatusChangeNotification({zoneStatus:{alarm1:true}});
 ias.onZoneStatusChangeNotification({zoneStatus:{}});
 ias.onZoneStatusChangeNotification({zoneStatus:null});
 ias.onZoneStatusChangeNotification({});
 assert.deepEqual(device.values,[
  ['alarm_contact',true],['alarm_battery',false],
  ['alarm_contact',false],['alarm_battery',true],
  ['alarm_contact',true],
 ],'a partial IAS report cannot false-close an existing contact');
 subscriptions['attr.batteryPercentageRemaining'](200);
 subscriptions['attr.batteryPercentageRemaining'](101);
 subscriptions['attr.batteryPercentageRemaining'](0);
 for(const invalid of [255,-1,NaN,null,false,'200',201,21.5])
  subscriptions['attr.batteryPercentageRemaining'](invalid);
 assert.deepEqual(device.values.slice(5),[
  ['measure_battery',100],['measure_battery',50.5],['measure_battery',0],
 ]);
 assert.deepEqual(errors,[]);
});
