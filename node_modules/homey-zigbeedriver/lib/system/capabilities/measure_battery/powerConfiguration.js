'use strict';

/**
 * Cluster capability configuration for `measure_battery`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  get: 'batteryPercentageRemaining',
  report: 'batteryPercentageRemaining',
  /**
   * @param {number} value
   * @returns {null|number}
   */
  reportParser(value) {
    // Max value 200, 255 indicates invalid or unknown reading
    if (value <= 200 && value !== 255) {
      return Math.round(value / 2);
    }
    return null;
  },
};
