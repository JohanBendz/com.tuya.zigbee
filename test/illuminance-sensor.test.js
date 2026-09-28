'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { illuminanceMeasuredValueToLux } = require('../drivers/illuminance_sensor/measurements');

test('TS0222 illuminance conversion follows Zigbee logarithmic encoding', () => {
  assert.equal(illuminanceMeasuredValueToLux(0), 0);
  assert.equal(illuminanceMeasuredValueToLux(10001), 10);
  assert.equal(illuminanceMeasuredValueToLux(20001), 100);
});

test('TS0222 illuminance conversion ignores Zigbee invalid value', () => {
  assert.equal(illuminanceMeasuredValueToLux(0xffff), null);
});

test('TS0222 illuminance conversion rejects non-numeric input', () => {
  assert.throws(() => illuminanceMeasuredValueToLux(Number.NaN), TypeError);
});
