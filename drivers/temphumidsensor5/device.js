'use strict';

const { Cluster, debug } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataTypes = {
	raw: 0, // [ bytes ]
	bool: 1, // [0/1]
	value: 2, // [ 4 byte value ]
	string: 3, // [ N byte string ]
	enum: 4, // [ 0-255 ]
	bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
	let value = 0;

	for (let i = 0; i < chunks.length; i++) {
		value = value << 8;
		value += chunks[i];
	}

	return value;
};

const getDataValue = (dpValue) => {
	switch (dpValue.datatype) {
		case dataTypes.raw:
			return dpValue.data;
		case dataTypes.bool:
			return dpValue.data[0] === 1;
		case dataTypes.value:
			return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
		case dataTypes.string:
			let dataString = '';
			for (let i = 0; i < dpValue.data.length; ++i) {
				dataString += String.fromCharCode(dpValue.data[i]);
			}
			return dataString;
		case dataTypes.enum:
			return dpValue.data[0];
		case dataTypes.bitmap:
			return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
	}
}

class temphumidsensor5 extends TuyaSpecificClusterDevice {

	async onNodeInit({ zclNode }) {

		this.printNode();

		this.addCapability("measure_temperature");
		this.addCapability("measure_humidity");
		this.addCapability("measure_battery");

		zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));

		zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processReporting(value));

		zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processDatapoint(value));

	}

	async processResponse(data) { // Based on the syren driver
		const dp = data.dp;
		const measuredValue = getDataValue(data);
		this.log('received data: ', data, ' dp: ', dp, ' measuredValue: ', measuredValue);
		switch (dp) {
			case 1:
				this.warn
				this.log('Temperature is ', (measuredValue / 10.0), ' C (', measuredValue, ')');
				this.reportTemperatureCapacity(measuredValue);
				break;

			case 2:
				this.log('Humidity Level is ', measuredValue, ' %RH (', measuredValue, ')');
				this.reportHumidityCapacity(measuredValue);
				break;
			/*
			//9 === 0
			//3 = 2
						case 15:
				this.log('received battery percentage: ', value, ' ', measuredValue);
				this.reportBatteryPercentageCapacity(measuredValue);
				break;
			*/
			default:
				this.error(`WARN: NOT PROCESSED Tuya cmd: dp='${dp}' value='${measuredValue}' descMap.data='${JSON.stringify(data)}'`);
				this.log('WARN: NOT PROCESSED Tuya cmd: dp=', dp, 'value=', measuredValue, 'descMap.data = ', data);
				break;
		}
	}

	reportHumidityCapacity(measuredValue) {
		const humidityOffset = this.getSetting('humidity_offset') || 0;
		const parsedValue = measuredValue;
		this.log('measure_humidity | relative humidity: ', parsedValue, ' + humidity offset', humidityOffset);
		this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this.error);
	}

	reportTemperatureCapacity(measuredValue) {
		const temperatureOffset = this.getSetting('temperature_offset') || 0;
		const parsedValue = measuredValue / 10;
		this.log('measure_temperature | temperature: ' , parsedValue, ' + temperature offset', temperatureOffset);
		this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
	}

	reportBatteryPercentageCapacity(measuredValue) {
		const parsedValue = measuredValue;
		this.log('measure_battery | battery percentage remaining: ', parsedValue, '%');
		this.setCapabilityValue('measure_battery', parsedValue).catch(this.error);
	}

	reportAlarmBatteryCapacity(measuredValue) { //true or false
		this.log('alarm_battery | battery alarm: ', measuredValue);
		this.setCapabilityValue('alarm_battery', measuredValue).catch(this.error);
	}

	processReporting(data) {
		this.log("########### Reporting: ", data);
	}

	processDatapoint(data) {
		this.log("########### Datapoint: ", data);
	}

	onDeleted() {
		this.log("sensortemphumidsensor removed");
	}

}

module.exports = temphumidsensor5;
