'use strict';

const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;
const Utils = require('homey-meshdriver').Util;
const FACTORY_DEFAULT_COLOR_DURATION = 255;
let debounceColorMode;

/**
 * ZwaveLightDevice takes care of all commands used by XY Lighting devices (COMMAND_CLASS_SWITCH_COLOR).
 * Set the capabilitiesOptions "setOnDim" to false for the onoff capability
 *
 * Duration(s) can be given for:
 * - dim (SWITCH_MULTILEVEL >= V2)
 * - light_hue (SWITCH_COLOR >= V2)
 * - light_saturation (SWITCH_COLOR >= V2)
 * - light_temperature (SWITCH_COLOR >= V2)
 *
 * @extends ZwaveDevice
 * @example
 *
 * // app.json
 * {
 * 	"id": YOUR_APP_ID,
 * 	...
 * 	"drivers": [
 * 		{
 *			"id": "YOUR_DRIVER_ID",
 * 			"capabilitiesOptions": {
 * 				"onoff": {
 * 					"setOnDim": false
 * 				},
 * 				"dim": {
 * 					"opts": {
 * 						"duration": true
 * 					}
 * 				},
 * 				"light_hue": {
 * 					"opts": {
 * 						"duration": true
 * 					}
 * 				},
 * 				"light_saturation": {
 * 					"opts": {
 * 						"duration": true
 * 					}
 * 				},
 * 				"light_temperature": {
 * 					"opts": {
 * 						"duration": true
 * 					}
 * 				}
 * 			}
  * 	]
 * }
 *
 * // device.js
 * const ZwaveLightDevice = require('homey-meshdriver').ZwaveLightDevice;
 *
 * class myDevice extends ZwaveLightDevice {
 *
 * 	async onMeshInit() {
 *
 * 		await super.onMeshInit();
 * 		// YOUR CODE COMES HERE
 * 		}
 * 	}
 */

class ZwaveLightDevice extends ZwaveDevice {

