'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const original = require('./fixtures/0.3.1-protected-runtime-blobs.json');
const approved = require('./fixtures/0.4-approved-runtime-deltas.json');

// Node's standard Git blob SHA-1 identity (header + actual source file bytes).
// This is an accidental-change detector, not a security/authenticity system.
// Keep the immutable source values pinned to the actual 0.3.1 Test commit.
function gitBlobSha(file) {
  const bytes = fs.readFileSync(path.resolve(__dirname, '..', file));
  return crypto.createHash('sha1')
    .update('blob ' + bytes.length + '\0', 'utf8')
    .update(bytes)
    .digest('hex');
}

test('0.4 preserves all 15 sensitive legacy light runtimes and five shared Zigbee/Tuya sources', () => {
  assert.equal(original.sourceSha, '7583b4bb2fa91600c2301eb142335312a6a7cac4');
  assert.equal(Object.keys(original.files).length, 20);
  assert.deepEqual(Object.keys(original.files).filter(f => f.startsWith('lib/')).length, 5);
  assert.deepEqual(Object.keys(original.files).filter(f => f.startsWith('drivers/')).length, 15);
  for (const [file, historicSha] of Object.entries(original.files)) {
    assert.match(historicSha, /^[a-f0-9]{40}$/, 'invalid historical Git blob identity: ' + file);
    const exception = approved.files?.[file];
    if (exception) {
      assert.match(exception.reason || '', /#[0-9]+/,
        'a protected source change must cite a GitHub issue: ' + file);
      assert.match(exception.sha || '', /^[a-f0-9]{40}$/,
        'approved source must pin an exact revised Git blob SHA: ' + file);
      assert.notEqual(exception.sha, historicSha, 'redundant source exception: ' + file);
    }
    assert.equal(gitBlobSha(file), exception ? exception.sha : historicSha,
      'PROTECTED 0.3.1 legacy light or shared Zigbee/Tuya runtime changed: ' + file);
  }
  for (const file of Object.keys(approved.files || {})) {
    assert.ok(original.files[file], 'unknown protected runtime exception: ' + file);
  }
});
