'use strict';

/**
 * Cluster capability configuration for `measure_power`.
 * @type {ClusterCapabilityConfiguration}
 * Add below code to your device driver to read the attributes and define the correct formatting
 * if (typeof this.activePowerFactor !== 'number') {
 *  const { acVoltageMultiplier, acVoltageDivisor } = await zclNode.endpoints[
 *      this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT)
 *    ]
 *    .clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME]
 *    .readAttributes('acVoltageMultiplier', 'acVoltageDivisor');
 *
 *  this.acVoltageFactor = acVoltageMultiplier / acVoltageDivisor;
 *  }
 */
module.exports = {
  get: 'rmsVoltage',
  getOpts: {
    getOnStart: true,
  },
  report: 'rmsVoltage',
  /**
   * @param {number} value
   * @returns {null|number}
   */
  reportParser(value) {
    const acVoltageFactor = this.acVoltageFactor || 1;
    if (value < 0) return null;
    return value * acVoltageFactor;
  },
};
