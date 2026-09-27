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
