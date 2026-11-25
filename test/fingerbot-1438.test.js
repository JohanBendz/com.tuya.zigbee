'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const datapoints = require('../lib/TuyaDataPoints');
const helpers = require('../lib/TuyaHelpers');

const source = fs.readFileSync(path.join(__dirname, '../drivers/fingerbot/device.js'), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

async function setup(options = {}) {
  let now = 100000;
  let timerId = 0;
  let deleted = 0;
  const timers = new Map();
  const commands = [], flows = [], writes = [], errors = [], saved = [], reads = [];
  const settings = { fingerbot_mode: 'click', ...options.settings };
  const store = { ...options.store };
  const listeners = {};
  class ClockDate extends Date { static now() { return now; } }
  const onOff = new EventEmitter();
  onOff.readAttributes = async names => {
    reads.push([...names]);
    if (options.readFails) throw new Error('read unavailable');
    return { onOff: options.initialState };
  };
  for (const [method, value] of [['setOn', true], ['setOff', false]]) {
    onOff[method] = async () => {
      commands.push({ value, at: now });
      if (options.command) await options.command({ value, onOff, number: commands.length });
    };
  }
  const zclNode = { endpoints: { 1: { bind() {}, clusters: {
    basic: { async readAttributes() {
      if (options.identityFails) throw new Error('identity unavailable');
      return {
        manufacturerName: '_TZ3210_j4pdtz9v', modelId: 'TS0001', ...options.identity,
      };
    } },
    onOff,
    tuya: Object.assign(new EventEmitter(), { async sendData(data) { writes.push(data); } }),
  } } } };
  class DeviceStub {
    async onNodeInit({ zclNode: node }) { this.zclNode = node; }
    onDeleted() { deleted++; }
    log() {}
    error(...args) { errors.push(args); }
    getSetting(name) { return settings[name]; }
    getStoreValue(key) { return store[key]; }
    async setStoreValue(key, value) {
      saved.push({ key, value });
      if (options.storeFails) throw new Error('store unavailable');
      store[key] = value;
    }
    hasCapability(id) { return ['onoff', 'button.push', 'measure_battery'].includes(id); }
    registerCapabilityListener(id, listener) { listeners[id] = listener; }
    async setCapabilityValue() {}
  }
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, Buffer, Date: ClockDate,
    require(name) {
      if (name === 'zigbee-clusters') return { Cluster: { addCluster() {} }, BoundCluster: class {} };
      if (name === '../../lib/TuyaSpecificClusterDevice') return DeviceStub;
      if (name === '../../lib/TuyaDataPoints') return datapoints;
      if (name === '../../lib/TuyaHelpers') return helpers;
      if (['../../lib/TuyaSpecificCluster', '../../lib/TuyaOnOffCluster'].includes(name)) return class {};
      throw new Error('Unexpected import ' + name);
    },
  }, { filename: 'fingerbot/device.js' });
  const device = new module.exports();
  device.homey = {
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    flow: { getDeviceTriggerCard(id) { return { async trigger() { flows.push(id); } }; } },
  };
  await device.onNodeInit({ zclNode });
  writes.length = 0; // Existing initialization writes are outside press requests.
  async function advance(ms) {
    const target = now + ms;
    await flush();
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
      await flush();
    }
    now = target;
    await flush();
  }
  return { device, onOff, zclNode, commands, flows, writes, errors, store, saved, reads,
    settings, listeners, advance, deleted: () => deleted, timers };
}

test('#1438 exact identity: 3-second click requests alternate real commands with one Flow each', async () => {
  const h = await setup({ command: async ({ value, onOff }) => onOff.emit('attr.onOff', value) });
  for (let i = 0; i < 3; i++) {
    await h.device.triggerFingerBotPress();
    await h.advance(3000);
  }
  assert.deepEqual(h.commands.map(c => c.value), [false, true, false]);
  assert.deepEqual(h.flows, Array(3).fill('fingerbot_button_pressed'));
  assert.deepEqual(h.writes, [], 'click presses must not use Tuya DP1 or change mode');
});

