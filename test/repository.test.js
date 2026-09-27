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
