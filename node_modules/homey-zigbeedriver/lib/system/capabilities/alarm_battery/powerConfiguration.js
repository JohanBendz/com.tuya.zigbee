'use strict';

/**
 * Cluster capability configuration for `alarm_battery`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  get: 'batteryPercentageRemaining',
  report: 'batteryPercentageRemaining',
  /**
   * @param {number} value
   * @returns {null|boolean}
   */
  reportParser(value) {
    // Max value 200, 255 indicates invalid or unknown reading
    if (value <= 200 && value !== 255) {
      // Check if setting `batteryThreshold` exists otherwise use Homey.Device#batteryThreshold if
      // it exists use that, if both don't exist fallback to default value 1.
      const batteryThreshold = this.getSetting('batteryThreshold') || this.batteryThreshold || 1;
      return Math.round(value / 2) <= batteryThreshold;
    }
    return null;
  },
};
