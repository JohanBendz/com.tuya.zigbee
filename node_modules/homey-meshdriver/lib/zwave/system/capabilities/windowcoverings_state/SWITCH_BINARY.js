'use strict';

const util = require('./../../../../util');

const FACTORY_DEFAULT_DIMMING_DURATION = 'Default';

/**
 * Capability windowcoverings_state handler for SWITCH_BINARY command class. If the device has the
 * 'invertWindowCoveringsDirection' setting (see zwave/system/settings.json), this will be used to invert the direction.
 */
module.exports = {
	get: 'SWITCH_BINARY_GET',
	set: 'SWITCH_BINARY_SET',
	setParserV1(value) {
		return {
			'Switch Value': determineAndSaveState.call(this, value),
		};
	},
	setParserV2: (value, options) => {
		const duration = (options.hasOwnProperty('duration') ? util.calculateZwaveDimDuration(options.duration) : FACTORY_DEFAULT_DIMMING_DURATION);
		return {
			'Switch Value': determineAndSaveState.call(this, value),
			Duration: duration,
		};
	},
	report: 'SWITCH_BINARY_REPORT',
	reportParser(report) {
		const invertDirection = !!this.getSetting('invertWindowCoveringsDirection');

		// Save latest known position state
		this.windowCoveringsPosition = report.Value;

		switch (this.windowCoveringsPosition) {
			case 'on/enable':
				if (invertDirection) return 'down';
				return 'up';
			case 'off/disable':
				if (invertDirection) return 'up';
				return 'down';
			default:
				return 'idle';
		}
	},
};

/**
 * Based on the windowcoverings_state value this method calculates and stores the corresponding SWITCH_BINARY value,
 * taking into account the possible invertWindowCoveringsDirection setting.
 * @param {string} value - windowcoverings_state value ('down'/'up' or 'idle')
 */
function determineAndSaveState(value) {
	const invertDirection = !!this.getSetting('invertWindowCoveringsDirection');

	let result = 'off/disable';
	switch (value) {
		case 'idle':
			if (this.windowCoveringsPosition === 'on/enable') result = 'off/disable';
			else if (this.windowCoveringsPosition === 'off/disable') result = 'on/enable';
			break;
		case 'up':
			result = (invertDirection) ? 'off/disable' : 'on/enable';
			break;
		case 'down':
			result = (invertDirection) ? 'on/enable' : 'off/disable';
			break;
	}

	// Save latest known position state and return it
	this.windowCoveringsPosition = result;
	return result;
}
