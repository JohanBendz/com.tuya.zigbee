'use strict';

/**
 * Cluster capability configuration for `onoff`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  get: 'onOff',
  getOpts: {
    getOnStart: true,
  },
  set: value => (value ? 'setOn' : 'setOff'),
  /**
   * Return empty object, the command specifies the action for this cluster ('setOn'/setOff').
   * @returns {{}}
   */
  setParser: () => ({}),
  report: 'onOff',
  /**
   * @param {boolean} value
   * @returns {boolean}
   */
  reportParser(value) {
    return value;
  },
};
