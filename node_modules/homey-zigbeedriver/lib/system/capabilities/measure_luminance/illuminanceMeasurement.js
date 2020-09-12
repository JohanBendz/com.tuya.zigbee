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
    return Math.round(10 ** ((value - 1) / 10000));
  },
};
