'use strict';

/**
 * Cluster capability configuration for `measure_luminance`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  get: 'measuredValue',
  report: 'measuredValue',
  /**
   * @param {number} value
   * @returns {number}
   */
  reportParser(value) {
    // MeasuredValue represents the Illuminance in Lux (symbol lx) as follows:
    // MeasuredValue = 10,000 x log10 Illuminance + 1
    return Math.round(10 ** ((value - 1) / 10000));
  },
};
