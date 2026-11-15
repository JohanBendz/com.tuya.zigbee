'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../app.json');

const families = [
  { channels: 2, runtime: 'switch_2_gang', manufacturers: ['_TZ3000_criiahcg', '_TZ3000_ywubfuvt', '_TZ3000_wnzoyohq'] },
  { channels: 3, runtime: 'switch_3_gang', manufacturers: ['_TZ3000_mhhxxjrs', '_TZ3000_hbic3ka3', '_TZ3000_iv4eq7eh'] },
  { channels: 4, runtime: 'switch_4_gang_ts0004', manufacturers: ['_TZ3000_knoj8lpk', '_TZ3000_5ajpkyq6', '_TZ3000_3n2minvf'] },
];
const childIds = ['secondSwitch', 'thirdSwitch', 'fourthSwitch'];

for (const family of families) {
  const id = `switch_module_${family.channels}_gang_tuya`;
  const profile = require(`../drivers/${id}/driver.compose.json`);
  test(`${id}: exact pairing, independent non-metering tiles and no ambiguous match`, () => {
    const generated = app.drivers.find(d => d.id === id);
    assert.ok(generated);
    assert.deepEqual(generated.zigbee, JSON.parse(JSON.stringify(profile.zigbee).replaceAll('{{driverAssetsPath}}', `/drivers/${id}/assets`)));
    assert.deepEqual(generated.zigbee.productId, [`TS000${family.channels}`]);
    assert.deepEqual(generated.zigbee.manufacturerName, family.manufacturers);
    assert.deepEqual(generated.capabilities, ['onoff']);
    {
      assert.equal(generated.settings[0].id, 'input_mode');
      for (const child of Object.values(generated.zigbee.devices)) assert.deepEqual(child.settings, []);
    }
    assert.equal(Object.keys(generated.zigbee.devices).length + 1, family.channels);
    for (let ep = 1; ep <= family.channels; ep++) {
      assert.ok(generated.zigbee.endpoints[ep].clusters.includes(6));
      assert.deepEqual(generated.zigbee.endpoints[ep].bindings, [6]);
      if (ep > 1) assert.deepEqual(generated.zigbee.devices[childIds[ep - 2]].capabilities, ['onoff']);
    }
    for (const manufacturer of family.manufacturers) {
      const matches = app.drivers.filter(d =>
        [].concat(d.zigbee?.manufacturerName || []).includes(manufacturer)
        && [].concat(d.zigbee?.productId || []).includes(`TS000${family.channels}`));
      assert.deepEqual(matches.map(d => d.id), [id]);
    }
    // A known two-channel identity already in upstream must retain its original pairing.
    const existing = app.drivers.filter(d =>
      [].concat(d.zigbee?.manufacturerName || []).includes('_TZ3000_zxrfobzw')
      && [].concat(d.zigbee?.productId || []).includes('TS0002'));
    assert.deepEqual(existing.map(d => d.id), ['switch_2_gang_ts0002']);
  });

  test(`${id}: inherited runtime registers each relay on its own endpoint without switching on init`, async () => {
    const exported = { exports: {} };
    const ON_OFF = { NAME: 'onOff' };
    class FakeDevice {
      constructor(sub) { this.sub = sub; this.registered = []; }
      getData() { return this.sub ? { subDeviceId: this.sub } : {}; }
      isSubDevice() { return !!this.sub; }
      log() {}
      error() {}
      registerCapability(capability, cluster, options) {
        this.registered.push([capability, cluster, options.endpoint]);
      }
    }
    const resolve = dependency => {
      if (dependency === 'homey') return {};
      if (dependency === 'homey-zigbeedriver') return { ZigBeeDevice: FakeDevice };
      if (dependency === 'zigbee-clusters') return { CLUSTER: { ON_OFF }, debug() {} };
      throw new Error('Unexpected runtime dependency: ' + dependency);
    };
    const wrapper = fs.readFileSync(path.join(__dirname, '..', 'drivers', id, 'device.js'), 'utf8');
    assert.ok(wrapper.includes(`require('../${family.runtime}/device')`));
    const source = fs.readFileSync(path.join(__dirname, '..', 'drivers', family.runtime, 'device.js'), 'utf8');
    vm.runInNewContext('(function(require,module,exports){' + source + '\n})')(resolve, exported, exported.exports);
    const node = { endpoints: { 1: { clusters: { basic: {
      readAttributes: async () => { throw new Error('Optional Basic read unavailable'); },
      writeAttributes: () => { throw new Error('Unexpected configuration write'); },
    } } } } };
    for (let ep = 1; ep <= family.channels; ep++) {
      const device = new exported.exports(ep === 1 ? undefined : childIds[ep - 2]);
      await device.onNodeInit({ zclNode: node });
      assert.equal(device.registered.length, 1);
      assert.deepEqual(device.registered[0], ['onoff', ON_OFF, ep]);
    }
  });
}