test('rapid requests wait their turn and their own result instead of being silently dropped', async () => {
  const h = await setup();
  const finished = [];
  const requests = [0, 1, 2].map(i => h.device.triggerFingerBotPress().then(() => finished.push(i)));
  await flush();
  assert.deepEqual(finished, [0]);
  await h.advance(1999);
  assert.equal(h.commands.length, 1);
  await h.advance(1);
  assert.deepEqual(finished, [0, 1]);
  await h.advance(2000);
  await Promise.all(requests);
  assert.deepEqual(h.commands, [
    { value: false, at: 100000 }, { value: true, at: 102000 }, { value: false, at: 104000 },
  ]);
  assert.deepEqual(finished, [0, 1, 2]);
});

test('an outstanding Zigbee response serializes later commands even beyond the minimum interval', async () => {
  let complete;
  const h = await setup({ command: ({ number }) => number === 1
    ? new Promise(resolve => { complete = resolve; }) : undefined });
  const first = h.device.triggerFingerBotPress();
  const second = h.device.triggerFingerBotPress();
  await h.advance(4000);
  assert.equal(h.commands.length, 1);
  complete();
  await Promise.all([first, second]);
  assert.deepEqual(h.commands.map(c => c.value), [false, true]);
  assert.equal(h.commands[1].at, 104000);
});

test('fresh OnOff read overrides stored state; valid stored boolean survives a failed read', async () => {
  const fresh = await setup({ initialState: false, store: { lastKnownFingerBotOnOff: true } });
  await fresh.device.triggerFingerBotPress();
  assert.equal(fresh.commands[0].value, true);
  const persisted = await setup({ readFails: true, store: { lastKnownFingerBotOnOff: true } });
  await persisted.device.triggerFingerBotPress();
  assert.equal(persisted.commands[0].value, false);
  for (const invalid of ['true', 1, null]) {
    const h = await setup({ readFails: true, store: { lastKnownFingerBotOnOff: invalid } });
    await h.device.triggerFingerBotPress();
    assert.equal(h.commands[0].value, false);
  }
});

test('reports update alternating state before echo suppression; a report during send wins over acknowledgement', async () => {
  const h = await setup({ initialState: false, command: ({ onOff }) => onOff.emit('attr.onOff', false) });
  await h.device.triggerFingerBotPress();
  await h.advance(2000);
  await h.device.triggerFingerBotPress();
  assert.deepEqual(h.commands.map(c => c.value), [true, true], 'reported false must remain authoritative');
  assert.equal(h.flows.length, 2, 'echo report must not create an extra Flow');
  assert.equal(h.store.lastKnownFingerBotOnOff, false);
});

test('failed command rejects its caller without advancing state or poisoning the remaining queue', async () => {
  const h = await setup({ command: ({ number }) => { if (number === 1) throw new Error('radio failure'); } });
  const first = assert.rejects(h.device.triggerFingerBotPress(), /radio failure/);
  const second = h.device.triggerFingerBotPress();
  await h.advance(2000);
  await Promise.all([first, second]);
  assert.deepEqual(h.commands.map(c => c.value), [false, false]);
  assert.equal(h.flows.length, 1);
});

test('store failure does not turn an acknowledged command into a retry or break in-memory alternation', async () => {
  const h = await setup({ storeFails: true });
  await h.device.triggerFingerBotPress();
  await h.advance(2000);
  await h.device.triggerFingerBotPress();
  assert.deepEqual(h.commands.map(c => c.value), [false, true]);
  assert.equal(h.flows.length, 2);
  assert.ok(h.errors.some(args => args.some(arg => String(arg).includes('store unavailable'))));
});

