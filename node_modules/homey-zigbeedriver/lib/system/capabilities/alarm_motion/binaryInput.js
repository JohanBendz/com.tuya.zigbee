'use strict';

/**
 * Cluster capability configuration for `alarm_motion`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  get: 'presentValue',
  report: 'presentValue',
  /**
   * @param {number} value
   * @returns {boolean}
   */
  reportParser(value) {
    return value;
  },
};
