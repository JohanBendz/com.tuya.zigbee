'use strict';

const { CLUSTER } = require('zigbee-clusters');

const {
  mapValueRange,
  limitValue,
  convertHSVToCIE,
  calculateLevelControlTransitionTime,
  calculateColorControlTransitionTime,
  mapTemperatureToHueSaturation,
  wrapAsyncWithRetry,
  wait,
} = require('./util');

const ZigBeeDevice = require('./ZigBeeDevice');

const MAX_HUE = 254;
const MAX_DIM = 254;
const MAX_SATURATION = 254;
const CIE_MULTIPLIER = 65536;
const CURRENT_LEVEL = 'currentLevel';

/**
 * `light_hue` capability configuration used for {@link registerMultipleCapabilities}.
 * @type {MultipleCapabilitiesConfiguration}
 * @private
 */
const lightHueCapabilityDefinition = {
  capability: 'light_hue',
  cluster: CLUSTER.COLOR_CONTROL,
};

/**
 * `light_saturation` capability configuration used for {@link registerMultipleCapabilities}.
 * @type {MultipleCapabilitiesConfiguration}
 * @private
 */
const lightSaturationCapabilityDefinition = {
  capability: 'light_saturation',
  cluster: CLUSTER.COLOR_CONTROL,
};

/**
 * `light_temperature` capability configuration used for {@link registerMultipleCapabilities}.
 * @type {MultipleCapabilitiesConfiguration}
 * @private
 */
const lightTemperatureCapabilityDefinition = {
  capability: 'light_temperature',
  cluster: CLUSTER.COLOR_CONTROL,
};

/**
 * `light_mode` capability configuration used for {@link registerMultipleCapabilities}.
 * @type {MultipleCapabilitiesConfiguration}
 * @private
 */
const lightModeCapabilityDefinition = {
  capability: 'light_mode',
  cluster: CLUSTER.COLOR_CONTROL,
};

/**
 * The ZigBeeLightDevice class handles all light related capabilities [`onoff`, `dim`,
 * `light_mode`, `light_hue`, `light_saturation` and `light_temperature`] for a Zigbee device
 * that uses the {@link CLUSTER.LEVEL_CONTROL} with the command `moveToLevelWithOnOff` for
 * `onoff` and `dim`, and the {@link CLUSTER.COLOR_CONTROL} with the commands
 * `moveToHueAndSaturation`, `moveToHue`, `moveToColor` and `moveToColorTemperature` for
 * `light_mode`, `light_hue`, `light_saturation` and `light_temperature`.
 * @extends ZigBeeDevice
 *
 * @example
 * const { ZigBeeLightDevice } = require('homey-zigbeedriver');
 *
 * class ZigBeeBulb extends ZigBeeLightDevice {
 *   async onNodeInit({zclNode, node}) {
 *     await super.onNodeInit({zclNode, node});
 *     // Do custom stuff here
 *   }
 * }
 */
class ZigBeeLightDevice extends ZigBeeDevice {

