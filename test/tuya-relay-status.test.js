'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeTuyaRelayStatus,
  parseTuyaRelaySetting,
  syncTuyaRelayStatus,
  writeTuyaRelayStatus,
} = require('../lib/TuyaRelayStatus');

test('Tuya 0x8002 normalization accepts only explicit numeric and enum variants', () => {
  for (const [value, expected] of [
    [0, 0], ['0', 0], ['Off', 0], [' OFF ', 0],
    [1, 1], ['1', 1], ['On', 1],
    [2, 2], ['2', 2], ['Remember', 2], ['PREVIOUS', 2],
    ['Recover', 2], ['remember last state', 2], ['off/on', 2],
  ]) assert.equal(normalizeTuyaRelayStatus(value), expected, String(value));
  for (const unknown of [undefined, null, {}, -1, 3, 255, '255', 'toggle', '2x', '', '0x02']) {
    assert.throws(() => normalizeTuyaRelayStatus(unknown), RangeError, String(unknown));
  }
});

test('Homey setting parses strict 0/1/2, never integer prefixes or standard ZCL previous=0xFF', () => {
  for (const v of [0, 1, 2, '0', '1', '2']) assert.equal(parseTuyaRelaySetting(v), Number(v));
  for (const v of [undefined, null, '', '2x', ' 2', '3', 3, -1, 255, '255', 'previous', '0x02']) {
    assert.throws(() => parseTuyaRelaySetting(v), RangeError, String(v));
  }
});

test('read on startup only updates Homey setting, NEVER writes to hardware', async () => {
  const reads = [], writes = [], saved = [];
  const device = { log() {}, async setSettings(settings) { saved.push(settings); } };
  const cluster = {
    async readAttributes(attributes) { reads.push(attributes); return { relayStatus: 'Remember' }; },
    async writeAttributes(payload) { writes.push(payload); },
  };
  assert.equal(await syncTuyaRelayStatus(device, cluster), true);
  assert.deepEqual(reads, [['relayStatus']]);
  assert.deepEqual(saved, [{ relay_status: '2' }]);
  assert.deepEqual(writes, []);
});

test('unknown, missing, failed or unavailable reads retain existing setting and do not block startup', async () => {
  const saved = [];
  const device = { log() {}, async setSettings(s) { saved.push(s); } };
  const values = [undefined, null, 0xFF, 'Toggle'];
  for (const value of values) {
    const cluster = { async readAttributes() { return { relayStatus: value }; } };
    assert.equal(await syncTuyaRelayStatus(device, cluster), false);
  }
  assert.equal(await syncTuyaRelayStatus(device, { async readAttributes() { throw new Error('unsupported attribute'); } }), false);
  assert.equal(await syncTuyaRelayStatus(device, undefined), false);
  assert.deepEqual(saved, []);
});

test('Homey setting changes write numeric Tuya enum only, and propagate device errors', async () => {
  const writes = [];
  const cluster = { async writeAttributes(payload) { writes.push(payload); } };
  for (const selected of ['0', '1', '2']) await writeTuyaRelayStatus(cluster, selected);
  assert.deepEqual(writes, [{ relayStatus: 0 }, { relayStatus: 1 }, { relayStatus: 2 }]);
  await assert.rejects(writeTuyaRelayStatus(cluster, '2notvalid'), RangeError);
  await assert.rejects(writeTuyaRelayStatus(cluster, '255'), RangeError);
  await assert.rejects(writeTuyaRelayStatus(undefined, '2'), /unavailable/);
  assert.deepEqual(writes.length, 3);
  await assert.rejects(writeTuyaRelayStatus({ async writeAttributes() { throw new Error('radio failure'); } }, '1'), /radio failure/);
});

test('four existing opted-in plug drivers keep their UI and isolate optional reads', () => {
  const manifest = require('../app.json');
  for (const id of ['smartplug', 'smartplug_2_socket', 'wall_socket', 'smartPlug_DinRail']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'drivers', id, 'device.js'), 'utf8');
    const driver = manifest.drivers.find(d => d.id === id);
    assert.ok(driver, id);
    const setting = driver.settings.find(s => s.id === 'relay_status');
    assert.equal(setting.value, '2', id);
    assert.deepEqual(setting.values.map(v => v.id), ['0', '1', '2'], id);
    assert.match(src, /Cluster\.addCluster\(TuyaOnOffCluster\)/);
    assert.match(src, /await syncTuyaRelayStatus\(this, onOffCluster\)/);
    assert.match(src, /await writeTuyaRelayStatus\(this\.zclNode\.endpoints\[1\]\?\.clusters\?\.onOff, newSettings\.relay_status\)/);
    assert.doesNotMatch(src, /parseInt\(newSettings\.relay_status\)/);
    assert.equal((src.match(/readAttributes\(\['relayStatus'\]\)/g) || []).length, 0,
      'relayStatus reading must be delegated to isolated helper: ' + id);
    // Child lock or indicator failure cannot suppress independent relay read.
    assert.match(src, /await syncTuyaRelayStatus\(this, onOffCluster\);[\s\S]*?readAttributes\(\['childLock'\]\)/);
    assert.match(src, /readAttributes\(\['indicatorMode'\]\)/);
  }
});
