'use strict';

/**
 * Cluster capability configuration for `windowcoverings_set`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  getOpts: {
    getOnStart: true,
  },
  get: 'currentPositionTiltPercentage',
  set: 'goToTiltPercentage',
  setParser(value) {
    return {
      percentageTiltValue: value * 100,
    };
  },
  report: 'currentPositionTiltPercentage',
  reportParser(value) {
    return value / 100;
  },
};
