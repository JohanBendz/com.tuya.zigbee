'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class lcdtemphumidsensor extends ZigBeeDevice {
	
	async onNodeInit({zclNode}) {

		let manufacturerName = zclNode.endpoints[1].clusters.basic?.attributes?.manufacturerName;
		if (!manufacturerName) {
			try {
				({ manufacturerName } = await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName']));
			} catch (err) {
				this.error('Failed to read manufacturerName; using standard humidity scaling', err);
			}
		}

		this.humidityDivisor = manufacturerName === '_TZ3000_ywagc4rj' ? 10 : 100;
		this.log('LCD temp/humidity manufacturer:', manufacturerName, 'humidity divisor:', this.humidityDivisor);


/* 		if (this.isFirstInit()){
			await this.configureAttributeReporting([
				{
					endpointId: 1,
					cluster: CLUSTER.POWER_CONFIGURATION,
					attributeName: 'batteryPercentageRemaining',
                    minInterval: 60, // Minimum interval (1 minute)
                    maxInterval: 21600, // Maximum interval (6 hours)
                    minChange: 1, // Report changes greater than 1%
				}
			]);
		} */

		// measure_temperature
		zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
		.on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));
  
		// measure_humidity
		zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
		.on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));

		// measure_battery // alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
		.on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

	}

	onTemperatureMeasuredAttributeReport(measuredValue) {
		const temperatureOffset = this.getSetting('temperature_offset') || 0;
		const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
		this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
		this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
	}

	onRelativeHumidityMeasuredAttributeReport(measuredValue) {
		const humidityOffset = this.getSetting('humidity_offset') || 0;
		const humidity = measuredValue / (this.humidityDivisor || 100);
		const parsedValue = this.getSetting('humidity_decimals') === '2'
			? Math.round(humidity * 100) / 100
			: Math.round(humidity * 10) / 10;
		this.log('measure_humidity | relativeHumidity - measuredValue (humidity):', parsedValue, '+ humidity offset', humidityOffset);
		this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this.error);
	}

	onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;
		this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
		this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2).catch(this.error);
		this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false).catch(this.error);
	}

	onDeleted(){
	this.log("temphumidsensor removed")
	}

}

module.exports = lcdtemphumidsensor;