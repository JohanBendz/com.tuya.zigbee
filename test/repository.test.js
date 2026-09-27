'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.homeybuild'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

test('all repository JSON files parse', () => {
  for (const file of walk(root).filter(file => file.endsWith('.json'))) {
    assert.doesNotThrow(
      () => JSON.parse(fs.readFileSync(file, 'utf8')),
      path.relative(root, file)
    );
  }
});

test('app versions stay aligned', () => {
  const pkg = require('../package.json');
  const compose = require('../.homeycompose/app.json');
  const generated = require('../app.json');

  assert.equal(pkg.version, compose.version);
  assert.equal(pkg.version, generated.version);
  assert.match(generated._comment || '', /generated/i);
});

test('generated app.json remains tracked by repository policy', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.doesNotMatch(gitignore, /^\/?app\.json\s*$/m);
});

test('human-readable supported device reference exists', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /SUPPORTED_DEVICES\.md/);
  assert.ok(fs.existsSync(path.join(root, 'SUPPORTED_DEVICES.md')));
});

test('release code does not enable global Zigbee debug logging', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const sharedLight = fs.readFileSync(path.join(root, 'lib', 'TuyaZigBeeLightDevice.js'), 'utf8');

  assert.doesNotMatch(app, /debug\(true\)/);
  assert.doesNotMatch(sharedLight, /this\.enableDebug\(\)/);
});

test('4-gang Tuya wall switch passes datapoint to _setupGang', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'wall_switch_4_gang_tuya', 'device.js'),
    'utf8'
  );

  assert.doesNotMatch(source, /startDpSniffer\(/);
  assert.doesNotMatch(source, /_setupGang\(zclNode,/);
  assert.match(
    source,
    /_setupGang\('first gang',\s*V1_MULTI_SWITCH_DATA_POINTS\.onOffSwitchOne\)/
  );
});

test('all JavaScript files pass Node syntax check', () => {
  const { execFileSync } = require('node:child_process');

  for (const file of walk(root).filter(file => file.endsWith('.js'))) {
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }),
      path.relative(root, file)
    );
  }
});

