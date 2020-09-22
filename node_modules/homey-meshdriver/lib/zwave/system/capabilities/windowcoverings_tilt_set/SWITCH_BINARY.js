'use strict';

const util = require('./../../../../util');

const FACTORY_DEFAULT_DIMMING_DURATION = 'Default';

/**
 * Capability windowcoverings_tilt_set handler for SWITCH_BINARY command class. If the device has the
 * 'invertWindowCoveringsDirection' setting (see zwave/system/settings.json), this will be used to invert the direction.
 */
module.exports = {
	get: 'SWITCH_BINARY_GET',
	set: 'SWITCH_BINARY_SET',
	setParserV1(value) {
		const invertDirection = !!this.getSetting('invertWindowCoveringsDirection');
		return {
			'Switch Value': (invertDirection) ? util.mapValueRange(0, 1, 0, 255, 1 - value) : util.mapValueRange(0, 1, 0, 255, value),
		};
	},
	setParserV2: (value, options) => {
		const duration = (options.hasOwnProperty('duration') ? util.calculateZwaveDimDuration(options.duration) : FACTORY_DEFAULT_DIMMING_DURATION);
		const invertDirection = !!this.getSetting('invertWindowCoveringsDirection');
		return {
			'Switch Value': (invertDirection) ? util.mapValueRange(0, 1, 0, 255, 1 - value) : util.mapValueRange(0, 1, 0, 255, value),
			Duration: duration,
		};
	},
	report: 'SWITCH_BINARY_REPORT',
	reportParser(report) {
		const invertDirection = !!this.getSetting('invertWindowCoveringsDirection');
		return (invertDirection) ? 1 - util.mapValueRange(0, 255, 0, 1, report.Value) : util.mapValueRange(0, 255, 0, 1, report.Value);
	},
};
