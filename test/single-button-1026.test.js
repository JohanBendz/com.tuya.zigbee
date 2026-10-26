'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'drivers', 'smart_remote_1_button_2', 'device.js'),
  'utf8'
);

async function setup({ failTrigger = false } = {}) {
  const events = [];
  const forwarded = [];
  const errors = [];
  let deletions = 0;
  const node = {
    async handleFrame(...args) {
      forwarded.push({ receiver: this, args });
      return 'handled by ZCL';
    },
  };
  const original = node.handleFrame;
  class DeviceStub {
    constructor() {
      this.homey = { zigbee: { getNode: async () => node } };
      this.driver = {
        buttonTrigger: {
          trigger: async (device, tokens, state) => {
            assert.equal(device, this);
            events.push(state.action);
            if (failTrigger) throw new Error('Flow rejected');
          },
        },
      };
    }
    log() {}
    error(...args) { errors.push(args); }
    onDeleted() { deletions += 1; }
  }
  const module = { exports: {} };
  const factory = vm.runInNewContext('(function(require, module) {' + source + '\n})', { Buffer });
  factory(name => {
    if (name === 'homey-zigbeedriver') return { ZigBeeDevice: DeviceStub };
    if (name === 'zigbee-clusters') return {};
    throw new Error('Unexpected dependency: ' + name);
  }, module);
  const device = new module.exports();
  await device.onNodeInit({ zclNode: {} });
  return { device, node, original, events, forwarded, errors, deletions: () => deletions };
}

// Actual #1026 captures: one gesture command and a standard OnOff follow-up.
const captures = [
  [0x11, 0x6b, 0xfd, 0], [0x11, 0x6c, 2],
  [0x11, 0x6d, 0xfd, 1], [0x11, 0x6e, 1],
  [0x11, 0x6f, 0xfd, 2], [0x11, 0x70, 0],
];

for (const format of ['Buffer', 'serialized Buffer']) {
  test('#1026 ' + format + ': captured clicks/hold each trigger once; follow-ups reach ZCL', async () => {
    const { node, events, forwarded } = await setup();
    const frames = captures.map(bytes => format === 'Buffer'
      ? Buffer.from(bytes) : { type: 'Buffer', data: [...bytes] });
    const before = JSON.stringify(frames);
    const meta = { linkQuality: 31 };
    for (const frame of frames) await node.handleFrame(1, 6, frame, meta);
    assert.deepEqual(events, ['oneClick', 'twoClicks', 'longPress']);
    assert.equal(forwarded.length, 3);
    for (let i = 0; i < forwarded.length; i++) {
      assert.equal(forwarded[i].receiver, node);
      assert.equal(forwarded[i].args[0], 1);
      assert.equal(forwarded[i].args[1], 6);
      assert.equal(forwarded[i].args[2], frames[2 * i + 1]);
      assert.equal(forwarded[i].args[3], meta);
    }
    assert.equal(JSON.stringify(frames), before, 'incoming frame bytes must not be mutated');
  });
}

