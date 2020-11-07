'use strict';

/**
 * Cluster capability configuration for `measure_power`.
 * @type {ClusterCapabilityConfiguration}
 * Add below code to your device driver to read the attributes and define the correct formatting
 * if (typeof this.acCurrentFactor !== 'number') {
 *  const { acCurrentMultiplier, acCurrentDivisor } = await zclNode.endpoints[
 *      this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT)
 *    ]
 *    .clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME]
 *    .readAttributes('acCurrentMultiplier', 'acCurrentDivisor');
 *
 *  this.acCurrentFactor = acCurrentMultiplier/ acCurrentDivisor;
 *  }
 */
module.exports = {
  get: 'rmsCurrent',
  getOpts: {
    getOnStart: true,
  },
  report: 'rmsCurrent',
  /**
   * @param {number} value
   * @returns {null|number}
   */
  reportParser(value) {
    const acCurrentFactor = this.acCurrentFactor || 1;
    if (value < 0) return null;
    return value * acCurrentFactor;
  },
};
