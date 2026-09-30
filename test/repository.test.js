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

test('release JavaScript contains no active debug helpers', () => {
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
    assert.doesNotMatch(source, /this\.printNode\s*\(\s*\)/, relative);
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

test('registerCapability calls use the SDK3 three-argument signature', () => {
  function countTopLevelArguments(source, startIndex) {
    let depth = 0;
    let commas = 0;
    let quote = null;
    let escaped = false;

    for (let index = startIndex; index < source.length; index += 1) {
      const char = source[index];

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        quote = char;
        continue;
      }

      if (char === '(' || char === '{' || char === '[') {
        depth += 1;
        continue;
      }

      if (char === ')' || char === '}' || char === ']') {
        if (depth === 0) return commas + 1;
        depth -= 1;
        continue;
      }

      if (char === ',' && depth === 0) commas += 1;
    }

    return null;
  }

  const violations = [];

  for (const file of walk(path.join(root, 'drivers')).filter(file => file.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8');
    const marker = 'registerCapability(';
    let offset = 0;

    while ((offset = source.indexOf(marker, offset)) !== -1) {
      const argumentStart = offset + marker.length;
      const count = countTopLevelArguments(source, argumentStart);

      if (count !== null && count > 3) {
        violations.push({ file: path.relative(root, file), count });
      }

      offset = argumentStart;
    }
  }

  assert.deepEqual(violations, []);
});

test('subdevice capability options only target declared capabilities', () => {
  const generated = require('../app.json');
  const problems = [];

  for (const driver of generated.drivers || []) {
    for (const [subDeviceId, subDevice] of Object.entries(driver.zigbee?.devices || {})) {
      const capabilities = new Set(subDevice.capabilities || []);

      for (const capabilityId of Object.keys(subDevice.capabilitiesOptions || {})) {
        if (!capabilities.has(capabilityId)) {
          problems.push({
            driver: driver.id,
            subDeviceId,
            capabilityId,
          });
        }
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('driver capability options only target declared capabilities', () => {
  const generated = require('../app.json');
  const problems = [];

  for (const driver of generated.drivers || []) {
    const capabilities = new Set(driver.capabilities || []);

    for (const capabilityId of Object.keys(driver.capabilitiesOptions || {})) {
      if (!capabilities.has(capabilityId)) {
        problems.push({ driver: driver.id, capabilityId });
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('SUPPORTED_DEVICES.md generated identity index is current', () => {
  const { execFileSync } = require('node:child_process');

  assert.doesNotThrow(() => {
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts', 'generate-supported-devices.js'), '--check'],
      { stdio: 'pipe' }
    );
  });
});

test('double power point keeps Homey polling and Zigbee reporting units separate', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'double_power_point', 'device.js'),
    'utf8'
  );

  for (const key of ['Power', 'Current', 'Voltage']) {
    assert.match(
      source,
      new RegExp(`maximumReportInterval: this\\.minReport${key} \\/ 1000`)
    );
  }
});

test('radar settings await Tuya datapoint writes', () => {
  for (const driverId of ['radar_sensor', 'radar_sensor_ceiling']) {
    const source = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'device.js'),
      'utf8'
    );
    const onSettings = source.match(/async onSettings\([^)]*\) \{([\s\S]*?)\n  \}/);
    assert.ok(onSettings, driverId);
    assert.doesNotMatch(onSettings[1], /(^|\n)\s*this\.writeData32\(/, driverId);
  }
});

test('TRV settings and Flow writes propagate Tuya write failures', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'thermostatic_radiator_valve', 'device.js'),
    'utf8'
  );

  assert.match(source, /async setWindowOpen\(state\)[\s\S]*await this\.writeBool/);
  assert.match(source, /async onSettings\([^)]*\)[\s\S]*await this\.applySettings/);
  assert.match(source, /async applySettings\([^)]*\)/);
  assert.match(source, /async updateSchedule\([^)]*\)/);
  assert.doesNotMatch(source, /(^|\n)\s*this\.write(?:Bool|Data32|Raw)\(/);
});

test('shared Tuya write helpers propagate Zigbee failures', () => {
  const source = fs.readFileSync(
    path.join(root, 'lib', 'TuyaSpecificClusterDevice.js'),
    'utf8'
  );

  for (const method of ['writeBool', 'writeData32', 'writeString', 'writeEnum', 'writeRaw']) {
    const match = source.match(
      new RegExp(`async ${method}\\([^)]*\\) \\{([\\s\\S]*?)(?=\\n    \\/\\*\\*|\\n})`)
    );
    assert.ok(match, method);
    assert.match(match[1], /catch \(err\)[\s\S]*throw err;/, method);
  }
});

test('device timers use Homey lifecycle-aware timer helpers', () => {
  const remote = fs.readFileSync(
    path.join(root, 'drivers', 'wall_remote_6_gang', 'device.js'),
    'utf8'
  );
  const water = fs.readFileSync(
    path.join(root, 'drivers', 'water_leak_sensor_tuya', 'device.js'),
    'utf8'
  );

  assert.doesNotMatch(remote, /(^|[^.])setTimeout\(/);
  assert.match(remote, /this\.homey\.setTimeout\(/);
  assert.match(remote, /this\.homey\.clearTimeout\(/);

  assert.doesNotMatch(water, /(^|[^.])setInterval\(/);
  assert.match(water, /this\.homey\.setInterval\(/);
  assert.match(water, /this\.homey\.clearInterval\(/);
});

test('known report handlers catch capability update failures', () => {
  const targets = [
    'drivers/temphumidsensor3/device.js',
    'drivers/smart_air_detection_box/device.js',
    'drivers/radar_sensor/device.js',
    'drivers/radar_sensor_ceiling/device.js',
    'drivers/water_leak_sensor_tuya/device.js',
  ];

  for (const relativePath of targets) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const unsafe = source
      .split('\n')
      .filter(line =>
        line.includes('this.setCapabilityValue(')
        && line.trimEnd().endsWith(');')
        && !line.includes('await ')
        && !line.includes('.catch(')
      );

    assert.deepEqual(unsafe, [], relativePath);
  }
});

test('known async settings synchronization awaits Homey promises', () => {
  const targets = [
    'drivers/siren/device.js',
    'drivers/thermostatic_radiator_valve/device.js',
    'drivers/wall_curtain_switch/device.js',
    'drivers/curtain_module_2_gang/device.js',
  ];

  for (const relativePath of targets) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const unsafe = source
      .split('\n')
      .filter(line =>
        line.includes('this.setSettings(')
        && !line.includes('await this.setSettings(')
        && !line.includes('.catch(')
      );

    assert.deepEqual(unsafe, [], relativePath);
  }
});

test('metering drivers do not misuse Homey capability options as Zigbee polling fallback', () => {
  const targets = [
    'drivers/double_power_point_2/device.js',
    'drivers/double_power_point/device.js',
    'drivers/switch_4_gang_metering/device.js',
    'drivers/switch_1_gang_metering/device.js',
  ];

  for (const relativePath of targets) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /setCapabilityOptions\('onoff',[\s\S]*getOpts/);
  }
});

test('wall remote trigger cards are registered once at driver level', () => {
  const drivers = [
    ['wall_remote_1_gang', 'wall_remote_1_gang_buttons'],
    ['wall_remote_2_gang', 'wall_remote_2_gang_buttons'],
    ['wall_remote_3_gang', 'wall_remote_3_gang_buttons'],
  ];

  for (const [driverId, cardId] of drivers) {
    const driver = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'driver.js'),
      'utf8'
    );
    const device = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'device.js'),
      'utf8'
    );

    assert.match(driver, new RegExp(`getDeviceTriggerCard\\('${cardId}'\\)`));
    assert.match(device, /this\.driver\.buttonTrigger\.trigger/);
    assert.doesNotMatch(device, /registerRunListener/);
  }
});

