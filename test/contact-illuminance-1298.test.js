'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../app.json');
const conversion = require('../drivers/illuminance_sensor/measurements');

const profiles = [
  {id:'contact_lux_hobeian',m:'HOBEIAN',p:'ZG-102ZL',
    clusters:[0,1,3,1024,1280,61184]},
  {id:'contact_lux_pay2byax',m:'_TZE200_pay2byax',p:'TS0601',
    clusters:[0,1,3,1024,1280]},
];

test('#1298 and physical source #414 are independently exact contact+lux matchers',()=>{
  for(const p of profiles) {
    const manifest=require('../drivers/'+p.id+'/driver.compose.json');
    assert.equal(manifest.id,p.id);
    assert.deepEqual(manifest.zigbee.manufacturerName,[p.m]);
    assert.deepEqual(manifest.zigbee.productId,[p.p]);
    assert.deepEqual(manifest.zigbee.endpoints,{
      '1':{clusters:p.clusters,bindings:[1,1024,1280]},
    });
    assert.deepEqual(manifest.capabilities,[
      'alarm_contact','measure_luminance','measure_battery','alarm_battery',
    ]);
    assert.deepEqual(manifest.energy.batteries,['OTHER']);
    const matches=app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes(p.m)
      && d.zigbee?.productId?.includes(p.p));
    assert.deepEqual(matches.map(d=>d.id),[p.id]);
    assert.deepEqual(matches[0].energy.batteries,['OTHER']);
    assert.equal(matches[0].settings,undefined);
  }
  // Exact pairs, no modelID TS0601 added to other HOBEIAN profiles.
  assert.deepEqual(app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes('HOBEIAN')
    && d.zigbee?.productId?.includes('TS0601')).map(d=>d.id),[]);
  assert.deepEqual(app.drivers.filter(d=>d.zigbee?.manufacturerName?.includes('_TZE200_pay2byax')
    && d.zigbee?.productId?.includes('ZG-102ZL')).map(d=>d.id),[]);
  const h=profiles[0],t=profiles[1];
  assert.ok(h.clusters.includes(61184),'physical HOBEIAN EF00 announced and retained');
  assert.ok(!t.clusters.includes(61184),'later independent TS0601 interviews do not advertise EF00');
  const hsrc=fs.readFileSync(path.join(__dirname,'..','drivers',h.id,'device.js'),'utf8');
  const tsrc=fs.readFileSync(path.join(__dirname,'..','drivers',t.id,'device.js'),'utf8');
  assert.ok(tsrc.includes("module.exports = require('../contact_lux_hobeian/device')"));
  for(const source of [hsrc,tsrc]) {
    assert.doesNotMatch(source,/TuyaDataPoints|TuyaSpecificCluster|sendFrame|writeAttributes|Cluster\.addCluster/);
  }
});

function initHarness(firstInit=true,reportingFailure=false) {
  const source=fs.readFileSync(path.join(__dirname,'..','drivers','contact_lux_hobeian','device.js'),'utf8');
  const CLUSTER={
    IAS_ZONE:{NAME:'iasZone'},
    POWER_CONFIGURATION:{NAME:'powerConfiguration'},
    ILLUMINANCE_MEASUREMENT:{NAME:'illuminanceMeasurement'},
  };
  const out={exports:{}};
  class ZigBeeDevice {
    constructor(){this.vals=[];this.config=[];this.messages=[];this.errors=[];
      this.error=(...args)=>this.errors.push(args);}
    isFirstInit(){return firstInit;}
    setCapabilityValue(id,value){this.vals.push([id,value]);return Promise.resolve();}
    configureAttributeReporting(list) {
      this.config.push(...list);
      return reportingFailure?Promise.reject(new Error('sleepy device')):Promise.resolve();
    }
    log(...args){this.messages.push(args);}
  }
  const requireFake=name=>{
    if(name==='homey-zigbeedriver')return {ZigBeeDevice};
    if(name==='zigbee-clusters')return {CLUSTER};
    if(name==='../illuminance_sensor/measurements')return conversion;
    throw Error('unexpected dependency '+name);
  };
  const factory=vm.runInNewContext('(function(require,module,exports){'+source+'\n})');
  factory(requireFake,out,out.exports);
  const device=new out.exports();
  const events={};
  const register=name=>({on(event,listener){events[name+'.'+event]=listener;}});
  const ias=register('ias');ias.enrollments=[];
  ias.zoneEnrollResponse=payload=>{ias.enrollments.push(payload);return Promise.resolve();};
  const zclNode={endpoints:{1:{clusters:{
    iasZone:ias,illuminanceMeasurement:register('lux'),
    powerConfiguration:register('power'),
  }}}};
  return {device,events,ias,zclNode};
}

