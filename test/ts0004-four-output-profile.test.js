'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const id = 'switch_4_gang_ts0004';
const manufacturers = ['_TZ3000_s6ma1nh4', '_TZ3000_enmfaave'];
const profile = require('../drivers/switch_4_gang_ts0004/driver.compose.json');
const manifest = require('../app.json');

test('TS0004 exact non-metering family has four independent Homey tiles and no vendor writes', () => {
  assert.equal(profile.id, id);
  assert.deepEqual(profile.zigbee.manufacturerName, manufacturers);
  assert.deepEqual(profile.zigbee.productId, ['TS0004']);
  assert.deepEqual(profile.capabilities, ['onoff']);
  assert.deepEqual(Object.keys(profile.zigbee.devices).sort(), [
    'fourthSwitch', 'secondSwitch', 'thirdSwitch',
  ]);
  for (const gang of Object.values(profile.zigbee.devices)) assert.deepEqual(gang.capabilities, ['onoff']);
  assert.deepEqual(profile.zigbee.endpoints, {
    '1': { clusters: [0, 4, 5, 6], bindings: [6] },
    '2': { clusters: [4, 5, 6], bindings: [6] },
    '3': { clusters: [4, 5, 6], bindings: [6] },
    '4': { clusters: [4, 5, 6], bindings: [6] },
  });
  // EP1 physical interview: 0/3/4/5/6/E000/E001; EP2–4: 4/5/6/E001.
  // Identify and vendor clusters are observable, but not required for basic OnOff.
  const requirements = JSON.stringify(profile.zigbee.endpoints);
  for (const forbidden of [1794, 2820, 57344, 57345, 61184]) {
    assert.ok(!requirements.includes(String(forbidden)), 'do not mandate metering/vendor cluster ' + forbidden);
  }
  for (const power of ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']) {
    assert.ok(!JSON.stringify(profile.capabilities).includes(power));
    assert.ok(!JSON.stringify(profile.zigbee.devices).includes(power));
  }
});

test('generated manifest matches only two physical TS0004 identities, not TS0726 or metering #722', () => {
  const found = manifest.drivers.find(d => d.id === id);
  assert.ok(found);
  assert.deepEqual(found.zigbee.manufacturerName, manufacturers);
  assert.deepEqual(found.zigbee.productId, ['TS0004']);
  assert.equal(found.settings, undefined);
  assert.deepEqual(Object.keys(found.zigbee.devices).sort(), ['fourthSwitch', 'secondSwitch', 'thirdSwitch']);
  for (const manufacturer of manufacturers) {
    assert.deepEqual(manifest.drivers.filter(d =>
      d.zigbee?.manufacturerName?.includes(manufacturer)
      && d.zigbee?.productId?.includes('TS0004')
    ).map(d=>d.id), [id]);
  }
  assert.ok(!found.zigbee.manufacturerName.includes('_TZ3000_ltt60asa'), 'metering variant #722 is separate');
  assert.ok(!found.zigbee.productId.includes('TS0726'), 'other BSEED family is separate');
  assert.ok(!manifest.drivers.find(d=>d.id==='relay_board_4_channel').zigbee.manufacturerName.some(m=>manufacturers.includes(m)), 'legacy profile unchanged');
});

function makeDeviceRuntime() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'drivers', id, 'device.js'), 'utf8');
  const exported = { exports: {} };
  const ON_OFF = { NAME: 'onOff' };
  class MockZigBeeDevice {
    constructor(subDeviceId) {
      this.subDeviceId = subDeviceId;
      this.registered = [];
    }
    getData() {
      return this.subDeviceId === undefined ? {} : { subDeviceId: this.subDeviceId };
    }
    registerCapability(name, cluster, options) {
      this.registered.push({ name, cluster, endpoint: options.endpoint });
    }
  }
  const fakeRequire = dependency => {
    if (dependency === 'homey-zigbeedriver') return { ZigBeeDevice: MockZigBeeDevice };
    if (dependency === 'zigbee-clusters') return { CLUSTER: { ON_OFF } };
    throw new Error('Unexpected module: ' + dependency);
  };
  const loader = vm.runInNewContext('(function(require,module,exports){' + code + '\n})');
  loader(fakeRequire, exported, exported.exports);
  return { Device: exported.exports, ON_OFF, code };
}

test('real isolated runtime maps main/second/third/fourth OnOff to EP1/EP2/EP3/EP4', async () => {
  const { Device, ON_OFF } = makeDeviceRuntime();
  for (const [subDeviceId, endpoint] of [[undefined,1],['secondSwitch',2],['thirdSwitch',3],['fourthSwitch',4]]) {
    const device = new Device(subDeviceId);
    await device.onNodeInit();
    assert.equal(device.registered.length, 1);
    assert.equal(device.registered[0].name, 'onoff');
    assert.equal(device.registered[0].cluster, ON_OFF);
    assert.equal(device.registered[0].endpoint, endpoint);
  }
});

test('isolated runtime fails closed on unknown subdevice, never probes Basic or sends vendor traffic', async () => {
  const { Device, code } = makeDeviceRuntime();
  await assert.rejects(new Device('fifthSwitch').onNodeInit(), /Unknown TS0004 subdevice/);
  assert.doesNotMatch(code, /readAttributes|writeAttributes|tuyaRgbMode|TuyaSpecificCluster|sendFrame/);
  const driver = fs.readFileSync(path.join(__dirname, '..', 'drivers', id, 'driver.js'),'utf8');
  assert.match(driver, /module\.exports = require\('\.\.\/relay_board_4_channel\/driver'\)/);
});
