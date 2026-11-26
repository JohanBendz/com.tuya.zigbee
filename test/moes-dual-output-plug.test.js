'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { CLUSTER } = require('zigbee-clusters');
const app = require('../app.json');
const onOff = require('homey-zigbeedriver/lib/system/capabilities/onoff/onOff');
const id = 'socket_moes_ts011f_dual';

function matching(model, manufacturer) {
  return app.drivers.filter(d => [].concat(d.zigbee?.productId || []).includes(model)
    && [].concat(d.zigbee?.manufacturerName || []).includes(manufacturer));
}

test('#1496 pairs only the interviewed TS011F and preserves both legacy socket identities', () => {
  const [moes] = matching('TS011F', '_TZ3000_2xlvlnez');
  assert.deepEqual(matching('TS011F', '_TZ3000_2xlvlnez').map(d => d.id), [id]);
  assert.deepEqual(moes.zigbee.manufacturerName, ['_TZ3000_2xlvlnez']);
  assert.deepEqual(moes.zigbee.productId, ['TS011F']);
  assert.deepEqual(moes.capabilities, ['onoff']);
  assert.deepEqual(Object.keys(moes.zigbee.devices), ['socketTwo']);
  assert.deepEqual(moes.zigbee.devices.socketTwo.capabilities, ['onoff']);
  assert.deepEqual(moes.zigbee.endpoints, {
    1: { clusters: [0, 4, 5, 6], bindings: [6] },
    2: { clusters: [4, 5, 6], bindings: [6] },
  });
  for (const manufacturer of ['_TYZB01_hlla45kx', '_TZ3000_k6fvknrr']) {
    const legacy = matching('TS011F', manufacturer);
    assert.deepEqual(legacy.map(d => d.id), ['double_power_point_2']);
    assert.deepEqual(legacy[0].capabilities, ['onoff', 'measure_power', 'meter_power', 'measure_current', 'measure_voltage']);
    assert.deepEqual(legacy[0].zigbee.devices.socketTwo.capabilities, ['onoff']);
  }
});

test('each MOES tile uses its own endpoint for commands, reports and state reads', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'drivers', id, 'device.js'), 'utf8');
  class Tile {
    constructor(subDeviceId) { this.data = { subDeviceId }; this.registrations = []; }
    getData() { return this.data; }
    registerCapability(capability, cluster, options) {
      this.registrations.push({ capability, cluster, options });
    }
  }
  const mod = { exports: {} };
  vm.runInThisContext('(function(require,module){' + source + '\n})')(name =>
    name === 'homey-zigbeedriver' ? { ZigBeeDevice: Tile } : require(name), mod);
  for (const [child, endpoint] of [[undefined, 1], ['socketTwo', 2]]) {
    const tile = new mod.exports(child);
    await tile.onNodeInit();
    assert.equal(tile.registrations.length, 1);
    const [{ capability, cluster, options }] = tile.registrations;
    assert.equal(capability, 'onoff');
    assert.equal(cluster, CLUSTER.ON_OFF);
    assert.equal(options.endpoint, endpoint);
    const config = { ...onOff, ...options };
    assert.equal(config.set(true), 'setOn');
    assert.equal(config.set(false), 'setOff');
    assert.equal(config.get, 'onOff');
    assert.equal(config.report, 'onOff');
    assert.equal(config.reportParser(false), false);
    assert.equal(config.reportParser(true), true);
    assert.deepEqual(config.getOpts, { getOnStart: true, getOnOnline: true });
    assert.ok(config.reportOpts.configureAttributeReporting.maxInterval > 0);
  }
});
