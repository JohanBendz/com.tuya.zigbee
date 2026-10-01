'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const id = 'switch_3_gang_ts0003';
const manufacturers = ['_TZ3000_lmcp6b0a', '_TZ3000_v4l4b0lp'];
const manifest = require('../app.json');
const profile = require('../drivers/switch_3_gang_ts0003/driver.compose.json');

test('exact #795/#1353 non-metering three-gang TS0003 pairing without cross-product manufacturer matches', () => {
  assert.equal(profile.id, id);
  assert.deepEqual(profile.zigbee.manufacturerName, manufacturers);
  assert.deepEqual(profile.zigbee.productId, ['TS0003']);
  assert.deepEqual(profile.capabilities, ['onoff']);
  assert.deepEqual(profile.zigbee.devices.secondSwitch.capabilities, ['onoff']);
  assert.deepEqual(profile.zigbee.devices.thirdSwitch.capabilities, ['onoff']);
  assert.deepEqual(Object.keys(profile.zigbee.devices).sort(), ['secondSwitch', 'thirdSwitch']);
  assert.deepEqual(profile.zigbee.endpoints, {
    '1': { clusters: [0, 4, 5, 6], bindings: [6] },
    '2': { clusters: [4, 5, 6], bindings: [6] },
    '3': { clusters: [4, 5, 6], bindings: [6] },
  });
  // Both real interviews also show optional Identify3 and E000/E001 on all
  // three EPs. Those optional clusters are not required for safe base OnOff.
  const declared = JSON.stringify(profile.zigbee.endpoints);
  for (const forbidden of [1794, 2820, 61184, 57344, 57345]) {
    assert.ok(!declared.includes(String(forbidden)), 'no invented mandatory vendor/metering cluster: ' + forbidden);
  }
  for (const cap of ['measure_power', 'meter_power', 'measure_current', 'measure_voltage']) {
    assert.ok(!JSON.stringify(profile.capabilities).includes(cap), 'no metering capability ' + cap);
    assert.ok(!JSON.stringify(profile.zigbee.devices).includes(cap), 'no child metering ' + cap);
  }

  const generated = manifest.drivers.find(d => d.id === id);
  assert.ok(generated, 'Compose output must include the new driver');
  assert.deepEqual(generated.zigbee.manufacturerName, manufacturers);
  assert.deepEqual(generated.zigbee.productId, ['TS0003']);
  assert.deepEqual(generated.capabilities, ['onoff']);
  assert.equal(generated.settings, undefined, 'Do not inherit phantom settings from another driver');
  for (const m of manufacturers) {
    const match = manifest.drivers.filter(d =>
      d.zigbee?.manufacturerName?.includes(m) && d.zigbee?.productId?.includes('TS0003')
    );
    assert.deepEqual(match.map(d => d.id), [id], 'single exact pairing profile: ' + m);
  }
});

test('new profile reuses existing validated standard three-channel runtime, never vendor writes', () => {
  const dir = path.join(__dirname, '..', 'drivers', id);
  const device = fs.readFileSync(path.join(dir, 'device.js'), 'utf8');
  const driver = fs.readFileSync(path.join(dir, 'driver.js'), 'utf8');
  assert.match(device, /module\.exports = require\('\.\.\/switch_3_gang\/device'\)/);
  assert.match(driver, /module\.exports = require\('\.\.\/switch_3_gang\/driver'\)/);
  assert.doesNotMatch(device + driver, /writeAttributes|TuyaSpecificCluster|TuyaColorControlCluster/);
});

test('actual inherited three-channel implementation binds OnOff once per physical endpoint, even if optional Basic fails', async () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'drivers', 'switch_3_gang', 'device.js'), 'utf8');
  const exported = { exports: {} };
  const ON_OFF = { NAME: 'onOff' };
  class MockZigBeeDevice {
    constructor(subDeviceId, rejectBasic = false) {
      this._subDeviceId = subDeviceId;
      this.rejectBasic = rejectBasic;
      this.bindings = [];
      this.basicReads = 0;
    }
    getData() { return this._subDeviceId ? { subDeviceId: this._subDeviceId } : {}; }
    isSubDevice() { return !!this._subDeviceId; }
    log() {}
    error() {}
    registerCapability(capability, cluster, options) {
      this.bindings.push({ capability, cluster, endpoint: options.endpoint });
    }
  }
  const requires = dependency => {
    if (dependency === 'homey') return {};
    if (dependency === 'homey-zigbeedriver') return { ZigBeeDevice: MockZigBeeDevice };
    if (dependency === 'zigbee-clusters') return { debug() {}, CLUSTER: { ON_OFF } };
    throw new Error('Unexpected runtime dependency: ' + dependency);
  };
  const create = vm.runInNewContext('(function(require,module,exports){' + code + '\n})');
  create(requires, exported, exported.exports);
  const Device = exported.exports;
  const makeNode = d => ({
    endpoints: { 1: { clusters: { basic: {
      readAttributes() {
        d.basicReads++;
        return d.rejectBasic
          ? Promise.reject(new Error('Basic timeout on physical wall switch'))
          : Promise.resolve({ manufacturerName: '_TZ3000_lmcp6b0a' });
      },
    } } } },
  });
  const rows = [
    { sub: undefined, ep: 1, reads: 1 },
    { sub: 'secondSwitch', ep: 2, reads: 0 },
    { sub: 'thirdSwitch', ep: 3, reads: 0 },
  ];
  for (const row of rows) {
    const device = new Device(row.sub);
    await device.onNodeInit({ zclNode: makeNode(device) });
    assert.equal(device.basicReads, row.reads);
    assert.equal(device.bindings.length, 1);
    assert.equal(device.bindings[0].capability, 'onoff');
    assert.equal(device.bindings[0].cluster, ON_OFF);
    assert.equal(device.bindings[0].endpoint, row.ep);
  }
  const timeout = new Device(undefined, true);
  await timeout.onNodeInit({ zclNode: makeNode(timeout) });
  assert.equal(timeout.bindings[0].endpoint, 1, 'optional Basic timeout must not block EP1');
});