test('real shared runtime handles IAS contact, battery flags, lux ZCL units and invalid samples',async()=>{
  const {device,ias,events,zclNode}=initHarness();
  await device.onNodeInit({zclNode});
  assert.equal(device.config.length,2,'only optional lux and battery reporting, no extra EF00 setup');
  assert.deepEqual(device.config.map(x=>x.cluster.NAME),['illuminanceMeasurement','powerConfiguration']);
  assert.deepEqual(ias.enrollments,[],'IAS enrollment is reactive, not unsolicited startup traffic');
  assert.equal(typeof ias.onZoneEnrollRequest,'function');
  ias.onZoneEnrollRequest();
  await Promise.resolve();await Promise.resolve();
  assert.equal(ias.enrollments.length,1);
  assert.equal(ias.enrollments[0].enrollResponseCode,0);
  assert.equal(ias.enrollments[0].zoneId,0);
  ias.onZoneStatusChangeNotification({zoneStatus:{alarm1:true,battery:false}});
  ias.onZoneStatusChangeNotification({zoneStatus:{alarm1:false,battery:true}});
  events['ias.attr.zoneStatus']({alarm1:true});
  ias.onZoneStatusChangeNotification({zoneStatus:{}});
  ias.onZoneStatusChangeNotification({zoneStatus:null});
  assert.deepEqual(device.vals.slice(0,5),[
    ['alarm_contact',true],['alarm_battery',false],
    ['alarm_contact',false],['alarm_battery',true],['alarm_contact',true],
  ]);
  events['lux.attr.measuredValue'](10001);
  events['lux.attr.measuredValue'](0);
  events['lux.attr.measuredValue'](0xffff);
  events['lux.attr.measuredValue'](NaN);
  assert.deepEqual(device.vals.slice(5),[
    ['measure_luminance',10],['measure_luminance',0],
  ]);
  events['power.attr.batteryPercentageRemaining'](200);
  events['power.attr.batteryPercentageRemaining'](39);
  events['power.attr.batteryPercentageRemaining'](255);
  events['power.attr.batteryPercentageRemaining'](-1);
  events['power.attr.batteryPercentageRemaining'](false);
  assert.deepEqual(device.vals.slice(7),[
    ['measure_battery',100],['alarm_battery',false],
    ['measure_battery',19.5],['alarm_battery',true],
  ]);
  assert.deepEqual(device.errors,[]);
});

test('sleepy init survives optional reporting failure, restart does not send reporting configuration',async()=>{
  const failed=initHarness(true,true);
  await failed.device.onNodeInit({zclNode:failed.zclNode});
  assert.equal(failed.device.config.length,2);
  assert.equal(failed.device.messages.length,2);
  assert.deepEqual(failed.device.errors,[]);
  const restored=initHarness(false,true);
  await restored.device.onNodeInit({zclNode:restored.zclNode});
  assert.deepEqual(restored.device.config,[]);
  assert.equal(typeof restored.ias.onZoneStatusChangeNotification,'function');
  assert.equal(typeof restored.events['lux.attr.measuredValue'],'function');
  assert.equal(typeof restored.events['power.attr.batteryPercentageRemaining'],'function');
});
