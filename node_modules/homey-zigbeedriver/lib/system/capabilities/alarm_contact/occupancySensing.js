'use strict';

/**
 * Cluster capability configuration for `alarm_motion`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  get: 'occupancy',
  report: 'occupancy',
  /**
   * @param {number} value
   * @returns {boolean}
   */
  reportParser(value) {
    return value === 1;
  },
};
