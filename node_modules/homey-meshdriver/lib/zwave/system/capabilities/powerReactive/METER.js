'use strict';

/**
 const exampleReport = {
	'Properties1 (Raw)': '<Buffer a1>',
	Properties1: {
		'Scale bit 2': true,
		'Meter Type': 'Electric meter',
		'Rate Type': 'Import',
		'Meter Type (Parsed)': { value: 'Electric meter' },
		'Rate Type (Parsed)': { value: 'Import' },
	},
	'Properties2 (Raw)': '<Buffer 3c>',
	Properties2: {
		Size: 4,
		'Scale bits 10': 3,
		Precision: 1,
	},
	'Meter Value': '<Buffer 00 00 00 01>',
	'Delta Time (Raw)': '<Buffer 00 00>',
	'Delta Time': 0,
	'Previous Meter Value': '<Buffer 00 00 00 00>',
	'Scale 2 (Raw)': '<Buffer 00>',
	'Scale 2': 0,
	'Meter Value (Parsed)': 0.1,
	'Previous Meter Value (Parsed)': 0,
 };
 */

module.exports = {
	get: 'METER_GET',
	getOpts: {
		getOnStart: true,
	},
	getParserV3: () => ({
		Properties1: {
			Scale: 7,
		},
	}),
	getParserV4: () => ({
		Properties1: {
			'Rate Type': 'Import',
			Scale: 7,
		},
		'Scale 2': 0,
	}),
	report: 'METER_REPORT',
	reportParserV3: report => {
		if (report &&
			report.hasOwnProperty('Properties1') &&
			report.Properties1.hasOwnProperty('Meter Type') &&
			(report.Properties1['Meter Type'] === 'Electric meter' || report.Properties1['Meter Type'] === 1) &&
			report.Properties1.hasOwnProperty('Scale bit 2') &&
			report.Properties1['Scale bit 2'] === true &&
			report.hasOwnProperty('Properties2') &&
			report.Properties2.hasOwnProperty('Scale bits 10') &&
			report.Properties2['Scale bits 10'] === 3) {
			return report['Meter Value (Parsed)'];
		}
		return null;
	},
	reportParserV4: report => {
		if (report &&
			report.hasOwnProperty('Properties1') &&
			report.Properties1.hasOwnProperty('Meter Type') &&
			(report.Properties1['Meter Type'] === 'Electric meter' || report.Properties1['Meter Type'] === 1) &&
			report.Properties1.hasOwnProperty('Scale bit 2') &&
			report.Properties1['Scale bit 2'] === true &&
			report.hasOwnProperty('Properties2') &&
			report.Properties2.hasOwnProperty('Scale bits 10') &&
			report.Properties2['Scale bits 10'] === 3 &&
			(report.hasOwnProperty('Scale 2') === false || report['Scale 2'] === 0)
		) {
			return report['Meter Value (Parsed)'];
		}
		return null;
	},
};
