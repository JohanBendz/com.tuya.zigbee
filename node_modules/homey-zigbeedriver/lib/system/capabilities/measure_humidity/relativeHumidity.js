'use strict';

/**
 * Cluster capability configuration for `measure_temperature`.
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
    // MeasuredValue represents the relative humidity in % as follows:
    // MeasuredValue = 100 x Relative humidity
    return Math.round((value / 100) * 10) / 10;
  },
};
