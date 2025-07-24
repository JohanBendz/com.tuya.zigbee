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
  // ===== FONCTIONNALITÃ‰S INTELLIGENTES =====
  // Mode YOLO Intelligent - Gestion de batterie intelligente
  this.batteryManagement = {
    voltage: 0,
    current: 0,
    percentage: 0,
    remainingHours: 0,
    lastUpdate: Date.now()
  };

  // DÃ©tection de clics intelligente
  this.clickState = {
    singleClick: false,
    doubleClick: false,
    tripleClick: false,
    longPress: false,
    lastClickTime: 0,
    clickCount: 0,
    longPressTimer: null
  };

  // Fonction de mise Ã  jour de l'autonomie de batterie
  async updateBatteryAutonomy() {
    if (this.batteryManagement.voltage > 0) {
      const voltageDiff = this.batteryManagement.voltage - 2.5; // Tension minimale
      const capacityRemaining = Math.max(0, voltageDiff / 1.5); // DiffÃ©rence de tension max
      this.batteryManagement.percentage = Math.min(100, Math.max(0, capacityRemaining * 100));
      
      // Calculer les heures restantes basÃ© sur la consommation actuelle
      if (this.batteryManagement.current > 0) {
        const capacityAh = (this.batteryManagement.voltage * 0.8) / 3.6; // CapacitÃ© estimÃ©e
        this.batteryManagement.remainingHours = Math.floor((capacityAh / this.batteryManagement.current) * 24);
      }
      
      this.batteryManagement.lastUpdate = Date.now();
      this.log('Battery autonomy updated - Voltage: ' + this.batteryManagement.voltage + 'V, Percentage: ' + this.batteryManagement.percentage + '%, Remaining: ' + this.batteryManagement.remainingHours + 'h');
    }
  }

  // Fonction de dÃ©clenchement de flows intelligents
  async triggerFlow(triggerType) {
    try {
      switch(triggerType) {
        case 'single_click':
          await this.homey.flow.getDeviceTriggerCard('single_click').trigger(this).catch(this.error);
          break;
        case 'double_click':
          await this.homey.flow.getDeviceTriggerCard('double_click').trigger(this).catch(this.error);
          break;
        case 'triple_click':
          await this.homey.flow.getDeviceTriggerCard('triple_click').trigger(this).catch(this.error);
          break;
        case 'long_press':
          await this.homey.flow.getDeviceTriggerCard('long_press').trigger(this).catch(this.error);
          break;
      }
    } catch (error) {
      this.error('Error triggering flow:', error);
    }
  }


	async onInit({ zclNode }) {
    // ===== GESTION INTELLIGENTE DES CLICS =====
    this.on('capability.onoff', async (value) => {
      const now = Date.now();
      const timeDiff = now - this.clickState.lastClickTime;
      
      if (value) { // Appui
        // DÃ©marrer le timer pour l'appui long
        this.clickState.longPressTimer = setTimeout(async () => {
          this.clickState.longPress = true;
          this.log('Appui long dÃ©tectÃ©');
          await this.triggerFlow('long_press');
        }, 2000); // 2 secondes
        
      } else { // RelÃ¢chement
        // Annuler le timer d'appui long
        if (this.clickState.longPressTimer) {
          clearTimeout(this.clickState.longPressTimer);
          this.clickState.longPressTimer = null;
        }
        
        if (timeDiff < 300) { // Clic simple
          this.clickState.singleClick = true;
          this.clickState.clickCount++;
          
          if (this.clickState.clickCount === 2) { // Double clic
            this.clickState.doubleClick = true;
            this.clickState.singleClick = false;
            this.log('Double clic dÃ©tectÃ©');
            await this.triggerFlow('double_click');
          } else if (this.clickState.clickCount === 3) { // Triple clic
            this.clickState.tripleClick = true;
            this.clickState.doubleClick = false;
            this.log('Triple clic dÃ©tectÃ©');
            await this.triggerFlow('triple_click');
          } else { // Clic simple
            this.log('Clic simple dÃ©tectÃ©');
            await this.triggerFlow('single_click');
          }
        } else { // Nouveau clic
          this.clickState.clickCount = 1;
          this.clickState.singleClick = true;
          this.log('Clic simple dÃ©tectÃ©');
          await this.triggerFlow('single_click');
        }
        
        this.clickState.lastClickTime = now;
        
        // RÃ©initialiser aprÃ¨s 1 seconde
        setTimeout(() => {
          this.clickState.clickCount = 0;
          this.clickState.singleClick = false;
          this.clickState.doubleClick = false;
          this.clickState.tripleClick = false;
          this.clickState.longPress = false;
        }, 1000);
      }
    });


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


