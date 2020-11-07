'use strict';

/**
 * Cluster capability configuration for `measure_power`.
 * @type {ClusterCapabilityConfiguration}
 * Add below code to your device driver to read the attributes and define the correct formatting
 * if (typeof this.meteringFactor !== 'number') {
 *  const { multiplier, divisor } = await zclNode.endpoints[
 *      this.getClusterEndpoint(CLUSTER.METERING)
 *    ]
 *    .clusters[CLUSTER.METERING.NAME]
 *    .readAttributes('multiplier', 'divisor');
 *
 *  this.meteringFactor = multiplier / divisor;
 * }
 */
module.exports = {
  get: 'currentSummationDelivered',
  getOpts: {
    getOnStart: true,
  },
  report: 'currentSummationDelivered',
  /**
   * @param {number} value
   * @returns {null|number}
   */
  reportParser(value) {
    const meteringFactor = this.meteringFactor || 1;
    if (value < 0) return null;
    return value * meteringFactor;
  },
};
