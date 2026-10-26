'use strict';

// CHARACTERIZATION ONLY (issue #1502):
// These assertions record current legacy behavior, including known defects.
// They MUST be deliberately replaced with expected behavior when implementing
// an isolated standard-CCT runtime. They are not correctness endorsements.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const legacySource = fs.readFileSync(path.join(root, 'lib', 'TuyaZigBeeLightDevice.js'), 'utf8');

function makeHarness({ withMode = false, rejectVendor = false, reportMired = 255 } = {}) {
  const calls = [];
  const registrations = new Map();
  const reportedCapabilities = new Map();
  const capabilities = new Set(['light_temperature', ...(withMode ? ['light_mode'] : [])]);
  const CLUSTER = {
    ON_OFF: { NAME: 'onOff' },
    LEVEL_CONTROL: { NAME: 'levelControl' },
    COLOR_CONTROL: { NAME: 'colorControl' },
  };

  const colorControl = {
    async tuyaRgbMode(payload) {
      calls.push({ command: 'tuyaRgbMode', payload });
      if (rejectVendor) throw new Error('UNSUPPORTED_COMMAND: tuyaRgbMode');
      return true;
    },
    async moveToColorTemperature(payload) {
      calls.push({ command: 'moveToColorTemperature', payload });
      return true;
    },
    async readAttributes() {
      return {
        colorTemperatureMireds: reportMired,
        colorMode: 'colorTemperatureMireds',
      };
    },
  };
  class StubZigBeeDevice {
    constructor() {
      this.zclNode = { endpoints: { 1: { clusters: { colorControl } } } };
      this.values = { light_temperature: 0.25 };
    }
    hasCapability(id) { return capabilities.has(id); }
    getCapabilityValue(id) { return this.values[id]; }
    setCapabilityValue(id, value) {
      reportedCapabilities.set(id, value);
      this.values[id] = value;
      return Promise.resolve();
    }
    registerMultipleCapabilities(definitions) {
      definitions.forEach(definition => registrations.set(definition.capabilityId, definition));
    }
    getClusterEndpoint(cluster) {
      return cluster === CLUSTER.COLOR_CONTROL ? 1 : null;
    }
    debug() {}
    log() {}
    error() {}
  }

  const fakeRequire = moduleName => {
    if (moduleName === 'homey-zigbeedriver') return { ZigBeeDevice: StubZigBeeDevice };
    if (moduleName === 'zigbee-clusters') return { CLUSTER, Cluster: { addCluster() {} } };
    if (moduleName === './TuyaColorControlCluster') return class MockColorControlCluster {};
    if (moduleName === './util') return {
      limitValue: x => x,
      calculateLevelControlTransitionTime: () => 0,
      calculateColorControlTransitionTime: () => 0,
      wrapAsyncWithRetry: action => action(),
      wait: () => Promise.resolve(),
    };
    throw new Error('Unexpected dependency in audit harness: ' + moduleName);
  };
  const stubModule = { exports: {} };
  const factory = vm.runInNewContext(
    '(function(require,module,exports){' + legacySource + '\n})'
  );
  factory(fakeRequire, stubModule, stubModule.exports);
  return {
    instance: new stubModule.exports(),
    calls,
    registrations,
    reportedCapabilities,
  };
}

