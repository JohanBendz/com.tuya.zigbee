'use strict';

const { Cluster, debug } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
	TUYA_DP_VOLUME: 5,
	TUYA_DP_DURATION: 7,
	TUYA_DP_ALARM: 13,
	TUYA_DP_BATTERY: 15,
	TUYA_DP_MELODY: 21,
	NEO_DP_VOLUME: 116,
	NEO_DP_DURATION: 103,
	NEO_DP_ALARM: 104,
	NEO_DP_BATTERY: 101, //enum
	NEO_DP_MELODY: 102 //enum
};

const volumeMapping = new Map();
volumeMapping.set('high', { volume: 100, tuya: 0 });
volumeMapping.set('medium', { volume: 66, tuya: 1 });
volumeMapping.set('low', { volume: 33, tuya: 2 });

const melodiesMapping = new Map();
melodiesMapping.set(0, "Doorbell 1");
melodiesMapping.set(1, "For Elise");
melodiesMapping.set(2, "Westminster");
melodiesMapping.set(3, "4 Key Chime");
melodiesMapping.set(4, "William Tell");
melodiesMapping.set(5, "Mozart Piano");
melodiesMapping.set(6, "Space Alarm");
melodiesMapping.set(7, "Klaxon");
melodiesMapping.set(8, "Meep meep");
melodiesMapping.set(9, "Wheep");
melodiesMapping.set(10, "Barking dog");
melodiesMapping.set(11, "Alarm Siren");
melodiesMapping.set(12, "Doorbell 2");
melodiesMapping.set(13, "Old Phone");
melodiesMapping.set(14, "Police Siren");
melodiesMapping.set(15, "Evacuation bell");
melodiesMapping.set(16, "Clock alarm");
melodiesMapping.set(17, "Fire alarm");

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

class sensortemphumidsensor extends TuyaSpecificClusterDevice {

