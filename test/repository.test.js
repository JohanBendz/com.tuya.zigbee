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
