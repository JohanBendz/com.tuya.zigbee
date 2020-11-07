'use strict';

/**
 * Cluster capability configuration for `measure_temperature`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  get: 'currentTemperature',
  report: 'currentTemperature',
  /**
   * @param {number} value
   * @returns {number}
   */
  reportParser(value) {
    return value;
  },
};