test('unknown/malformed commands never become longPress and are forwarded unchanged', async () => {
  const { node, device, events, forwarded } = await setup();
  const frames = [
    undefined, null, {}, [], '11 01 fd 02',
    Buffer.from([]), Buffer.from([0x11, 1, 0xfd]),
    Buffer.from([0x11, 1, 0xfd, 3]), // Unsupported gesture.
    Buffer.from([0x11, 1, 0xfd, 255]),
    Buffer.from([0x11, 1, 2, 2]), // Another command with a gesture-looking byte.
    Buffer.from([0x18, 1, 0xfd, 2]), // Global ZCL frame, not the Tuya command.
    Buffer.from([0x15, 1, 0xfd, 2]), // Truncated manufacturer-specific header.
    Buffer.from([0x15, 0x34, 0x12, 1, 0xfd, 2]), // Unverified manufacturer-specific form.
    Buffer.from([0x11, 1, 0xfd, 2, 0]), // Unexpected extra payload.
    { type: 'Buffer', data: [0x11, 1, 0xfd, '2'] },
    { type: 'Buffer', data: [0x11, 1, 0xfd, 2.5] },
    { type: 'Buffer', data: [0x11, -1, 0xfd, 2] },
    { type: 'Buffer', data: [0x11, 256, 0xfd, 2] },
    { type: 'Buffer', data: [0x11, , 0xfd, 2] },
    { type: 'not a Buffer', data: [0x11, 1, 0xfd, 2] },
  ];
  for (const frame of frames) {
    assert.equal(await node.handleFrame(1, 6, frame), 'handled by ZCL');
    assert.equal(device.buttonCommandParser(frame), null);
  }
  assert.deepEqual(events, []);
  assert.equal(forwarded.length, frames.length);
  for (let i = 0; i < frames.length; i++) assert.equal(forwarded[i].args[2], frames[i]);
});

test('unrelated endpoints, clusters and reports preserve the original dispatcher result/context', async () => {
  const { node, events, forwarded } = await setup();
  const gesture = Buffer.from([0x11, 1, 0xfd, 0]);
  const report = Buffer.from([0x18, 2, 0x0a, 0, 0, 0x10, 1]);
  const meta = { timestamp: 123 };
  for (const [endpoint, cluster, frame] of [[2, 6, gesture], [1, 1, gesture], [1, 0, report], [1, 6, report]]) {
    assert.equal(await node.handleFrame(endpoint, cluster, frame, meta), 'handled by ZCL');
  }
  assert.deepEqual(events, []);
  assert.equal(forwarded.length, 4);
  for (const call of forwarded) {
    assert.equal(call.receiver, node);
    assert.equal(call.args[3], meta);
  }
});

test('rapid legitimate presses and sequence-number wrap do not drop events', async () => {
  const { node, events, forwarded } = await setup();
  for (const sequence of [254, 255, 0, 1]) {
    await node.handleFrame(1, 6, Buffer.from([0x11, sequence, 0xfd, 0]));
  }
  assert.deepEqual(events, ['oneClick', 'oneClick', 'oneClick', 'oneClick']);
  assert.equal(forwarded.length, 0);
});

test('reinitialization does not stack wrappers; deletion restores the captured dispatcher', async () => {
  const { device, node, original, forwarded, deletions } = await setup();
  await device.onNodeInit({ zclNode: {} });
  await node.handleFrame(1, 1, Buffer.from([0x18, 1, 0x0a]));
  assert.equal(forwarded.length, 1);
  device.onDeleted();
  assert.equal(node.handleFrame, original);
  assert.equal(deletions(), 1, 'SDK listener/interval cleanup must still run');
});

test('deletion does not overwrite a newer dispatcher installed after this wrapper', async () => {
  const { device, node } = await setup();
  const replacement = () => 'new dispatcher';
  node.handleFrame = replacement;
  device.onDeleted();
  assert.equal(node.handleFrame, replacement);
});

test('Flow rejection is caught once without passing the consumed gesture to ZCL', async () => {
  const { node, events, errors, forwarded } = await setup({ failTrigger: true });
  await node.handleFrame(1, 6, Buffer.from([0x11, 1, 0xfd, 2]));
  assert.deepEqual(events, ['longPress']);
  assert.equal(errors.length, 1);
  assert.match(errors[0][1].message, /Flow rejected/);
  assert.equal(forwarded.length, 0);
});

test('original dispatcher failures are propagated without being replaced by Flow events', async () => {
  const { device, node, events } = await setup();
  node.handleFrame = async () => { throw new Error('ZCL failure'); };
  await device.onNodeInit({ zclNode: {} });
  await assert.rejects(node.handleFrame(1, 1, Buffer.from([0x18, 1, 0x0a])), /ZCL failure/);
  assert.deepEqual(events, []);
});
