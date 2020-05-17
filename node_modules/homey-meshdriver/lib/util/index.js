'use strict';

const color = require('./color');

/**
 * Map a range of values to a different range of values.
 * @param inputStart
 * @param inputEnd
 * @param outputStart
 * @param outputEnd
 * @param input
 * @returns {number}
 * @memberof Util
 */
function mapValueRange(inputStart, inputEnd, outputStart, outputEnd, input) {
	if (typeof inputStart !== 'number' || typeof inputEnd !== 'number' ||
		typeof outputStart !== 'number' || typeof outputEnd !== 'number' ||
		typeof input !== 'number') {
		return null;
	}
  return outputStart + ((outputEnd - outputStart) / (inputEnd - inputStart)) * (Math.min(Math.max(inputStart, input), inputEnd) - inputStart);
}

/**
 * Calculate a duration value for SWITCH_MULTILEVEL and SWITCH_BINARY from an input value in milliseconds. Below 127
 * the value is in seconds, above the value is in minutes. Hence, above 127 some rounding might occur. If a value larger
 * than 7560 is entered it will be maxed at 254 (longest duration possible).
 * @param {number} duration - Dim duration in milliseconds (0 - 7560000ms)
 * @returns {number} Range 0 - 254 (short to long)
 * 1-127 = 1 second – 127 seconds
 * 128 – 253 = 1 minute – 126 minutes
 * 254 max
 */
function calculateZwaveDimDuration(duration, opts = {}) {
	const seconds = duration / 1000;
	const maxValue = Object.prototype.hasOwnProperty.call(opts, 'maxValue') ? opts.maxValue : 254;
	if (seconds <= 127) return seconds;
	else if (seconds > 127 && seconds < 7560) {
		return Math.min(Math.round(128 + (seconds / 60)), maxValue);
	}

	return maxValue;
}

/**
 * Calculate a transtime value for ZigBee clusters, it takes two parameters, opts and settings. Opts is the opts object
 * provided by a capbilityListener which can hold a duration property (in miliseconds), settings is an object which can
 * hold a 'transition_time' property (in seconds). If none are available, the default is 0. The valid value range is
 * 0 - 6553.
 * @param opts {object}
 * @param opts.duration {number} - Duration property in miliseconds (preferred over 'transition_time')
 * @param settings {object}
 * @param settings.transition_time {number} - Transition time property in seconds
 * @returns {number}
 */
function calculateZigBeeDimDuration(opts = {}, settings = {}) {
	let transtime = 0;
	if (opts.hasOwnProperty('duration')) {
		transtime = opts.duration / 100;
	} else if (typeof settings.transition_time === 'number') {
		transtime = Math.round(settings.transition_time * 10);
	}
	// Cap the range between 0 and 6553
	return Math.max(Math.min(transtime, 6553), 0);
}


/**
 * Utility class with several color and range conversion methods.
 * @class Util
 */
module.exports = {
	convertRGBToCIE: color.convertRGBToCIE,
	convertHSVToCIE: color.convertHSVToCIE,
	convertHSVToRGB: color.convertHSVToRGB,
	convertRGBToHSV: color.convertRGBToHSV,
	mapValueRange,
	calculateZwaveDimDuration,
	calculateZigBeeDimDuration,
};
