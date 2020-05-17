'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class lcdtemphumidsensor extends ZigBeeDevice {

	async onMeshInit() {

		// Developer tools
		// this.enableDebug();
		this.printNode();
			
		// Register capabilities and listeners

		// Temperature
		if (this.hasCapability('measure_temperature')) {
		 this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
		 this.registerAttrReportListener('msTemperatureMeasurement', 'measuredValue', 10, 300, null,
			this.measure_temperature_Report.bind(this))
			.catch(err => {
				this.error('failed to register report listener msTemperatureMeasurement', err);
			});
		}

		// Battery
		if (this.hasCapability('measure_battery')) {
		 this.registerCapability('measure_battery', 'genPowerCfg');
		 this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', 10, 300, null,
			this.measure_battery_Report.bind(this))
			.catch(err => {
			this.error('failed to register report listener genPowerCfg', err);
			});
		}

		// Humidity
		if (this.hasCapability('measure_humidity')) {
			this.registerCapability('measure_humidity', 'msRelativeHumidity');
			await this.registerAttrReportListener('msRelativeHumidity', 'measuredValue', 10, 300, null,
				this.measure_humidity_Report.bind(this))
				.catch(err => {
				this.error('failed to register report listener msRelativeHumidity', err);
				});
			}

		// end Register capabilities and listeners

		this.log('Temperature & Humidity Sensor Driver has been inited');

	}

		// Handle reports
		measure_temperature_Report(value) {
			const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((value / 100) * 100) / 100 : Math.round((value / 100) * 10) / 10;
			const temperatureOffset = this.getSetting('temperature_offset') || 0;
			this.log('msTemperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
			this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset);
		}
		
		measure_battery_Report(value) {
			const parsedValue = (value/2);
			this.log('Battery level, genPowerCfg', value, parsedValue);
			this.setCapabilityValue('measure_battery', parsedValue);
			this.setCapabilityValue('alarm_battery', parsedValue < (this.getSetting('battery_threshold') || 20));
		}

		measure_humidity_Report(value) {
			const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((value / 100) * 100) / 100 : Math.round((value / 100) * 10) / 10;
			this.log('msRelativeHumidity - measuredValue (humidity):', parsedValue);
			this.setCapabilityValue('measure_humidity', parsedValue);
		}
		
		// end Handle reports

}

module.exports = lcdtemphumidsensor;