'use strict';

const util = require('./../../../../util');

const maxDim = 254;

module.exports = {
	set: 'moveToLevelWithOnOff',
	setParser(value, opts = {}) {
		if (value === 0) {
			this.setCapabilityValue('onoff', false);
		} else if (this.getCapabilityValue('onoff') === false && value > 0) {
			this.setCapabilityValue('onoff', true);
		}

		return {
			level: Math.round(value * maxDim),
			transtime: util.calculateZigBeeDimDuration(opts, this.getSettings()),
		};
	},
	get: 'currentLevel',
	reportParser(value) {
		return value / maxDim;
	},
	report: 'currentLevel',
	getOpts: {
		getOnStart: true,
	},
};
