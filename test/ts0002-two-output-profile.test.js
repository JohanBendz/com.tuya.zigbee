'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dId = 'switch_2_gang_ts0002';
const expectedManufacturers = [
  '_TZ3000_lugaswf8',
  '_TZ3000_zxrfobzw',
  '_TZ3000_ptjcjise',
  '_TZ3000_rmiew70n',
  '_TZ3000_pgcclddi',
  '_TZ3000_l9brjwau',
];
const profile = require('../drivers/switch_2_gang_ts0002/driver.compose.json');
const manifest = require('../app.json');

test('exact TS0002-only family, with two non-metering standard-Zigbee endpoints', () => {
  assert.equal(profile.id, dId);
  assert.deepEqual(profile.zigbee.manufacturerName, expectedManufacturers);
  assert.deepEqual(profile.zigbee.productId, ['TS0002']);
  assert.deepEqual(profile.capabilities, ['onoff']);
  assert.deepEqual(profile.zigbee.devices.secondSwitch.capabilities, ['onoff']);
  assert.deepEqual(profile.zigbee.endpoints['1'], { clusters: [0, 4, 5, 6], bindings: [6] });
  assert.deepEqual(profile.zigbee.endpoints['2'], { clusters: [4, 5, 6], bindings: [6] });
  for (const dp of ['measure_power','meter_power','measure_current','measure_voltage']) {
    assert.ok(!profile.capabilities.includes(dp), 'no phantom metering: ' + dp);
    assert.ok(!profile.zigbee.devices.secondSwitch.capabilities.includes(dp));
  }
  const clusters = JSON.stringify(profile.zigbee.endpoints);
  for (const optional of ['57344', '57345', '61184', '1794', '2820']) {
    assert.ok(!clusters.includes(optional), 'must not require proprietary or metering cluster ' + optional);
  }
  const generated = manifest.drivers.find(d => d.id === dId);
  assert.ok(generated);
  assert.deepEqual(generated.zigbee.manufacturerName, expectedManufacturers);
  assert.deepEqual(generated.zigbee.productId, ['TS0002']);
  assert.deepEqual(Object.keys(generated.zigbee.devices), ['secondSwitch']);
  for (const manufacturer of expectedManufacturers) {
    const matching = manifest.drivers.filter(d =>
      (d.zigbee?.manufacturerName || []).includes(manufacturer)
      && (d.zigbee?.productId || []).includes('TS0002')
    );
    assert.deepEqual(matching.map(d => d.id), [dId], manufacturer + ' has exactly one pairing profile');
  }
});

test('TS0002 profile reuses existing two-gang driver and device, without vendor writes', () => {
  const device = fs.readFileSync(path.resolve(__dirname,'..','drivers',dId,'device.js'),'utf8');
  const driver = fs.readFileSync(path.resolve(__dirname,'..','drivers',dId,'driver.js'),'utf8');
  assert.match(device, /module\.exports = require\('\.\.\/switch_2_gang\/device'\)/);
  assert.match(driver, /module\.exports = require\('\.\.\/switch_2_gang\/driver'\)/);
  assert.doesNotMatch(device + driver, /TuyaSpecificCluster|writeAttributes|DP[0-9]/);
});

test('actual existing runtime registers independent OnOff on EP1 and EP2, tolerates optional Basic read failure', async () => {
  const source = fs.readFileSync(path.resolve(__dirname,'..','drivers','switch_2_gang','device.js'),'utf8');
  const moduleStub = { exports: {} };
  const onOff = { NAME: 'onOff' };
  class MockZigBeeDevice {
    constructor(subDeviceId, failRead = false) {
      this.subDeviceId = subDeviceId;
      this.failRead = failRead;
      this.bound = [];
      this.reads = 0;
    }
    isSubDevice() { return this.subDeviceId === 'secondSwitch'; }
    getData() { return this.subDeviceId ? { subDeviceId: this.subDeviceId } : {}; }
    log() {}
    error() {}
    registerCapability(name, cluster, options) { this.bound.push({ name, cluster, endpoint: options.endpoint }); }
  }
  const fakeRequire = name => {
    if (name === 'homey') return {};
    if (name === 'homey-zigbeedriver') return { ZigBeeDevice: MockZigBeeDevice };
    if (name === 'zigbee-clusters') return { debug() {}, CLUSTER: { ON_OFF: onOff } };
    throw new Error('Unexpected dependency: ' + name);
  };
  const factory = vm.runInNewContext('(function(require,module,exports){' + source + '\n})');
  factory(fakeRequire, moduleStub, moduleStub.exports);
  const DriverDevice = moduleStub.exports;
  const makeNode = (device) => ({ endpoints: { 1: { clusters: {
    basic: { readAttributes() {
      device.reads += 1;
      return device.failRead ? Promise.reject(new Error('non-responsive Basic cluster')) : Promise.resolve({ manufacturerName: '_TZ3000_lugaswf8' });
    } },
  } } } });

  const parent = new DriverDevice();
  await parent.onNodeInit({ zclNode: makeNode(parent) });
  assert.equal(parent.reads, 1);
  assert.equal(parent.bound.length, 1);
  assert.equal(parent.bound[0].name, 'onoff');
  assert.equal(parent.bound[0].cluster, onOff);
  assert.equal(parent.bound[0].endpoint, 1);

  const child = new DriverDevice('secondSwitch');
  await child.onNodeInit({ zclNode: makeNode(child) });
  assert.equal(child.reads, 0, 'child should not duplicate the basic read');
  assert.equal(child.bound.length, 1);
  assert.equal(child.bound[0].endpoint, 2);

  const flakyParent = new DriverDevice(undefined, true);
  await flakyParent.onNodeInit({ zclNode: makeNode(flakyParent) });
  assert.equal(flakyParent.bound.length, 1);
  assert.equal(flakyParent.bound[0].endpoint, 1, 'optional Basic failure must not block switching');
});
