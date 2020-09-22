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
    // MeasuredValue represents the pressure in kPa as follows:
    // MeasuredValue = 10 x Pressure
    return Math.round((value / 10) * 10) / 10;
  },
};