test('audit: exact existing shared-runtime blast radius is 15 light-temperature driver IDs', () => {
  const expected = [
    'dimmable_led_strip',
    'dimmable_recessed_led',
    'rgb_bulb_E14',
    'rgb_bulb_E27',
    'rgb_ceiling_led_light',
    'rgb_floor_led_light',
    'rgb_led_light_bar',
    'rgb_led_strip',
    'rgb_mood_light',
    'rgb_spot_GU10',
    'rgb_spot_GardenLight',
    'rgb_wall_led_light',
    'tunable_bulb_E14',
    'tunable_bulb_E27',
    'tunable_spot_GU10',
  ];
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  for (const id of expected) {
    const profile = manifest.drivers.find(driver => driver.id === id);
    assert.ok(profile, 'existing paired-driver identity must not disappear: ' + id);
    assert.ok(profile.capabilities.includes('light_temperature'), 'existing temp capability: ' + id);
    const device = fs.readFileSync(path.join(root, 'drivers', id, 'device.js'), 'utf8');
    assert.match(device, /require\('\.\.\/\.\.\/lib\/TuyaZigBeeLightDevice'\)/);
    assert.match(device, /extends TuyaZigBeeLightDevice/);
  }
  assert.equal(expected.length, 15);
});

test('audit: actual registered legacy parser has 254 scale and returns invalid negative reports at 255/500 mired', async () => {
  const h = makeHarness();
  await h.instance.registerColorCapabilities({ zclNode: h.instance.zclNode });
  const options = h.registrations.get('light_temperature').userOpts;
  assert.equal(options.setParser(0).colorTemperature, 0);
  assert.equal(options.setParser(1).colorTemperature, 254);
  assert.equal(options.reportParser(153), 1 - 153 / 254);
  assert.ok(options.reportParser(255) < 0, '#113 observed physical mired 255 maps below Homey 0');
  assert.ok(options.reportParser(500) < 0, 'reported 500 mired maps below Homey 0');
  assert.equal(options.set, 'moveToColorTemperature');
});

test('audit: actual command path inverts the registered setParser endpoints', async () => {
  const h = makeHarness();
  await h.instance.registerColorCapabilities({ zclNode: h.instance.zclNode });
  const options = h.registrations.get('light_temperature').userOpts;
  await h.instance.changeColorTemperature(0);
  await h.instance.changeColorTemperature(1);
  const requested = h.calls
    .filter(call => call.command === 'moveToColorTemperature')
    .map(call => call.payload.colorTemperature);
  assert.equal(options.setParser(0).colorTemperature, 0);
  assert.equal(options.setParser(1).colorTemperature, 254);
  assert.equal(requested[0], 254, 'changeColorTemperature(0) is opposite to setParser(0)');
  assert.equal(requested[1], 0, 'changeColorTemperature(1) is opposite to setParser(1)');
  assert.deepEqual(h.calls.map(call => call.command), [
    'tuyaRgbMode', 'moveToColorTemperature',
    'tuyaRgbMode', 'moveToColorTemperature',
  ]);
});

test('audit: rejected proprietary Tuya mode command prevents standard CCT command in current implementation', async () => {
  const h = makeHarness({ rejectVendor: true });
  await assert.rejects(h.instance.changeColorTemperature(0.5), /UNSUPPORTED_COMMAND/);
  assert.deepEqual(h.calls.map(call => call.command), ['tuyaRgbMode']);
  // This is only a code-path proof: no claim is made that #113/#271 hardware rejects F0.
});

test('audit: light_mode and announce paths also use legacy inverted scale', async () => {
  const h = makeHarness({ withMode: true, reportMired: 255 });
  await h.instance.registerColorCapabilities({ zclNode: h.instance.zclNode });
  const modeOptions = h.registrations.get('light_mode').userOpts;
  await modeOptions.setParser.call(h.instance, 'temperature', {});
  assert.equal(h.calls.at(-1).command, 'moveToColorTemperature');
  assert.equal(h.calls.at(-1).payload.colorTemperature, Math.round(254 - 0.25 * 254));
  await h.instance.onEndDeviceAnnounce();
  assert.ok(h.reportedCapabilities.get('light_temperature') < 0);
});

test.todo('acceptance: all direct, grouped, light_mode and announce conversions agree in both directions');
test.todo('acceptance: all emitted and reported mireds honor separately established physical min/max bounds');
test.todo('acceptance: standard CCT profiles do not require vendor F0 commands; legacy RGB behavior stays unchanged');
