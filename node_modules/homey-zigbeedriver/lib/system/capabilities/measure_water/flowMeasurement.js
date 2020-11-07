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
    // MeasuredValue represents the flow in m3/h as follows:
    // MeasuredValue = 10 x Flow
    // Measure_water represents the flow in l/min = m3/h / 16,6667
    return Math.round(((value / 10) / 16.6667) * 10) / 10;
  },
};
