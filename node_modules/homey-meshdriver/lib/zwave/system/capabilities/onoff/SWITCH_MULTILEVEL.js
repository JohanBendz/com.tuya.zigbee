'use strict';

const util = require('./../../../../util');

const FACTORY_DEFAULT_DIMMING_DURATION = 'Factory default';
const FACTORY_DEFAULT_DIMMING_DURATION_V4 = 'Default';

module.exports = {
	get: 'SWITCH_MULTILEVEL_GET',
	set: 'SWITCH_MULTILEVEL_SET',
	setParser: value => ({
		Value: (value) ? 'on/enable' : 'off/disable',
	}),
	setParserV2(value, options) {
		const duration = (options.hasOwnProperty('duration') ? util.calculateZwaveDimDuration(options.duration) : FACTORY_DEFAULT_DIMMING_DURATION);
		return {
			Value: (value) ? 'on/enable' : 'off/disable',
			'Dimming Duration': duration,
		};
	},
	setParserV4(value, options) {
    // Buffer.from() is a fix for difference between V3/V4 dimming duration XML specification
    const duration = (options.hasOwnProperty('duration') ? Buffer.from([util.calculateZwaveDimDuration(options.duration)]) : FACTORY_DEFAULT_DIMMING_DURATION_V4);
		return {
			Value: (value) ? 'on/enable' : 'off/disable',
			'Dimming Duration': duration,
		};
	},
	report: 'SWITCH_MULTILEVEL_REPORT',
	reportParserV1: report => {
		if (report) {
			if (report.hasOwnProperty('Value')) {
				if (typeof report.Value === 'number') return report.Value > 0;
				if (typeof report.Value === 'string') return report.Value === 'on/enable';
			}
			if (report.hasOwnProperty('Value (Raw)')) return report['Value (Raw)'][0] > 0;
		}
		return null;
	},
	reportParserV4: report => {
	  if (report) {
      if (report.hasOwnProperty('Current Value')) {
        if (typeof report['Current Value'] === 'number') return report['Current Value'] > 0;
        if (typeof report['Current Value'] === 'string') return report['Current Value'] === 'on/enable';
      }
      if (report.hasOwnProperty('Current Value (Raw)')) return report['Current Value (Raw)'][0] > 0;
    }
		return null;
	},
};
