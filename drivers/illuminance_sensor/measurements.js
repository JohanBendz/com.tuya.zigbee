'use strict';

function illuminanceMeasuredValueToLux(measuredValue) {
  if (!Number.isFinite(measuredValue)) {
    throw new TypeError('Illuminance measuredValue must be a finite number');
  }

  // Zigbee Illuminance Measurement uses 0xffff for an invalid/unknown reading.
  if (measuredValue === 0xffff) return null;
  if (measuredValue === 0) return 0;

  return 10 ** ((measuredValue - 1) / 10000);
}

module.exports = {
  illuminanceMeasuredValueToLux,
};
