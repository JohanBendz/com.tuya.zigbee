'use strict';

// Behavioural regression coverage of the actual driver source in an isolated
// Homey/Zigbee stub. Hardware acceptance remains tracked separately in #1389.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const driverPath = path.resolve(__dirname, '../drivers/smart_knob_switch/device.js');

async function createKnob() {
  const events = [];
  const forwarded = [];
  const bindings = new Map();
  const node = {
    handleFrame(...args) {
      forwarded.push(args);
      return 'original-zcl-handler';
    },
  };

  class ZigBeeDevice {
    hasCapability() { return true; }
    log() {}
    error(err) { throw err; }
  }

  class OnOffBound {
    constructor(callbacks) { this.callbacks = callbacks; }
  }

  class LevelBound {
    constructor(callbacks) { this.callbacks = callbacks; }
  }

  const required = {
    'homey-zigbeedriver': { ZigBeeDevice },
    'zigbee-clusters': {
      CLUSTER: {
        ON_OFF: { NAME: 'onOff', ID: 6 },
        LEVEL_CONTROL: { NAME: 'levelControl', ID: 8 },
        COLOR_CONTROL: { NAME: 'colorControl', ID: 768 },
      },
    },
    '../../lib/TuyaRemoteOnOffBoundCluster': OnOffBound,
    '../../lib/LevelControlBoundCluster': LevelBound,
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(driverPath, 'utf8'), {
    module,
    Buffer,
    Promise,
    Date,
    require(name) {
      assert.ok(Object.hasOwn(required, name), `Unexpected import: ${name}`);
      return required[name];
    },
  }, { filename: driverPath });

  const device = new module.exports();
  device.homey = { zigbee: { getNode: async () => node } };
  device.driver = {
    buttonTrigger: {
      trigger(_device, _tokens, state) {
        events.push(state.button);
        return Promise.resolve();
      },
    },
  };
  await device.onNodeInit({
    zclNode: {
      endpoints: {
        1: { bind(name, handler) { bindings.set(name, handler); } },
      },
    },
  });

  const frame = data => ({ toJSON: () => ({ data }) });
  return { events, forwarded, bindings, node, frame, device };
}

test('TS004F Dimmer Mode step/move directions use correct ZCL enum fields', async () => {
  const { events, bindings } = await createKnob();
  const level = bindings.get('levelControl').callbacks;
  assert.ok(level, 'level control must be bound');

  await level.onStep({ mode: 'up' });
  await level.onStep({ mode: 'down' });
  await level.onStepWithOnOff({ mode: 'down' });
  await level.onMove({ moveMode: 'up' });
  await level.onMove({ moveMode: 'down' });
  await level.onMoveWithOnOff({ moveMode: 'down' });
  assert.deepEqual(events, ['right', 'left', 'left', 'right', 'left', 'left']);

  await level.onMove({ mode: 'up' }); // malformed Move: no moveMode
  await level.onStep({ mode: 'sideways' });
  assert.equal(events.length, 6, 'invalid move payloads must not become clockwise turns');
});

test('TS004F Scene Mode proprietary FC/FD frames produce actions without swallowing normal ZCL', async () => {
  const { events, node, forwarded, frame } = await createKnob();

  await node.handleFrame(1, 6, frame([0x11, 0x71, 0xFC, 0]), {});
  await node.handleFrame(1, 6, frame([0x11, 0x72, 0xFC, 1]), {});
  assert.deepEqual(events, ['right', 'left']);

  await node.handleFrame(1, 6, frame([0x11, 0x73, 0xFD, 0]), {});
  assert.deepEqual(events, ['right', 'left', 'press']);

  // Unknown values/lengths, standard OnOff commands, and other clusters
  // are forwarded to the original ZCL handler, not invented as actions.
  const malformed = [
    [0x11, 0x74, 0xFC, 2],
    [0x11, 0x75, 0xFD, 99],
    [0x11, 0x76, 0xFC],
    [0x11, 0x77, 0x02],
  ];
  for (const data of malformed) {
    assert.equal(node.handleFrame(1, 6, frame(data), {}), 'original-zcl-handler');
  }
  assert.equal(node.handleFrame(1, 8, frame([0x11, 0x78, 0x02, 0]), {}), 'original-zcl-handler');
  assert.equal(forwarded.length, 5);
  assert.equal(events.length, 3);
});

test('TS004F repeated press bursts remain debounced, but rotation never is', async () => {
  const { events, bindings, node, frame, device } = await createKnob();
  const onOff = bindings.get('onOff').callbacks;

  await onOff.onSingle('toggle');
  await node.handleFrame(1, 6, frame([0x11, 0x10, 0xFD, 0]), {});
  assert.deepEqual(events, ['press']);

  await node.handleFrame(1, 6, frame([0x11, 0x11, 0xFC, 0]), {});
  await node.handleFrame(1, 6, frame([0x11, 0x12, 0xFC, 0]), {});
  assert.deepEqual(events, ['press', 'right', 'right']);

  device._lastPressAt = Date.now() - 300;
  await node.handleFrame(1, 6, frame([0x11, 0x13, 0xFD, 1]), {});
  assert.deepEqual(events, ['press', 'right', 'right', 'press']);
});

test('legacy Color Control hold actions still work on the raw path', async () => {
  const { events, node, forwarded, frame } = await createKnob();
  await node.handleFrame(1, 768, frame([0x11, 0x15, 0x4C, 3]), {});
  await node.handleFrame(1, 768, frame([0x11, 0x16, 0x4C, 1]), {});
  assert.deepEqual(events, ['hold-left', 'hold-right']);
  assert.equal(forwarded.length, 0);
});

test('native Buffer scene commands work and standard frames preserve bytes and metadata', async () => {
  const { events, node, forwarded } = await createKnob();
  const frames = [
    Buffer.from([0x11, 0x71, 0xFC, 0]),
    Buffer.from([0x11, 0x72, 0xFC, 1]),
    Buffer.from([0x11, 0x73, 0xFD, 0]),
    Buffer.from([0x11, 0x74, 0x02]),
    Buffer.from([0x18, 0x75, 0x0A, 0, 0, 0x10, 1]),
  ];
  const before = frames.map(frame => frame.toString('hex'));
  const meta = { linkQuality: 39 };
  for (const frame of frames) await node.handleFrame(1, 6, frame, meta);
  assert.deepEqual(events, ['right', 'left', 'press']);
  assert.equal(forwarded.length, 2);
  for (let i = 0; i < forwarded.length; i++) {
    assert.equal(forwarded[i][0], 1);
    assert.equal(forwarded[i][1], 6);
    assert.equal(forwarded[i][2], frames[i + 3]);
    assert.equal(forwarded[i][3], meta);
  }
  assert.deepEqual(frames.map(frame => frame.toString('hex')), before);
});