  /**
   * This method will be called when the {@link ZigBeeDevice} instance is ready and did
   * initialize a {@link ZCLNode}.
   *
   * @param {ZCLNode} zclNode
   * @param {boolean} supportsHueAndSaturation - If the device does not have attribute
   * `colorCapabilities` set to `hueAndSaturation` but controlling via hue and saturation is
   * still required, set this flag to true.
   * @param {boolean} supportsColorTemperature - If the device does not have attribute
   * `colorCapabilities` set to `colorTemperature` but controlling color temperature via
   * `moveToColorTemperature` is still required, set this flag to true.
   * @returns {Promise<void>}
   */
  async onNodeInit({ zclNode, supportsHueAndSaturation, supportsColorTemperature }) {
    // TODO: remove when stable
    this.enableDebug();

    // Read attribute values from device on first init if it has color capabilities
    if (!this.getStoreValue('colorClusterConfigured')
      && (this.hasCapability('light_hue')
      || this.hasCapability('light_saturation')
      || this.hasCapability('light_mode')
      || this.hasCapability('light_temperature'))
    ) {
      await wrapAsyncWithRetry(this.readColorControlAttributes.bind(this));
    }

    // Override if needed
    if (typeof supportsColorTemperature === 'boolean') {
      this._supportsColorTemperature = supportsColorTemperature;
    }
    if (typeof supportsHueAndSaturation === 'boolean') {
      this._supportsHueAndSaturationOption = supportsHueAndSaturation;
    }

    // Register `onoff` and `dim` capabilities
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', value => {
        return this.changeOnOff(value);
      });
    }
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', (value, opts) => {
        return this.changeDimLevel(value, opts);
      });
    }

    // Register color related capabilities if device has one of the following
    if (this.hasCapability('light_hue')
      || this.hasCapability('light_saturation')
      || this.hasCapability('light_mode')
      || this.hasCapability('light_temperature')
    ) {
      await this.registerColorCapabilities({ zclNode });
    }

    this.log('ZigBeeLightDevice is initialized', {
      supportsHueAndSaturation: this.supportsHueAndSaturation,
      supportsColorTemperature: this.supportsColorTemperature,
      colorTemperatureRange: this.colorTemperatureRange,
    });
  }

  get supportsHueAndSaturation() {
    if (typeof this._supportsHueAndSaturationOption === 'boolean') {
      return this._supportsHueAndSaturationOption;
    }
    return !!((this.getStoreValue('colorCapabilities') || {}).hueAndSaturation);
  }

  get supportsColorTemperature() {
    if (typeof this._supportsColorTemperature === 'boolean') {
      return this._supportsColorTemperature;
    }
    return !!((this.getStoreValue('colorCapabilities') || {}).colorTemperature);
  }

  get colorTemperatureRange() {
    return {
      min: this.getStoreValue('colorTempMin'),
      max: this.getStoreValue('colorTempMax'),
    };
  }

  get levelControlCluster() {
    const levelControlClusterEndpoint = this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL);
    if (levelControlClusterEndpoint === null) throw new Error('missing_level_control_cluster');
    return this.zclNode.endpoints[levelControlClusterEndpoint].clusters.levelControl;
  }

  get onOffCluster() {
    const onOffClusterEndpoint = this.getClusterEndpoint(CLUSTER.ON_OFF);
    if (onOffClusterEndpoint === null) throw new Error('missing_on_off_cluster');
    return this.zclNode.endpoints[onOffClusterEndpoint].clusters.onOff;
  }

  get colorControlCluster() {
    const colorControlEndpoint = this.getClusterEndpoint(CLUSTER.COLOR_CONTROL);
    if (colorControlEndpoint === null) throw new Error('missing_color_control_cluster');
    return this.zclNode.endpoints[colorControlEndpoint].clusters.colorControl;
  }

  /**
   * Read colorControl cluster attributes needed in order to operate the device properly.
   * @returns {Promise<T>}
   */
  async readColorControlAttributes() {
    this.log('readColorControlAttributes()');
    return this.colorControlCluster.readAttributes(
      'colorCapabilities', 'colorTemperatureMireds', 'colorTempPhysicalMinMireds',
      'colorTempPhysicalMaxMireds', 'currentHue', 'currentSaturation', 'colorMode', 'currentX',
      'currentY',
    )
      .then(async ({
        colorCapabilities, colorTemperatureMireds, colorTempPhysicalMinMireds,
        colorTempPhysicalMaxMireds, currentHue, currentSaturation, colorMode, currentX, currentY,
      }) => {
        // Make sure not undefined
        colorCapabilities = colorCapabilities || {};

        // Store all properties
        await this.setStoreValue('colorCapabilities', {
          hueAndSaturation: colorCapabilities.hueAndSaturation,
          enhancedHue: colorCapabilities.enhancedHue,
          colorLoop: colorCapabilities.colorLoop,
          xy: colorCapabilities.xy,
          colorTemperature: colorCapabilities.colorTemperature,
        });

        await this.setStoreValue('colorTempMin', colorTempPhysicalMinMireds);
        await this.setStoreValue('colorTempMax', colorTempPhysicalMaxMireds);
        await this.setStoreValue('colorClusterConfigured', true);

        this._supportsColorTemperature = colorCapabilities.colorTemperature;
        this._supportsHueAndSaturationOption = colorCapabilities.hueAndSaturation;

        this.log('read configuration attributes', {
          colorCapabilities,
          colorTemperatureMireds,
          colorTempPhysicalMinMireds,
          colorTempPhysicalMaxMireds,
          currentHue,
          currentSaturation,
          colorMode,
          currentX,
          currentY,
        });
      })
      .catch(err => {
        this.error('Error: could not read color control attributes', err);
      });
  }

  /**
   * This method handles registration of the color capabilities `light_hue`, `light_saturation`,
   * `light_mode` and `light_temperature`.
   * @param {ZCLNode} zclNode
   * @returns {Promise<void>}
   */
  async registerColorCapabilities({ zclNode }) {
    // Register debounced capabilities
    const groupedCapabilities = [];
    if (this.hasCapability('light_hue')) {
      groupedCapabilities.push(lightHueCapabilityDefinition);
    }
    if (this.hasCapability('light_saturation')) {
      groupedCapabilities.push(lightSaturationCapabilityDefinition);
    }
    if (this.hasCapability('light_temperature')) {
      groupedCapabilities.push(lightTemperatureCapabilityDefinition);
    }
    if (this.hasCapability('light_mode')) {
      groupedCapabilities.push(lightModeCapabilityDefinition);
    }

    // Register multiple capabilities, they will be debounced when one of them is called
    // eslint-disable-next-line consistent-return
    this.registerMultipleCapabilities(groupedCapabilities, (valueObj, optsObj) => {
      const lightHueChanged = typeof valueObj.light_hue === 'number';
      const lightSaturationChanged = typeof valueObj.light_saturation === 'number';
      const lightTemperatureChanged = typeof valueObj.light_temperature === 'number';
      const lightModeChanged = typeof valueObj.light_mode === 'string';

      this.log('capabilities changed', {
        lightHueChanged, lightSaturationChanged, lightTemperatureChanged, lightModeChanged,
      });

      // If a color capability changed or light mode was changed to color, change the color
      if (lightHueChanged || lightSaturationChanged || (lightModeChanged && valueObj.light_mode === 'color')) {
        return this.changeColor(
          { hue: valueObj.light_hue, saturation: valueObj.light_saturation },
          { ...optsObj.light_saturation, ...optsObj.light_hue },
        ).catch(err => {
          if (err && err.message && err.message.includes('FAILURE')) {
            throw new Error('Make sure the device is turned on before changing its color.');
          }
          throw err;
        });
      }

      // If the light temperature was changed or the light mode was changed to temperature,
      // change the temperature
      if (lightTemperatureChanged || (lightModeChanged && valueObj.light_mode === 'temperature')) {
        return this.changeColorTemperature(
          valueObj.light_temperature,
          { ...optsObj.light_temperature },
        ).catch(err => {
          if (err && err.message && err.message.includes('FAILURE')) {
            throw new Error('Make sure the device is turned on before changing its color temperature.');
          }
          throw err;
        });
      }
    });
  }

  /**
   * Sends a `setOn` or `setOff` command to the device in order to turn it on or off. After
   * successfully changing the on/off value, the `dim` capability value will be updated
   * accordingly. Additionally, if the device is turned on, the current dim level will be
   * requested and updated in the form of the `dim` capability value.
   * @param {boolean} onoff
   * @returns {Promise<any>}
   */
  async changeOnOff(onoff) {
    this.log('changeOnOff() →', onoff);
    return this.onOffCluster[onoff ? 'setOn' : 'setOff']()
      .then(async result => {
        if (onoff === false) {
          this.setCapabilityValue('dim', 0).catch(this.error); // Set dim to zero when turned off
        } else if (onoff) {
          // Wait for a little while, some devices do not directly update their currentLevel
          wait(1000)
            .then(async () => {
              // Get current level attribute to update dim level
              const { currentLevel } = await this.levelControlCluster.readAttributes(CURRENT_LEVEL);
              this.debug('changeOnOff() →', onoff, { currentLevel });
              // Always set dim to 0.01 or higher since bulb is turned on
              await this.setCapabilityValue('dim', Math.max(0.01, currentLevel / MAX_DIM)).catch(this.error);
            })
            .catch(err => {
              this.error('Error: could not update dim capability value after `onoff` change', err);
            });
        }
        return result;
      });
  }

  /**
   * Sends a `moveToLevelWithOnOff` command to the device in order to change the dim value.
   * After successfully changing the dim value, the `onoff` capability value will be updated
   * accordingly.
   * @param {number} dim - Range 0 - 1
   * @param {object} [opts]
   * @property {number} [opts.duration]
   * @returns {Promise<any>}
   */
  async changeDimLevel(dim, opts = {}) {
    this.log('changeDimLevel() →', dim);

    const moveToLevelWithOnOffCommand = {
      level: Math.round(dim * MAX_DIM),
      transitionTime: calculateLevelControlTransitionTime(opts),
    };

    // Execute dim
    this.debug('changeDimLevel() → ', dim, moveToLevelWithOnOffCommand);
    return this.levelControlCluster.moveToLevelWithOnOff(moveToLevelWithOnOffCommand)
      .then(async result => {
        // Update onoff value
        if (dim === 0) {
          this.setCapabilityValue('onoff', false).catch(this.error);
        } else if (this.getCapabilityValue('onoff') === false && dim > 0) {
          this.setCapabilityValue('onoff', true).catch(this.error);
        }
        return result;
      });
  }

  /**
   * Sends a command to the device which changes it's color temperature. If the device supports
   * `colorTemperature` the `moveToColorTemperature` command will be used. If it doesn't the
   * device is not capable to change it's color temperature. In the past a color temperature
   * would be faked with HSV values i.c.w. `moveToColor` command, with varying results. It is
   * recommended to remove/no longer add the `light_temperature` capability for devices that do not
   * support `colorTemperature`. For legacy reasons this still works, but yields sub par
   * results, colors are often skewed.
   * @param {number} temperature - Range 0 - 1
   * @param {object} [opts]
   * @property {number} [opts.duration]
   * @returns {Promise<*>}
   */
  async changeColorTemperature(temperature, opts = {}) {
    this.log('changeColorTemperature() →', temperature);

    // Determine value with fallback to current light_saturation capability value or 1
    if (typeof temperature !== 'number') {
      if (typeof this.getCapabilityValue('light_temperature') === 'number') {
        temperature = this.getCapabilityValue('light_temperature');
      } else {
        temperature = 1;
      }
    }

    // Update light_mode capability if necessary
    if (this.hasCapability('light_mode')
      && this.getCapabilityValue('light_mode') !== 'temperature') {
      await this.setCapabilityValue('light_mode', 'temperature').catch(this.error);
    }

    // Not all devices support moveToColorTemperature
    if (this.supportsColorTemperature) {
      // Map color temperature based on provided min max values
      const { min, max } = this.colorTemperatureRange;
      const colorTemperature = Math.round(
        mapValueRange(0, 1, min, max, temperature),
      );

      // Execute move to color temperature command
      const moveToColorTemperatureCommand = {
        colorTemperature,
        transitionTime: calculateColorControlTransitionTime(opts),
      };
      this.debug(`changeColorTemperature() → ${temperature} →`, moveToColorTemperatureCommand);
      return this.colorControlCluster.moveToColorTemperature(moveToColorTemperatureCommand);
    }

    this.error('Warning: this device does not support \'moveToColorTemperature\', it should'
      + ' not have the \'light_temperature\' capability');

    // Calculate fake temperature range
    const { hue, saturation, value } = mapTemperatureToHueSaturation(temperature);

    // Convert HSV to CIE
    const { x, y } = convertHSVToCIE({
      hue,
      saturation,
      value, // || this.getCapabilityValue('dim'),
    });

    // Execute move to color command
    const moveToColorCommand = {
      colorX: x * CIE_MULTIPLIER,
      colorY: y * CIE_MULTIPLIER,
      transitionTime: calculateColorControlTransitionTime(opts),
    };
    this.debug(`changeColorTemperature() → ${temperature} →`, moveToColorCommand);
    return this.colorControlCluster.moveToColor(moveToColorCommand);
  }

  /**
   * Sends a command to the device which changes it's color. If the device supports
   * `hueAndSaturation` the `moveToHueAndSaturation` command will be used. If it doesn't it will
   * fallback to `moveToColor` which should always be supported.
   * @param {number} hue - Range 0 - 1
   * @param {number} saturation - Range 0 - 1
   * @param {number} value - Range 0 - 1
   * @param {object} [opts]
   * @property {number} [opts.duration]
   * @returns {Promise<any>}
   */
  async changeColor({ hue, saturation, value }, opts = {}) {
    this.log('changeColor() →', { hue, saturation, value });

    // Determine value with fallback to current light_saturation capability value or 1
    if (typeof saturation !== 'number') {
      if (typeof this.getCapabilityValue('light_saturation') === 'number') {
        saturation = this.getCapabilityValue('light_saturation');
      } else {
        saturation = 1;
      }
    }

    // Determine value with fallback to current light_saturation capability value or 1
    if (typeof hue !== 'number') {
      if (typeof this.getCapabilityValue('light_hue') === 'number') {
        hue = this.getCapabilityValue('light_hue');
      } else {
        hue = 1;
      }
    }

    // Update light_mode capability if necessary
    if (this.hasCapability('light_mode'
      && this.getCapabilityValue('light_mode') !== 'color')) {
      await this.setCapabilityValue('light_mode', 'color').catch(this.error);
    }

    // If this device supports hue and saturation commands
    if (this.supportsHueAndSaturation) {
      // Execute move to hue and saturation command
      const moveToHueAndSaturationCommand = {
        hue: Math.round(hue * MAX_HUE),
        saturation: Math.round(saturation * MAX_SATURATION),
        transitionTime: calculateColorControlTransitionTime(opts),
      };
      this.debug('changeColor() → hue and saturation', moveToHueAndSaturationCommand);
      return this.colorControlCluster.moveToHueAndSaturation(moveToHueAndSaturationCommand);
    }

    // Determine value with fallback to current dim capability value or 1, value should never be
    // zero, this would result in colorX=0 and colorY=0 being sent to the device which makes
    // some bulbs flicker when turned on again.
    if (typeof value !== 'number') {
      value = this.getCapabilityValue('dim') || 1;
    }

    // Convert to CIE color space
    const { x, y } = convertHSVToCIE({ hue, saturation, value });

    // Execute move to color command
    const moveToColorCommand = {
      colorX: x * CIE_MULTIPLIER,
      colorY: y * CIE_MULTIPLIER,
      transitionTime: calculateColorControlTransitionTime(opts),
    };
    this.debug('changeColor() → hue', moveToColorCommand);
    return this.colorControlCluster.moveToColor(moveToColorCommand);
  }

  /**
   * When node sends an end device announce retrieve its color values and update the respective
   * capabilities.
   * @returns {Promise<void>}
   */
  async onEndDeviceAnnounce() {
    // Try and get level control cluster
    let levelControlCluster;
    try {
      levelControlCluster = this.levelControlCluster;
      const { currentLevel } = await levelControlCluster.readAttributes('currentLevel');
      this.setCapabilityValue('dim', limitValue(currentLevel / 254, 0, 1)).catch(this.error);
      this.setCapabilityValue('onoff', limitValue(currentLevel > 0, 0, 1)).catch(this.error);
    } catch (err) {
      // Device does not support the level control cluster, skip
    }

    if (!levelControlCluster) {
      let onOffCluster;
      try {
        onOffCluster = this.onOffCluster;
        const { onOff } = await onOffCluster.readAttributes('onOff');
        this.setCapabilityValue('onoff', onOff).catch(this.error);
      } catch (err) {
        // Device does not support the onoff cluster, skip
      }
    }


    // Try and get color control cluster
    let colorControlCluster;
    try {
      colorControlCluster = this.colorControlCluster;
    } catch (err) {
      // Device does not support the color control cluster, skip
      return;
    }

    let colorControlAttributes;
    try {
      colorControlAttributes = await colorControlCluster.readAttributes(
        'currentSaturation', 'currentHue', 'colorMode', 'colorTemperatureMireds',
      );
      this.log('onEndDeviceAnnounce → read color control attributes', colorControlAttributes);
    } catch (err) {
      this.error('onEndDeviceAnnounce → Error: failed to read color control attributes', err);
      return;
    }

    const {
      currentSaturation,
      currentHue,
      colorMode,
      colorTemperatureMireds,
    } = colorControlAttributes;

    // If device supports hue and saturation fetch it and update the capability values
    if (this.supportsHueAndSaturation && typeof currentHue === 'number' && typeof currentSaturation === 'number') {
      await this.setCapabilityValue('light_hue', limitValue(currentHue / MAX_HUE, 0, 1)).catch(this.error);
      await this.setCapabilityValue('light_saturation', limitValue(currentSaturation / MAX_SATURATION, 0, 1)).catch(this.error);
    }

    // Determine the light_mode
    if (this.hasCapability('light_mode')) {
      await this.setCapabilityValue('light_mode', colorMode === 'colorTemperatureMireds' ? 'temperature' : 'color').catch(this.error);
    }

    // If device supports color temperature and current color temperature is provided
    if (this.supportsColorTemperature && typeof colorTemperatureMireds === 'number') {
      await this.setCapabilityValue('light_temperature', mapValueRange(
        this.getStoreValue('colorTempMin'),
        this.getStoreValue('colorTempMax'),
        0,
        1,
        colorTemperatureMireds,
      )).catch(this.error);
    }
  }

}

module.exports = ZigBeeLightDevice;
