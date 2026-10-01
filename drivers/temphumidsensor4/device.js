'use strict';

const { Cluster } = require('zigbee-clusters');
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

class temphumidsensor4 extends TuyaSpecificClusterDevice {

	async onNodeInit({ zclNode, node }) {


		for (const capabilityId of ['measure_temperature', 'measure_humidity', 'measure_battery']) {
			if (!this.hasCapability(capabilityId)) {
				await this.addCapability(capabilityId);
			}
		}

		// Homey provides the Zigbee interview identity on the node. A live Basic
		// read can time out for sleepy sensors, so do not depend on it for DP4.
		let manufacturerName = node?.manufacturerName;
		if (!manufacturerName) {
			try {
				({ manufacturerName } = await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName']));
			} catch (err) {
				this.error('Error reading device manufacturerName', err);
			}
		}

		// TH05Z / _TZE200_vvmbj46n reports battery percentage on DP4.
		// Keep this runtime branch for devices paired before the profile split.
		this.isVvmbj46n = manufacturerName === '_TZE200_vvmbj46n';

		zclNode.endpoints[1].clusters.tuya.on("response", async value => {
      try {
        await this.processResponse(value);
      } catch (err) {
        this.error('Failed to process Tuya response', err);
      }
    });

		zclNode.endpoints[1].clusters.tuya.on("reporting", async value => {
      try {
        await this.processResponse(value);
      } catch (err) {
        this.error('Failed to process Tuya reporting', err);
      }
    });

		zclNode.endpoints[1].clusters.tuya.on("datapoint", value => {
      try {
        this.processDatapoint(value);
      } catch (err) {
        this.error('Failed to process Tuya datapoint', err);
      }
    });

	}

	async processResponse(data) { // Based on the syren driver
		const dp = data.dp;
		const measuredValue = getDataValue(data);
		this.log('received data: ', data, ' dp: ', dp, ' measuredValue: ', measuredValue);
		switch (dp) {
			case 1:
				this.log('Temperature is ', (measuredValue / 10.0), ' C (', measuredValue, ')');
				this.reportTemperatureCapacity(measuredValue);
				break;

			case 2:
				this.log('Humidity Level is ', measuredValue, ' %RH (', measuredValue, ')');
				this.reportHumidityCapacity(measuredValue);
				break;

			case 3: {
				if (this.isVvmbj46n) {
					this.log('Ignoring DP3 battery-state mapping for TH05Z profile');
					break;
				}

				const batteryByState = { 0: 25, 1: 50, 2: 100 };
				const batteryLevel = batteryByState[measuredValue];

				if (batteryLevel === undefined) {
					this.log('Unknown battery state:', measuredValue);
					break;
				}

				this.log('Battery state:', measuredValue, '=>', batteryLevel, '%');
				this.reportBatteryPercentageCapacity(batteryLevel);
				this.reportAlarmBatteryCapacity(measuredValue === 0);
				break;
			}

			case 4:
				if (this.isVvmbj46n) {
					this.log('TH05Z battery percentage:', measuredValue, '%');
					this.reportBatteryPercentageCapacity(measuredValue);
					if (this.hasCapability('alarm_battery')) {
						this.reportAlarmBatteryCapacity(measuredValue < 20);
					}
					break;
				}
				this.log('Unhandled battery percentage DP4 for this profile:', measuredValue);
				break;

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

module.exports = temphumidsensor4;