	async onNodeInit({ zclNode }) {

		this.printNode();

		this.addCapability("measure_temperature");
		this.addCapability("measure_humidity");
		this.addCapability("measure_battery");
		this.addCapability("alarm_battery");
		this.addCapability("alarm_siren");

		this.registerCapabilityListener('onoff', async value => {
			this.log('onoff: ', value);
			await this.writeBool(1, value);
		});

		zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));

		zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processReporting(value));

		zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processDatapoint(value));

		//===== CONTROL Binary Switch
		// define FlowCardAction to set the Switch
		let alarm_state_run_listener = async (args, state) => {
			try {
				this.log('FlowCardAction Set Alarm state (', state, ') to: ', args.alarm_state);
				let alarm_state_requested = args.alarm_state == "off/disable" ? false : true;
				this.writeBool(dataPoints.NEO_DP_ALARM, alarm_state_requested);
			} catch (error) {
				console.log(error);
				return false;
			}
			return true;
		};

		// Register Action card card trigger
		let action_alarm_state = this.homey.flow.getActionCard('alarm_state');
		action_alarm_state.registerRunListener(alarm_state_run_listener);

		// Register Flow card trigger
		const sirenFlowTrigger = this.homey.flow.getDeviceTriggerCard('alarm_siren');
		sirenFlowTrigger.registerRunListener(alarm_state_run_listener);

		// Cards that change device settings
		//===== CONTROL Alarm Volume:
		let siren_volume_run_listener = async (args) => {
			this.log('FlowCardAction Set Alarm volume to: ', args.siren_volume);
			this.sendAlarmVolume(args.siren_volume);
		};
		let action_siren_volume = this.homey.flow.getActionCard('siren_volume');
		action_siren_volume.registerRunListener(siren_volume_run_listener);

		//===== CONTROL Alarm Sound Duration:
		let alarm_duration_run_listener = async (args) => {
			this.log('FlowCardAction Set Alarm Duration to: ', args.duration);
			this.sendAlarmDuration(args.duration);
		};
		let action_alarm_duration = this.homey.flow.getActionCard('alarm_duration');
		action_alarm_duration.registerRunListener(alarm_duration_run_listener);

		//===== CONTROL Alarm Tune: 
		let alarm_tune_run_listener = async (args) => {
			this.log('FlowCardAction Set Alarm Tune to: ', args.alarm_tune);
			this.sendAlarmTune(args.alarm_tune);
		};
		let action_alarm_tune = this.homey.flow.getActionCard('alarm_tune');
		action_alarm_tune.registerRunListener(alarm_tune_run_listener);

	}

	async processResponse(data) {
		const dp = data.dp;
		const measuredValue = getDataValue(data);
		let parsedValue = 0;

		// see https://raw.githubusercontent.com/kkossev/Hubitat/main/Drivers/Tuya%20Smart%20Siren%20Zigbee/Tuya%20Smart%20Siren%20Zigbee.groovy
		// and https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts0601_siren.py
		switch (dp) {
			case 0x74: // Neo Alarm Volume [0, 1, 2]
				this.log('received Neo Alarm Volume is (', measuredValue, ')');
			case dataPoints.TUYA_DP_VOLUME:    // (05) volume [ENUM] 0:high 1:mid 2:low
				let volumeName = 'unknown';
				let volumePct = -1;
				[volumeName, volumePct] = this.findVolumeByTuyaValue(measuredValue);
				this.log('confirmed volume: ', volumeName, ' (', volumePct, ')');
				await this.setSettings({
					alarmvolume: measuredValue?.toString(),
				});
				break;

			case 0x67: // Neo Alarm Duration 0..1800 seconds
				this.log('received Neo Alarm duration', measuredValue);
			case dataPoints.TUYA_DP_DURATION:  // (07) duration [VALUE] in seconds
				this.log('confirmed duration', measuredValue, 's');
				this.setSettings({
					alarmsoundtime: measuredValue,
				});
				break;

			case 0x68: // Neo Alarm On 0x01 Off 0x00
				this.log('received Neo Alarm status is ', measuredValue);
			case dataPoints.TUYA_DP_ALARM:    // (13) alarm [BOOL]
				let value = measuredValue == 0 ? "off" : "on";
				this.log('confirmed alarm state ', value, ' ', measuredValue);
				this.setCapabilityValue('alarm_siren', measuredValue)
				break;

			case dataPoints.TUYA_DP_BATTERY:    // (15) battery [VALUE] percentage
				this.log('received battery percentage: ', value, ' ', measuredValue);
				this.reportBatteryPercentageCapacity(measuredValue);
				break;

			case 0x66: // Neo Alarm Melody 0..17
				this.log('received Neo Alarm melody ', measuredValue);
			case dataPoints.TUYA_DP_MELODY:     // (21) melody [enum] 0..17
				this.log('confirmed melody: ',melodiesMapping.get(measuredValue), '(', measuredValue, ')');
				this.setSettings({
					alarmtune: measuredValue?.toString(),
				});
				break;

			case 0x65: // Neo Power Mode  ['battery_full':0, 'battery_high':1, 'battery_medium':2, 'battery_low':3, 'usb':4]
				switch (measuredValue) {
					case 0:
						this.log('Neo Power Mode is: battery_full - ', measuredValue);
						this.reportAlarmBatteryCapacity(false);
						break;
					case 1:
						this.log('Neo Power Mode is: battery_high - ', measuredValue);
						this.reportAlarmBatteryCapacity(false);
						break;
					case 2:
						this.log('Neo Power Mode is: battery_medium - ', measuredValue);
						this.reportAlarmBatteryCapacity(false);
						break;
					case 3:
						this.log('Neo Power Mode is: battery_low - ', measuredValue);
						this.reportAlarmBatteryCapacity(true);
						break;
					case 4:
						this.log('Neo Power Mode is: usb - ', measuredValue);
						this.reportAlarmBatteryCapacity(false);
						break;
				}
				break;

			case 0x69: // Neo Temperature  ( x10 )
				this.log('Neo Temperature is ', (measuredValue / 10.0), ' C (', measuredValue, ')');
				this.reportTemperatureCapacity(measuredValue);
				break;

			case 0x6A: // Neo Humidity Level
				this.log('Neo Humidity Level is ', measuredValue, ' %RH (', measuredValue, ')');
				this.reportHumidityCapacity(measuredValue);
				break;

			case 0x6B: // Neo Min Alarm Temperature -20 .. 80
				this.log('Neo Min Alarm Temperature is ', measuredValue, '°C');
				break;

			case 0x6C: // Neo Max Alarm Temperature -20 .. 80
				this.log('Neo Max Alarm Temperature is ', measuredValue, '°C');
				break;

			case 0x6D: // Neo Min Alarm Humidity 1..100
				this.log('Neo Min Alarm Humidity is ', measuredValue, ' %RH');
				break;

			case 0x6E: // Neo Max Alarm Humidity 1..100
				this.log('Neo Max Alarm Humidity is ', measuredValue, ' %RH');
				break;

			case 0x70: // Neo Temperature Unit (F 0x00, C 0x01)
				this.log('Neo Temperature Unit is ${temperatureScaleOptions[safeToInt(fncmd).toString()]} (', measuredValue, ')');
				break;

			case 0x71: // Neo Alarm by Temperature status
				this.log('Neo Alarm by Temperature status is ${disabledEnabledOptions[safeToInt(fncmd).toString()]} (', measuredValue, ')');
				break;

			case 0x72: // Neo Alarm by Humidity status
				this.log('Neo Alarm by Humidity status is ${disabledEnabledOptions[safeToInt(fncmd).toString()]} (', measuredValue, ')');
				break;

			case 0x73: // Neo ???
				this.log('Neo unknown parameter (x073) is ', measuredValue);
				break;
			default:
				this.log('WARN: <b>NOT PROCESSED</b> Tuya cmd: dp=', dp, 'value=', measuredValue, 'descMap.data = ', data);
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

	async onSettings({ oldSettings, newSettings, changedKeys }) {
		changedKeys.forEach(updatedSetting => {
			this.log("########### Updated setting: ", updatedSetting, " => ", newSettings[updatedSetting]);
			switch (updatedSetting) {
				case "alarmvolume":
					this.sendAlarmVolume(newSettings[updatedSetting]);
					break;
				case "alarmsoundtime":
					this.sendAlarmDuration(newSettings[updatedSetting]);
					break;
				case "alarmtune":
					this.sendAlarmTune(newSettings[updatedSetting]);
					break;
				default:
					this.log("ERROR: Unknown setting: ", updatedSetting);
					break;
			}
		});
	}

	sendAlarmVolume(volume) { // (05) volume [ENUM] 0:high 1:mid 2:low
		let volumeName = 'unknown';
		let volumePct = -1;
		[volumeName, volumePct] = this.findVolumeByTuyaValue(volume);
		this.log('Sending alarm volume: ', volumeName, ' (', volumePct, ')');
		this.writeEnum(dataPoints.NEO_DP_VOLUME, volume);
	}

	sendAlarmDuration(duration) {
		this.log('Sending alarm duration: ', duration, 's');
		this.writeData32(dataPoints.NEO_DP_DURATION, duration);
	}

	sendAlarmTune(tune) {
		this.log('Sending alarm tune: ', melodiesMapping.get(tune), ' (', tune, ')');
		this.writeEnum(dataPoints.NEO_DP_MELODY, tune);
	}

	findVolumeByTuyaValue(measuredValue) {
		let volumeName = 'unknown';
		let volumePct = -1;
		volumeMapping.forEach(function (v, k) {
			if (v.tuya == measuredValue) {
				volumeName = k;
				volumePct = v.volume;
			}
		});
		return [volumeName, volumePct];
	}
}

module.exports = sensortemphumidsensor;
