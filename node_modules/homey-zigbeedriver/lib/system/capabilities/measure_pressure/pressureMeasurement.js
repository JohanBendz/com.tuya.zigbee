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
    if (value === 0x8000) {
      return null;
    }

    // MeasuredValue represents the pressure in kPa as follows:
    // MeasuredValue = 10 x Pressure
    // However, as 1 kPa == 10 mbar, it only needs to be rounded
    return value;
  },
};
