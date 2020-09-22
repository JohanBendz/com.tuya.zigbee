'use strict';

/**
 const exampleReport = {
	'Properties1 (Raw)': '<Buffer 21>',
	Properties1:
		{
			'Scale bit 2': false,
			'Meter Type': 'Electric meter',
			'Rate Type': 'Import',
			'Meter Type (Parsed)': { value: 'Electric meter' },
			'Rate Type (Parsed)': { value: 'Import' },
		},
	'Properties2 (Raw)': '<Buffer 34>',
	Properties2: {
		Size: 4,
		'Scale bits 10': 2,
		Precision: 1,
	},
	'Meter Value': '<Buffer 00 00 01 6a>',
	'Delta Time (Raw)': '<Buffer 00 00>',
	'Delta Time': 0,
	'Previous Meter Value': '<Buffer 00 00 00>',
	'Scale 2 (Raw)': '<Buffer 00>',
	'Scale 2': 0,
	'Meter Value (Parsed)': 36.2,
 };
 */

module.exports = {
	get: 'METER_GET',
	getOpts: {
		getOnStart: true,
	},
	getParserV2: () => ({
		Properties1: {
			Scale: 2,
		},
	}),
	getParserV4: () => ({
		Properties1: {
			'Rate Type': 'Import',
			Scale: 2,
		},
		'Scale 2': 0,
	}),
	report: 'METER_REPORT',
	reportParserV1: report => {
		if (report &&
			report.hasOwnProperty('Meter Type') &&
			(report['Meter Type'] === 'Electric meter' || report['Meter Type'] === 1) &&
			report.hasOwnProperty('Properties1') &&
			report.Properties1.hasOwnProperty('Scale') &&
			report.Properties1.Scale === 2) {
			return report['Meter Value (Parsed)'];
		}
		return null;
	},
	reportParserV2: report => {
		if (report &&
			report.hasOwnProperty('Properties1') &&
			report.Properties1.hasOwnProperty('Meter Type') &&
			(report.Properties1['Meter Type'] === 'Electric meter' || report.Properties1['Meter Type'] === 1) &&
			report.hasOwnProperty('Properties2') &&
			report.Properties2.hasOwnProperty('Scale') &&
			report.Properties2.Scale === 2) {
			return report['Meter Value (Parsed)'];
		}
		return null;
	},
	reportParserV3: report => {
		if (report &&
			report.hasOwnProperty('Properties1') &&
			report.Properties1.hasOwnProperty('Meter Type') &&
			(report.Properties1['Meter Type'] === 'Electric meter' || report.Properties1['Meter Type'] === 1) &&
			report.Properties1.hasOwnProperty('Scale bit 2') &&
			report.Properties1['Scale bit 2'] === false &&
			report.hasOwnProperty('Properties2') &&
			report.Properties2.hasOwnProperty('Scale bits 10') &&
			report.Properties2['Scale bits 10'] === 2) {
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
			report.Properties1['Scale bit 2'] === false &&
			report.hasOwnProperty('Properties2') &&
			report.Properties2.hasOwnProperty('Scale bits 10') &&
			report.Properties2['Scale bits 10'] === 2 &&
			(report.hasOwnProperty('Scale 2') === false || report['Scale 2'] === 0)
		) {
			return report['Meter Value (Parsed)'];
		}
		return null;
	},
};
