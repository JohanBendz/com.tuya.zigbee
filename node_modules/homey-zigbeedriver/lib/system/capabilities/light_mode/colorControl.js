'use strict';

const { CLUSTER } = require('zigbee-clusters');

const {
  mapValueRange,
  calculateColorControlTransitionTime,
} = require('../../../util');

const MAX_HUE = 254;
const MAX_SATURATION = 254;

/**
 * Cluster capability configuration for `light_mode`.
 * @type {ClusterCapabilityConfiguration}
 *
 * Note: this system parser requires two store values to be set 'colorTempMin' and
 * 'colorTempMax'. These can be retrieved by reading these respective attributes from the
 * colorControl cluster (`readAttributes('colorTempMin', 'colorTempMax')).
 */
module.exports = {
  /**
   * This `set` command will be overridden in the `setParser` depending on the required
   * `light_mode` to be set.
   */
  set: 'moveToColorTemperature',

  /**
   * @param {'temperature'|'color'} lightMode
   * @param {object} [opts]
   * @returns {Promise<T>}
   */
  setParser(lightMode, opts = {}) {
    const colorControlEndpoint = this.getClusterEndpoint(CLUSTER.COLOR_CONTROL);
    if (colorControlEndpoint === null) throw new Error('missing_color_control_cluster');
    const colorControlCluster = this.zclNode.endpoints[colorControlEndpoint].clusters.colorControl;
    switch (lightMode) {
      case 'temperature': {
        const colorTemperature = Math.round(mapValueRange(
          0,
          1,
          this.getStoreValue('colorTempMin'),
          this.getStoreValue('colorTempMax'),
          this.getCapabilityValue('light_temperature'),
        ));
        const moveToColorTemperatureCommand = {
          colorTemperature,
          transitionTime: calculateColorControlTransitionTime(opts),
        };
        this.debug('set → `light_mode`: \'temperature\' → setParser → moveToColorTemperature', moveToColorTemperatureCommand);

        return colorControlCluster.moveToColorTemperature(moveToColorTemperatureCommand)
          .then(res => {
            this.debug('set → `light_mode`: \'temperature\' → setParser → moveToColorTemperature'
              + ' success', res);
            return null; // Return `null` to prevent the default command from being send
          })
          .catch(err => {
            this.error('Error: could not set → `light_mode`: \'temperature\' → setParser →'
              + ' moveToColorTemperature', err);
            throw err;
          });
      }
      case 'color': {
        const lightHue = this.getCapabilityValue('light_hue');
        const lightSaturation = this.getCapabilityValue('light_saturation');

        const moveToHueAndSaturation = {
          hue: Math.round(lightHue * MAX_HUE),
          saturation: Math.round(lightSaturation * MAX_SATURATION),
          transitionTime: calculateColorControlTransitionTime(opts),
        };

        this.debug('set → `light_mode`: \'color\' → setParser → moveToHueAndSaturation', moveToHueAndSaturation);

        return colorControlCluster.moveToHueAndSaturation(moveToHueAndSaturation)
          .then(res => {
            this.debug('set → `light_mode`: \'color\' → setParser → moveToHueAndSaturation'
              + ' success', res);
            return null; // Return `null` to prevent the default command from being send
          })
          .catch(err => {
            this.error('Error: could not set → `light_mode`: \'color\' → setParser →'
              + ' moveToHueAndSaturation', err);
            throw err;
          });
      }
      default:
        return null;
    }
  },
  get: 'colorMode',
  getOpts: {
    getOnStart: true,
    getOnOnline: true,
  },
  report: 'colorMode',
  /**
   * @param {'currentHueAndCurrentSaturation'|'currentXAndCurrentY'|'colorTemperatureMireds'}
   * colorMode
   * @returns {Promise<string|null>}
   */
  async reportParser(colorMode) {
    switch (colorMode) {
      case 'currentHueAndCurrentSaturation':
      case 'currentXAndCurrentY': {
        this.debug(`\`light_mode\` → reportParser → colorMode: ${colorMode} → parsed: 'color'`);
        return 'color';
      }
      default:
        this.debug(`\`light_mode\` → reportParser → colorMode: ${colorMode} → parsed: 'temperature'`);
        return 'temperature';
    }
  },
};
