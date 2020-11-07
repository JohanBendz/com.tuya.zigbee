'use strict';

const hsv = require('color-space/hsv');
const xyz = require('color-space/xyz');
const xyy = require('color-space/xyy');
const rgb = require('color-space/rgb');
const tinyGradient = require('tinygradient');

const FAKE_TEMP_BLUE = { r: 217, g: 244, b: 255 };
const FAKE_TEMP_WHITE = { r: 255, g: 255, b: 255 };
const FAKE_TEMP_YELLOW = { r: 255, g: 201, b: 59 };

/**
 * Gradient used to fake color temperature on RGB devices.
 * @type {tinygradient.Instance | *}
 * @private
 */
const FAKE_LIGHT_TEMPERATURE_GRADIENT = tinyGradient([
  FAKE_TEMP_BLUE,
  FAKE_TEMP_WHITE,
  FAKE_TEMP_YELLOW,
]);

/**
 * @typedef {Object} CIExyY
 * @property {number} x - CIE x (small x) value, range 0 - 1 (for Zigbee CurrentX multiply by
 * 65536)
 * @property {number} y - CIE y (small y) value, range 0 - 1 (for Zigbee CurrentY multiply by
 * 65536)
 * @property {number} Y - CIE Y value, range 0 - 100, this represents the luminance which is not
 * used by the Zigbee color control cluster.
 */

/**
 * @typedef {Object} HSV
 * @property {number} hue - Hue value, range 0 - 1.
 * @property {number} saturation - Saturation value, range 0 - 1.
 * @property {number} value - Value (brightness) value, range 0 - 1.
 */

/**
 * Method that converts colors from the HSV (or HSL) color space to the CIE (1931) color space.
 * @param {HSV} - HSV color object
 * @returns {CIExyY} - CIExyY color space object
 * @memberof Util
 */
function convertHSVToCIE({ hue, saturation, value }) {
  if (typeof hue !== 'number') hue = 1;
  if (typeof saturation !== 'number') saturation = 1;
  if (typeof value !== 'number') value = 1;

  const _rgb = hsv.rgb([hue * 360, saturation * 100, value * 100]);
  const _xyz = rgb.xyz(_rgb);
  const [x, y, Y] = xyz.xyy(_xyz);
  return { x, y, Y };
}

/**
 * Method that converts colors from the CIE (xyY) color space to the HSV color space. Note: do
 * not use this for converting xy values from Zigbee devices to HSV, that seems to be inaccurate
 * (see: https://github.com/colorjs/color-space/issues/48).
 * @param {CIExyY} - xyY color object
 * @returns {HSV} - HSV color object
 * @memberof Util
 */
function convertCIEToHSV({ x, y, Y }) {
  const _xyz = xyy.xyz([x, y, typeof Y === 'number' ? Y : 100]);
  const _rgb = xyz.rgb(_xyz);
  const [hue, saturation, value] = rgb.hsv(_rgb);
  return {
    hue: hue / 360,
    saturation: saturation / 100,
    value: value / 100,
  };
}

/**
 * Takes a temperature value (0-1) and returns a HSV object. It tries to mimic the light
 * temperature capabilities some devices have for RGB devices.
 * @param {number} temperature
 * @returns {HSV} - Range 0 - 1
 * @memberof Util
 */
function mapTemperatureToHueSaturation(temperature) {
  // Pick a color from the gradient based on the temperature value
  const { _originalInput } = FAKE_LIGHT_TEMPERATURE_GRADIENT.hsvAt(temperature);
  return {
    hue: _originalInput.h / 360,
    saturation: _originalInput.s,
    value: 1,
  };
}

module.exports = {
  convertHSVToCIE,
  convertCIEToHSV,
  mapTemperatureToHueSaturation,
};