	onMeshInit() {

		// Check if all used capabilities are present
		if (!this.hasCapability('onoff')) return this.error('Missing capability: onoff');
		if (!this.hasCapability('dim')) return this.error('Missing capability: dim');
		if (!this.hasCapability('light_mode')) return this.error('Missing capability: light_mode');
		if (!this.hasCapability('light_hue')) return this.error('Missing capability: light_hue');
		if (!this.hasCapability('light_saturation')) return this.error('Missing capability: light_saturation');
		if (!this.hasCapability('light_temperature')) return this.error('Missing capability: light_temperature');

		// Register capabilities
		if (this.hasCommandClass('SWITCH_MULTILEVEL')) {
			this.registerCapability('onoff', 'SWITCH_MULTILEVEL');
			this.registerCapability('dim', 'SWITCH_MULTILEVEL');

			// If Multilevel Switch is not available fall back to basic
		} else if (this.hasCommandClass('BASIC')) {
			this.registerCapability('onoff', 'BASIC');
			this.registerCapability('dim', 'BASIC');

		}

		this.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], async (values, options) => {
			let hue;
			let saturation;

			typeof values.light_hue === 'number' ? hue = values.light_hue : hue = this.getCapabilityValue('light_hue');
			typeof values.light_saturation === 'number' ? saturation = values.light_saturation : saturation = this.getCapabilityValue('light_saturation');
			const value = 1; // brightness value is not determined in SWITCH_COLOR but with SWITCH_MULTILEVEL, changing this throws the dim value vs real life brightness out of sync

			const rgb = Utils.convertHSVToRGB({ hue, saturation, value });

			debounceColorMode = setTimeout(() => {
				debounceColorMode = false;
			}, 200);

			let duration = null;
			if (options.hasOwnProperty('light_hue') && options.light_hue.hasOwnProperty('duration')) {
				duration = options.light_hue.duration;
			}
			if (!duration && options.hasOwnProperty('light_saturation') && options.light_saturation.hasOwnProperty('duration')) {
				duration = options.light_saturation.duration;
			}

			return await this._sendColors({
				warm: 0,
				cold: 0,
				red: rgb.red,
				green: rgb.green,
				blue: rgb.blue,
				duration,
			});
		});

		this.registerCapabilityListener(['light_temperature'], async (value, options) => {
			const warm = Math.floor(value * 255);
			const cold = Math.floor((1 - value) * 255);

			debounceColorMode = setTimeout(() => {
				debounceColorMode = false;
			}, 200);

			let duration = null;
			if (options.hasOwnProperty('duration')) duration = options.duration;

			return await this._sendColors({
				warm,
				cold,
				red: 0,
				green: 0,
				blue: 0,
				duration,
			});
		});

		this.registerCapability('light_mode', 'SWITCH_COLOR', {
			set: 'SWITCH_COLOR_SET',
			setParser: (value, options) => {

				// set light_mode is always triggered with the set color/temperature flow cards, timeout is needed because of homey's async nature surpassing the debounce
				setTimeout(async () => {
					if (debounceColorMode) {
						clearTimeout(debounceColorMode);
						debounceColorMode = false;
						return this.setCapabilityValue('light_mode', value);
					}

					if (value === 'color') {
						const hue = this.getCapabilityValue('light_hue') || 1;
						const saturation = this.getCapabilityValue('light_saturation') || 1;
						const _value = 1; // brightness value is not determined in SWITCH_COLOR but with SWITCH_MULTILEVEL, changing this throws the dim value vs real life brightness out of sync

						const rgb = Utils.convertHSVToRGB({ hue, saturation, _value });

						return await this._sendColors({
							warm: 0,
							cold: 0,
							red: rgb.red,
							green: rgb.green,
							blue: rgb.blue,
							duration: options.duration || null,
						});

					} else if (value === 'temperature') {
						const temperature = this.getCapabilityValue('light_temperature') || 1;
						const warm = temperature * 255;
						const cold = (1 - temperature) * 255;

						return await this._sendColors({
							warm,
							cold,
							red: 0,
							green: 0,
							blue: 0,
							duration: options.duration || null,
						});
					}
				}, 50);
				return null;
			},
		});

		// Getting all color values during boot
		const commandClassColorSwitch = this.getCommandClass('SWITCH_COLOR');
		if (!(commandClassColorSwitch instanceof Error) && typeof commandClassColorSwitch.SWITCH_COLOR_GET === 'function') {

			// Timeout mandatory for stability, often fails getting 1 (or more) value without it
			setTimeout(() => {

				// Wait for all color values to arrive
				Promise.all([this._getColorValue(0), this._getColorValue(1), this._getColorValue(2), this._getColorValue(3), this._getColorValue(4)])
					.then(result => {
						if (result[0] === 0 && result[1] === 0) {
							const hsv = Utils.convertRGBToHSV({
								red: result[2],
								green: result[3],
								blue: result[4],
							});

							this.setCapabilityValue('light_mode', 'color');
							this.setCapabilityValue('light_hue', hsv.hue);
							this.setCapabilityValue('light_saturation', hsv.saturation);
						} else {
							const temperature = Math.round(result[0] / 255 * 100) / 100;
							this.setCapabilityValue('light_mode', 'temperature');
							this.setCapabilityValue('light_temperature', temperature);
						}
					});
			}, 500);
		}
	}

	async _getColorValue(colorComponentID) {
		const commandClassColorSwitch = this.getCommandClass('SWITCH_COLOR');
		if (!(commandClassColorSwitch instanceof Error) && typeof commandClassColorSwitch.SWITCH_COLOR_GET === 'function') {

			try {
				const result = await commandClassColorSwitch.SWITCH_COLOR_GET({ 'Color Component ID': colorComponentID });
				return (result && typeof result.Value === 'number') ? result.Value : 0;
			} catch (err) {
				this.error(err);
				return 0;
			}
		}
		return 0;
	}

	async _sendColors({ warm, cold, red, green, blue, duration }) {
		const SwitchColorVersion = this.getCommandClass('SWITCH_COLOR').version || 1;

		let setCommand = {
			Properties1: {
				'Color Component Count': 5,
			},
			vg1: [
				{
					'Color Component ID': 0,
					Value: Math.round(warm),
				},
				{
					'Color Component ID': 1,
					Value: Math.round(cold),
				},
				{
					'Color Component ID': 2,
					Value: Math.round(red),
				},
				{
					'Color Component ID': 3,
					Value: Math.round(green),
				},
				{
					'Color Component ID': 4,
					Value: Math.round(blue),
				},
			],
		};

		if (SwitchColorVersion > 1) {
			setCommand.duration = typeof duration !== 'number' ? FACTORY_DEFAULT_COLOR_DURATION : Utils.calculateZwaveDimDuration(duration);
		}

		// Fix broken CC_SWITCH_COLOR_V2 parser
		if (SwitchColorVersion === 2) {
			setCommand = new Buffer([setCommand.Properties1['Color Component Count'], 0, setCommand.vg1[0].Value, 1, setCommand.vg1[1].Value, 2, setCommand.vg1[2].Value, 3, setCommand.vg1[3].Value, 4, setCommand.vg1[4].Value, setCommand.duration]);
		}

		return this.node.CommandClass.COMMAND_CLASS_SWITCH_COLOR.SWITCH_COLOR_SET(setCommand);
	}
}

module.exports = ZwaveLightDevice;