test('2-gang wall remote parses the normalized frame payload', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'wall_remote_2_gang', 'device.js'),
    'utf8'
  );

  assert.match(source, /frame = frame\.toJSON\(\)/);
  assert.match(source, /frame\.data\[3\]/);
  assert.doesNotMatch(source, /frame\[3\]/);
});

test('4-gang wall remote Flow triggers are driver-scoped', () => {
  const drivers = [
    ['wall_remote_4_gang', 'wall_remote_4_gang_buttons'],
    ['wall_remote_4_gang_2', 'wall_remote_4_gang_buttons_2'],
    ['wall_remote_4_gang_3', 'wall_remote_4_gang_buttons_3'],
  ];

  for (const [driverId, cardId] of drivers) {
    const driver = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'driver.js'),
      'utf8'
    );
    const device = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'device.js'),
      'utf8'
    );

    assert.match(driver, new RegExp(`getDeviceTriggerCard\\('${cardId}'\\)`));
    assert.match(device, /this\.driver\.buttonTrigger\.trigger/);
    assert.doesNotMatch(device, /registerRunListener/);
  }
});

test('4-gang wall remote variant 3 parses normalized frame data', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'wall_remote_4_gang_3', 'device.js'),
    'utf8'
  );

  assert.match(source, /const parsedFrame = frame\.toJSON\(\)/);
  assert.match(source, /buttonCommandParser\(endpointId, parsedFrame\)/);
  assert.match(source, /frame\.data\[3\]/);
  assert.doesNotMatch(source, /frame\[3\]/);
});

test('6-gang wall remote Flow trigger is driver-scoped', () => {
  const driver = fs.readFileSync(
    path.join(root, 'drivers', 'wall_remote_6_gang', 'driver.js'),
    'utf8'
  );
  const device = fs.readFileSync(
    path.join(root, 'drivers', 'wall_remote_6_gang', 'device.js'),
    'utf8'
  );

  assert.match(driver, /getDeviceTriggerCard\('wall_remote_6_gang_buttons'\)/);
  assert.match(device, /this\.driver\.buttonTrigger\.trigger/);
  assert.doesNotMatch(device, /registerRunListener/);
});

test('smart and handheld remote Flow triggers are driver-scoped', () => {
  const drivers = [
    ['smart_button_switch', 'smart_button_switch_buttons'],
    ['smart_remote_1_button_2', 'smart_remote_1_button_2'],
    ['smart_remote_4_buttons', 'smart_remote_4_buttons'],
    ['handheld_remote_4_buttons', 'handheld_remote_4_buttons'],
  ];

  for (const [driverId, cardId] of drivers) {
    const driver = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'driver.js'),
      'utf8'
    );
    const device = fs.readFileSync(
      path.join(root, 'drivers', driverId, 'device.js'),
      'utf8'
    );

    assert.match(driver, new RegExp(`getDeviceTriggerCard\\('${cardId}'\\)`));
    assert.match(device, /this\.driver\.buttonTrigger\.trigger/);
    assert.doesNotMatch(device, /registerRunListener/);
  }
});

test('smart knob Flow trigger is driver-scoped and filters by button', () => {
  const driver = fs.readFileSync(
    path.join(root, 'drivers', 'smart_knob_switch', 'driver.js'),
    'utf8'
  );
  const device = fs.readFileSync(
    path.join(root, 'drivers', 'smart_knob_switch', 'device.js'),
    'utf8'
  );

  assert.match(driver, /getDeviceTriggerCard\('smart_knob_switch_button'\)/);
  assert.match(driver, /args\.button === state\.button/);
  assert.match(device, /this\.driver\.buttonTrigger\.trigger/);
  assert.doesNotMatch(device, /getDeviceTriggerCard/);
});

test('device trigger cards with custom arguments register driver-level filters', () => {
  const generated = require('../app.json');
  const problems = [];

  for (const trigger of generated.flow?.triggers || []) {
    const customArgs = (trigger.args || []).filter(arg => arg.type !== 'device');
    if (customArgs.length === 0) continue;

    const deviceArg = (trigger.args || []).find(arg => arg.type === 'device');
    const match = deviceArg?.filter?.match(/driver_id=([^&]+)/);
    if (!match) continue;

    const driverId = match[1];
    const driverPath = path.join(root, 'drivers', driverId, 'driver.js');

    if (!fs.existsSync(driverPath)) {
      problems.push({ trigger: trigger.id, driverId, reason: 'missing driver.js' });
      continue;
    }

    const source = fs.readFileSync(driverPath, 'utf8');
    if (!source.includes(`getDeviceTriggerCard('${trigger.id}')`)
      || !source.includes('registerRunListener')) {
      problems.push({ trigger: trigger.id, driverId, reason: 'missing run listener' });
    }
  }

  assert.deepEqual(problems, []);
});

