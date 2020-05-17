'use strict';

const util = require('./../../../../util');

const FACTORY_DEFAULT_DIMMING_DURATION_V2 = 'Factory default';
const FACTORY_DEFAULT_DIMMING_DURATION_V4 = 'Default';

module.exports = {
	get: 'SWITCH_MULTILEVEL_GET',
	set: 'SWITCH_MULTILEVEL_SET',
	getOpts: {
		getOnStart: true,
	},
	setParserV1(value) {
		if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', value > 0);
		return {
			Value: Math.round(value * 99),
		};
	},
	setParserV2(value, options) {
		const duration = (options.hasOwnProperty('duration') ? util.calculateZwaveDimDuration(options.duration) : FACTORY_DEFAULT_DIMMING_DURATION_V2);
		if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', value > 0);
		return {
			Value: Math.round(value * 99),
			'Dimming Duration': duration,
		};
	},
	setParserV4(value, options) {
    // Buffer.from() is a fix for difference between V3/V4 dimming duration XML specification
    const duration = (options.hasOwnProperty('duration') ? Buffer.from([util.calculateZwaveDimDuration(options.duration)]) : FACTORY_DEFAULT_DIMMING_DURATION_V4);
    if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', value > 0);
		return {
			Value: Math.round(value * 99),
			'Dimming Duration': duration,
		};
	},
	report: 'SWITCH_MULTILEVEL_REPORT',
	reportParserV1(report) {
		if (report && report.hasOwnProperty('Value (Raw)')) {
			if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', report['Value (Raw)'][0] > 0);
			if (report['Value (Raw)'][0] === 255) return 1;
			return report['Value (Raw)'][0] / 99;
		}
		return null;
	},
	reportParserV4(report) {
		if (report && report.hasOwnProperty('Current Value (Raw)')) {
			if (this.hasCapability('onoff')) this.setCapabilityValue('onoff', report['Current Value (Raw)'][0] > 0);
			if (report['Current Value (Raw)'][0] === 255) return 1;
			return report['Current Value (Raw)'][0] / 99;
		}
		return null;
	},
};