test('other manufacturers, product alias and unknown identity retain legacy repeated-On/suppression behavior', async () => {
  for (const options of [
    ...['_TZ3210_dse8ogfy', '_TZ3210_232nryqh', '_TZ3210_okbss9dy', undefined]
      .map(manufacturerName => ({ identity: { manufacturerName } })),
    { identity: { modelId: 'TS0001_fingerbot' } },
    { identity: { modelId: undefined } },
    { identityFails: true },
  ]) {
    const h = await setup(options);
    await h.device.triggerFingerBotPress();
    await h.device.triggerFingerBotPress();
    await h.advance(3000);
    await h.device.triggerFingerBotPress();
    assert.deepEqual(h.commands.map(c => c.value), [true, true]);
    assert.deepEqual(h.reads, [], 'unverified identity must not gain an OnOff startup read');
    assert.deepEqual(h.saved, []);
  }
});

test('switch/program onoff still passes through both values and explicit push retains legacy mode write', async () => {
  for (const mode of ['switch', 'program']) {
    const h = await setup({ settings: { fingerbot_mode: mode } });
    await h.listeners.onoff(true);
    await h.listeners.onoff(false);
    assert.deepEqual(h.commands.map(c => c.value), [true, false]);
    assert.equal(h.flows.length, 0);
    await h.device.triggerFingerBotPress();
    assert.equal(h.commands[2].value, true);
    assert.equal(h.writes.length, 1);
    assert.equal(h.writes[0].dp, datapoints.V1_FINGER_BOT_DATA_POINTS.mode);
    assert.equal(h.writes[0].data[0], 0);
  }
});

test('click-mode onoff and button.push share the queue; GUI false sends no command', async () => {
  const h = await setup();
  await h.listeners.onoff(false);
  assert.equal(h.commands.length, 0);
  const first = h.listeners.onoff(true);
  const second = h.listeners['button.push']();
  await h.advance(2000);
  await Promise.all([first, second]);
  assert.deepEqual(h.commands.map(c => c.value), [false, true]);
});

test('mode change cancels waiting clicks instead of forcing click mode later; returning to click can queue again', async () => {
  const h = await setup();
  await h.device.triggerFingerBotPress();
  const waiting = assert.rejects(h.device.triggerFingerBotPress(), /cancel|mode/i);
  const queued = assert.rejects(h.device.triggerFingerBotPress(), /cancel|mode/i);
  await flush();
  await h.device.onSettings({ newSettings: { fingerbot_mode: 'switch' }, changedKeys: ['fingerbot_mode'] });
  h.settings.fingerbot_mode = 'switch';
  await h.advance(4000);
  await Promise.all([waiting, queued]);
  assert.equal(h.commands.length, 1);
  assert.equal(h.writes.length, 1, 'only the explicit switch-mode setting is written');
  h.settings.fingerbot_mode = 'click';
  await h.device.triggerFingerBotPress();
  assert.equal(h.commands.length, 2);
});

test('deletion rejects pending and future clicks, clears wait timers and retains SDK cleanup', async () => {
  const h = await setup();
  await h.device.triggerFingerBotPress();
  const waiting = assert.rejects(h.device.triggerFingerBotPress(), /cancel|removed/i);
  const queued = assert.rejects(h.device.triggerFingerBotPress(), /cancel|removed/i);
  await flush();
  h.device.onDeleted();
  await h.advance(10000);
  await Promise.all([waiting, queued]);
  await assert.rejects(h.device.triggerFingerBotPress(), /removed/i);
  assert.equal(h.commands.length, 1);
  assert.equal(h.flows.length, 1);
  assert.equal(h.deleted(), 1);
  assert.equal(h.timers.size, 0);
});

test('deletion during an in-flight command prevents later Flow/GUI work and additional queued sends', async () => {
  let complete;
  const h = await setup({ command: () => new Promise(resolve => { complete = resolve; }) });
  const first = assert.rejects(h.device.triggerFingerBotPress(), /cancel|removed/i);
  const second = assert.rejects(h.device.triggerFingerBotPress(), /cancel|removed/i);
  await flush();
  h.device.onDeleted();
  complete();
  await Promise.all([first, second]);
  assert.equal(h.commands.length, 1);
  assert.equal(h.flows.length, 0);
  assert.equal(h.timers.size, 0);
});

