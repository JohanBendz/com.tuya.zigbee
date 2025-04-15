'use strict';

const { Cluster, debug } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { V1_SIREN_TEMPHUMID_SENSOR_DATA_POINTS: dataPoints } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

const volumeMapping = new Map([
  [0, 'High'],
  [1, 'Medium'],
  [2, 'Low']
]);

const melodiesMapping = new Map([
  [0, 'Doorbell Chime'],
  [1, 'Fur Elise'],
  [2, 'Westminster Chimes'],
  [3, 'Fast double door bell'],
  [4, 'William Tell Overture'],
  [5, 'Turkish March'],
  [6, 'Security Alarm'],
  [7, 'Chemical Spill Alert'],
  [8, 'Piercing Alarm Clock'],
  [9, 'Smoke Alarm'],
  [10, 'Dog Barking'],
  [11, 'Police Siren'],
  [12, 'Doorbell Chime (reverb)'],
  [13, 'Mechanical Telephone'],
  [14, 'Fire/Ambulance'],
  [15, '3/1 Elevator'],
  [16, 'Buzzing Alarm Clock'],
  [17, 'School Bell']
]);

const dataTypes = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  return chunks.reduce((acc, byte) => (acc << 8) + byte, 0);
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw: return dpValue.data;
    case dataTypes.bool: return dpValue.data[0] === 1;
    case dataTypes.value: return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string: return String.fromCharCode(...dpValue.data);
    case dataTypes.enum: return dpValue.data[0];
    case dataTypes.bitmap: return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
};

class siren extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
    this.addCapability("measure_battery");

    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff: ', value);
      await this.writeBool(dataPoints.alarm, value);
    });

    zclNode.endpoints[1].clusters.tuya.on("response", v => this.processResponse(v));
    zclNode.endpoints[1].clusters.tuya.on("reporting", v => this.processReporting(v));
    zclNode.endpoints[1].clusters.tuya.on("datapoint", v => this.processDatapoint(v));

    const actionAlarmState = this.homey.flow.getActionCard('siren_alarm_state');
    actionAlarmState.registerRunListener(async (args, state) => {
      try {
        this.log('FlowCardAction Set Alarm state to:', args.siren_alarm_state);
        const alarmState = args.siren_alarm_state !== 'off/disable';
        await this.writeBool(dataPoints.alarm, alarmState);
        return true;
      } catch (error) {
        this.error(error);
        return false;
      }
    });

    this.homey.flow.getActionCard('siren_volume_setting')
      .registerRunListener(async (args) => {
        this.log('Set Alarm volume to:', args.siren_volume_setting);
        await this.sendAlarmVolume(args.siren_volume_setting);
      });

    this.homey.flow.getActionCard('siren_alarm_duration')
      .registerRunListener(async (args) => {
        this.log('Set Alarm Duration to:', args.duration);
        await this.sendAlarmDuration(args.duration);
      });

    this.homey.flow.getActionCard('siren_alarm_tune')
      .registerRunListener(async (args) => {
        this.log('Set Alarm Tune to:', args.siren_alarm_tune);
        await this.sendAlarmTune(args.siren_alarm_tune);
      });

    this.homey.flow.getActionCard('siren_beep')
      .registerRunListener(async () => {
        this.log('FlowCardAction: Beep triggered');
        await this.beep();
        return true;
      });
  }

  async processResponse(data) {
    this.log('Response:', data);
    this.log('Parsed value:', getDataValue(data));
  }

  async processReporting(data) {
    const parsedValue = getDataValue(data);
    this.log(`Reporting - DP ${data.dp}:`, parsedValue);

    switch (data.dp) {
      case dataPoints.alarm:
        this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        break;
      case dataPoints.volume:
        this.setSettings({ alarmvolume: String(parsedValue) });
        break;
      case dataPoints.duration:
        this.setSettings({ alarmsoundtime: parsedValue });
        break;
      case dataPoints.melody:
        this.setSettings({ alarmtune: String(parsedValue) });
        break;
      case dataPoints.battery:
        this.setCapabilityValue('measure_battery', parsedValue).catch(this.error);
        break;
      default:
        this.log('Unhandled datapoint:', data);
    }
  }

  async processDatapoint(data) {
    this.log('Datapoint:', data);
    this.log('Parsed value:', getDataValue(data));
  }

  onDeleted() {
    this.log('Zigbee Siren removed');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    for (const key of changedKeys) {
      this.log('Updated setting:', key, '=>', newSettings[key]);
      switch (key) {
        case 'alarmvolume':
          await this.sendAlarmVolume(newSettings[key]);
          break;
        case 'alarmsoundtime':
          await this.sendAlarmDuration(newSettings[key]);
          break;
        case 'alarmtune':
          await this.sendAlarmTune(newSettings[key]);
          break;
        default:
          this.log('Unknown setting:', key);
      }
    }
  }

  async sendAlarmVolume(volume) {
    this.log('Sending alarm volume:', volumeMapping.get(Number(volume)), '(', volume, ')');
    return this.writeEnum(dataPoints.volume, Number(volume));
  }

  async sendAlarmDuration(duration) {
    this.log('Sending alarm duration:', duration);
    return this.writeData32(dataPoints.duration, Number(duration));
  }

  async sendAlarmTune(tune) {
    this.log('Sending alarm tune:', melodiesMapping.get(Number(tune)), '(', tune, ')');
    return this.writeEnum(dataPoints.melody, Number(tune));
  }

  async beep() {
    this.log('Beep command triggered');
    await this.writeEnum(dataPoints.volume, 0); // High
    await this.writeEnum(dataPoints.melody, 1); // Fur Elise
    await this.writeData32(dataPoints.duration, 1); // 1 second
    await this.writeBool(dataPoints.alarm, true);
  }
}

module.exports = siren;
