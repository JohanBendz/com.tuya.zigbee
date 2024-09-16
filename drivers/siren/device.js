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
};

const volumeMapping = new Map();
volumeMapping.set(0, 'Low');
volumeMapping.set(1, 'Medium');
volumeMapping.set(2, 'High');

const melodiesMapping = new Map();
melodiesMapping.set(0, 'Doorbell Chime');
melodiesMapping.set(1, 'Fur Elise');
melodiesMapping.set(2, 'Westminster Chimes');
melodiesMapping.set(3, 'Fast double door bell');
melodiesMapping.set(4, 'William Tell Overture');
melodiesMapping.set(5, 'Turkish March');
melodiesMapping.set(6, 'Security Alarm');
melodiesMapping.set(7, 'Chemical Spill Alert');
melodiesMapping.set(8, 'Piercing Alarm Clock');
melodiesMapping.set(9, 'Smoke Alarm');
melodiesMapping.set(10, 'Dog Barking');
melodiesMapping.set(11, 'Police Siren');
melodiesMapping.set(12, 'Doorbell Chime (reverb)');
melodiesMapping.set(13, 'Mechanical Telephone');
melodiesMapping.set(14, 'Fire/Ambulance');
melodiesMapping.set(15, '3/1 Elevator');
melodiesMapping.set(16, 'Buzzing Alarm Clock');
melodiesMapping.set(17, 'School Bell');

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

class siren extends TuyaSpecificClusterDevice {

	async onNodeInit({ zclNode }) {

		this.printNode();

		this.addCapability("measure_battery");

		this.registerCapabilityListener('onoff', async (value) => {
			this.log('onoff: ', value);
			await this.writeBool(dataPoints.TUYA_DP_ALARM, value);
		});

		zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));
		zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processReporting(value));
		zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processDatapoint(value));

		this.log('Register action card listeners for node: ', this);
		const actionAlarmState = this.homey.flow.getActionCard('siren_alarm_state');
		actionAlarmState.registerRunListener(async (args, state) => {
		  try {
			this.log('FlowCardAction Set Alarm state (', state, ') to: ', args.siren_alarm_state);
			const alarmStateRequested = args.siren_alarm_state !== 'off/disable';
			await this.writeBool(dataPoints.TUYA_DP_ALARM, alarmStateRequested);
		  } catch (error) {
			this.log(error);
			return false;
		  }
		  return true;
		});
	
		const actionSirenVolume = this.homey.flow.getActionCard('siren_volume_setting');
		actionSirenVolume.registerRunListener(async (args, state) => {
		  this.log('FlowCardAction Set Alarm volume to: ', args.siren_volume_setting);
		  args.device.sendAlarmVolume(args.siren_volume_setting);
		});
	
		const actionAlarmDuration = this.homey.flow.getActionCard('siren_alarm_duration');
		actionAlarmDuration.registerRunListener(async (args, state) => {
		  this.log('FlowCardAction Set Alarm Duration to: ', args.duration);
		  args.device.sendAlarmDuration(args.duration);
		});
	
		const actionAlarmTune = this.homey.flow.getActionCard('siren_alarm_tune');
		actionAlarmTune.registerRunListener(async (args, state) => {
		  this.log('FlowCardAction Set Alarm Tune to: ', args.siren_alarm_tune);
		  args.device.sendAlarmTune(args.siren_alarm_tune);
		});
	  }
	
	  async processResponse(data) {
		this.log('########### Response: ', data);
		const parsedValue = getDataValue(data);
		this.log('Parsed value ', parsedValue);
	  }
	
	  async processReporting(data) {
		this.log('########### Reporting: ', data);
		const parsedValue = getDataValue(data);
		this.log('DP ', data.dp, ' with parsed value ', parsedValue);
		switch (data.dp) {
		  case dataPoints.TUYA_DP_ALARM:
			this.log('Alarm state update: ', parsedValue);
			this.setCapabilityValue('onoff', parsedValue).catch(this.error);
			break;
		  case dataPoints.TUYA_DP_VOLUME: // (05) volume [ENUM] 0:high 1:mid 2:low
			this.log('Volume updated: ', volumeMapping.get(Number(parsedValue)), ' (', parsedValue, ')');
			this.setSettings({
			  alarmvolume: parsedValue?.toString(),
			});
			break;
		  case dataPoints.TUYA_DP_DURATION: // (07) duration [VALUE] in seconds
			this.log('Duration updated:', parsedValue, 's');
			this.setSettings({
			  alarmsoundtime: parsedValue,
			});
			break;
		  case dataPoints.TUYA_DP_MELODY: // (21) melody [enum] 0..17
			this.log('Melody updated: ', melodiesMapping.get(parsedValue), '(', parsedValue, ')');
			this.setSettings({
			  alarmtune: parsedValue?.toString(),
			});
			break;
		  case dataPoints.TUYA_DP_BATTERY: // battery
			this.log('Received battery percentage: ', parsedValue, '%');
			this.setCapabilityValue('measure_battery', parsedValue).catch(this.error);
			break;
		  default:
			this.log('DP ', data.dp, ' not handled!');
		}
	  }
	
	  async processDatapoint(data) {
		this.log('########### Datapoint: ', data);
		const parsedValue = getDataValue(data);
		this.log('Parsed value ', parsedValue);
	  }
	
	  onDeleted() {
		this.log('ZigbeeSiren removed');
	  }
	
	  async onSettings({ oldSettings, newSettings, changedKeys }) {
		changedKeys.forEach((updatedSetting) => {
		  this.log('########### Updated setting: ', updatedSetting, ' => ', newSettings[updatedSetting]);
		  switch (updatedSetting) {
			case 'alarmvolume':
			  this.sendAlarmVolume(newSettings[updatedSetting]);
			  break;
			case 'alarmsoundtime':
			  this.sendAlarmDuration(newSettings[updatedSetting]);
			  break;
			case 'alarmtune':
			  this.sendAlarmTune(newSettings[updatedSetting]);
			  break;
			default:
			  this.log('ERROR: Unknown setting: ', updatedSetting);
			  break;
		  }
		});
	  }
	
	  sendAlarmVolume(volume) { // (05) volume [ENUM] 0:high 1:mid 2:low
		const volumeName = volumeMapping.get(Number(volume));
		this.log('Sending alarm volume: ', volumeName, ' (', volume, ')');
		this.writeEnum(dataPoints.TUYA_DP_VOLUME, volume);
	  }
	
	  sendAlarmDuration(duration) {
		this.log('Sending alarm duration: ', duration, 's');
		this.writeData32(dataPoints.TUYA_DP_DURATION, duration);
	  }
	
	  sendAlarmTune(tune) {
		const tuneNr = Number(tune);
		this.log('Sending alarm tune: ', melodiesMapping.get(tuneNr), ' (', tuneNr, ')');
		this.writeEnum(dataPoints.TUYA_DP_MELODY, tuneNr);
	  }
	
	}

module.exports = siren;
