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
    // MeasuredValue represents the temperature in degrees Celsius as follows:
    // MeasuredValue = 100 x temperature in degrees Celsius.
    return Math.round((value / 100) * 10) / 10;
  },
};
