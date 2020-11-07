'use strict';

const util = require('../../../util');

const MAX_DIM = 254;

/**
 * Cluster capability configuration for `dim`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  set: 'moveToLevelWithOnOff',
  /**
   * @param {number} value
   * @param {object} opts
   * @returns {{transitionTime: number, level: number}}
   */
  setParser(value, opts = {}) {
    if (value === 0) {
      this.setCapabilityValue('onoff', false);
    } else if (this.getCapabilityValue('onoff') === false && value > 0) {
      this.setCapabilityValue('onoff', true);
    }

    return {
      level: Math.round(value * MAX_DIM),
      transitionTime: util.calculateLevelControlTransitionTime(opts),
    };
  },
  get: 'currentLevel',
  getOpts: {
    getOnStart: true,
  },
  report: 'currentLevel',
  /**
   * @param {number} value
   * @returns {number}
   */
  reportParser(value) {
    return value / MAX_DIM;
  },
};
