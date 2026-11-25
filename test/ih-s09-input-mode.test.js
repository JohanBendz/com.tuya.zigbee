'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const withInputType = require('../lib/TuyaRelayModuleInputType');
const { Cluster, ZCLNode } = require('zigbee-clusters');
const InputCluster = require('../lib/TuyaRelayInputCluster');
Cluster.addCluster(InputCluster);

function fixture({ channels = 3, manufacturer, sub = false, unsupported = false } = {}) {
  const profile = require(`../drivers/switch_module_${channels}_gang_tuya/driver.compose.json`);
  manufacturer = manufacturer || profile.zigbee.manufacturerName[0];
  let mode = 'momentary';
  const writes = [], saved = [];
  const cluster = {
    async readAttributes() { return { switchType: unsupported ? undefined : mode }; },
    async writeAttributes(value) { writes.push(value.switchType); mode = value.switchType; },
  };
  class Base {
    constructor() { this.driver = { manifest: profile }; }
    async onNodeInit() { this.baseInitialized = true; }
    isSubDevice() { return sub; }
    log() {}
    async setSettings(settings) { saved.push(settings.input_mode); }
  }
  const mod = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', `drivers/switch_module_${channels}_gang_tuya/device.js`), 'utf8');
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})')((name) => {
    if (name === 'zigbee-clusters') return { Cluster };
    if (name === '../../lib/TuyaRelayInputCluster') return InputCluster;
    if (name.endsWith('/device')) return Base;
    if (name === '../../lib/TuyaRelayModuleInputType') return withInputType;
    throw new Error(name);
  }, mod, mod.exports);
  const device = new mod.exports();
  const args = { zclNode: { endpoints: { 1: { clusters: {
    basic: { readAttributes: async () => ({ manufacturerName: manufacturer, modelId: `TS000${channels}` }) },
    tuyaRelayInput: cluster,
  } } } } };
  const change = input_mode => device.onSettings({ newSettings: { input_mode }, changedKeys: ['input_mode'] });
  return { device, args, change, cluster, writes, saved };
}

test('IH-S09 startup reads actual shared mode without changing device configuration', async () => {
  const f = fixture(); await f.device.onNodeInit(f.args);
  assert.equal(f.device.baseInitialized, true);
  assert.deepEqual(f.saved, ['momentary']);
  assert.deepEqual(f.writes, []);
  await f.change('keep'); assert.deepEqual(f.writes, []);
  await f.change('toggle'); await f.change('state'); await f.change('momentary');
  assert.deepEqual(f.writes, ['toggle', 'state', 'momentary']);
});

test('unmatched identities, child tiles and unknown modes cannot issue configuration writes', async () => {
  for (const opts of [{ manufacturer: '_TZ3000_unknown' }, { sub: true }, { unsupported: true }]) {
    const f = fixture(opts); await f.device.onNodeInit(f.args);
    assert.deepEqual(f.saved, []);
    await assert.rejects(f.change('toggle'));
    assert.deepEqual(f.writes, []);
  }
  const f = fixture(); await f.device.onNodeInit(f.args);
  await assert.rejects(f.change('detached'), /Unsupported/);
  assert.deepEqual(f.writes, []);
});

test('failed readback restores previous mode and a later request can succeed', async () => {
  const f = fixture(); await f.device.onNodeInit(f.args);
  f.cluster.writeAttributes = async value => { f.writes.push(value.switchType); }; // Ignore update.
  await assert.rejects(f.change('toggle'), /previous mode restored/);
  assert.deepEqual(f.writes, ['toggle', 'momentary']);
  f.cluster.writeAttributes = async value => {
    f.writes.push(value.switchType);
    f.cluster.readAttributes = async () => ({ switchType: value.switchType });
  };
  await f.change('state');
});

test('restore failures are reported and unsupported initial reads never guess a write', async () => {
  const f = fixture(); await f.device.onNodeInit(f.args);
  f.cluster.writeAttributes = async value => { f.writes.push(value.switchType); throw new Error('radio failure'); };
  await assert.rejects(f.change('toggle'), /previous mode could not be confirmed/);
  assert.deepEqual(f.writes, ['toggle', 'momentary']);
});

test('actual pinned Zigbee library encodes D030 as enum8 and decodes all three named modes', async () => {
  let mode = 2; const sent = [];
  const raw = { endpointDescriptors: [{ endpointId: 1, inputClusters: [0xe001], outputClusters: [] }],
    async sendFrame(ep, id, frame) {
      sent.push({ ep, id, frame: Buffer.from(frame) });
      const seq = frame[1], cmd = frame[2]; let response;
      if (cmd === 0) response = Buffer.from([0x18, seq, 1, 0x30, 0xd0, 0, 0x30, mode]);
      else if (cmd === 2) { mode = frame[6]; response = Buffer.from([0x18, seq, 4, 0]); }
      else throw new Error('Unexpected command');
      queueMicrotask(() => raw.handleFrame(ep, id, response, {}));
    },
  };
  const cluster = new ZCLNode(raw).endpoints[1].clusters.tuyaRelayInput;
  for (const [name, code] of [['toggle', 0], ['state', 1], ['momentary', 2]]) {
    await cluster.writeAttributes({ switchType: name });
    assert.equal(sent[sent.length - 1].frame.subarray(3).toString('hex'), '30d0300' + code);
    assert.equal((await cluster.readAttributes(['switchType'])).switchType, name);
  }
  assert.ok(sent.every(s => s.ep === 1 && s.id === 0xe001 && (s.frame[0] & 1) === 0));
});

for (const channels of [2, 3, 4]) {
  test(`${channels}-channel wrapper reads and updates the shared input mode for every exact identity`, async () => {
    const profile = require(`../drivers/switch_module_${channels}_gang_tuya/driver.compose.json`);
    for (const manufacturer of profile.zigbee.manufacturerName) {
      const f = fixture({ channels, manufacturer });
      await f.device.onNodeInit(f.args);
      assert.deepEqual(f.saved, ['momentary']);
      assert.deepEqual(f.writes, []);
      await f.change('state');
      assert.deepEqual(f.writes, ['state']);
    }
    const unsupported = fixture({ channels, unsupported: true });
    await unsupported.device.onNodeInit(unsupported.args);
    await assert.rejects(unsupported.change('state'));
    assert.deepEqual(unsupported.writes, []);
  });
}

for (const lifecycle of ['onNodeInit', 'onDeleted', 'onUninit']) {
  test(`input settings cannot write or roll back after ${lifecycle}`, async () => {
    const f = fixture();
    await f.device.onNodeInit(f.args);
    let started, release;
    const writing = new Promise(resolve => { started = resolve; });
    const pendingWrite = new Promise(resolve => { release = resolve; });
    f.cluster.writeAttributes = async ({ switchType }) => {
      f.writes.push(switchType);
      started();
      await pendingWrite;
    };
    const first = f.change('toggle');
    await writing;
    const queued = f.change('state');
    await f.device[lifecycle](f.args);
    release();
    await assert.rejects(first, /connection has changed/);
    await assert.rejects(queued, /connection has changed/);
    assert.deepEqual(f.writes, ['toggle']);
  });
}