test('physical reports outside local echo window still produce one debounced press Flow', async () => {
  const h = await setup();
  await h.device.triggerFingerBotPress();
  await h.advance(3500);
  h.onOff.emit('attr.onOff', true);
  h.onOff.emit('attr.onOff', true);
  await flush();
  assert.equal(h.flows.length, 2);
  assert.equal(h.store.lastKnownFingerBotOnOff, true);
});

test('actual Push Flow action waits for its queued command and propagates command rejection', async () => {
  const h = await setup({ command: ({ number }) => {
    if (number === 3) throw new Error('Flow command failure');
  } });
  let run;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../drivers/fingerbot/driver.js'), 'utf8'), {
    module,
    require(name) {
      assert.equal(name, 'homey-zigbeedriver');
      return { ZigBeeDriver: class {} };
    },
  });
  const driver = new module.exports();
  driver.homey = { flow: { getActionCard(id) {
    assert.equal(id, 'fingerbot_push');
    return { registerRunListener(listener) { run = listener; } };
  } } };
  driver._registerActionFlowCards();
  await run({ device: h.device });
  let finished = false;
  const second = run({ device: h.device }).then(value => { finished = value; });
  await h.advance(1999);
  assert.equal(finished, false);
  await h.advance(1);
  await second;
  assert.equal(finished, true);
  const rejected = assert.rejects(run({ device: h.device }), /Flow command failure/);
  await h.advance(2000);
  await rejected;
  assert.equal(h.flows.length, 2);
});

test('a new instance restores the last acknowledged boolean without sending a startup OnOff command', async () => {
  const first = await setup();
  await first.device.triggerFingerBotPress();
  assert.equal(first.store.lastKnownFingerBotOnOff, false);
  const restarted = await setup({ store: first.store, readFails: true });
  assert.equal(restarted.commands.length, 0);
  await restarted.device.triggerFingerBotPress();
  assert.equal(restarted.commands[0].value, true);
});

test('a slow command and its late echo still produce only one local Flow', async () => {
  let complete;
  const h = await setup({ command: () => new Promise(resolve => { complete = resolve; }) });
  const press = h.device.triggerFingerBotPress();
  await h.advance(5000);
  h.onOff.emit('attr.onOff', false);
  complete();
  await press;
  h.onOff.emit('attr.onOff', false);
  await flush();
  assert.equal(h.flows.length, 1);
});

test('reinitialization cancels the old queue and keeps the existing minimum interval for new work', async () => {
  const h = await setup();
  await h.device.triggerFingerBotPress();
  const waiting = assert.rejects(h.device.triggerFingerBotPress(), /cancel|reinitial/i);
  await flush();
  await h.device.onNodeInit({ zclNode: h.zclNode });
  await waiting;
  const next = h.device.triggerFingerBotPress();
  await h.advance(1999);
  assert.equal(h.commands.length, 1);
  await h.advance(1);
  await next;
  assert.deepEqual(h.commands.map(c => c.value), [false, true]);
});

test('new clicks are rejected while a mode setting write is still pending', async () => {
  const h = await setup();
  let complete;
  h.zclNode.endpoints[1].clusters.tuya.sendData = () => new Promise(resolve => { complete = resolve; });
  const changing = h.device.onSettings({
    newSettings: { fingerbot_mode: 'switch' }, changedKeys: ['fingerbot_mode'],
  });
  await assert.rejects(h.listeners.onoff(true), /mode.*chang/i);
  assert.equal(h.commands.length, 0);
  complete();
  await changing;
  h.settings.fingerbot_mode = 'switch';
  await h.listeners.onoff(false);
  assert.deepEqual(h.commands.map(c => c.value), [false]);
});
