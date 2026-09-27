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


		if (!this.hasCapability('measure_battery')) {
			await this.addCapability('measure_battery');
		}

		this._alarmTrigger = this.homey.flow.getDeviceTriggerCard('siren_alarm');

		this.registerCapabilityListener('onoff', async (value) => {
			this.log('onoff: ', value);
			await this.writeBool(dataPoints.TUYA_DP_ALARM, value);
		});

		zclNode.endpoints[1].clusters.tuya.on("response", async value => {
      try {
        await this.processResponse(value);
      } catch (err) {
        this.error('Failed to process Tuya response', err);
      }
    });
		zclNode.endpoints[1].clusters.tuya.on("reporting", async value => {
      try {
        await this.processReporting(value);
      } catch (err) {
        this.error('Failed to process Tuya reporting', err);
      }
    });
		zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processDatapoint(value));


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
		  case dataPoints.TUYA_DP_ALARM: {
			const isAlarm = !!parsedValue;
			const wasAlarm = this.getCapabilityValue('onoff') === true;
			this.log('Alarm state update: ', isAlarm);
			await this.setCapabilityValue('onoff', isAlarm).catch(this.error);

			if (isAlarm && !wasAlarm) {
			  this._alarmTrigger.trigger(this, {}, {})
			    .catch(err => this.error('Failed to trigger siren_alarm Flow card', err));
			}
			break;
		  }
		  case dataPoints.TUYA_DP_VOLUME: // (05) volume [ENUM] 0:high 1:mid 2:low
			this.log('Volume updated: ', volumeMapping.get(Number(parsedValue)), ' (', parsedValue, ')');
			await this.setSettings({
			  alarmvolume: parsedValue?.toString(),
			});
			break;
		  case dataPoints.TUYA_DP_DURATION: // (07) duration [VALUE] in seconds
			this.log('Duration updated:', parsedValue, 's');
			await this.setSettings({
			  alarmsoundtime: parsedValue,
			});
			break;
		  case dataPoints.TUYA_DP_MELODY: // (21) melody [enum] 0..17
			this.log('Melody updated: ', melodiesMapping.get(parsedValue), '(', parsedValue, ')');
			await this.setSettings({
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
	
	  async setAlarmState(value) {
		await this.writeBool(dataPoints.TUYA_DP_ALARM, value);
	  }
	
	  async sendAlarmVolume(volume) { // (05) volume [ENUM] 0:high 1:mid 2:low
		const volumeName = volumeMapping.get(Number(volume));
		this.log('Sending alarm volume: ', volumeName, ' (', volume, ')');
		await this.writeEnum(dataPoints.TUYA_DP_VOLUME, volume);
	  }
	
	  async sendAlarmDuration(duration) {
		this.log('Sending alarm duration: ', duration, 's');
		await this.writeData32(dataPoints.TUYA_DP_DURATION, duration);
	  }
	
	  async sendAlarmTune(tune) {
		const tuneNr = Number(tune);
		this.log('Sending alarm tune: ', melodiesMapping.get(tuneNr), ' (', tuneNr, ')');
		await this.writeEnum(dataPoints.TUYA_DP_MELODY, tuneNr);
	  }
	
	}

module.exports = siren;
