'use strict';

const {
  convertHSVToCIE,
  calculateColorControlTransitionTime,
} = require('../../../util');

const CIE_MULTIPLIER = 65536;

/**
 * Cluster capability configuration for `light_saturation`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  set: 'moveToColor',
  /**
   * @param {number} saturation
   * @param {object} [opts]
   * @returns {{transitionTime: number, colorY: number, colorX: number}}
   */
  setParser(saturation, opts = {}) {
    // Convert to CIE color space
    const hue = typeof this.getCapabilityValue('light_hue') === 'number'
      ? this.getCapabilityValue('light_hue')
      : 1;

    // Convert HSV to xyY
    const { x, y } = convertHSVToCIE({ hue, saturation, value: 1 });

    // Execute move to color command
    return {
      colorX: x * CIE_MULTIPLIER,
      colorY: y * CIE_MULTIPLIER,
      transitionTime: calculateColorControlTransitionTime(opts),
    };
  },
};
