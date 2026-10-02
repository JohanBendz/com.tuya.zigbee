'use strict';

// 0.4.0 RELEASE CONTRACT: pin actual 0.3.1 Test-generated manifest
// (source SHA 7583b4bb2fa91600c2301eb142335312a6a7cac4).
// Do not silently regenerate this baseline from the current development app.
// A deliberate exception should be documented separately with exact target
// manifest and GitHub issue; never rewrite history to make tests pass.
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app.json');
const baseline = require('./fixtures/0.3.1-manifest-contract.json');
const approved = require('./fixtures/0.4-approved-manifest-deltas.json');

function signature(value) {
  // Stable, deterministic change detector over JS JSON serialization.
  // The length is retained alongside a FNV-1a 64-bit UTF-16 checksum.
  // This is NOT a security / authenticity signature.
  const json = JSON.stringify(value);
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < json.length; i++) {
    hash ^= BigInt(json.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return json.length + ':' + hash.toString(16).padStart(16, '0');
}

function expectedSignature(kind, id, original) {
  const exception = approved[kind]?.[id];
  if (!exception) return original;
  assert.match(exception.reason || '', /#[0-9]+/,
    'approved change MUST cite an actual GitHub issue: ' + kind + '/' + id);
  assert.match(exception.signature || '', /^[0-9]+:[a-f0-9]{16}$/,
    'approved change must pin its exact target contract: ' + kind + '/' + id);
  assert.notEqual(exception.signature, original,
    'a baseline-identical item must not have a redundant exception: ' + kind + '/' + id);
  return exception.signature;
}

test('0.4 retains the full generated 0.3.1 manifest contract for all 135 existing drivers', () => {
  assert.equal(baseline.version, '0.3.1');
  assert.equal(baseline.sourceSha, '7583b4bb2fa91600c2301eb142335312a6a7cac4');
  assert.equal(Object.keys(baseline.drivers).length, 135);
  const seen = new Set();
  for (const d of app.drivers) {
    assert.ok(!seen.has(d.id), 'duplicate driver ID: ' + d.id);
    seen.add(d.id);
  }
  const actual = new Map(app.drivers.map(d => [d.id, d]));
  for (const [id, original] of Object.entries(baseline.drivers)) {
    assert.ok(actual.has(id), '0.3.1 driver REMOVED from 0.4: ' + id);
    assert.equal(signature(actual.get(id)), expectedSignature('drivers', id, original),
      '0.3.1 driver contract changed: ' + id + '; inspect EVERY manifest property before approval');
  }
  for (const id of Object.keys(approved.drivers || {})) {
    assert.ok(baseline.drivers[id], 'approved exception cannot target new/unknown driver: ' + id);
  }
});

test('0.4 preserves existing Flow-card contracts and custom capability definitions', () => {
  for (const [kind, historicCards] of Object.entries(baseline.flow)) {
    const currentCards = app.flow?.[kind] || [];
    const actual = new Map(currentCards.map(card => [card.id, card]));
    assert.equal(actual.size, currentCards.length, 'duplicate Flow ID in ' + kind);
    for (const [id, original] of Object.entries(historicCards)) {
      assert.ok(actual.has(id), '0.3.1 Flow card REMOVED: ' + kind + '/' + id);
      assert.equal(signature(actual.get(id)),
        expectedSignature('flow', kind + '/' + id, original),
        'existing Flow contract changed without explicit exception: ' + kind + '/' + id);
    }
  }
  for (const [id, original] of Object.entries(baseline.capabilities)) {
    assert.ok(Object.prototype.hasOwnProperty.call(app.capabilities || {}, id),
      '0.3.1 custom capability REMOVED: ' + id);
    assert.equal(signature(app.capabilities[id]),
      expectedSignature('capabilities', id, original),
      '0.3.1 custom capability contract changed: ' + id);
  }
  for (const [kind, exceptions] of Object.entries(approved)) {
    for (const id of Object.keys(exceptions)) {
      const exists = kind === 'drivers' ? baseline.drivers[id]
        : kind === 'capabilities' ? baseline.capabilities[id]
          : baseline.flow[id.split('/')[0]]?.[id.split('/').slice(1).join('/')];
      assert.ok(exists, 'exception must refer to baseline item: ' + kind + '/' + id);
    }
  }
});
