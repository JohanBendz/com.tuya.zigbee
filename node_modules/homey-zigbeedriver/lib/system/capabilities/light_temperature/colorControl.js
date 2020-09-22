'use strict';

const {
  mapValueRange,
  calculateColorControlTransitionTime,
} = require('../../../util');

/**
 * Cluster capability configuration for `light_temperature`.
 * @type {ClusterCapabilityConfiguration}
 *
 * Note: this system parser requires two store values to be set 'colorTempMin' and
 * 'colorTempMax'. These can be retrieved by reading these respective attributes from the
 * colorControl cluster (`readAttributes('colorTempMin', 'colorTempMax')).
 */
module.exports = {
  set: 'moveToColorTemperature',
  /**
   * @param {number} value
   * @param {object} [opts]
   * @returns {{transitionTime: (number|number), colorTemperature: number}}
   */
  setParser(value, opts = {}) {
    const colorTemperature = Math.round(mapValueRange(
      0,
      1,
      this.getStoreValue('colorTempMin'),
      this.getStoreValue('colorTempMax'),
      value,
    ));
    return {
      colorTemperature,
      transitionTime: calculateColorControlTransitionTime(opts),
    };
  },
  get: 'colorTemperatureMireds',
  getOpts: {
    getOnStart: true,
    getOnOnline: true,
  },
  report: 'colorTemperatureMireds',
  /**
   * @param {number} value
   * @returns {number}
   */
  reportParser(value) {
    return mapValueRange(this.getStoreValue('colorTempMin'), this.getStoreValue('colorTempMax'), 0, 1, value);
  },
};
