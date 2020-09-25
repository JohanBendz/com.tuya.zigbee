'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class lcdtemphumidsensor extends ZigBeeDevice {
	
	async onNodeInit({zclNode}) {

		const minReportTemp = this.getSetting('minReportTemp') || 60;
		const maxReportTemp = this.getSetting('maxReportTemp') || 300;
		const minReportHum = this.getSetting('minReportHum') || 60;
		const maxReportHum = this.getSetting('maxReportHum') || 300;
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;

		if (this.isFirstInit()){

			// measure_temperature
			await this.configureAttributeReporting([
				{
				endpointId: 1,
				cluster: CLUSTER.TEMPERATURE_MEASUREMENT,
				attributeName: 'measuredValue',
				minInterval: minReportTemp,
				maxInterval: maxReportTemp,
				minChange: 1,
				}
			])
			.catch(err => this.error('Error: configureAttributeReporting failed', err));

			// measure_humidity
			await this.configureAttributeReporting([
				{
				endpointId: 1,
				cluster: CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT,
				attributeName: 'measuredValue',
				minInterval: minReportHum,
				maxInterval: maxReportHum,
				minChange: 1,
				},
			])
			.catch(err => this.error('Error: configureAttributeReporting failed', err));

			// measure_battery
			await this.configureAttributeReporting([
				{
				endpointId: 1,
				cluster: CLUSTER.POWER_CONFIGURATION,
				attributeName: 'batteryPercentageRemaining',
				minInterval: 60,
				maxInterval: 3600,
				minChange: 1,
				}
			])
			.catch(err => this.error('Error: configureAttributeReporting failed', err));
			
		}

		// measure_temperature
		zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
		.on('attr.measuredValue', (currentTempValue) => {
			this.log('Current temp: ', currentTempValue);
			const temperature = this.getSetting('temperature_decimals') === '2' ? Math.round((currentTempValue / 100) * 100) / 100 : Math.round((currentTempValue / 100) * 10) / 10;
			const temperatureOffset = this.getSetting('temperature_offset') || 0;
			this.log('Temperature: ', temperature, ', Offset: ', temperatureOffset);
			this.setCapabilityValue('measure_temperature', temperature + temperatureOffset);
		});

		// measure_humidity
		zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
		.on('attr.measuredValue', (currentHumValue) => {
			const humidity = this.getSetting('humidity_decimals') === '2' ? Math.round((currentHumValue / 100) * 100) / 100 : Math.round((currentHumValue / 100) * 10) / 10;
			this.log('Humidity: ', humidity);
			this.setCapabilityValue('measure_humidity', humidity);
		});

		// measure_battery / alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
		.on('attr.batteryPercentageRemaining', (batteryPercentage) => {
			this.log('Battery Percentage Remaining: ', batteryPercentage/2);
			this.setCapabilityValue('measure_battery', batteryPercentage/2);
			this.setCapabilityValue('alarm_battery', (batteryPercentage/2 < batteryThreshold) ? true : false)
		});

	}

	onDeleted(){
		this.log("lcdtemphumidsensor removed")
	}

}

module.exports = lcdtemphumidsensor;