test('release JavaScript contains no active debug helpers or console.log', () => {
  function withoutComments(source) {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  }

  for (const file of walk(root).filter(file => file.endsWith('.js'))) {
    const source = withoutComments(fs.readFileSync(file, 'utf8'));
    const relative = path.relative(root, file);

    assert.doesNotMatch(source, /\bdebug\s*\(\s*true\s*\)/, relative);
    assert.doesNotMatch(source, /this\.enableDebug\s*\(\s*\)/, relative);
    assert.doesNotMatch(source, /\bconsole\.log\s*\(/, relative);
    assert.doesNotMatch(source, /startDpSniffer\s*\(/, relative);
  }
});

test('pairing fingerprints are not ambiguous across drivers', () => {
  const generated = require('../app.json');
  const fingerprints = new Map();

  // Known TS110E ambiguity is being reviewed separately in PR #1350.
  const allowed = new Set([
    '_TZ3210_ngqk6jia\u0000TS110E',
  ]);

  for (const driver of generated.drivers || []) {
    const zigbee = driver.zigbee;
    if (!zigbee) continue;

    const manufacturers = Array.isArray(zigbee.manufacturerName)
      ? zigbee.manufacturerName
      : [zigbee.manufacturerName];
    const products = Array.isArray(zigbee.productId)
      ? zigbee.productId
      : [zigbee.productId];

    const endpointFingerprint = JSON.stringify(zigbee.endpoints || {});

    for (const manufacturer of manufacturers) {
      for (const product of products) {
        const identity = `${manufacturer}\u0000${product}`;
        const key = `${identity}\u0000${endpointFingerprint}`;

        if (!fingerprints.has(key)) fingerprints.set(key, []);
        fingerprints.get(key).push(driver.id);
      }
    }
  }

  const ambiguous = [];
  for (const [key, driverIds] of fingerprints.entries()) {
    const uniqueDrivers = [...new Set(driverIds)];
    if (uniqueDrivers.length < 2) continue;

    const [manufacturer, product] = key.split('\u0000');
    const identity = `${manufacturer}\u0000${product}`;
    if (allowed.has(identity)) continue;

    ambiguous.push({
      manufacturer,
      product,
      drivers: uniqueDrivers,
    });
  }

  assert.deepEqual(ambiguous, []);
});

test('manifest arrays contain no duplicate entries', () => {
  const generated = require('../app.json');

  function duplicates(values) {
    if (!Array.isArray(values)) return [];
    const seen = new Set();
    const repeated = new Set();

    for (const value of values) {
      if (seen.has(value)) repeated.add(value);
      seen.add(value);
    }

    return [...repeated];
  }

  const problems = [];

  for (const driver of generated.drivers || []) {
    const checks = {
      capabilities: driver.capabilities,
      manufacturerName: driver.zigbee?.manufacturerName,
      productId: driver.zigbee?.productId,
    };

    for (const [field, values] of Object.entries(checks)) {
      const repeated = duplicates(values);
      if (repeated.length) problems.push({ driver: driver.id, field, repeated });
    }

    for (const [endpointId, endpoint] of Object.entries(driver.zigbee?.endpoints || {})) {
      for (const field of ['clusters', 'bindings']) {
        const repeated = duplicates(endpoint[field]);
        if (repeated.length) {
          problems.push({
            driver: driver.id,
            field: `endpoint ${endpointId} ${field}`,
            repeated,
          });
        }
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('current app version has a Homey changelog entry', () => {
  const pkg = require('../package.json');
  const changelog = require('../.homeychangelog.json');

  assert.ok(
    changelog[pkg.version],
    `Missing .homeychangelog.json entry for ${pkg.version}`
  );
});

test('Zigbee dependency versions are pinned', () => {
  const pkg = require('../package.json');

  for (const name of ['homey-zigbeedriver', 'zigbee-clusters']) {
    assert.match(
      pkg.dependencies[name],
      /^\d+\.\d+\.\d+$/,
      `${name} should use an exact version`
    );
  }
});

test('smart knob flow trigger is initialized outside raw frame handling', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smart_knob_switch', 'device.js'),
    'utf8'
  );

  const triggerIndex = source.indexOf("getDeviceTriggerCard('smart_knob_switch_button')");
  const frameHandlerIndex = source.indexOf('node.handleFrame =');

  assert.ok(triggerIndex >= 0);
  assert.ok(frameHandlerIndex >= 0);
  assert.ok(triggerIndex < frameHandlerIndex);
  assert.match(source, /if \(!this\.hasCapability\('dim'\)\)/);
});

test('siren flow actions are registered once at driver level', () => {
  const sirenDriver = fs.readFileSync(
    path.join(root, 'drivers', 'siren', 'driver.js'),
    'utf8'
  );
  const sirenDevice = fs.readFileSync(
    path.join(root, 'drivers', 'siren', 'device.js'),
    'utf8'
  );
  const sensorDriver = fs.readFileSync(
    path.join(root, 'drivers', 'sirentemphumidsensor', 'driver.js'),
    'utf8'
  );

  assert.match(sirenDriver, /\{ device, siren_volume \}/);
  assert.doesNotMatch(sirenDevice, /registerRunListener/);

  for (const id of ['alarm_state', 'siren_volume', 'alarm_duration', 'alarm_tune']) {
    assert.match(sensorDriver, new RegExp(`getActionCard\\('${id}'\\)`));
  }
});

test('siren alarm flow triggers are wired to device reports', () => {
  const sirenDevice = fs.readFileSync(
    path.join(root, 'drivers', 'siren', 'device.js'),
    'utf8'
  );
  const sensorDevice = fs.readFileSync(
    path.join(root, 'drivers', 'sirentemphumidsensor', 'device.js'),
    'utf8'
  );

  assert.match(sirenDevice, /getDeviceTriggerCard\('siren_alarm'\)/);
  assert.match(sensorDevice, /getDeviceTriggerCard\('alarm_siren'\)/);
});

test('curtain action cards target the selected device', () => {
  const families = [
    ['curtain_module', 'move_open', 'move_close'],
    ['curtain_module_2_gang', 'move_open_2gang', 'move_close_2gang'],
    ['wall_curtain_switch', 'wall_move_open', 'wall_move_close'],
  ];

  for (const [driverId, openCard, closeCard] of families) {
    const driver = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'driver.js'),
      'utf8'
    );
    const device = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'device.js'),
      'utf8'
    );

    assert.match(driver, new RegExp(`getActionCard\\('${openCard}'\\)`));
    assert.match(driver, new RegExp(`getActionCard\\('${closeCard}'\\)`));
    assert.match(driver, /\{ device \}/);
    assert.doesNotMatch(device, /registerRunListener/);
  }
});

test('smart_remote_1_button initializes its Flow trigger', () => {
  const driver = fs.readFileSync(
    path.join(root, 'drivers', 'smart_remote_1_button', 'driver.js'),
    'utf8'
  );
  const device = fs.readFileSync(
    path.join(root, 'drivers', 'smart_remote_1_button', 'device.js'),
    'utf8'
  );

  assert.match(driver, /getDeviceTriggerCard\('smart_remote_1_button'\)/);
  assert.match(device, /this\.driver\.buttonTrigger/);
  assert.doesNotMatch(device, /_buttonPressedTriggerDevice/);
});

test('ceiling radar exposes the target distance it reports', () => {
  const generated = require('../app.json');
  const driver = generated.drivers.find(item => item.id === 'radar_sensor_ceiling');
  const device = fs.readFileSync(
    path.join(root, 'drivers', 'radar_sensor_ceiling', 'device.js'),
    'utf8'
  );

  assert.ok(driver.capabilities.includes('target_distance'));
  assert.match(device, /hasCapability\('target_distance'\)/);
});

test('driver manifests contain no template placeholder paths', () => {
  const generated = require('../app.json');
  const serialized = JSON.stringify(generated.drivers || []);

  assert.doesNotMatch(serialized, /\/drivers\/my_driver\//);
});

test('all generated driver image paths exist in the repository', () => {
  const generated = require('../app.json');
  const missing = [];

  for (const driver of generated.drivers || []) {
    const imagePaths = [
      ...Object.values(driver.images || {}),
      driver.zigbee?.learnmode?.image,
    ].filter(value => typeof value === 'string' && value.startsWith('/'));

    for (const imagePath of imagePaths) {
      const localPath = path.join(root, imagePath.replace(/^\//, ''));
      if (!fs.existsSync(localPath)) {
        missing.push({ driver: driver.id, imagePath });
      }
    }
  }

  assert.deepEqual(missing, []);
});

test('metering drivers do not register fake Zigbee reset capabilities', () => {
  for (const driverId of ['switch_1_gang_metering', 'switch_2_gang_metering']) {
    const source = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'device.js'),
      'utf8'
    );

    assert.doesNotMatch(
      source,
      /registerCapability\(['"]resetEnergyMeter['"]/
    );
  }

  const twoGang = fs.readFileSync(
    path.join(root, 'drivers', 'switch_2_gang_metering', 'device.js'),
    'utf8'
  );
  assert.doesNotMatch(twoGang, /basic\.doCommand\(['"]0['"]\)/);
});

test('onDeleted handlers do not use out-of-scope subDeviceId values', () => {
  for (const file of walk(path.join(root, 'drivers')).filter(file => file.endsWith('device.js'))) {
    const source = fs.readFileSync(file, 'utf8');
    const handlers = [...source.matchAll(/onDeleted\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/g)];

    for (const [, body] of handlers) {
      if (!body.includes('subDeviceId')) continue;

      assert.match(
        body,
        /(?:const|let|var)\s*\{?\s*subDeviceId\s*\}?\s*=\s*this\.getData\(\)/,
        path.relative(root, file)
      );
    }
  }
});

test('Zigbee registerCapability calls do not use legacy fourth config arguments', () => {
  const targets = [
    'drivers/double_power_point/device.js',
    'drivers/switch_4_gang_metering/device.js',
  ];

  for (const relativePath of targets) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');

    assert.doesNotMatch(source, /registerCapability\([^;]*\},\s*\{/s, relativePath);
  }
});

test('double power point subdevice does not gain main-device metering capabilities', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'double_power_point', 'device.js'),
    'utf8'
  );

  const endpointGuard = source.indexOf('if (endpoint === 1) {');
  const ensureCapabilities = source.indexOf('await this.ensureCapabilities();');

  assert.ok(endpointGuard >= 0);
  assert.ok(ensureCapabilities > endpointGuard);
  assert.match(source, /if \(endpoint === 1\) \{[\s\S]*await this\.ensureCapabilities\(\);/);
});

test('2-gang metering subdevice keeps only its declared switch capability', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'switch_2_gang_metering', 'device.js'),
    'utf8'
  );

  assert.match(
    source,
    /if \(!this\.isSubDevice\(\)\) \{[\s\S]*addCapability\('measure_current'\)[\s\S]*addCapability\('measure_voltage'\)/
  );
});