test('remote release code does not dump raw Zigbee frames or node descriptors', () => {
  const targets = ["drivers/smart_knob_switch/device.js","drivers/wall_remote_1_gang/device.js","drivers/wall_remote_2_gang/device.js","drivers/wall_remote_3_gang/device.js","drivers/wall_remote_4_gang/device.js","drivers/wall_remote_4_gang_2/device.js","drivers/wall_remote_4_gang_3/device.js","drivers/wall_remote_6_gang/device.js","drivers/smart_button_switch/device.js","drivers/smart_remote_1_button_2/device.js","drivers/smart_remote_4_buttons/device.js","drivers/handheld_remote_4_buttons/device.js"];

  for (const relativePath of targets) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');

    assert.doesNotMatch(source, /this\.printNode\(\)/, relativePath);
    assert.doesNotMatch(source, /Frame JSON data/, relativePath);
    assert.doesNotMatch(source, /this\.log\(["']endpointId:/, relativePath);
  }
});

test('shared Tuya light color changes preserve mode state and propagate failures', () => {
  const source = fs.readFileSync(
    path.join(root, 'lib', 'TuyaZigBeeLightDevice.js'),
    'utf8'
  );

  assert.match(
    source,
    /this\.hasCapability\('light_mode'\)\s*&&\s*this\.getCapabilityValue\('light_mode'\) !== 'color'/
  );
  assert.doesNotMatch(
    source,
    /this\.hasCapability\('light_mode'\s*&&/
  );

  const temperatureMethod = source.match(
    /async changeColorTemperature\([\s\S]*?(?=\n    async changeColor\()/
  );
  const colorMethod = source.match(
    /async changeColor\([\s\S]*?(?=\n    async onEndDeviceAnnounce\()/
  );

  assert.ok(temperatureMethod);
  assert.ok(colorMethod);
  assert.match(temperatureMethod[0], /catch \(error\)[\s\S]*throw error;/);
  assert.match(colorMethod[0], /catch \(error\)[\s\S]*throw error;/);
});

test('Tuya light_mode temperature fallback does not reference undefined values', () => {
  const source = fs.readFileSync(
    path.join(root, 'lib', 'TuyaZigBeeLightDevice.js'),
    'utf8'
  );

  const modeDefinition = source.match(
    /const lightModeCapabilityDefinition = \{[\s\S]*?(?=\n\nclass TuyaZigBeeLightDevice)/
  );

  assert.ok(modeDefinition);
  assert.doesNotMatch(modeDefinition[0], /Math\.round\(value \* MAX_COLORTEMPERATURE\)/);
  assert.match(modeDefinition[0], /getCapabilityValue\('light_temperature'\)/);
});

test('TRV schedules enforce Tuya 10-minute periods and a final 24:00 segment', () => {
  const { marshalSchedule, THERMOSTAT_DATA_POINTS } = require(
    '../drivers/thermostatic_radiator_valve/helpers'
  );

  const valid = marshalSchedule(
    '2',
    THERMOSTAT_DATA_POINTS.scheduleMonday,
    '06:00/16 22:30/20.5 24:00/16'
  );
  assert.equal(valid.length, 31);

  assert.throws(() => marshalSchedule(
    '2',
    THERMOSTAT_DATA_POINTS.scheduleMonday,
    '06:05/16 24:00/16'
  ));

  assert.throws(() => marshalSchedule(
    '2',
    THERMOSTAT_DATA_POINTS.scheduleMonday,
    '08:50/16 08:10/20 24:00/16'
  ));

  assert.throws(() => marshalSchedule(
    '2',
    THERMOSTAT_DATA_POINTS.scheduleMonday,
    '06:00/16 24:10/16'
  ));

  assert.throws(() => marshalSchedule(
    '2',
    THERMOSTAT_DATA_POINTS.scheduleMonday,
    '06:00/16 22:30/20'
  ));
});

test('curtain motor handles both Tuya position reports and the current Homey capability', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'curtain_motor', 'device.js'),
    'utf8'
  );

  assert.match(source, /getCapabilityValue\('windowcoverings_set'\)/);
  assert.doesNotMatch(source, /getCapabilityValue\('pos'\)/);
  assert.match(source, /case dataPoints\.position:/);
  assert.match(source, /case dataPoints\.arrived:/);
  assert.match(source, /\.on\('response', handlePositionReport\)/);
  assert.match(source, /\.on\('reporting', handlePositionReport\)/);
});

test('Tuya report listeners do not fire async handlers without an error boundary', () => {
  const unsafe = [];

  for (const file of walk(path.join(root, 'drivers')).filter(file => file.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    const matches = source.match(
      /clusters\.tuya\.on\(["'](?:response|reporting)["'],\s*value\s*=>\s*this\.[A-Za-z_$][\w$]*\(value\)\)/g
    );

    if (matches?.length) {
      unsafe.push({ file: path.relative(root, file), matches });
    }
  }

  assert.deepEqual(unsafe, []);
});

test('Tuya event listeners do not bind parser methods directly to EventEmitter', () => {
  const unsafe = [];

  for (const file of walk(path.join(root, 'drivers')).filter(file => file.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    if (/clusters\.tuya\.on\([^\n]+\.bind\(this\)\)/.test(source)) {
      unsafe.push(path.relative(root, file));
    }

    if (/clusters\.tuya\.on\(["'](?:response|reporting|datapoint|reportingConfiguration)["'],\s*value\s*=>\s*this\./.test(source)) {
      unsafe.push(path.relative(root, file));
    }
  }

  assert.deepEqual([...new Set(unsafe)], []);
});

test('irrigation controller uses scoped battery values and clears timed shutoff safely', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smart_garden_irrigation_control', 'device.js'),
    'utf8'
  );

  assert.doesNotMatch(source, /batteryPercentageRemaining\s*\/\s*2\s*</);
  assert.match(source, /batteryPercentage < batteryThreshold/);
  assert.match(source, /if \(this\._onOffTimeout\)[\s\S]*clearTimeout/);
  assert.match(source, /setOff\(\)[\s\S]*\.catch\(err => this\.error/);
});

test('one-button smart remote avoids raw frame handling', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smart_remote_1_button', 'device.js'),
    'utf8'
  );

  assert.doesNotMatch(source, /handleFrame/);
  assert.doesNotMatch(source, /frame:", frame/);
  assert.match(source, /TuyaRemoteOnOffBoundCluster/);
  assert.match(source, /triggerAction\('oneClick'/);
  assert.match(source, /triggerAction\('twoClicks'/);
});

test('simple setCapabilityValue statements handle their Promise', () => {
  const problems = [];

  for (const file of walk(path.join(root, 'drivers')).filter(file => file.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    const lines = source.split('\n');

    lines.forEach((line, index) => {
      if (!line.includes('this.setCapabilityValue(')) return;

      const trimmed = line.trim();
      const safe = trimmed.includes('await this.setCapabilityValue(')
        || trimmed.includes('return this.setCapabilityValue(')
        || trimmed.includes('.catch(')
        || !trimmed.endsWith(');');

      if (!safe) {
        problems.push({
          file: path.relative(root, file),
          line: index + 1,
          source: trimmed,
        });
      }
    });
  }

  assert.deepEqual(problems, []);
});

test('Tuya light mode changes await the mode command before color commands', () => {
  const source = fs.readFileSync(
    path.join(root, 'lib', 'TuyaZigBeeLightDevice.js'),
    'utf8'
  );

  const definition = source.match(
    /const lightModeCapabilityDefinition = \{[\s\S]*?(?=\n\nclass TuyaZigBeeLightDevice)/
  );

  assert.ok(definition);
  assert.match(definition[0], /async setParser\(lightMode, opts = \{\}\)/);
  assert.match(definition[0], /await colorControlCluster\.tuyaRgbMode\(\{ enable: 0 \}\)[\s\S]*await colorControlCluster\.moveToColorTemperature/);
  assert.match(definition[0], /await colorControlCluster\.tuyaRgbMode\(\{ enable: 1 \}\)[\s\S]*await colorControlCluster\.moveToHueAndSaturation/);
  assert.doesNotMatch(definition[0], /tuyaRgbMode\([^\n]+\)\s*\.then/);
});

test('Zigbee manufacturer/product identities resolve to a single driver', () => {
  const generated = require('../app.json');
  const identities = new Map();
  const duplicates = [];

  for (const driver of generated.drivers || []) {
    if (!driver.zigbee) continue;

    for (const manufacturer of [].concat(driver.zigbee.manufacturerName || [])) {
      for (const product of [].concat(driver.zigbee.productId || [])) {
        const key = `${manufacturer}\u0000${product}`;
        if (!identities.has(key)) identities.set(key, []);
        identities.get(key).push(driver.id);
      }
    }
  }

  for (const [identity, driverIds] of identities.entries()) {
    const uniqueDrivers = [...new Set(driverIds)];
    if (uniqueDrivers.length <= 1) continue;

    if (identity === '_TZ3210_ngqk6jia\u0000TS110E') continue;

    const [manufacturer, product] = identity.split('\u0000');
    duplicates.push({ manufacturer, product, drivers: uniqueDrivers });
  }

  assert.deepEqual(duplicates, []);
});

test('_TZE200_mgxy2d9f motion sensor keeps the verified passive Tuya profile', () => {
  const manifest = require('../drivers/motion_sensor_3/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'motion_sensor_3', 'device.js'),
    'utf8'
  );

  assert.deepEqual(manifest.zigbee.manufacturerName, ['_TZE200_mgxy2d9f']);
  assert.deepEqual(manifest.zigbee.productId, ['TS0601']);
  assert.deepEqual(manifest.capabilities, ['alarm_motion', 'alarm_tamper', 'measure_battery']);
  assert.deepEqual(manifest.energy.batteries, ['CR123A']);
  assert.deepEqual(manifest.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);

  assert.match(source, /const DP_MOTION = 1;/);
  assert.match(source, /const DP_BATTERY = 4;/);
  assert.match(source, /const DP_TAMPER = 5;/);
  assert.match(source, /const motionActive = numericValue === 0;/);
  assert.match(source, /Math\.max\(0, Math\.min\(100, numericValue\)\)/);
  assert.match(source, /const tamperActive = numericValue === 1;/);
  assert.doesNotMatch(source, /readAttributes\(/);
  assert.doesNotMatch(source, /setInterval\(/);
});

test('double power point maps its declared metering capabilities to endpoint 1', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'double_power_point', 'device.js'),
    'utf8'
  );

  assert.match(
    source,
    /if \(endpoint === 1\) \{[\s\S]*this\.registerMeteringCapabilities\(\);[\s\S]*this\.configureMeteringReporting/
  );

  const mappings = [
    ['meter_power', 'CLUSTER.METERING', 'currentSummationDelivered'],
    ['measure_power', 'CLUSTER.ELECTRICAL_MEASUREMENT', 'activePower'],
    ['measure_current', 'CLUSTER.ELECTRICAL_MEASUREMENT', 'rmsCurrent'],
    ['measure_voltage', 'CLUSTER.ELECTRICAL_MEASUREMENT', 'rmsVoltage'],
  ];

  for (const [capability, cluster, attribute] of mappings) {
    assert.match(
      source,
      new RegExp(
        `registerCapability\\('${capability}', ${cluster.replace('.', '\\.')}[\\s\\S]*?endpoint: 1[\\s\\S]*?get: '${attribute}'[\\s\\S]*?report: '${attribute}'`
      )
    );
  }

  assert.match(source, /reportParser: value => value \/ 1000/);
  assert.match(source, /reportParser: value => \(value \* this\.meteringOffset\) \/ 100\.0/);
  assert.match(source, /reportParser: value => \(value \* this\.measureOffset\) \/ 100/);
});
test('_TZ3210_pfbzs1an uses the repaired double-power-point metering profile', () => {
  const manifest = require('../drivers/double_power_point/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'double_power_point', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZ3210_pfbzs1an'));
  assert.deepEqual(manifest.zigbee.productId, ['TS011F']);
  assert.deepEqual(manifest.zigbee.endpoints['1'].clusters, [0, 4, 5, 6, 1794, 2820]);
  assert.deepEqual(manifest.zigbee.endpoints['2'].clusters, [6]);

  assert.match(source, /reportParser: value => \(value \* this\.meteringOffset\) \/ 100\.0/);
  assert.match(source, /reportParser: value => value \/ 1000/);
  assert.match(source, /endpoint: 1,[\s\S]*?get: 'currentSummationDelivered'/);
});
test('_TZ3000_dd8wwzcy uses the repaired double-power-point metering profile', () => {
  const manifest = require('../drivers/double_power_point/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'double_power_point', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZ3000_dd8wwzcy'));
  assert.deepEqual(manifest.zigbee.productId, ['TS011F']);
  assert.deepEqual(manifest.zigbee.endpoints['1'].clusters, [0, 4, 5, 6, 1794, 2820]);
  assert.deepEqual(manifest.zigbee.endpoints['2'].clusters, [6]);

  assert.match(
    source,
    /readAttributes\([\s\S]*manufacturerName[\s\S]*zclVersion[\s\S]*appVersion[\s\S]*modelId[\s\S]*powerSource[\s\S]*attributeReportingStatus/
  );
  assert.match(source, /reportParser: value => \(value \* this\.meteringOffset\) \/ 100\.0/);
  assert.match(source, /reportParser: value => value \/ 1000/);
});
test('_TZ3000_mmkbptmx exposes all four switch endpoints', () => {
  const manifest = require('../drivers/switch_4_gang_metering/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'switch_4_gang_metering', 'device.js'),
    'utf8'
  );

  assert.deepEqual(manifest.zigbee.manufacturerName, ['_TZ3000_mmkbptmx']);
  assert.deepEqual(manifest.zigbee.productId, ['TS0004']);
  assert.deepEqual(manifest.zigbee.endpoints['2'].clusters, [4, 5, 6]);
  assert.deepEqual(manifest.zigbee.endpoints['3'].clusters, [4, 5, 6]);
  assert.deepEqual(manifest.zigbee.endpoints['4'].clusters, [4, 5, 6]);

  assert.match(
    source,
    /subDeviceId === 'secondSwitch' \? 2 : subDeviceId === 'thirdSwitch' \? 3 : subDeviceId === 'fourthSwitch' \? 4 : 1/
  );
});
test('smart air box keeps manufacturer-specific Tuya datapoint maps', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smart_air_detection_box', 'device.js'),
    'utf8'
  );
  const formaldehyde = require('../.homeycompose/capabilities/measure_formaldehyde.json');

  assert.match(source, /zclNode\.endpoints\[1\]\.clusters\.tuya\.on\('reporting', handleDatapoint\)/);
  assert.match(source, /zclNode\.endpoints\[1\]\.clusters\.tuya\.on\('response', handleDatapoint\)/);

  assert.match(source, /manufacturerName === '_TZE200_ryfmq5rl'/);
  assert.match(source, /manufacturerName === '_TZE200_mja3fuja'/);

  assert.match(source, /case dataPoints\.co2OrFormaldehyde:[\s\S]*PROFILE_RYFMQ5RL[\s\S]*PROFILE_FORMALDEHYDE_DP2[\s\S]*measure_formaldehyde'[\s\S]*convertFormaldehydeToMgM3\(value\)/);
  assert.match(source, /PROFILE_FORMALDEHYDE_DP2[\s\S]*convertFormaldehydeToMgM3\(value\)/);
  assert.match(source, /else \{[\s\S]*measure_co2', value/);

  assert.match(source, /case dataPoints\.voc:[\s\S]*measure_voc'[\s\S]*convertVocToPpm\(value\)/);
  assert.match(source, /case dataPoints\.formaldehydeOrCo2:[\s\S]*PROFILE_DEFAULT[\s\S]*measure_formaldehyde'[\s\S]*convertFormaldehydeToMgM3\(value\)[\s\S]*measure_co2', value/);

  assert.equal(formaldehyde.units.en, 'mg/m³');
  assert.equal(formaldehyde.units.ru, 'мг/м³');
  assert.match(formaldehyde.desc.en, /mg\/m³/);
});
test('_TZE200_yjjdcqsq handles Tuya battery-state reports', () => {
  const manifest = require('../drivers/temphumidsensor4/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'temphumidsensor4', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZE200_yjjdcqsq'));
  assert.deepEqual(manifest.energy.batteries, ['AAA', 'AAA']);

  assert.match(source, /case 1:[\s\S]*reportTemperatureCapacity\(measuredValue\)/);
  assert.match(source, /case 2:[\s\S]*reportHumidityCapacity\(measuredValue\)/);
  assert.match(source, /case 3: \{/);
  assert.match(source, /const batteryByState = \{ 0: 25, 1: 50, 2: 100 \}/);
  assert.match(source, /reportAlarmBatteryCapacity\(measuredValue === 0\)/);
  assert.match(source, /clusters\.tuya\.on\("reporting",[\s\S]*processResponse\(value\)/);
});
test('_TZE200_qyflbnbj keeps its raw-percent humidity profile', () => {
  const manifest = require('../drivers/lcdtemphumidsensor_3/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'lcdtemphumidsensor_3', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZE200_qyflbnbj'));
  assert.match(source, /tenthPercentHumidityManufacturers = new Set\(\[[\s\S]*_TZE200_bjawzodf[\s\S]*_TZE200_zl1kmjqx/);
  assert.match(source, /this\.humidityDivisor = tenthPercentHumidityManufacturers\.has\(this\.manufacturerName\) \? 10 : 1/);
  assert.match(source, /const humidity = measuredValue \/ this\.humidityDivisor/);
  assert.match(source, /const signedValue = measuredValue > 0x2000 \? measuredValue - 0xFFFF : measuredValue/);
  assert.match(source, /tuyaCluster\.on\('reporting', handleDatapoint\)/);
  assert.match(source, /tuyaCluster\.on\('response', handleDatapoint\)/);
});
test('_TZE204_qasjif9e uses an isolated exact radar profile', () => {
  const generic = require('../drivers/radar_sensor/driver.compose.json');
  const exact = require('../drivers/radar_sensor_qasjif9e/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'radar_sensor', 'device.js'),
    'utf8'
  );

  assert.ok(!generic.zigbee.manufacturerName.includes('_TZE204_qasjif9e'));
  assert.ok(!generic.zigbee.manufacturerName.includes('_TZE204_ztqnh5cg'));
  assert.deepEqual(exact.zigbee.manufacturerName.sort(), ['_TZE204_qasjif9e', '_TZE204_ztqnh5cg'].sort());
  assert.deepEqual(exact.zigbee.productId, ['TS0601']);
  assert.deepEqual(exact.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);
  assert.deepEqual(exact.zigbee.endpoints['1'].bindings, [10, 25]);

  assert.match(source, /tenthSecondTimingManufacturers = new Set\(\['_TZE204_qasjif9e', '_TZE204_ztqnh5cg'\]\)/);
  assert.match(source, /newSettings\['detection_delay'\] \* 10/);
  assert.match(source, /newSettings\['fading_time'\] \* 10/);
  assert.match(source, /clusters\.tuya\.on\("reporting", handleDatapoint\)/);
});
test('FingerBot uses Tuya MCU send-data command for datapoint settings', () => {
  const clusterSource = fs.readFileSync(
    path.join(root, 'lib', 'TuyaSpecificCluster.js'),
    'utf8'
  );
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'fingerbot', 'device.js'),
    'utf8'
  );

  assert.match(clusterSource, /sendData:\s*\{\s*id:\s*0x04/);
  assert.match(source, /clusters\.tuya\.sendData\(\{/);
  assert.match(source, /_writeFingerBotEnum\(V1_FINGER_BOT_DATA_POINTS\.mode/);
  assert.match(source, /_writeFingerBotData32\(V1_FINGER_BOT_DATA_POINTS\.lower/);
  assert.match(source, /_writeFingerBotData32\(V1_FINGER_BOT_DATA_POINTS\.delay/);
  assert.match(source, /_writeFingerBotEnum\([\s\S]*?V1_FINGER_BOT_DATA_POINTS\.reverse/);
  assert.match(source, /_writeFingerBotData32\(V1_FINGER_BOT_DATA_POINTS\.upper/);

  assert.doesNotMatch(source, /this\.writeEnum\(/);
  assert.doesNotMatch(source, /this\.writeData32\(/);
});
test('soil sensor profiles keep manufacturer-specific temperature scaling', () => {
  const legacyManifest = require('../drivers/soilsensor/driver.compose.json');
  const scaledManifest = require('../drivers/soilsensor_2/driver.compose.json');
  const legacySource = fs.readFileSync(
    path.join(root, 'drivers', 'soilsensor', 'device.js'),
    'utf8'
  );
  const scaledSource = fs.readFileSync(
    path.join(root, 'drivers', 'soilsensor_2', 'device.js'),
    'utf8'
  );

  assert.ok(!legacyManifest.zigbee.manufacturerName.includes('_TZE284_aao3yzhs'));
  assert.ok(scaledManifest.zigbee.manufacturerName.includes('_TZE284_aao3yzhs'));
  assert.ok(scaledManifest.zigbee.manufacturerName.includes('_TZE284_sgabhwa6'));

  assert.match(
    legacySource,
    /manufacturerName === '_TZE284_aao3yzhs' \? 10 : 1/
  );
  assert.match(
    legacySource,
    /const temperature = value \/ \(this\.temperatureDivisor \|\| 1\)/
  );
  assert.match(legacySource, /clusters\.tuya\.on\('response', handleDatapoint\)/);
  assert.match(legacySource, /clusters\.tuya\.on\('reporting', handleDatapoint\)/);

  assert.match(scaledSource, /setCapabilityValue\('measure_temperature', value\/10\)/);
  assert.match(scaledSource, /clusters\.tuya\.on\('response', handleDatapoint\)/);
  assert.match(scaledSource, /clusters\.tuya\.on\('reporting', handleDatapoint\)/);
});
test('NEO siren processes response frames and awaits settings writes', () => {
  const manifest = require('../drivers/siren/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'siren', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZE204_t1blo2bj'));
  assert.ok(manifest.zigbee.manufacturerName.includes('_TZE200_t1blo2bj'));

  assert.match(
    source,
    /async processResponse\(data\) \{[\s\S]*await this\.processReporting\(data\)/
  );
  assert.match(
    source,
    /async processDatapoint\(data\) \{[\s\S]*await this\.processReporting\(data\)/
  );

  assert.match(source, /for \(const updatedSetting of changedKeys\)/);
  assert.match(source, /await this\.sendAlarmVolume\(/);
  assert.match(source, /await this\.sendAlarmDuration\(/);
  assert.match(source, /await this\.sendAlarmTune\(/);
  assert.doesNotMatch(source, /changedKeys\.forEach/);
});
test('_TZ3000_upgcbody uses exact 2xAAA water profile', () => {
  const legacy = require('../drivers/water_detector/driver.compose.json');
  const exact = require('../drivers/water_detector_2aaa/driver.compose.json');
  const runtime = fs.readFileSync(
    path.join(root, 'drivers', 'water_detector_2aaa', 'device.js'),
    'utf8'
  );

  assert.ok(!legacy.zigbee.manufacturerName.includes('_TZ3000_upgcbody'));
  assert.deepEqual(exact.zigbee.manufacturerName, ['_TZ3000_upgcbody']);
  assert.deepEqual(exact.zigbee.productId, ['TS0207', 'SNZB-05']);
  assert.deepEqual(exact.energy.batteries, ['AAA', 'AAA']);
  assert.deepEqual(exact.zigbee.endpoints['1'].clusters, [0, 1, 3, 1280]);
  assert.deepEqual(exact.zigbee.endpoints['1'].bindings, [1, 1280]);
  assert.match(runtime, /require\('\.\.\/water_detector\/device'\)/);
});
test('solar rain sensor derives water alarm from DP105 intensity', () => {
  const manifest = require('../drivers/rain_sensor/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'rain_sensor', 'device.js'),
    'utf8'
  );

  assert.deepEqual(manifest.zigbee.manufacturerName, ['_TZ3210_tgvtvdoc']);
  assert.deepEqual(manifest.zigbee.productId, ['TS0207']);
  assert.match(
    source,
    /case V1_RAIN_SENSOR_DATA_POINTS\.rain_intensity:[\s\S]*const isRaining = parsedValue > 100/
  );
  assert.match(
    source,
    /setCapabilityValue\('measure_voltage\.rain', parsedValue \/ 1000\)/
  );
  assert.match(
    source,
    /setCapabilityValue\('alarm_water', isRaining\)/
  );
});
test('_TZE200_jthf7vb6 keeps its verified DP1/DP4 profile', () => {
  const shared = require('../drivers/water_leak_sensor_tuya/driver.compose.json');
  const exact = require('../drivers/water_leak_sensor_jthf7vb6/driver.compose.json');
  const sharedSource = fs.readFileSync(
    path.join(root, 'drivers', 'water_leak_sensor_tuya', 'device.js'),
    'utf8'
  );
  const exactSource = fs.readFileSync(
    path.join(root, 'drivers', 'water_leak_sensor_jthf7vb6', 'device.js'),
    'utf8'
  );

  assert.ok(!shared.zigbee.manufacturerName.includes('_TZE200_jthf7vb6'));
  assert.deepEqual(exact.zigbee.manufacturerName, ['_TZE200_jthf7vb6']);
  assert.deepEqual(exact.zigbee.productId, ['TS0601']);
  assert.deepEqual(exact.energy.batteries, ['OTHER']);
  assert.ok(!exact.capabilities.includes('alarm_battery'));

  assert.match(
    sharedSource,
    /manufacturerName === '_TZE200_jthf7vb6'/
  );
  assert.match(
    sharedSource,
    /data\.dp === 1[\s\S]*Number\(value\) === 0/
  );
  assert.match(
    sharedSource,
    /data\.dp === 4[\s\S]*setCapabilityValue\('measure_battery', battery\)/
  );
  assert.match(
    sharedSource,
    /setCapabilityValue\('alarm_battery', battery < 20\)/
  );
  assert.match(
    sharedSource,
    /if \(!this\.isJthf7vb6\)[\s\S]*tuya\.read\(\{ dp: 14 \}\)/
  );
  assert.match(exactSource, /require\('\.\.\/water_leak_sensor_tuya\/device'\)/);
});
test('_TZE200_vvmbj46n uses exact DP4 battery and 3xAAA profile', () => {
  const generic = require('../drivers/temphumidsensor4/driver.compose.json');
  const exact = require('../drivers/temphumidsensor_vvmbj46n/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'temphumidsensor4', 'device.js'),
    'utf8'
  );
  const exactSource = fs.readFileSync(
    path.join(root, 'drivers', 'temphumidsensor_vvmbj46n', 'device.js'),
    'utf8'
  );

  assert.ok(!generic.zigbee.manufacturerName.includes('_TZE200_vvmbj46n'));
  assert.deepEqual(exact.zigbee.manufacturerName, ['_TZE200_vvmbj46n']);
  assert.deepEqual(exact.energy.batteries, ['AAA', 'AAA', 'AAA']);
  assert.deepEqual(
    exact.capabilities,
    ['measure_temperature', 'measure_humidity', 'measure_battery']
  );

  assert.match(source, /manufacturerName === '_TZE200_vvmbj46n'/);
  assert.match(
    source,
    /case 4:[\s\S]*this\.isVvmbj46n[\s\S]*reportBatteryPercentageCapacity\(measuredValue\)/
  );
  assert.match(
    source,
    /case 3:[\s\S]*this\.isVvmbj46n[\s\S]*Ignoring DP3 battery-state mapping/
  );
  assert.match(exactSource, /require\('\.\.\/temphumidsensor4\/device'\)/);
});
test('Nous A1Z keeps verified stock metering scaling', () => {
  const manifest = require('../drivers/smartplug/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smartplug', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZ3000_2putqrmw'));

  // Stock A1Z reports Metering multiplier=1/divisor=100 and
  // Electrical Measurement current multiplier=1/divisor=1000.
  assert.match(
    source,
    /registerCapability\('meter_power'[\s\S]*reportParser: value => \(value \* this\.meteringOffset\)\/100\.0/
  );
  assert.match(
    source,
    /registerCapability\('measure_current'[\s\S]*return value\/1000/
  );
});
test('_TZE200_amp6tsvy uses the 1-gang Tuya DP1 switch profile', () => {
  const manifest = require('../drivers/wall_switch_1_gang_tuya/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'wall_switch_1_gang_tuya', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZE200_amp6tsvy'));
  assert.deepEqual(manifest.zigbee.productId, ['TS0601']);
  assert.deepEqual(manifest.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);

  assert.match(source, /writeBool\(1, onOff\)/);
  assert.match(source, /if \(dp !== 1\)/);
  assert.match(source, /clusters\.tuya\.on\("reporting"/);
  assert.match(source, /clusters\.tuya\.on\("response"/);
});
test('_TZE204_5cuocqty uses an exact Tuya-DP dimmer profile', () => {
  const generic = require('../drivers/dimmer_1_gang_tuya/driver.compose.json');
  const exact = require('../drivers/dimmer_1_gang_tuya_avatto/driver.compose.json');
  const exactRuntime = fs.readFileSync(
    path.join(root, 'drivers', 'dimmer_1_gang_tuya_avatto', 'device.js'),
    'utf8'
  );
  const sharedRuntime = fs.readFileSync(
    path.join(root, 'drivers', 'dimmer_1_gang_tuya', 'device.js'),
    'utf8'
  );

  assert.ok(!generic.zigbee.manufacturerName.includes('_TZE204_5cuocqty'));
  assert.deepEqual(exact.zigbee.manufacturerName, ['_TZE204_5cuocqty']);
  assert.deepEqual(exact.zigbee.productId, ['TS0601']);
  assert.deepEqual(exact.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);
  assert.deepEqual(exact.zigbee.endpoints['1'].bindings, [25, 10]);

  assert.match(exactRuntime, /require\('\.\.\/dimmer_1_gang_tuya\/device'\)/);
  assert.match(sharedRuntime, /writeBool\(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS\.onOff/);
  assert.match(sharedRuntime, /writeData32\(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS\.brightness/);
  assert.match(sharedRuntime, /clusters\.tuya\.on\('reporting'/);
  assert.match(sharedRuntime, /clusters\.tuya\.on\('response'/);
});
test('_TZE204_7gclukjs uses its exact ZY-M100 24G datapoint profile', () => {
  const generic = require('../drivers/radar_sensor/driver.compose.json');
  const exact = require('../drivers/radar_sensor_7gclukjs/driver.compose.json');
  const settings = require('../drivers/radar_sensor_7gclukjs/driver.settings.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'radar_sensor', 'device.js'),
    'utf8'
  );

  assert.ok(!generic.zigbee.manufacturerName.includes('_TZE204_7gclukjs'));
  assert.deepEqual(exact.zigbee.manufacturerName, ['_TZE204_7gclukjs']);
  assert.deepEqual(exact.zigbee.productId, ['TS0601']);
  assert.deepEqual(exact.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);
  assert.deepEqual(exact.zigbee.endpoints['1'].bindings, [25, 10]);

  assert.match(source, /zyM10024GV2Manufacturers = new Set\(\['_TZE204_7gclukjs'\]\)/);
  assert.match(source, /tshpsPresenceState: 104/);
  assert.match(source, /tshpsState: 1/);
  assert.match(source, /tshpsIlluminanceLux: 103/);
  assert.match(source, /tshpsFadingTime: 105/);
  assert.match(source, /const divisor = this\.isZyM10024GV2 \? 10 : 100/);
  assert.match(source, /value === 1 \|\| value === 2/);
  assert.match(source, /this\.usesAlternateDataPoints \|\| this\.isZyM10024GV2/);

  assert.ok(!settings.some(setting => setting.id === 'detection_delay'));
  assert.equal(settings.find(setting => setting.id === 'radar_sensitivity').max, 10);
  assert.equal(settings.find(setting => setting.id === 'maximum_range').max, 8.25);
});
test('_TZE200_fjjbhx9d uses the exact dual Tuya-DP dimmer profile', () => {
  const generic = require('../drivers/dimmer_2_gang_tuya/driver.compose.json');
  const exact = require('../drivers/dimmer_2_gang_tuya_fjjbhx9d/driver.compose.json');
  const runtime = fs.readFileSync(
    path.join(root, 'drivers', 'dimmer_2_gang_tuya', 'device.js'),
    'utf8'
  );

  assert.ok(!generic.zigbee.manufacturerName.includes('_TZE200_fjjbhx9d'));
  assert.deepEqual(exact.zigbee.manufacturerName, ['_TZE200_fjjbhx9d']);
  assert.deepEqual(exact.zigbee.productId, ['TS0601']);
  assert.deepEqual(exact.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);
  assert.deepEqual(exact.zigbee.endpoints['1'].bindings, [25, 10]);
  assert.ok(exact.zigbee.devices.secondGang);

  assert.match(runtime, /onOffGangOne/);
  assert.match(runtime, /brightnessGangOne/);
  assert.match(runtime, /onOffGangTwo/);
  assert.match(runtime, /brightnessGangTwo/);
  assert.match(runtime, /clusters\.tuya\.on\("reporting"/);
  assert.match(runtime, /clusters\.tuya\.on\("response"/);
});
test('smart air box declares Basic cluster for manufacturer-specific profiles', () => {
  const manifest = require('../drivers/smart_air_detection_box/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smart_air_detection_box', 'device.js'),
    'utf8'
  );

  assert.deepEqual(manifest.zigbee.endpoints['1'].clusters, [0, 61184]);
  assert.match(source, /clusters\.basic/);
  assert.match(source, /manufacturerName === '_TZE200_ryfmq5rl'/);
  assert.match(source, /manufacturerName === '_TZE200_mja3fuja'/);
});
test('smart air box maps verified DP20 PM2.5 for default family', () => {
  const manifest = require('../drivers/smart_air_detection_box/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smart_air_detection_box', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.capabilities.includes('measure_pm25'));
  assert.match(source, /pm25: 20/);
  assert.match(source, /PROFILE_DEFAULT && !this\.hasCapability\('measure_pm25'\)/);
  assert.match(source, /await this\.addCapability\('measure_pm25'\)/);
  assert.match(
    source,
    /case dataPoints\.pm25:[\s\S]*PROFILE_DEFAULT[\s\S]*setCapabilityValue\('measure_pm25', value\)/
  );
});
test('_TZE200_a8sdabtg standard sensor configures robust reporting', () => {
  const manifest = require('../drivers/temphumidsensor3/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'temphumidsensor3', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZE200_a8sdabtg'));
  assert.deepEqual(manifest.zigbee.endpoints['1'].clusters, [0, 1, 1026, 1029]);
  assert.deepEqual(manifest.zigbee.endpoints['1'].bindings, [1, 1026, 1029]);

  assert.match(source, /cluster: CLUSTER\.TEMPERATURE_MEASUREMENT/);
  assert.match(source, /cluster: CLUSTER\.RELATIVE_HUMIDITY_MEASUREMENT/);
  assert.match(source, /cluster: CLUSTER\.POWER_CONFIGURATION/);
  assert.match(source, /for \(const configuration of reportingConfigurations\)/);
  assert.match(source, /configureAttributeReporting\(\[configuration\]\)\.catch/);
});
test('_TZ3000_ywagc4rj uses tenth-percent humidity scaling', () => {
  const manifest = require('../drivers/lcdtemphumidsensor/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'lcdtemphumidsensor', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZ3000_ywagc4rj'));
  assert.match(
    source,
    /manufacturerName === '_TZ3000_ywagc4rj' \? 10 : 100/
  );
  assert.match(
    source,
    /const humidity = measuredValue \/ \(this\.humidityDivisor \|\| 100\)/
  );
  assert.match(source, /measuredValue \/ 100/);
});
test('_TZ3000_18ejxno0 configures persistent OnOff reporting', () => {
  const manifest = require('../drivers/wall_switch_2_gang/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'wall_switch_2_gang', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZ3000_18ejxno0'));
  assert.deepEqual(manifest.zigbee.endpoints['1'].bindings, [6]);
  assert.deepEqual(manifest.zigbee.endpoints['2'].bindings, [6]);

  assert.match(source, /Cluster\.addCluster\(TuyaOnOffCluster\)/);
  assert.match(source, /CLUSTER, Cluster, ZCLDataTypes/);
  assert.match(source, /manufacturerName === '_TZ3000_18ejxno0'/);
  assert.match(source, /getStoreValue\('onoff_reporting_configured'\) !== true/);
  assert.match(source, /attributeName: 'onOff'/);
  assert.match(source, /maxInterval: 300/);
  assert.match(source, /setStoreValue\('onoff_reporting_configured', true\)/);
  assert.match(source, /endpointId: endpoint/);
});
test('Silvercrest TS004F remote uses parsed Tuya actions instead of raw frames', () => {
  const cluster = fs.readFileSync(
    path.join(root, 'lib', 'TuyaOnOffCluster.js'),
    'utf8'
  );
  const bound = fs.readFileSync(
    path.join(root, 'lib', 'TuyaRemoteOnOffBoundCluster.js'),
    'utf8'
  );
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smart_remote_1_button', 'device.js'),
    'utf8'
  );

  assert.match(cluster, /tuyaOperationMode: \{ id: 0x8004/);
  assert.match(cluster, /tuyaAction:[\s\S]*id: 0xFD/);
  assert.match(cluster, /tuyaAction2:[\s\S]*id: 0xFC/);

  assert.match(bound, /tuyaAction\(\{ value \}\)/);
  assert.match(bound, /value === 0[\s\S]*_onSingle/);
  assert.match(bound, /value === 1[\s\S]*_onDouble/);

  assert.doesNotMatch(source, /handleFrame/);
  assert.match(source, /TuyaRemoteOnOffBoundCluster/);
  assert.match(source, /tuyaOperationMode: 1/);
  assert.match(source, /manufacturerName === '_TZ3000_rco1yzb1'/);
  assert.match(source, /onSingle: source => this\.triggerAction\('oneClick'/);
  assert.match(source, /onDouble: source => this\.triggerAction\('twoClicks'/);
  assert.match(source, /attr\.batteryPercentageRemaining/);
});
test('_TZ3000_wkai4ga5 bypasses legacy alternating-frame debounce', () => {
  const manifest = require('../drivers/wall_remote_4_gang_3/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'wall_remote_4_gang_3', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZ3000_wkai4ga5'));
  assert.ok(manifest.zigbee.manufacturerName.length > 1);

  assert.match(
    source,
    /bypassAlternatingDebounce = manufacturerName === '_TZ3000_wkai4ga5'/
  );
  assert.match(
    source,
    /if \(bypassAlternatingDebounce\) \{[\s\S]*buttonCommandParser\(endpointId, parsedFrame\)[\s\S]*return;/
  );
  assert.match(source, /debounce \+= 1/);
  assert.match(source, /if \(debounce === 1\)/);
});
test('smart air box converts VOC and formaldehyde to Homey capability units', () => {
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smart_air_detection_box', 'device.js'),
    'utf8'
  );
  const voc = require('../.homeycompose/capabilities/measure_voc.json');
  const formaldehyde = require('../.homeycompose/capabilities/measure_formaldehyde.json');

  assert.match(source, /const divisor = this\.profile === PROFILE_RYFMQ5RL \? 10000 : 1000/);
  assert.match(source, /const divisor = this\.profile === PROFILE_RYFMQ5RL \? 100000 : 1000/);
  assert.match(source, /convertVocToPpm\(value\)/);
  assert.match(source, /convertFormaldehydeToMgM3\(value\)/);

  assert.equal(voc.units.en, 'ppm');
  assert.equal(voc.decimals, 3);
  assert.equal(formaldehyde.units.en, 'mg/m³');
});
test('_TZ3000_xabckq1v keeps its physical 4-button order', () => {
  const manifest = require('../drivers/wall_remote_4_gang_2/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'wall_remote_4_gang_2', 'device.js'),
    'utf8'
  );

  assert.ok(manifest.zigbee.manufacturerName.includes('_TZ3000_xabckq1v'));
  assert.match(
    source,
    /this\.useXabckq1vButtonMap = manufacturerName === '_TZ3000_xabckq1v'/
  );
  assert.match(source, /leftDown: 'leftUp'/);
  assert.match(source, /rightDown: 'rightUp'/);
  assert.match(source, /rightUp: 'leftDown'/);
  assert.match(source, /leftUp: 'rightDown'/);
});
test('_TZE200_m9skfctm uses smoke-only TS0601 profile', () => {
  const generic = require('../drivers/smoke_sensor2/driver.compose.json');
  const exact = require('../drivers/smoke_sensor_smoke_only/driver.compose.json');
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'smoke_sensor2', 'device.js'),
    'utf8'
  );

  for (const manufacturer of ['_TZE200_m9skfctm', '_TZE200_rccxox8p', '_TZE200_vzekyi4c']) {
    assert.ok(!generic.zigbee.manufacturerName.includes(manufacturer));
    assert.ok(exact.zigbee.manufacturerName.includes(manufacturer));
  }

  assert.deepEqual(exact.capabilities, ['alarm_smoke']);
  assert.deepEqual(exact.zigbee.productId, ['TS0601']);

  assert.match(source, /clusters\.tuya\.on\("response", handleDatapoint\)/);
  assert.match(source, /clusters\.tuya\.on\("reporting", handleDatapoint\)/);
  assert.match(source, /if \(this\.hasCapability\('alarm_tamper'\)\)/);
  assert.match(source, /const batteryPercentages = \{ 0: 20, 1: 50, 2: 90 \}/);
  assert.match(source, /if \(this\.hasCapability\('alarm_battery'\)\)/);
  assert.match(source, /setCapabilityValue\('alarm_battery', value === 0\)/);
});
test('_TZE200_locansqn receives Tuya 1970-based MCU time sync', () => {
  const clusterSource = fs.readFileSync(
    path.join(root, 'lib', 'TuyaSpecificCluster.js'),
    'utf8'
  );
  const source = fs.readFileSync(
    path.join(root, 'drivers', 'lcdtemphumidsensor_3', 'device.js'),
    'utf8'
  );

  assert.match(
    clusterSource,
    /timeSync:[\s\S]*id: 0x24[\s\S]*payloadSize: ZCLDataTypes\.uint16[\s\S]*payload: ZCLDataTypes\.buffer/
  );
  assert.match(
    source,
    /this\.requiresTuyaTimeSync = this\.manufacturerName === '_TZE200_locansqn'/
  );
  assert.match(source, /tuyaCluster\.on\('timeSync'/);
  assert.match(source, /const utcTime = Math\.floor\(Date\.now\(\) \/ 1000\)/);
  assert.match(source, /const localTime = utcTime - new Date\(\)\.getTimezoneOffset\(\) \* 60/);
  assert.match(source, /payload\.writeUInt32BE\(utcTime >>> 0, 0\)/);
  assert.match(source, /payload\.writeUInt32BE\(localTime >>> 0, 4\)/);
  assert.match(source, /payloadSize: payload\.length/);
  assert.match(source, /Date\.now\(\) - this\.lastTuyaTimeSyncAt >= 3600000/);
});
